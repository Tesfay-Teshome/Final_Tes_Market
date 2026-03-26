import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import Conversation, Message, MessageReaction, MessageReadReceipt
from .serializers import MessageSerializer, MessageReactionSerializer, MessageReadReceiptSerializer

# Get the user model
User = get_user_model()
logger = logging.getLogger(__name__)

class MessageStatus:
    SENDING = 'sending'
    SENT = 'sent'
    DELIVERED = 'delivered'
    READ = 'read'
    FAILED = 'failed'
    EDITED = 'edited'
    DELETED = 'deleted'

class EventType:
    # Message events
    CHAT_MESSAGE = 'chat_message'
    MESSAGE_DELIVERED = 'message_delivered'
    MESSAGE_READ = 'message_read'
    MESSAGE_EDITED = 'message_edited'
    MESSAGE_DELETED = 'message_deleted'
    MESSAGE_REACTION = 'message_reaction'
    
    # Status events
    TYPING = 'typing'
    USER_STATUS = 'user_status'
    ERROR = 'error'

User = get_user_model()
logger = logging.getLogger(__name__)

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for handling real-time chat functionality with JWT authentication.
    Handles messaging, typing indicators, read receipts, and message reactions.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.conversation_id = None
        self.room_group_name = None
        self.conversation = None
        self.typing_timers: Dict[str, Any] = {}
    
    async def connect(self):
        """
        Handle WebSocket connection.
        - Authenticate user via JWT token
        - Add user to conversation room group
        - Send initial conversation data
        """
        # Get token from query string
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token = params.get('token', [''])[0]
        
        if not token:
            await self.close(code=4000)  # Invalid request
            return
            
        try:
            # Verify JWT token
            access_token = AccessToken(token)
            self.user_id = access_token['user_id']
            self.user = await self.get_user()
            
            if not self.user:
                raise TokenError('User not found')
                
        except (TokenError, KeyError, Exception) as e:
            logger.error(f'Authentication error: {str(e)}')
            await self.close(code=4001)  # Unauthorized
            return
        
        # Get conversation ID from URL route
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        try:
            # Verify user has access to this conversation
            self.conversation = await self.get_conversation()
            if not self.conversation:
                await self.close(code=4003)  # Forbidden
                return
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Update user's online status
            await self.set_user_online(True)
            
            # Mark all messages as read for this user in this conversation
            await self.mark_conversation_read()
            
            # Get conversation participants
            participants = await self.get_conversation_participants()
            
            # Notify others in the conversation that user is online
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_user_status',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'is_online': True,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f'User {self.user.id} connected to conversation {self.conversation_id}')
            
            # Send initial data to the client
            await self.send_initial_data(participants)
            
        except Exception as e:
            logger.error(f'Error in WebSocket connection: {str(e)}')
            await self.close(code=4000)  # Internal error
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        - Leave conversation room group
        - Update user's online status if they're not connected elsewhere
        """
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # Mark user as offline if they have no other active connections
            await self.set_user_online(False)
            
            # Notify others in the conversation that this user is now offline
            if hasattr(self, 'conversation'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_status',
                        'user_id': self.user.id,
                        'is_online': False,
                        'timestamp': timezone.now().isoformat()
                    }
                )
            
            logger.info(f"User {getattr(self, 'user', {}).id} disconnected from conversation {getattr(self, 'conversation_id', 'unknown')}")
    
    async def receive_json(self, content, **kwargs):
        """
        Handle incoming WebSocket messages in JSON format.
        Expected message types: chat_message, typing, read_receipt, reaction, edit_message, delete_message, mark_messages_read
        """
        try:
            message_type = content.get('type')
            request_id = content.get('request_id', str(uuid.uuid4()))
            
            # Add request ID to the content for tracking
            content['request_id'] = request_id
            
            if message_type == EventType.CHAT_MESSAGE:
                await self.handle_chat_message(content)
            elif message_type == EventType.TYPING:
                await self.handle_typing(content)
            elif message_type == EventType.MESSAGE_READ:
                await self.handle_read_receipt(content)
            elif message_type == EventType.MESSAGE_REACTION:
                await self.handle_reaction(content)
            elif message_type == EventType.MESSAGE_EDITED:
                await self.handle_edit_message(content)
            elif message_type == EventType.MESSAGE_DELETED:
                await self.handle_delete_message(content)
            elif message_type == 'mark_messages_read':
                await self.handle_mark_messages_read(content)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send_error("Unknown message type", code="unknown_message_type", request_id=request_id)
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send_error("Invalid message format", code="invalid_format", request_id=request_id)
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            await self.send_error("An error occurred", code="server_error", request_id=request_id)
    
    async def handle_chat_message(self, data):
        """
        Handle incoming chat message.
        
        Args:
            data: Message data containing content, temp_id, parent_id, etc.
        """
        temp_id = data.get('temp_id', str(uuid.uuid4()))
        content = data.get('content', '').strip()
        parent_id = data.get('parent_id')
        attachments = data.get('attachments', [])
        
        if not content and not attachments:
            await self.send_error(
                message="Message cannot be empty",
                code="empty_message",
                request_id=data.get('request_id')
            )
            return
            
        try:
            # Notify sender that message is being prcessed
            await self.send_json({
                'type': 'message_status',
                'status': 'sending',
                'temp_id': temp_id,
                'timestamp': timezone.now().isoformat(),
                'request_id': data.get('request_id')
            })
            
            # Save message to database
            message = await self.save_message(
                content=content,
                parent_id=parent_id,
                temp_id=temp_id,
                attachments=attachments
            )
            
            # Serialize message for sending
            serialized_message = await self.serialize_message(message)
            
            # Add temporary ID for client-side tracking
            serialized_message['temp_id'] = temp_id
            
            # Prepare message data for broadcasting
            message_data = {
                'type': 'chat_message',
                'message': serialized_message,
                'request_id': data.get('request_id')
            }
            
            # Send message to room group (excluding sender)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_message',
                    'sender_channel_name': self.channel_name,
                    'data': message_data
                }
            )
            
            # Send success status to sender
            await self.send_json({
                'type': 'message_status',
                'status': 'sent',
                'temp_id': temp_id,
                'message_id': str(message.id),
                'timestamp': timezone.now().isoformat(),
                'request_id': data.get('request_id')
            })
            
            # Mark message as delivered to sender
            await self.mark_message_delivered(message.id)
            
            # Update conversation's last message
            await self.update_conversation_last_message(message)
            
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            await self.send_error(
                message="Failed to send message",
                code="message_send_failed",
                request_id=data.get('request_id'),
                temp_id=temp_id,
                status='failed'
            )

    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)
        
        # Broadcast typing status to other users in the conversation
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': is_typing
            }
        )

    async def handle_read_receipt(self, data):
        """Handle read receipt"""
        message_id = data.get('message_id')
        if not message_id:
            return
        
        try:
            # Save read receipt
            message = await self.mark_message_read(message_id)
            
            # Broadcast read receipt to other users in the conversation
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error saving read receipt: {str(e)}")

    async def handle_reaction(self, data):
        """
        Handle message reaction.
        
        Args:
            data: Dictionary containing:
                - message_id: ID of the message to react to
                - reaction_type: Type of reaction (or 'remove' to remove reaction)
        """
        message_id = data.get('message_id')
        reaction_type = data.get('reaction_type')
        
        if not message_id or not reaction_type:
            logger.warning("Missing message_id or reaction_type in reaction data")
            return
        
        try:
            # Save or remove reaction
            reaction = await self.save_reaction(message_id, reaction_type)
            
            # Prepare reaction data for broadcasting
            reaction_data = {
                'type': 'reaction',
                'message_id': message_id,
                'user_id': self.user.id,
                'username': self.user.username,
                'action': 'removed' if reaction is None else 'added'
            }
            
            # If it's an added reaction, include reaction details
            if reaction is not None:
                reaction_data['reaction'] = {
                    'id': str(reaction.id),
                    'reaction_type': reaction.reaction_type,
                    'created_at': reaction.created_at.isoformat()
                }
            
            # Broadcast reaction event to all users in the conversation
            await self.channel_layer.group_send(
                self.room_group_name,
                reaction_data
            )
            
        except Exception as e:
            logger.error(f"Error processing reaction: {str(e)}")
            await self.send_error(
                "Failed to process reaction",
                code="reaction_error",
                details=str(e)
            )

    # Handler methods for group messages

    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    async def typing(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing status back to the user who is typing
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def read_receipt(self, event):
        """Send read receipt to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username'],
            'timestamp': event['timestamp']
        }))

    async def broadcast_message(self, event):
        """Broadcast message to everyone except the original sender's channel"""
        if event.get('sender_channel_name') != self.channel_name:
            # event['data'] is already the payload we want to forward
            await self.send_json(event.get('data', {}))

    async def reaction(self, event):
        """Send reaction to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'message_id': event['message_id'],
            'reaction': event['reaction']
        }))

    async def user_status(self, event):
        """Send user online/offline status to WebSocket"""
        # Don't send status back to the user who changed status
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_status',
                'user_id': event['user_id'],
                'is_online': event['is_online'],
                'timestamp': event['timestamp']
            }))

    async def broadcast_user_status(self, event):
        """Broadcast online status to all participants except the originator"""
        # Frontend listens for broadcast_user_status
        # Skip sending to the same user to avoid echo
        incoming_user_id = str(event.get('user_id'))
        if incoming_user_id != str(self.user.id):
            await self.send_json({
                'type': 'broadcast_user_status',
                'user_id': event.get('user_id'),
                'username': event.get('username'),
                'is_online': event.get('is_online'),
                'timestamp': event.get('timestamp'),
            })

    # Helper methods

    async def send_error(self, message, code=None, request_id=None, **kwargs):
        """
        Send error message to WebSocket
        
        Args:
            message: Error message
            code: Error code
            request_id: Optional request ID for tracking
            **kwargs: Additional error data
        """
        error_data = {
            'type': 'error',
            'message': message,
            'code': code,
            'timestamp': timezone.now().isoformat()
        }
        error_data.update(kwargs)
        if request_id:
            error_data['request_id'] = request_id
        await self.send_json(error_data)

    # Database operations (using database_sync_to_async)

    @database_sync_to_async
    def get_user(self):
        """Get user by ID"""
        try:
            return User.objects.get(id=self.user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_conversation(self):
        """Get conversation with permission check"""
        try:
            return Conversation.objects.filter(
                id=self.conversation_id,
                participants=self.user
            ).first()
        except (ValueError, ValidationError):
            return None

    @database_sync_to_async
    def set_user_online(self, is_online):
        """Update user's online status"""
        # Only update fields that actually exist on the User model
        fields = []
        if hasattr(self.user, 'is_online'):
            self.user.is_online = is_online
            fields.append('is_online')
        if hasattr(self.user, 'last_seen'):
            # Update last_seen if present on the model
            self.user.last_seen = timezone.now()
            fields.append('last_seen')
        if fields:
            self.user.save(update_fields=fields)

    @database_sync_to_async
    def mark_conversation_read(self):
        """Mark all messages in the conversation as read for the current user"""
        if self.conversation:
            self.conversation.mark_as_read(self.user)
    
    @database_sync_to_async
    def save_message(self, content, parent_id=None, temp_id=None, attachments=None):
        """Save message to database"""
        parent = None
        if parent_id:
            try:
                parent = Message.objects.get(id=parent_id, conversation=self.conversation)
            except Message.DoesNotExist:
                pass
                
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            content=content,
            parent=parent,
            status='sent'
        )
        
        # Update conversation's last message
        self.conversation.update_last_message(message)
        
        return message

    @database_sync_to_async
    def get_conversation_participants(self):
        """Return basic participant info for the conversation"""
        if not self.conversation:
            return []
        return list(self.conversation.participants.values('id', 'username', 'full_name'))

    async def send_initial_data(self, participants):
        """Send initial payload after successful connection"""
        await self.send_json({
            'type': 'initial_data',
            'conversation_id': str(self.conversation_id),
            'participants': participants,
            'timestamp': timezone.now().isoformat(),
        })
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        try:
            message = Message.objects.get(
                id=message_id,
                conversation=self.conversation
            )
            message.mark_as_read(self.user)
            return message
        except Message.DoesNotExist:
            logger.warning(f"Message {message_id} not found in conversation {self.conversation_id}")
            return None
    
    @database_sync_to_async
    def save_reaction(self, message_id, reaction_type):
        """Save or update reaction"""
        try:
            message = Message.objects.get(
                id=message_id,
                conversation=self.conversation
            )
            
            # Delete existing reaction from this user to this message
            MessageReaction.objects.filter(
                message=message,
                user=self.user
            ).delete()
            
            # If reaction_type is not 'remove', add the new reaction
            if reaction_type.lower() != 'remove':
                reaction = MessageReaction.objects.create(
                    message=message,
                    user=self.user,
                    reaction_type=reaction_type
                )
                return reaction
            return None
            
        except Message.DoesNotExist:
            logger.warning(f"Message {message_id} not found in conversation {self.conversation_id}")
            return None
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message using the DRF serializer"""
        from .serializers import MessageSerializer
        from rest_framework.request import HttpRequest
        
        # Create a mock request for the serializer context
        request = HttpRequest()
        request.user = self.user
        
        serializer = MessageSerializer(
            message,
            context={'request': request}
        )
        return serializer.data
