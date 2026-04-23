import { store } from '@/store';
import {
  setConversations,
  addMessage,
  setMessages,
  updateConversation,
  setTypingStatus,
  setOnlineStatus,
  updateMessageStatus,
  markAsRead,
  addConversation,
  Message,
  Conversation,
  MessageStatus
} from '@/store/slices/chatSlice';
import { RootState } from '@/store';
import { messagingAPI } from './api';
import { toast } from '@/components/ui/use-toast';

// Extend the messagingAPI type to include our methods
declare module './api' {
  interface MessagingAPI {
    sendTypingStatus: (conversationId: string, isTyping: boolean) => Promise<void>;
    updateUserStatus: (userId: string, isOnline: boolean) => Promise<void>;
  }
}

/**
 * Interface for tracking typing timeouts
 */
interface TypingTimeouts {
  [conversationId: string]: NodeJS.Timeout;
}

/**
 * Interface for the chat service instance
 */
export interface IChatService {
  fetchConversations(): Promise<void>;
  fetchMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, content: string): Promise<Message>;
  markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void>;
  markAsRead(conversationId: string, messageIds?: string[]): Promise<void>;
  sendTyping(conversationId: string, isTyping: boolean): Promise<void>;
  updateOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  getOrCreateConversation(participantId: string): Promise<Conversation>;
  cleanup(): void;
}

/**
 * ChatService handles all chat-related operations using REST API with polling
 */
class ChatService implements IChatService {
  private typingTimeouts: TypingTimeouts = {};
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private unsubscribeStore?: () => void;

  constructor() {
    // React to auth changes to start/stop polling appropriately
    this.unsubscribeStore = store.subscribe(() => this.handleAuthChange());
    // Initialize once according to current auth state
    this.handleAuthChange();
  }

  private isAuthenticated(): boolean {
    const state = store.getState() as RootState;
    return !!state.auth?.user?.id;
  }

  private handleAuthChange(): void {
    const authed = this.isAuthenticated();
    if (authed && !this.isPolling) {
      this.initializePolling();
    } else if (!authed && this.isPolling) {
      this.destroy();
    }
  }

  /**
   * Initialize polling for conversations and messages
   */
  private initializePolling(): void {
    if (this.isPolling) return;
    if (!this.isAuthenticated()) return;

    console.log('Initializing chat service polling (authenticated)...');

    // Initial fetch of conversations
    this.fetchConversations().catch(error => {
      console.error('Failed to fetch initial conversations:', error);
    });

    // Set up polling for conversations (every 30 seconds)
    this.pollingInterval = setInterval(() => {
      if (!this.isAuthenticated()) {
        // Stop polling immediately if logged out
        this.destroy();
        return;
      }
      this.fetchConversations().catch(error => {
        console.error('Polling error in fetchConversations:', error);
      });
    }, 30000);

    this.isPolling = true;
  }

