import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Message } from '@/store/slices/chatSlice';
import { MoreVertical, Edit, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StatusIcon from './StatusIcon';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'failed';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onRetry?: (msg: Message) => void;
  onEdit?: (msg: Message, newContent: string) => void;
  onDelete?: (msg: Message) => void;
  isEditing?: string | null;
  onStartEdit?: (msg: Message) => void;
  onCancelEdit?: () => void;
  currentUserId?: string;
}

const getTimeString = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return !isNaN(date.getTime())
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
};

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  onRetry,
  onEdit,
  onDelete,
  isEditing,
  onStartEdit,
  onCancelEdit,
  currentUserId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isBeingEdited = isEditing === message.id;

  // Focus input when editing starts
  useEffect(() => {
    if (isBeingEdited && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const length = editContent.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isBeingEdited, editContent.length]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message, editContent);
    } else {
      onCancelEdit?.();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit?.(message);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete?.(message);
    }
  };

  if (isBeingEdited) {
    return (
      <form onSubmit={handleEditSubmit} className="w-full px-2 py-1">
        <div className="flex flex-col items-end gap-2">
          <div className="w-full">
            <textarea
              ref={inputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={Math.min(5, editContent.split('\n').length + 1)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEditSubmit(e);
                } else if (e.key === 'Escape') {
                  onCancelEdit?.();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCancelEdit?.()}
              className="h-8"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8">
              Save
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div
      className={clsx('group flex w-full items-end gap-3 mb-4', {
        'justify-end': isOwn,
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
          {message.sender_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      )}
      
      {/* Bubble */}
      <div className="max-w-xs md:max-w-md lg:max-w-lg relative">
        <div
          className={clsx(
            'rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap transition-all duration-200 shadow-lg backdrop-blur-sm',
            {
              'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-200/50': isOwn,
              'bg-white/90 text-emerald-900 border border-emerald-100/50 shadow-emerald-100/30': !isOwn,
              'rounded-br-md': isOwn,
              'rounded-bl-md': !isOwn,
            }
          )}
        >
          <p className="leading-relaxed">{message.content}</p>
          
          {/* Message timestamp and status */}
          <div className={clsx('flex items-center justify-end mt-2 text-xs', {
            'text-white/80': isOwn,
            'text-emerald-600/70': !isOwn,
          })}>
            <span className="mr-2">{getTimeString(message.created_at)}</span>
            {isOwn && <StatusIcon status={message.status} />}
          </div>
        </div>
        
        {/* Enhanced Message actions menu */}
        {isOwn && isHovered && (
          <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl bg-white/95 hover:bg-white text-emerald-600 shadow-lg border border-emerald-100/50 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Message actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white/95 backdrop-blur-xl border-emerald-200/50 shadow-xl">
                <DropdownMenuItem 
                  onClick={handleEditClick}
                  className="cursor-pointer text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50"
                >
                  <Edit className="mr-3 h-4 w-4" />
                  <span className="font-medium">Edit message</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50"
                >
                  <Trash2 className="mr-3 h-4 w-4" />
                  <span className="font-medium">Delete message</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* Status & time */}
        <div className={clsx("flex items-center gap-1 mt-0.5", {
          'justify-end': isOwn,
          'justify-start': !isOwn,
        })}>
          <div className="flex items-center gap-1">
            {isOwn && (
              <StatusIcon 
                status={message.status === 'error' ? 'failed' : (message.status || 'sent')} 
                size={14} 
                timestamp={message.updated_at || message.created_at}
                className={message.status === 'error' ? 'text-red-500' : 'text-gray-400'} 
              />
            )}
            
            <span className={clsx("text-xs", {
              'text-gray-400': !isOwn,
              'text-blue-100': isOwn,
            })}>
              {getTimeString(message.updated_at || message.created_at)}
              {message.is_edited && ' • Edited'}
            </span>
          </div>
          
          {isOwn && message.status === 'error' && (
            <button
              className="ml-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(message);
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Spacer for alignment when own message (no avatar) */}
      {isOwn && <div className="w-8" />}
    </div>
  );
};

export default ChatBubble;
