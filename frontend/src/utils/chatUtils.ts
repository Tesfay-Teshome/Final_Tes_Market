import { WebSocketMessage, MessageAck } from '@/types/chat';

import { store } from '@/store';
import { Message, addMessage, updateMessageStatus } from '@/store/slices/chatSlice';

export interface SendMessageOptions {
  conversationId: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  requireAck?: boolean;
}



export async function sendMessage({
  conversationId,
  content,
  sender,
  requireAck = true
}: SendMessageOptions): Promise<Message> {
  if (!conversationId || !content.trim() || !sender?.id) {
    throw new Error('Missing required parameters for message');
  }

  // Create server message structure
  const serverMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content,
    sender_id: sender.id,
    sender_name: sender.name,
    sender_avatar: sender.avatar || '',
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    status: 'sending' as const,
    conversation_id: conversationId
  };


  // Add message to store
  store.dispatch(addMessage(serverMessage));
  
  // Update message status to delivered (simulated since WebSocket is removed)
  serverMessage.status = 'delivered' as const;
  serverMessage.updated_at = new Date().toISOString();

  return serverMessage;
}
