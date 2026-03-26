import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import notificationReducer from './slices/notificationSlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    notification: notificationReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['chat/addMessage', 'chat/setTypingStatus'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.last_message.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['chat.messages', 'chat.conversations'],
      },
    }),
});

// Infer the RootState type from the store itself
export type RootState = ReturnType<typeof store.getState>;

// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;