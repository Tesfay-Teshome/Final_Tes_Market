import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import chatService from '@/services/chatService';
import { 
  Conversation, 
  Message, 
  setCurrentConversation, 
  markAsRead as markAsReadAction,
  setTypingStatus as setTypingStatusAction,
  addMessage as addMessageAction
} from '@/store/slices/chatSlice';

type TypingTimeoutRef = Record<string, NodeJS.Timeout>;

export const useChat = () => {
  const dispatch = useDispatch();
  const { conversations, messages, currentConversation, onlineUsers, isConnected } = useSelector((state: RootState & { chat: { 
    conversations: Conversation[];
    messages: Array<{ conversationId: string; messages: Message[] }>;
    currentConversation: string | null;
    onlineUsers: Record<string, boolean>;
    isConnected: boolean;
  } }) => state.chat);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const typingTimeoutRef = useRef<TypingTimeoutRef>({});

  // Initialize chat service
  useEffect(() => {
    // Load conversations when component mounts
    chatService.fetchConversations().catch(console.error);

    // Cleanup on unmount
    return () => {
      chatService.cleanup();
    };
  }, []);

  // Fetch messages when current conversation changes
  useEffect(() => {
    if (currentConversation) {
      chatService.fetchMessages(currentConversation).catch(console.error);
      
      // Mark messages as read when opening a conversation
      const conversationMessages = messages.find((m) => m.conversationId === currentConversation)?.messages || [];
      const unreadMessages = conversationMessages.filter(
        (msg) => !msg.is_read && msg.sender !== currentUser?.id
      );
      
      if (unreadMessages.length > 0 && currentConversation) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        dispatch(markAsReadAction({ conversationId: currentConversation, messageIds }));
        chatService.markAsRead(currentConversation, messageIds).catch(console.error);
      }
    }
  }, [currentConversation]);

  // Get messages for current conversation
  const getCurrentMessages = useCallback((): Message[] => {
    if (!currentConversation) return [];
    return messages.find((m) => m.conversationId === currentConversation)?.messages || [];
  }, [currentConversation, messages]);

  // Get current conversation data
  const getCurrentConversation = useCallback((): Conversation | undefined => {
    if (!currentConversation) return undefined;
    return conversations.find((c) => c.id === currentConversation);
  }, [currentConversation, conversations]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation || !content.trim()) return;
    
    try {
      const now = new Date().toISOString();
      const message: Message = {
        id: `temp-${Date.now()}`,
        content,
        conversation_id: currentConversation,
        sender_id: currentUser?.id || '',
        sender_name: currentUser?.username || currentUser?.email || 'You',
        sender_avatar: currentUser?.profile_image,
        sender: currentUser?.id ? { 
          id: currentUser.id,
          email: currentUser.email,
          profile_image: currentUser.profile_image
        } : undefined,
        timestamp: now,
        created_at: now,
        updated_at: now,
        is_read: false,
        status: 'sending' as const
      };
      
      // Optimistically add message to state
      dispatch(addMessageAction(message));
      
      // Mark as read
      dispatch(markAsReadAction({ conversationId: currentConversation, messageIds: [message.id] }));
      
      // Send via chat service
      await chatService.sendMessage(currentConversation, content);
      
      // The actual message from server will replace the temp one via WebSocket
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [currentConversation, currentUser?.id, dispatch]);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!currentConversation || !currentUser?.id) return;
    
    // Update local state
    dispatch(setTypingStatusAction({
      userId: currentUser.id,
      conversationId: currentConversation,
      isTyping
    }));
    
    // Send typing status via chat service
    chatService.sendTyping(currentConversation, isTyping);
    
    // Clear any existing timeout
    if (typingTimeoutRef.current[currentConversation]) {
      clearTimeout(typingTimeoutRef.current[currentConversation]);
      delete typingTimeoutRef.current[currentConversation];
    }
    
    // Set a timeout to automatically stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current[currentConversation] = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  }, [currentConversation, currentUser?.id, dispatch]);

  // Get typing users for current conversation
  const getTypingUsers = useCallback((): string[] => {
    if (!currentConversation) return [];
    const conversation = conversations.find(c => c.id === currentConversation);
    if (!conversation || !conversation.typingUsers) return [];
    return conversation.typingUsers.filter((id: string) => id !== currentUser?.id);
  }, [currentConversation, conversations, currentUser]);

  // Check if a user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return !!onlineUsers[userId];
  }, [onlineUsers]);

  // Get unread count for a conversation
  const getUnreadCount = useCallback((conversationId: string): number => {
    const conversation = conversations.find(c => c.id === conversationId);
    return conversation?.unread_count || 0;
  }, [conversations]);

  // Get total unread count
  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce<number>(
      (total, conv) => total + (conv.unread_count || 0), 0
    );
  }, [conversations]);

  // Create or switch to a conversation
  const startConversation = useCallback(async (participantId: string): Promise<void> => {
    try {
      const conversation = await chatService.getOrCreateConversation(participantId);
      dispatch(setCurrentConversation(conversation.id));
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    // State
    conversations,
    messages: getCurrentMessages(),
    currentConversation: getCurrentConversation(),
    currentConversationId: currentConversation,
    isConnected,
    
    // Actions
    sendMessage,
    setTyping,
    startConversation,
    setCurrentConversation: (conversationId: string | null) => 
      dispatch(setCurrentConversation(conversationId)),
    markAsRead: (messageIds?: string[]) => 
      currentConversation && chatService.markAsRead(currentConversation, messageIds),
    
    // Getters
    getTypingUsers,
    isUserOnline,
    getUnreadCount,
    getTotalUnreadCount,
  };
};
