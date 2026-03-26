import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  timestamp: string;
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  is_read: boolean;
  is_edited?: boolean;
  created_at: string;
  updated_at: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'failed';
  conversation_id: string;
  recipient_id?: string;
  error?: string;
  temp_id?: string;
  sender?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    profile_image?: string;
  };
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  is_online?: boolean;
  typingUsers?: string[];
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  currentConversation: string | null;
  onlineUsers: Record<string, boolean>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  conversations: {},
  messages: {},
  currentConversation: null,
  onlineUsers: {},
  isConnected: false,
  isLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    updateConversation(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Conversation>;
      }>
    ) {
      const { id, changes } = action.payload;
      if (state.conversations[id]) {
        state.conversations[id] = {
          ...state.conversations[id],
          ...changes,
        };
      }
    },
    
    updateMessage(
      state,
      action: PayloadAction<{
        messageId: string;
        conversationId: string;
        changes: Partial<Message>;
      }>
    ) {
      const { messageId, conversationId, changes } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          messages[messageIndex] = {
            ...messages[messageIndex],
            ...changes,
          };
        }
      }
    },
    setConversations(state, action: PayloadAction<Conversation[]>) {
      const conversations: Record<string, Conversation> = {};
      action.payload.forEach(conv => {
        conversations[conv.id] = conv;
      });
      state.conversations = conversations;
    },
    
    addConversation(state, action: PayloadAction<Conversation>) {
      const conversation = action.payload;
      state.conversations[conversation.id] = conversation;
      
      // Initialize messages array if it doesn't exist
      if (!state.messages[conversation.id]) {
        state.messages[conversation.id] = [];
      }
    },
    
    setCurrentConversation(state, action: PayloadAction<string | null>) {
      state.currentConversation = action.payload;
    },
    
    setMessages(state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
      
      // Update last message in conversation
      if (messages.length > 0 && state.conversations[conversationId]) {
        state.conversations[conversationId].last_message = messages[messages.length - 1];
      }
    },
    
    addMessage(state, action: PayloadAction<Message>) {
      const message = action.payload;
      const conversationId = message.conversation_id;
      
      // Add message to messages array
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      // Check if message already exists
      const messageExists = state.messages[conversationId].some(m => m.id === message.id);
      if (!messageExists) {
        state.messages[conversationId].push(message);
        
        // Update last message in conversation
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].last_message = message;
          
          // Increment unread count if not current conversation
          if (state.currentConversation !== conversationId) {
            state.conversations[conversationId].unread_count = 
              (state.conversations[conversationId].unread_count || 0) + 1;
          }
        }
      }
    },
    
    updateMessageStatus: (state, action: PayloadAction<{ 
      messageIds: string[]; 
      status: Message['status'];
      _update?: Partial<Message>;
      _error?: string;
    }>) => {
      const { messageIds, status, _update, _error } = action.payload;
      const now = new Date().toISOString();
      
      // Update messages in conversations
      Object.values(state.conversations).forEach(conversation => {
        // Update last message if needed
        if (conversation.last_message && messageIds.includes(conversation.last_message.id)) {
          conversation.last_message = {
            ...conversation.last_message,
            status,
            ...(_update || {}),
            updated_at: now,
            ...(_error ? { error: _error } : {})
          };
        }
      });
      
      // Update individual messages
      messageIds.forEach(messageId => {
        // Find the conversation containing this message
        const conversationId = Object.keys(state.messages).find(id => 
          state.messages[id].some(msg => msg.id === messageId || msg.temp_id === messageId)
        );
        
        if (conversationId) {
          const messageIndex = state.messages[conversationId].findIndex(
            msg => msg.id === messageId || msg.temp_id === messageId
          );
          
          if (messageIndex !== -1) {
            const currentMessage = state.messages[conversationId][messageIndex];
            
            // Update the message with new status and any additional updates
            state.messages[conversationId][messageIndex] = {
              ...currentMessage,
              status,
              ...(_update || {}),
              updated_at: now,
              ...(_error ? { error: _error } : {})
            };
            
            // If this was a temporary message that now has a real ID, update its ID
            if (_update?.id && currentMessage.temp_id) {
              state.messages[conversationId][messageIndex].id = _update.id;
              delete state.messages[conversationId][messageIndex].temp_id;
            }
          }
        }
      });
    },
    
    setOnlineStatus(state, action: PayloadAction<{ userId: string; isOnline: boolean }>) {
      const { userId, isOnline } = action.payload;
      state.onlineUsers[userId] = isOnline;
    },
    
    setTypingStatus(state, action: PayloadAction<{ userId: string; conversationId: string; isTyping: boolean }>) {
      const { userId, conversationId, isTyping } = action.payload;
      const conversation = state.conversations[conversationId];
      
      if (conversation) {
        if (isTyping) {
          // Add to typing users if not already present
          if (!conversation.typingUsers) {
            conversation.typingUsers = [];
          }
          if (!conversation.typingUsers.includes(userId)) {
            conversation.typingUsers.push(userId);
          }
        } else {
          // Remove from typing users
          if (conversation.typingUsers) {
            conversation.typingUsers = conversation.typingUsers.filter(id => id !== userId);
          }
        }
      }
    },
    
    markAsRead(state, action: PayloadAction<{ conversationId: string; messageIds?: string[] }>) {
      const { conversationId, messageIds } = action.payload;
      
      if (state.messages[conversationId]) {
        // Mark specific messages as read
        if (messageIds && messageIds.length > 0) {
          state.messages[conversationId] = state.messages[conversationId].map(msg => {
            if (messageIds.includes(msg.id) && !msg.is_read) {
              return { ...msg, is_read: true, status: 'read' as const };
            }
            return msg;
          });
        } else {
          // Mark all messages in conversation as read
          state.messages[conversationId] = state.messages[conversationId].map(msg => ({
            ...msg,
            is_read: true,
            status: 'read' as const
          }));
        }
        
        // Update unread count
        if (state.conversations[conversationId]) {
          state.conversations[conversationId].unread_count = 0;
          
          // Update last message if needed
          const messages = state.messages[conversationId];
          if (messages.length > 0 && state.conversations[conversationId].last_message) {
            const lastMessage = messages[messages.length - 1];
            state.conversations[conversationId].last_message = {
              ...state.conversations[conversationId].last_message!,
              is_read: true
            };
          }
        }
      }
    },
    
    setConnectionStatus(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    resetChatState() {
      return initialState;
    }
  }
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  setCurrentConversation,
  setMessages,
  addMessage,
  updateMessageStatus,
  setOnlineStatus,
  setTypingStatus,
  markAsRead,
  setConnectionStatus,
  setLoading,
  setError,
  resetChatState
} = chatSlice.actions;

export default chatSlice.reducer;
