import React from 'react';
import { Conversation } from '@/store/slices/chatSlice';
import StatusIndicator from './StatusIndicator';

interface UserInfo {
  id: string;
  full_name?: string;
  profile_image?: string | null;
  isOnline?: boolean;
}

interface ChatHeaderProps {
  conversation: Conversation;
  otherUser: UserInfo | null;
  onBack?: () => void;
  isLoading?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  conversation, 
  otherUser, 
  onBack,
  isLoading = false 
}) => {
  if (isLoading || !otherUser) {
    return (
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-4 py-2 border-b border-gray-200">
        <div className="animate-pulse flex items-center gap-3 w-full">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-4 py-2 border-b border-gray-200">
      {onBack && (
        <button
          onClick={onBack}
          className="mr-2 text-gray-600 hover:text-gray-800 focus:outline-none md:hidden"
          aria-label="Go back"
        >
          ←
        </button>
      )}
      <div className="flex flex-col">
        <span className="font-medium leading-tight flex items-center gap-2">
          {otherUser?.full_name || 'Unknown User'}
          <StatusIndicator isOnline={!!otherUser?.isOnline} />
        </span>
      </div>
    </header>
  );
};

export default ChatHeader;
