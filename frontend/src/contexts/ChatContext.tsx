import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
// Import the chat service instance and its type
import { chatService, IChatService } from '@/services';

// Type assertion for the chat service instance
const typedChatService = chatService as unknown as IChatService;
import { 
  setConnectionStatus, 
  setOnlineStatus, 
  addMessage, 
  setTypingStatus,
  markAsRead as markAsReadAction,
  setCurrentConversation,
  Message
} from '@/store/slices/chatSlice';

// Define TypingStatus type since it's not exported from chatSlice
interface TypingStatus {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

import * as api from '@/services/api';

interface ChatContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string, messageIds?: string[]) => Promise<void>;
  updateOnlineStatus: (userId: string, isOnline: boolean) => void;
  startConversation: (participantId: string) => Promise<{
    id: string;
    participants: Array<{
      id: string;
      username: string;
      email: string;
      profile_image?: string;
    }>;
    last_message?: any;
    unread_count?: number;
    created_at: string;
    updated_at: string;
  }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isConnected = useSelector((state: RootState & { chat: { isConnected: boolean } }) => state.chat?.isConnected || false);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const currentConversation = useSelector((state: RootState & { chat: { currentConversation: string | null } }) => 
    state.chat?.currentConversation
  );
  const initializedRef = useRef(false);

  // Polling interval in milliseconds
  const POLLING_INTERVAL = 30000; // 30 seconds
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Start polling for new messages
  const startPolling = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    const intervalId = setInterval(async () => {
      if (!currentUser?.id) return;
      
      try {
        // Fetch latest conversations to check for new messages
        await typedChatService.fetchConversations();
        
        // If we have an active conversation, fetch its messages
        if (currentConversation) {
          await typedChatService.fetchMessages(currentConversation);
        }
      } catch (error: unknown) {
        console.error('Error during polling:', error);
      }
    }, POLLING_INTERVAL);

    setPollingIntervalId(intervalId);
    return intervalId;
  }, [currentUser?.id, currentConversation]);

  // Initialize polling
  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Initialize connection
    dispatch(setConnectionStatus(true));
    
    // Start polling
    const intervalId = startPolling();
    
    // Clean up on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      dispatch(setConnectionStatus(false));
    };
  }, [currentUser?.id, currentConversation, startPolling, dispatch]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string, messageIds: string[] = []) => {
    if (!conversationId) return;
    
    try {
      // Optimistically update the local state
      dispatch(markAsReadAction({ 
        conversationId, 
        messageIds: messageIds.length > 0 ? messageIds : undefined 
      }));
      
      // Notify the server via REST API
      await api.messagingAPI.markMessagesAsRead(conversationId, messageIds);
      
      // Refresh conversations to update unread counts
      await typedChatService.fetchConversations();
    } catch (error: unknown) {
      console.error('Failed to mark messages as read:', error);
      // Optionally, you could revert the optimistic update here
    }
  }, [dispatch, chatService]);

  // Handle new messages from the server
  const handleNewMessage = useCallback((message: Message) => {
    dispatch(addMessage(message));
    
    // Auto-mark as read if it's the current conversation and message is from another user
    if (currentConversation === message.conversation_id && 
        message.sender_id !== currentUser?.id) {
      markAsRead(message.conversation_id, [message.id]);
    }
  }, [currentConversation, currentUser?.id, dispatch, markAsRead]);

  // Handle typing status updates
  const handleTypingStatus = useCallback(({ userId, conversationId, isTyping }: TypingStatus) => {
    if (conversationId && userId) {
      dispatch(setTypingStatus({
        userId,
        conversationId,
        isTyping
      }));
    }
  }, [dispatch]);

  // Handle user status updates
  const handleUserStatus = useCallback(({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
    if (userId) {
      dispatch(setOnlineStatus({ userId, isOnline }));
    }
  }, [dispatch]);



  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!content.trim() || !conversationId) return;
    
    try {
      // Send message via chat service (which uses REST API)
      await typedChatService.sendMessage(conversationId, content);
      
      // Immediately fetch latest messages to ensure UI is up to date
      await typedChatService.fetchMessages(conversationId);
    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  const sendTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!conversationId || !currentUser?.id) return;
    
    try {
      // Update local state immediately for better UX
      handleTypingStatus({
        userId: currentUser.id,
        conversationId,
        isTyping
      });
      
      // Notify server about typing status
      await typedChatService.sendTyping(conversationId, isTyping);
    } catch (error: unknown) {
      console.error('Failed to send typing status:', error);
    }
  }, [currentUser?.id, handleTypingStatus]);

  const startConversation = useCallback(async (participantId: string) => {
    if (!participantId) {
      throw new Error('Participant ID is required');
    }
    
    try {
      const response = await api.messagingAPI.getOrCreateConversation(participantId);
      if (response?.data?.id) {
        dispatch(setCurrentConversation(response.data.id));
        return response.data;
      }
      throw new Error('Failed to create conversation: Invalid response format');
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }, [dispatch]);

  const updateOnlineStatus = useCallback((userId: string, isOnline: boolean) => {
    if (!userId) return;
    
    // Update local state
    handleUserStatus({ userId, isOnline });
    
    // Notify server about online status
    typedChatService.updateOnlineStatus(userId, isOnline).catch((error: unknown) => {
      console.error('Failed to update online status:', error);
    });
  }, [handleUserStatus]);

  // Connect and disconnect functions for the context value
  const connect = useCallback(() => {
    dispatch(setConnectionStatus(true));
  }, [dispatch]);

  const disconnect = useCallback(() => {
    dispatch(setConnectionStatus(false));
  }, [dispatch]);

  return (
    <ChatContext.Provider
      value={{
        isConnected,
        connect,
        disconnect,
        sendMessage,
        sendTyping,
        markAsRead,
        updateOnlineStatus,
        startConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