  // Clean up polling on service destruction
  public destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  // Fetch all conversations for the current user with enhanced error handling
  public async fetchConversations(): Promise<void> {
    try {
      if (!this.isAuthenticated()) {
        return;
      }
      const response = await messagingAPI.getConversations();

      if (!Array.isArray(response.data)) {
        console.error('Invalid conversations data format:', response.data);
        throw new Error('Invalid conversations data format received from server');
      }

      // Only filter out conversations with no ID — backend handles all other rules
      const validConversations = response.data.filter(conversation => {
        if (!conversation?.id) {
          console.warn('Skipping conversation with missing ID:', conversation);
          return false;
        }
        return true;
      });

      console.log(`Fetched ${validConversations.length} valid conversations`);
      store.dispatch(setConversations(validConversations));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);

      // Don't throw the error to prevent the app from crashing
      // Just log it and dispatch an empty array to clear any stale data
      store.dispatch(setConversations([]));

      // Show error toast to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      store.dispatch({
        type: 'toast/showToast',
        payload: {
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        },
      });
    }
  }

  // Fetch messages for a specific conversation
  public async fetchMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await messagingAPI.getMessages(conversationId);
      store.dispatch(setMessages({ conversationId, messages: response.data }));
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Send a new message
  public async sendMessage(conversationId: string, content: string, recipientId?: string): Promise<Message> {
    const state = store.getState() as RootState;
    const currentUser = state.auth.user;
    const tempId = `temp-${Date.now()}`;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Create a temporary message for optimistic UI update
    const now = new Date().toISOString();
    const tempMessage: Message = {
      id: tempId,
      content,
      sender_id: currentUser.id,
      recipient_id: recipientId || undefined,
      sender_name: currentUser.username || currentUser.email || 'You',
      sender_avatar: currentUser.profile_image,
      is_read: false,
      created_at: now,
      updated_at: now,
      timestamp: now,
      status: 'sending',
      conversation_id: conversationId,
      temp_id: tempId,
    };

    try {
      // Add the temporary message to the store
      store.dispatch(addMessage(tempMessage));

      // Send the message to the server
      const response = await messagingAPI.sendMessage(conversationId, content, recipientId || '');

      // Create the updated message with server response
      const updatedMessage: Message = {
        ...response.data,
        status: 'delivered' as MessageStatus,
        recipient_id: recipientId || response.data.recipient_id,
        temp_id: tempId, // Preserve the temp ID for mapping
      };

      // Update the message in the store
      store.dispatch(updateMessageStatus({
        messageIds: [tempId],
        status: 'delivered',
        // @ts-ignore - Using internal property to update the message
        _update: updatedMessage
      }));

      // Update the conversation's last message
      const conversation = state.chat.conversations[conversationId];
      if (conversation) {
        store.dispatch(updateConversation({
          id: conversationId,
          changes: {
            last_message: {
              ...updatedMessage,
              status: 'delivered' as MessageStatus,
            },
            updated_at: new Date().toISOString(),
          }
        }));
      }

      // Mark as read if it's the current conversation
      if (state.chat.currentConversation === conversationId) {
        await this.markMessagesAsRead(conversationId, [response.data.id]);
      }

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);

      // Update the message status to failed
      store.dispatch(updateMessageStatus({
        messageIds: [tempId],
        status: 'failed',
        // @ts-ignore - Using internal property for error
        _error: error instanceof Error ? error.message : 'Failed to send message'
      }));

      throw error;
    }
  }

  // Mark messages as read
  public async markMessagesAsRead(conversationId: string, messageIds: string[] = []): Promise<void> {
    if (!messageIds.length) return;

    try {
      const state = store.getState() as RootState;
      const currentUserId = state.auth.user?.id;

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Get conversation messages
      const conversationMessages = state.chat.messages[conversationId] || [];

      // If no messageIds provided, find all unread messages in the conversation
      const messagesToMark = messageIds.length > 0
        ? conversationMessages.filter(msg => messageIds.includes(msg.id))
        : conversationMessages.filter(msg => !msg.is_read && msg.sender_id !== currentUserId);

      if (messagesToMark.length === 0) return;

      const messageIdsToUpdate = messagesToMark.map(msg => msg.id);

      // Optimistically update the UI
      store.dispatch(markAsRead({
        conversationId,
        messageIds: messageIdsToUpdate
      }));

      // Update status to 'read' for all messages
      store.dispatch(updateMessageStatus({
        messageIds: messageIdsToUpdate,
        status: 'read',
        // @ts-ignore - conversationId is used in the reducer
        conversationId
      }));

      // Update the last message status in the conversation if needed
      const conversation = state.chat.conversations[conversationId];
      const lastMessageId = conversation?.last_message?.id;

      if (lastMessageId && messageIdsToUpdate.includes(lastMessageId)) {
        store.dispatch(updateConversation({
          id: conversationId,
          changes: {
            last_message: {
              ...conversation.last_message!,
              status: 'read' as MessageStatus,
              is_read: true
            },
            unread_count: 0
          }
        }));
      }

      // Notify the server - using markMessagesAsRead API
      await messagingAPI.markMessagesAsRead(conversationId, messageIdsToUpdate);

    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Revert optimistic update on error (if needed)
      // Note: We're not reverting here as it might cause UI flicker
      // The next data fetch will correct any inconsistencies
      throw error;
    }
  }

  // Update conversation's last message
  private updateConversationLastMessage(conversationId: string, message: Message) {
    store.dispatch(updateConversation({
      id: conversationId,
      changes: {
        last_message: message,
        updated_at: new Date().toISOString()
      }
    }));
  }

  // Update message status
  private updateMessageStatus(messageId: string, status: 'sending' | 'delivered' | 'error', error?: string) {
    store.dispatch(updateMessageStatus({
      messageIds: [messageId],
      status: status as any, // Temporary cast to any to fix type error
      ...(error ? { error } : {})
    }));
  }

  // Start typing indicator
  public startTyping(conversationId: string): void {
    const state = store.getState() as RootState;
    const currentUser = state.auth.user;

    if (!currentUser) return;

    // Clear any existing timeout
    this.stopTyping(conversationId);

    // Set typing status to true
    store.dispatch(setTypingStatus({
      conversationId,
      userId: currentUser.id,
      isTyping: true
    }));

    // Set timeout to stop typing after 3 seconds of inactivity
    this.typingTimeouts[conversationId] = setTimeout(() => {
      this.stopTyping(conversationId);
    }, 3000);
  }

  /**
   * Stop typing indicator
   */
  public stopTyping(conversationId: string): void {
    const state = store.getState() as RootState;
    const currentUser = state.auth.user;

    if (!currentUser) return;

    // Clear the typing timeout if it exists
    if (this.typingTimeouts[conversationId]) {
      clearTimeout(this.typingTimeouts[conversationId]);
      delete this.typingTimeouts[conversationId];
    }

    // Set typing status to false
    store.dispatch(setTypingStatus({
      conversationId,
      userId: currentUser.id,
      isTyping: false
    }));
  }

  /**
   * Send typing indicator to the server
   */
  public async sendTyping(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      const state = store.getState() as RootState;
      const currentUser = state.auth.user;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Update typing status in the store
      store.dispatch(setTypingStatus({
        conversationId,
        userId: currentUser.id,
        isTyping
      }));

      // Use the existing typing indicator endpoint
      await messagingAPI.sendTypingIndicator(conversationId);
    } catch (error) {
      console.error('Error sending typing status:', error);
      throw error;
    }
  }

  /**
   * Update user's online status
   */
  public async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      // Update online status in the store
      store.dispatch(setOnlineStatus({
        userId,
        isOnline
      }));

      // Note: No direct API endpoint for updating online status in the current API
      // This could be implemented later if needed
      console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read (alias for markMessagesAsRead)
   */
  public async markAsRead(conversationId: string, messageIds?: string[]): Promise<void> {
    return this.markMessagesAsRead(conversationId, messageIds || []);
  }

  /**
   * Get or create a conversation with a participant
   */
  public async getOrCreateConversation(participantId: string): Promise<Conversation> {
    try {
      const response = await messagingAPI.getOrCreateConversation(participantId);
      const conversation = response.data;

      // Add to store
      store.dispatch(addConversation(conversation));

      return conversation;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  }

  /**
   * Cleanup method for component unmounting
   */
  public cleanup(): void {
    // Clear any timeouts or intervals if needed
    console.log('ChatService cleanup called');
    this.destroy();
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = undefined;
    }
  }
}

// Create and export a singleton instance of the ChatService
const chatService = new ChatService();

export default chatService;
