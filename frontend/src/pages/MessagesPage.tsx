import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Menu, Loader2, ArrowLeft, Search, X, Smile, Paperclip, MoreHorizontal, Pencil, Trash2, Settings, Users, Clock, Star, Bell } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useToast } from '@/components/ui/use-toast';
import { useAppSelector } from '@/lib/hooks';
import api, { messagingAPI, adminAPI, authAPI, buildApiUrl, resolveMediaUrl } from '@/services/api';
import { User as BaseUser, Conversation, Message } from '@/types/user';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import MessageSettings from '@/components/messaging/MessageSettings';

// Extend the User type to include display_name
type User = BaseUser & {
  display_name?: string;
  avatar?: string;
  image?: string;
  is_online?: boolean;
  username?: string;
};

// Helper function to get user initials from user object
const getUserInitials = (user?: User | null): string => {
  if (!user) return ''; // Empty string falls back to Avatar's default
  
  // Try to get from first and last name
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  
  // Fallback to full name if available
  if (user.full_name) {
    const names = user.full_name.split(' ').filter(Boolean);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
  }
  
  // Fallback to email or empty string (will use Avatar's default)
  return user.email?.[0]?.toUpperCase() || '';
};

// Get avatar URL with fallback
const getAvatarUrl = (user?: User | null): string | undefined => {
  if (!user) return undefined;
  const imageUrl = user.profile_image || user.avatar || user.image;
  return resolveMediaUrl(imageUrl);
};

// Get user's full name with fallbacks
const getFullName = (user?: User | null): string => {
  if (!user) return 'Unknown User';
  
  if (user.full_name) return user.full_name;
  if (user.username) return user.username;
  if (user.email) return user.email.split('@')[0];
  
  return 'Unknown User';
};

// Get user type display
const getUserTypeDisplay = (user?: User | null): string => {
  if (!user?.user_type) return '';
  
  const types: Record<string, string> = {
    vendor: 'Vendor',
    buyer: 'Buyer',
    administrator: 'Admin'
  };
  return types[user.user_type] || user.user_type;
};

// Get user status text
const getUserStatus = (user?: User | null): string => {
  if (!user) return 'Offline';
  if (user.is_online) return 'Online';
  
  if (user.last_seen) {
    return `Last seen ${formatDistanceToNow(new Date(user.last_seen))} ago`;
  }
  return 'Offline';
};

// Get user status color
const getUserStatusColor = (user?: User | null): string => {
  if (!user) return 'gray';
  return user.is_online ? 'green' : 'gray';
};

function MessagesPage() {
  // Hooks
  const { toast } = useToast();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, loading: authLoading } = useAppSelector((state) => state.auth);

  // State
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingOriginalContent, setEditingOriginalContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!(window.innerWidth < 768));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | number | null>(null);
  
  // File attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('msg_notify_enabled') === '1'; } catch { return false; }
  });
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastNotifiedMessageId = useRef<string | number | null>(null);
  const inputRafRef = useRef<number | null>(null);
  const BASE_INPUT_HEIGHT = 36; // px – matches min-h

  const resizeComposer = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newH = Math.min(ta.scrollHeight, 200);
    ta.style.height = `${Math.max(BASE_INPUT_HEIGHT, newH)}px`;
  }, []);

  // Compress image to speed up sending
  const compressImageFile = useCallback((file: File, maxDim = 1280, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const scale = Math.min(1, maxDim / Math.max(width, height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(e.target?.result as string);
            ctx.drawImage(img, 0, 0, width, height);
            const out = canvas.toDataURL('image/jpeg', quality);
            resolve(out);
          };
          img.onerror = () => resolve(e.target?.result as string);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err as Error);
      }
    });
  }, []);

  // Feature flag: allow disabling WebSocket via env. Set VITE_WS_ENABLED=true to enable.
  const WS_ENABLED = ((import.meta as any).env?.VITE_WS_ENABLED || '').toString().toLowerCase() === 'true';


  // Mutations for editing and deleting messages (must be inside component)
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return messagingAPI.updateMessage(id, { content });
    },
    onMutate: async ({ id, content }) => {
      if (!conversationId) return;
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const previous = queryClient.getQueryData<Message[]>(['messages', conversationId]) || [];

      // Optimistic update of the message content
      queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) =>
        old.map(m => (String(m.id) === String(id) ? { ...m, content, updated_at: new Date().toISOString() } : m))
      );

      // If edited message is the conversation's last_message, update it there too
      queryClient.setQueryData<Conversation[]>(['conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (conv.id === conversationId && conv.last_message && String(conv.last_message.id) === String(id)) {
            const updated = { ...conv, last_message: { ...conv.last_message, content, updated_at: new Date().toISOString() } } as Conversation;
            return updated;
          }
          return conv;
        });
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!conversationId) return;
      // Revert on error
      if (ctx?.previous) {
        queryClient.setQueryData(['messages', conversationId], ctx.previous);
      } else {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    },
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Message updated' });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ id }: { id: string | number }) => {
      if (!conversationId) throw new Error('No conversation id');
      return messagingAPI.deleteMessage(conversationId, String(id));
    },
    onMutate: async ({ id }) => {
      if (!conversationId) return;
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const previous = queryClient.getQueryData<Message[]>(['messages', conversationId]) || [];

      // Remove the message optimistically
      const next = (previous || []).filter(m => String(m.id) !== String(id));
      queryClient.setQueryData<Message[]>(['messages', conversationId], next);

      // If the deleted message was last_message, recompute to previous latest
      const newLast = next.length ? next[next.length - 1] : undefined;
      queryClient.setQueryData<Conversation[]>(['conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) => (conv.id === conversationId ? ({ ...conv, last_message: newLast } as Conversation) : conv));
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!conversationId) return;
      if (ctx?.previous) {
        queryClient.setQueryData(['messages', conversationId], ctx.previous);
      } else {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
      toast({ title: 'Failed to delete message', variant: 'destructive' });
    },
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Message deleted' });
    }
  });

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingOriginalContent(msg.content || '');
    setMessage(msg.content || '');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingOriginalContent('');
    setMessage('');
  };

  // Close message action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Any click outside will close the open menu
      if (actionMenuOpenId !== null) setActionMenuOpenId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuOpenId]);

  // When opening/viewing a conversation, mark its unread_count as 0 in cache
  useEffect(() => {
    if (!conversationId) return;
    queryClient.setQueryData<Conversation[]>(['conversations'], (old) => {
      if (!old) return old;
      return old.map((c) => (c.id === conversationId ? ({ ...c, unread_count: 0 } as Conversation) : c));
    });
  }, [conversationId]);
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView);
    };

    // Close emoji picker when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch users based on user type
  const { data: availableUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['messaging-users', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      try {
        let users: User[] = [];
        let response;
        
        // For buyers, show approved vendors
        if (currentUser.user_type === 'buyer') {
          response = await adminAPI.getUsers({ 
            user_type: 'vendor',
            status: 'approved'
          });
          users = Array.isArray(response.data) ? response.data : [];
        } 
        // For vendors, show admins
        else if (currentUser.user_type === 'vendor') {
          response = await adminAPI.getUsers({ 
            user_type: 'administrator'
          });
          users = Array.isArray(response.data) ? response.data : [];
        }
        // For admins, show all vendors and other admins
        else {
          const [vendorsResponse, adminsResponse] = await Promise.all([
            adminAPI.getUsers({ user_type: 'vendor' }),
            adminAPI.getUsers({ user_type: 'administrator' })
          ]);
          
          const allUsers = [
            ...(Array.isArray(vendorsResponse.data) ? vendorsResponse.data : []),
            ...(Array.isArray(adminsResponse.data) ? adminsResponse.data : [])
          ];
          
          // Remove duplicates and current user
          const userMap = new Map();
          allUsers.forEach(user => {
            if (user.id !== currentUser.id) {
              userMap.set(user.id, user);
            }
          });
          
          users = Array.from(userMap.values());
        }
        
        return users.filter(user => user.is_active !== false);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load users. Please try again.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!currentUser,
    refetchOnWindowFocus: false,
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!availableUsers) return [];
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return availableUsers;
    
    return availableUsers.filter((user: User) => {
      const nameMatch = user.full_name?.toLowerCase().includes(query) || false;
      const emailMatch = user.email?.toLowerCase().includes(query) || false;
      const storeMatch = user.store_name?.toLowerCase().includes(query) || false;
      return nameMatch || emailMatch || storeMatch;
    });
  }, [availableUsers, searchQuery]);
  
  // Fetch conversations with enhanced error handling and logging
  const { 
    data: conversations = [],
    refetch: refetchConversations,
    isLoading: isLoadingConversations,
    error: conversationsError
  } = useQuery<Conversation[]>({
    queryKey: ['conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        return [];
      }
      
      
      try {
        const response = await messagingAPI.getConversations();
        
        // Ensure we have valid response data
        if (!response?.data || !Array.isArray(response.data)) {
          toast({
            title: 'Error',
            description: 'Received invalid conversations data from server',
            variant: 'destructive',
          });
          return [];
        }
        
        
        // Filter conversations to only include those where current user is a participant
        const filteredConversations = response.data.filter(conversation => {
          try {
            // Skip if conversation is invalid or has no participants
            if (!conversation?.id) {
              return false;
            }
            
            if (!conversation.participants || !Array.isArray(conversation.participants)) {
              return false;
            }
            
            // Skip if not a direct message
            if (conversation.is_group) {
              return false;
            }
            
            // Ensure we have exactly 2 participants for direct messages
            const participants = Array.isArray(conversation.participants) 
              ? conversation.participants 
              : [];
              
            if (participants.length !== 2) {
              return false;
            }
            
            // Check if current user is a participant in this conversation
            const isParticipant = participants.some((participant: unknown) => {
              try {
                const participantId = participant && typeof participant === 'object' && 'id' in participant 
                  ? (participant as { id: string }).id 
                  : participant;
                
                if (!participantId) {
                  return false;
                }
                
                const isMatch = String(participantId) === String(currentUser.id);
                return isMatch;
              } catch (e) {
                return false;
              }
            });
            
            
            return isParticipant;
          } catch (e) {
            return false;
          }
        });
        
        
        
        return filteredConversations;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        toast({
          title: 'Error',
          description: `Failed to load conversations: ${errorMessage}. Will retry...`,
          variant: 'destructive',
        });
        
        throw error; // Let React Query handle retry
      }
    },
    refetchInterval: 10000, // Poll every 10 seconds
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!currentUser?.id,
  });

  const unreadTotal = useMemo(() => {
    try {
      return (conversations || []).reduce((sum: number, c: any) => sum + (c?.unread_count || 0), 0);
    } catch {
      return 0;
    }
  }, [conversations]);

  // Fetch messages for the current conversation with proper typing and polling
  const { 
    data: messagesData = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
    error: messagesError
  } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return [];
      }
      
      try {
        const response = await messagingAPI.getMessages(conversationId);
        
        // Validate response format
        if (!response?.data || !Array.isArray(response.data)) {
          return [];
        }
        
        // Process and validate each message - be more permissive with validation
        const validMessages = response.data.filter((msg): msg is Message => {
          if (!msg || typeof msg !== 'object') {
            return false;
          }
          
          // Basic validation for required fields
          const hasValidId = typeof msg.id === 'string' || typeof msg.id === 'number';
          const hasValidContent = typeof msg.content === 'string';
          
          // Log detailed validation info for debugging
          if (!hasValidId || !hasValidContent) {
            return false;
          }
          
          return true;
        });
        
        return validMessages;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        toast({
          title: 'Error',
          description: `Failed to load messages: ${errorMessage}. Will retry...`,
          variant: 'destructive',
        });
        
        // Re-throw to let React Query handle retry
        throw error;
      }
    },
    enabled: !!conversationId,
    refetchInterval: 10000, // Poll every 10 seconds
    refetchIntervalInBackground: true, // Continue polling when tab is in background
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5000, // Consider data fresh for 5 seconds
  });
  
  // Use the messages from React Query
  const messages = messagesData;

  const scrollToBottom = useCallback(() => {
    try {
      const el = messagesContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    } catch {}
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.length, isSending, scrollToBottom]);

  // Ensure body doesn't keep previous scroll position when switching conversations
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const id = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(id);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    try { localStorage.setItem('msg_notify_enabled', notifyEnabled ? '1' : '0'); } catch {}
  }, [notifyEnabled]);


  // Helper function to get user display name
  const getUserDisplayName = (user: User): string => {
    // Ensure we're always returning a string
    const name = [
      user.full_name,
      user.username,
      user.email?.split('@')[0],
      'User'
    ].find(Boolean);
    
    return typeof name === 'string' ? name : 'User';
  };

  // Helper function to get user initials
  const getUserInitials = (user?: User | null): string => {
    // Use first letter of email or empty string (handled by Avatar component)
    const name = user?.full_name || user?.username || (user?.email ? user.email[0].toUpperCase() : '');
    return name
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Helper function to get user type display
  const getUserTypeDisplay = (user: User): string => {
    if (!user.user_type) return '';
    return user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1);
  };

  // Get other participant from conversation
  const otherParticipant = useMemo(() => {
    if (!currentUser?.id) return null;
    
    // If we have a selected participant from the user list, use that
    if (selectedParticipant) {
      return selectedParticipant;
    }
    
    // Otherwise, try to find from the current conversation
    if (!conversationId || !conversations) return null;
    
    // Find the current conversation
    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    if (!conversation) return null;
    
    // Handle both cases where participants might be objects or just IDs
    const otherParticipant = conversation.participants?.find((p: unknown) => {
      // If participant is an object with an id property
      if (p && typeof p === 'object' && 'id' in p) {
        return (p as { id: string }).id !== currentUser.id;
      }
      // If participant is just an ID
      return p !== currentUser.id;
    });
    
    if (!otherParticipant) return null;
    
    // If otherParticipant is just an ID, find the full user object from availableUsers
    if (typeof otherParticipant === 'string') {
      return availableUsers?.find((u: User) => u.id === otherParticipant) || null;
    }
    
    return otherParticipant as User;
  }, [conversationId, conversations, currentUser, availableUsers, selectedParticipant]);

  // Additional details for other participant (fetch if missing image)
  const [otherDetails, setOtherDetails] = useState<User | null>(null);

  const enrichedOtherParticipant = useMemo(() => {
    if (!otherParticipant) return null;
    return { ...otherParticipant, ...otherDetails } as User;
  }, [otherParticipant, otherDetails]);

  // WebSocket connection to mark presence online and receive live status
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryRef = useRef<number>(0);
  useEffect(() => {
    // Only connect when enabled and a conversation is open
    if (!WS_ENABLED || !conversationId) return;

    const buildUrl = (accessToken: string) => {
      const explicit = (import.meta as any).env?.VITE_WS_URL as string | undefined;
      if (explicit) {
        // Use explicitly provided WS base, append path and token
        try {
          const u = new URL(explicit);
          u.pathname = `/ws/chat/${conversationId}/`;
          u.search = `?token=${encodeURIComponent(accessToken)}`;
          return u.toString();
        } catch {}
      }

      const apiBase = buildApiUrl();
      const origin = apiBase || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
      try {
        const u = new URL(origin);
        // Prefer page scheme to avoid mixed content issues
        const pageIsHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        u.protocol = pageIsHttps ? 'wss:' : (u.protocol === 'https:' ? 'wss:' : 'ws:');
        u.pathname = `/ws/chat/${conversationId}/`;
        u.search = `?token=${encodeURIComponent(accessToken)}`;
        return u.toString();
      } catch {
        const pageIsHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const proto = pageIsHttps ? 'wss' : 'ws';
        return `${proto}://localhost:8000/ws/chat/${conversationId}/?token=${encodeURIComponent(accessToken)}`;
      }
    };

    const MAX_WS_RETRIES = 5;
    const scheduleReconnect = (immediate = false) => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const attempt = retryRef.current;
      if (attempt >= MAX_WS_RETRIES) {
        console.warn('WebSocket: max retries reached. Falling back to polling for presence.');
        return;
      }
      const delay = immediate ? 0 : Math.min(30000, 1000 * Math.pow(2, attempt));
      reconnectTimerRef.current = window.setTimeout(() => {
        retryRef.current = attempt + 1;
        connect();
      }, delay);
    };

    const connect = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return; // not authenticated

      // Avoid duplicate connections
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const wsUrl = buildUrl(token);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0; // reset backoff on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'user_status' || data?.type === 'broadcast_user_status') {
            if (String(data.user_id) === String(otherParticipant?.id)) {
              setOtherDetails(prev => ({ ...(prev || {} as any), is_online: !!data.is_online } as any));
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onerror = (err) => {
        // Surface for debugging
        console.warn('WebSocket error', err);
      };

      ws.onclose = async (ev) => {
        wsRef.current = null;
        // Log for diagnosis
        console.warn('WebSocket closed', { code: ev.code, reason: ev.reason });

        if (ev.code === 4001) {
          // Unauthorized; try refresh once, then reconnect
          try {
            const refresh = localStorage.getItem('refresh_token');
            if (refresh) {
              const res = await authAPI.refreshToken(refresh);
              const newAccess = res.data?.access;
              if (newAccess) {
                localStorage.setItem('access_token', newAccess);
                retryRef.current = 0;
                scheduleReconnect(true);
                return;
              }
            }
          } catch (_) {
            // fall through to normal reconnect (or user re-login)
          }
        }

        // Normal reconnect with backoff (for transient failures like 1006)
        scheduleReconnect(false);
      };
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [conversationId, otherParticipant?.id]);

  // Always refresh other participant details (presence, avatar, last_seen)
  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;
    const fetchUserDetails = async () => {
      if (!otherParticipant?.id) return;
      try {
        const { data } = await api.get(`/api/users/${otherParticipant.id}/`);
        if (!cancelled) setOtherDetails(data);
      } catch (_) {
        // ignore
      }
    };
    fetchUserDetails();
    intervalId = window.setInterval(fetchUserDetails, 15000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [otherParticipant?.id]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    const currentId = currentUser?.id;
    const otherId = enrichedOtherParticipant?.id;
    if (!currentId || !otherId) return messages;
    return messages.filter((msg) => {
      const sender = msg.sender_id;
      const recipient = msg.recipient_id ?? (sender === currentId ? otherId : currentId);
      return (
        (sender === currentId && recipient === otherId) ||
        (sender === otherId && recipient === currentId)
      );
    });
  }, [messages, currentUser?.id, enrichedOtherParticipant?.id]);




  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || !currentUser?.id || messageIds.length === 0) return;
    
    try {
      // Update local state optimistically
      queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => 
        old.map(msg => 
          messageIds.includes(msg.id) && !msg.is_read 
            ? { 
                ...msg, 
                is_read: true,
                read_at: new Date().toISOString()
              } 
            : msg
        )
      );
      
      // Update read status via API
      await messagingAPI.markMessagesAsRead(conversationId, messageIds);
      
      // Invalidate queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['messages', conversationId],
          refetchType: 'active' 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['conversations'],
          refetchType: 'active'
        })
      ]);
      
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ 
        queryKey: ['messages', conversationId],
        refetchType: 'active'
      });
    }
  }, [conversationId, currentUser?.id, queryClient]);

  // Effect to mark messages as read when they become visible
  useEffect(() => {
    if (!conversationId || !currentUser?.id || !messages?.length) return;
    
    // Find unread messages not sent by current user
    const unreadMessages = messages.filter(
      msg => !msg.is_read && msg.sender && msg.sender.id && msg.sender.id !== currentUser.id
    );
    
    if (unreadMessages.length === 0) return;
    
    const messageIds = unreadMessages.map(msg => msg.id).filter(Boolean);
    if (messageIds.length === 0) return;
    
    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      markMessagesAsRead(messageIds);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [conversationId, currentUser?.id, messages, markMessagesAsRead]);

  useEffect(() => {
    if (!Array.isArray(messages) || !currentUser?.id) return;
    const latestIncoming = [...messages]
      .filter(m => m && m.sender_id !== currentUser.id)
      .slice(-1)[0];
    if (!latestIncoming) return;
    const latestId = latestIncoming.id;
    if (latestId && latestId !== lastNotifiedMessageId.current) {
      lastNotifiedMessageId.current = latestId;
      const senderName = latestIncoming.sender?.full_name || latestIncoming.sender_name || 'New message';
      const preview = typeof latestIncoming.content === 'string' ? latestIncoming.content.slice(0, 120) : '';
      if (notifyEnabled) {
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().then(() => {});
            }
            if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
              new Notification(senderName, { body: preview || 'New message', silent: false });
            }
          }
        } catch {}
      }
    }
  }, [messages, currentUser?.id, notifyEnabled]);

  // Send message with proper error handling, optimistic updates, and notifications
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, recipientId }: { content: string; recipientId: string }) => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      
      
      setIsSending(true);
      let targetConversationId = conversationId;
      let targetRecipientId = recipientId;
      
      // If we don't have a recipient ID but have a conversation, find the other participant
      if (!targetRecipientId && targetConversationId) {
        const conversation = conversations?.find(c => c.id === targetConversationId);
        
        if (conversation?.participants) {
          const otherParticipant = conversation.participants.find(p => {
            const participantId = typeof p === 'object' ? p.id : p;
            return participantId && participantId !== currentUser.id;
          });
          
          
          if (otherParticipant) {
            targetRecipientId = typeof otherParticipant === 'object' 
              ? otherParticipant.id 
              : otherParticipant;
          }
        }
      }
      
      if (!targetRecipientId) {
        const errorMsg = 'No recipient specified and could not determine recipient from conversation';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempMessageId,
        content,
        sender: currentUser,
        sender_id: currentUser.id,
        conversation_id: targetConversationId || '',
        created_at: new Date().toISOString(),
        is_read: false,
        temp_id: tempMessageId,
        status: 'sending',
        conversation: '',
        sender_avatar: undefined,
        sender_name: undefined
      };


      // Optimistically update the UI
      if (targetConversationId) {
        queryClient.setQueryData<Message[]>(
          ['messages', targetConversationId], 
          (old = []) => [...old, tempMessage]
        );
      }
      
      try {
        // Create conversation if it doesn't exist
        if (!targetConversationId) {
          try {
            const conversationResponse = await messagingAPI.getOrCreateConversation(targetRecipientId);
            
            if (conversationResponse?.data?.id) {
              targetConversationId = conversationResponse.data.id;
              
              // Update the URL to reflect the new conversation
              navigate(`/messages/${targetConversationId}`, { replace: true });
              
              // Add the new conversation to the list
              queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) => {
                if (!conversationResponse.data) {
                  return old || [];
                }
                return [conversationResponse.data, ...(old || [])];
              });
              
              // Ensure targetConversationId is defined before using it
              if (!targetConversationId) {
                const errorMsg = 'No conversation ID available after creation';
                throw new Error(errorMsg);
              }
              
              // Update the temp message with the new conversation ID
              tempMessage.conversation_id = targetConversationId;
              tempMessage.conversation = targetConversationId;
              queryClient.setQueryData<Message[]>(['messages', targetConversationId], (old = []) => {
                return [tempMessage];
              });
            } else {
              throw new Error('Failed to create conversation');
            }
          } catch (error) {
            throw new Error('Failed to start conversation');
          }
        }
        
        // Now send the actual message
        const response = await messagingAPI.sendMessage(targetConversationId!, content, targetRecipientId);
        
        // Update the message in the cache with the server response
        queryClient.setQueryData<Message[]>(['messages', targetConversationId], (old = []) => {
          if (!old) return [response.data];
          
          return old.map(msg => 
            msg.temp_id === tempMessageId 
              ? { ...response.data, status: 'sent' } 
              : msg
          );
        });
        
        // Update the conversation's last message
        queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) => {
          if (!old) return old;
          
          return old.map(conv => {
            if (conv.id === targetConversationId) {
              return {
                ...conv,
                last_message: response.data,
                updated_at: new Date().toISOString(),
                unread_count: 0
              };
            }
            return conv;
          });
        });
        
        return response.data;
      } finally {
        setIsSending(false);
      }
    },
    onMutate: async ({ content, recipientId }) => {
      // Generate a temporary ID for the optimistic update
      const tempMessageId = `temp-${Date.now()}`;
      
      // Cancel any outgoing refetches (optimistic update)
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', conversationId]) || [];
      
      // Create optimistic message
      const now = new Date().toISOString();
      const optimisticMessage: Message = {
        id: tempMessageId,
        content,
        sender: currentUser!,
        sender_id: currentUser?.id || '',
        sender_name: currentUser?.username || currentUser?.email || 'You',
        sender_avatar: currentUser?.profile_image,
        conversation_id: conversationId || '',
        created_at: now,
        updated_at: now,
        is_read: false,
        temp_id: tempMessageId,
        status: 'sending',
        conversation: ''
      };
      
      // Optimistically update the UI
      if (conversationId) {
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => [
          ...old,
          optimisticMessage
        ]);
      }
      
      // Return a context object with the snapshotted value and temp message ID
      return { 
        previousMessages,
        tempMessageId,
        optimisticMessage
      };
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Clear the message input and file selection
      setMessage('');
      removeSelectedFile();
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error, variables, context) => {
      console.error('Error sending message:', error);
      
      // Update the message status to 'error' in the UI
      if (conversationId) {
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => {
          if (!old) return [];
          
          return old.map(msg => {
            // Check if this is our temporary message
            if (msg.temp_id === context?.tempMessageId) {
              return {
                ...msg,
                status: 'error',
                error: error.message || 'Failed to send message'
              };
            }
            return msg;
          });
        });
      }
      
      // Show error toast with retry option
      toast({
        title: 'Message not sent',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
        action: (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              // Retry sending the message
              if (variables.content && variables.recipientId) {
                sendMessageMutation.mutate({
                  content: variables.content,
                  recipientId: variables.recipientId
                });
              }
            }}
          >
            Retry
          </Button>
        )
      });
    },
    onSettled: () => {
      // Always refetch messages after error or success to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Handle starting or resuming a conversation with proper error handling
  const handleStartConversation = async (user: User) => {
    
    if (!user?.id || !currentUser?.id) {
      const errorMsg = !user?.id ? 'No user selected' : 'Not authenticated';
      toast({
        title: 'Error',
        description: `Cannot start conversation: ${errorMsg}`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedParticipant(user);
    setIsSending(true);

    try {
      // First, fetch the latest conversations
      const convsResponse = await messagingAPI.getConversations();
      const conversations = Array.isArray(convsResponse.data) ? convsResponse.data : [];
      
      // Update the query cache with fresh data
      queryClient.setQueryData(['conversations'], conversations);
      
      // Check if we already have a conversation with this user
      const existingConv = conversations.find(conv => {
        if (!conv?.participants) return false;
        const participantIds = conv.participants.map((p: unknown) => 
          typeof p === 'object' && p !== null && 'id' in p ? (p as { id: string }).id : p
        );
        return participantIds.includes(user.id);
      });

      let conversation = existingConv;
      
      // If no existing conversation, create a new one
      if (!existingConv) {
        const createResponse = await messagingAPI.createConversation([user.id]);
        if (!createResponse?.data) {
          throw new Error('Failed to create conversation: No data in response');
        }
        conversation = createResponse.data;
        
        // Update the conversations list with the new conversation
        queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => 
          Array.isArray(old) ? [...old, conversation] : [conversation]
        );
      } else {
      }

      if (!conversation?.id) {
        throw new Error('Failed to get or create conversation: No conversation ID');
      }

      // Close sidebar on mobile when a conversation is selected
      if (isMobile) {
        setIsSidebarOpen(false);
      }
      
      // Navigate to the conversation
      navigate(`/messages/${conversation.id}`);
      
      // Force a refresh of the messages
      queryClient.invalidateQueries({ 
        queryKey: ['messages', conversation.id],
        refetchType: 'active'
      });
      
    } catch (error) {
      console.error('Error in handleStartConversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
    
    // Clear the file input to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Clean up object URLs when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Handle keyboard events for the message input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Let Shift+Enter add a new line by default
  };

  // Handle input change and auto-resize
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const next = target.value;
    // Resize using rAF to avoid layout thrash
    if (inputRafRef.current) cancelAnimationFrame(inputRafRef.current);
    inputRafRef.current = requestAnimationFrame(() => {
      target.style.height = 'auto';
      const newH = Math.min(target.scrollHeight, 200);
      target.style.height = `${Math.max(BASE_INPUT_HEIGHT, newH)}px`;
    });
    setMessage((prev) => (prev === next ? prev : next));
    // If cleared, immediately reset height to base
    if (next.length === 0) {
      target.style.height = `${BASE_INPUT_HEIGHT}px`;
    }
  };

  // Keep height in sync when message is cleared programmatically
  useEffect(() => {
    if (!textareaRef.current) return;
    if (!message) {
      textareaRef.current.style.height = `${BASE_INPUT_HEIGHT}px`;
    } else {
      resizeComposer();
    }
    return () => {
      if (inputRafRef.current) cancelAnimationFrame(inputRafRef.current);
    };
  }, [message, resizeComposer]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const trimmedMessage = message.trim();
    
    // Check for empty message (allow sending if file is attached)
    if (!trimmedMessage && !selectedFile) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message or select a file to send',
        variant: 'destructive',
      });
      return;
    }
    
    // Check message length
    if (trimmedMessage.length > 2000) {
      toast({
        title: 'Message Too Long',
        description: 'Message must be less than 2000 characters',
        variant: 'destructive',
      });
      return;
    }
    
    // Ensure we have a current user
    if (!currentUser?.id) {
      toast({
        title: 'Not Logged In',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      // Consider redirecting to login
      // navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // If editing an existing message, call update flow
    if (editingMessageId) {
      try {
        await updateMessageMutation.mutateAsync({ id: String(editingMessageId), content: trimmedMessage });
        setEditingMessageId(null);
        setEditingOriginalContent('');
        setMessage('');
        removeSelectedFile(); // Clear any selected file when editing
      } catch (error) {
        // error handled in mutation
      }
      return;
    }
    
    // Determine the recipient ID and conversation ID
    let targetConversationId = conversationId;
    let targetRecipientId: string | undefined;
    let targetConversation: Conversation | undefined;

    // If we have a conversation, find the other participant
    if (targetConversationId && conversations) {
      targetConversation = conversations.find(c => c.id === targetConversationId);
      
      if (targetConversation?.participants) {
        // Find the participant who is not the current user
        const otherParticipant = targetConversation.participants.find(p => {
          try {
            const participantId = p && typeof p === 'object' && 'id' in p 
              ? p.id 
              : p;
            return String(participantId) !== String(currentUser?.id);
          } catch (e) {
            console.warn('Error processing participant:', p, e);
            return false;
          }
        });
        
        if (otherParticipant) {
          targetRecipientId = typeof otherParticipant === 'object' 
            ? otherParticipant.id 
            : otherParticipant;
        }
      }
    } 
    // If we're starting a new conversation, use the selected participant
    else if (selectedParticipant?.id) {
      targetRecipientId = selectedParticipant.id;
      
      // Check if we already have a conversation with this user
      if (conversations) {
        const existingConv = conversations.find(conv => {
          if (!conv?.participants) return false;
          return conv.participants.some(p => {
            const participantId = p && typeof p === 'object' && 'id' in p ? p.id : p;
            return String(participantId) === String(targetRecipientId);
          });
        });
        
        if (existingConv) {
          targetConversationId = existingConv.id;
          targetConversation = existingConv;
          // Update URL to use existing conversation
          navigate(`/messages/${targetConversationId}`, { replace: true });
        }
      }
    }

    // If we still don't have a recipient, we can't proceed
    if (!targetRecipientId && !targetConversationId) {
      toast({
        title: 'No Recipient',
        description: 'Please select a recipient to send a message',
        variant: 'destructive',
      });
      return;
    }
    
    // Track if we're in the process of creating a new conversation
    let isCreatingConversation = false;
    
    // If we don't have a conversation ID but have a recipient, create a new conversation
    if (!targetConversationId && targetRecipientId) {
      isCreatingConversation = true;
      
      try {
        // Show loading state
        const loadingToast = toast({
          title: 'Please wait',
          description: 'Starting conversation...',
          variant: 'default',
          duration: 0, // Prevent auto-dismissal
        });
        
        const response = await messagingAPI.getOrCreateConversation(targetRecipientId);
        
        if (response?.data?.id) {
          targetConversationId = response.data.id;
          
          // Update the URL with the new conversation ID
          navigate(`/messages/${targetConversationId}`, { replace: true });
          
          // Update conversations list with the new conversation
          queryClient.setQueryData(['conversations'], (old: any) => {
            const updated = Array.isArray(old) 
              ? old.some((c: any) => c.id === response.data.id) 
                ? old 
                : [response.data, ...old] // Add new conversation to the top
              : [response.data];
            return updated;
          });
          
          // Invalidate and refetch messages for the new conversation
          await queryClient.invalidateQueries({ 
            queryKey: ['messages', targetConversationId],
            refetchType: 'active'
          });
          
          // Wait a moment for the messages to load
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Dismiss the loading toast and show success
          loadingToast.dismiss();
          toast({
            title: 'Success',
            description: 'Conversation started',
            variant: 'default',
          });
        } else {
          throw new Error('Failed to create conversation: Invalid response format');
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Show error toast (this will automatically replace any existing toasts)
        toast({
          title: 'Error',
          description: `Failed to start conversation: ${errorMessage}`,
          variant: 'destructive',
          duration: 5000, // Show for 5 seconds
        });
        
        return;
      }
    }
    
    // If we still don't have a conversation ID, we can't proceed
    if (!targetConversationId) {
      toast({
        title: 'Error',
        description: 'Could not create or find conversation',
        variant: 'destructive',
      });
      return;
    }
    
    // If we just created this conversation, wait a bit longer for the UI to update
    if (isCreatingConversation) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Create a temporary message for optimistic update
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempMessage: Message = {
      id: tempId,
      conversation_id: targetConversationId,
      conversation: targetConversationId,
      sender: {
        id: currentUser.id,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        email: currentUser.email || '',
        profile_image: currentUser.profile_image
      },
      sender_id: currentUser.id,
      sender_name: getFullName(currentUser as any),
      sender_avatar: getAvatarUrl(currentUser as any) || undefined,
      content: trimmedMessage,
      created_at: now,
      updated_at: now,
      is_read: false,
      status: 'sending' as const,
      temp_id: tempId,
      recipient_id: targetRecipientId || ''
    };

    // Optimistically update the messages in the cache
    queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
      return Array.isArray(old) ? [...old, tempMessage] : [tempMessage];
    });
    
    // Clear the message input
    setMessage('');
    
    // Scroll to bottom will be handled by the effect
    
    try {
      if (!targetConversationId) {
        throw new Error('No conversation ID available');
      }

      // Prepare attachment data if file is selected
      let attachment = null;
      if (selectedFile) {
        // Create a data URL for the file (compress images to speed up sending)
        const isImage = selectedFile.type.startsWith('image/');
        const fileDataUrl = isImage
          ? await compressImageFile(selectedFile)
          : await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(selectedFile);
            });

        attachment = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          dataUrl: fileDataUrl,
          isImage,
        };
        // Immediately reflect attachment in the optimistic temp message in cache
        try {
          queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map(m => m.id === tempId ? {
              ...m,
              content: trimmedMessage
                ? `${trimmedMessage}\n\n[ATTACHMENT:${JSON.stringify({
                    type: 'file_attachment',
                    name: attachment!.name,
                    size: attachment!.size,
                    fileType: attachment!.type,
                    dataUrl: attachment!.dataUrl,
                    isImage: attachment!.isImage,
                  })}]`
                : `[ATTACHMENT:${JSON.stringify({
                    type: 'file_attachment',
                    name: attachment!.name,
                    size: attachment!.size,
                    fileType: attachment!.type,
                    dataUrl: attachment!.dataUrl,
                    isImage: attachment!.isImage,
                  })}]`
            } : m);
          });
        } catch {}
      }

      // Send via REST API
      console.log('Sending message to API...');
      
      // Include attachment data in message content as JSON for parsing later
      let messageContent = trimmedMessage;
      if (attachment) {
        const attachmentData = {
          type: 'file_attachment',
          name: attachment.name,
          size: attachment.size,
          fileType: attachment.type,
          dataUrl: attachment.dataUrl,
          isImage: attachment.isImage
        };
        
        if (trimmedMessage) {
          messageContent = `${trimmedMessage}\n\n[ATTACHMENT:${JSON.stringify(attachmentData)}]`;
        } else {
          messageContent = `[ATTACHMENT:${JSON.stringify(attachmentData)}]`;
        }
      }
      
      // Immediately clear the file preview UI so it disappears once user presses Send
      removeSelectedFile();

      // Send regular text message
      const { data } = await messagingAPI.sendMessage(
        targetConversationId,
        messageContent,
        targetRecipientId!
      );
      const serverMessage = data;
      
      console.log('Message sent via API:', serverMessage);
      
      // Update the message in the cache with server response
      queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
        if (!Array.isArray(old)) return old;
        
        return old.map(msg => 
          msg.id === tempId || msg.id === serverMessage.id
            ? {
                ...msg,
                ...serverMessage,
                id: serverMessage.id || msg.id,
                status: 'sent' as const,
                conversation_id: serverMessage.conversation_id || targetConversationId || '',
                conversation: serverMessage.conversation_id || targetConversationId || '',
                sender: serverMessage.sender,
                sender_id: serverMessage.sender_id,
                sender_name: serverMessage.sender_name,
                sender_avatar: serverMessage.sender_avatar,
                created_at: serverMessage.created_at || new Date().toISOString(),
                is_read: serverMessage.is_read || false,
                updated_at: serverMessage.updated_at || new Date().toISOString()
              }
            : msg
        );
      });
      
      // Update conversation last message in the conversations list
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!Array.isArray(old)) return old;
        
        return old.map(conv => 
          conv.id === targetConversationId
            ? {
                ...conv,
                last_message: {
                  ...serverMessage,
                  id: serverMessage.id,
                  content: serverMessage.content,
                  created_at: serverMessage.created_at || new Date().toISOString(),
                  is_read: serverMessage.is_read || false,
                  sender: {
                    id: currentUser.id,
                    full_name: getFullName(currentUser as any),
                    email: currentUser.email,
                    profile_image: currentUser.profile_image
                  }
                },
                updated_at: new Date().toISOString()
              }
            : conv
        );
      });
      
      // No WebSocket notification needed - polling will handle updates
      console.log('Message sent successfully, polling will handle updates');
      
      // Invalidate queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['messages', targetConversationId],
          refetchType: 'active' 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['conversations'],
          refetchType: 'active'
        })
      ]);
      
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      // Update message status to error in the cache
      queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
        if (!Array.isArray(old)) return old;
        
        return old.map(msg => 
          msg.id === tempId
            ? {
                ...msg,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Failed to send message',
              }
            : msg
        );
      });
      
      // Show error to user
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'An error occurred while sending your message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
};

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600 mb-4">Please wait while we load your messages</p>
        </div>
      </div>
    );
  }

  // Show authentication required
  if (!currentUser?.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view messages</p>
          <Button onClick={() => navigate('/login')} variant="default">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-white flex">
      {/* Mobile backdrop when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div
          className="absolute top-[64px] left-0 right-0 bottom-0 bg-black/30 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <motion.div 
        className={cn(
          "bg-emerald-50/70 border-r border-emerald-100 flex flex-col transition-all duration-300 ease-in-out shadow-xl rounded-r-2xl overflow-hidden md:overflow-visible min-h-0",
          isSidebarOpen ? "w-80" : "w-0",
          isMobile && "absolute top-[64px] bottom-0 left-0 z-50"
        )}
        initial={{ x: isMobile ? -320 : 0 }}
        animate={{ x: isSidebarOpen ? 0 : (isMobile ? -320 : 0) }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <div className="md:sticky md:top-[64px] md:h-[calc(100vh-64px)] flex flex-col min-h-0">
        <div className="p-4 border-b border-emerald-100 bg-emerald-50 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-emerald-700">Messages</h2>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              className="pl-10 rounded-full bg-emerald-50 border border-emerald-100 focus-visible:ring-emerald-500 focus:border-emerald-500 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 bg-emerald-50/70 min-h-0">
          <ScrollArea className="h-full">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading conversations...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium mb-2">
                {searchQuery ? 'No matching users found' : 'No users available'}
              </p>
              <p className="text-xs text-gray-400">
                {searchQuery ? 'Try adjusting your search' : 'Start by adding some contacts'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user: User, index: number) => {
                // Find existing conversation if it exists
                const existingConversation = conversations?.find(conv => {
                  if (!Array.isArray(conv.participants)) return false;
                  const participantIds = conv.participants
                    .map(p => typeof p === 'object' ? String(p.id) : String(p));
                  return participantIds.includes(String(user.id)) && 
                         participantIds.includes(String(currentUser?.id));
                });

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`relative group cursor-pointer transition-all duration-200 rounded-xl mx-2 border ${
                      selectedParticipant?.id === user.id 
                        ? 'bg-white border-emerald-200 shadow' 
                        : 'bg-white border-transparent hover:border-emerald-200 hover:shadow'
                    }`}
                    onClick={() => {
                      if (existingConversation?.id) {
                        if (isMobile) setIsSidebarOpen(false);
                        navigate(`/messages/${existingConversation.id}`);
                      } else {
                        handleStartConversation(user);
                      }
                    }}
                  
                  >
                    <div className="flex items-center p-4 space-x-4">
                      {/* Enhanced Avatar Section */}
                      <div className="flex-shrink-0 relative">
                        {user.profile_image ? (
                          <img
                            className="h-14 w-14 rounded-full ring-2 ring-white shadow-lg object-cover"
                            src={getAvatarUrl(user)}
                            alt={getFullName(user)}
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white shadow-lg">
                            <span className="text-white font-bold text-lg">
                              {getUserInitials(user)}
                            </span>
                          </div>
                        )}
                        
                        {/* Online Status with Animation */}
                        {user.is_online && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg">
                            <span className="absolute inset-0 w-5 h-5 bg-green-500 rounded-full animate-ping opacity-75"></span>
                          </span>
                        )}
                        
                        {/* Unread Count Badge */}
                        {existingConversation?.unread_count && existingConversation.unread_count > 0 && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                            <span className="text-white text-xs font-bold">
                              {existingConversation.unread_count > 9 ? '9+' : existingConversation.unread_count}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Enhanced User Info Section */}
                      <div className="min-w-0 flex-1">
                        {/* Name and Time */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-base truncate ${
                            existingConversation?.unread_count ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                          }`}>
                            {getFullName(user)}
                          </h3>
                          {existingConversation?.last_message?.created_at && (
                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                              {formatDistanceToNow(new Date(existingConversation.last_message.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        {/* Enhanced User Type and Status Badges */}
                        <div className="flex items-center space-x-2 mb-2">
                          {user.user_type && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                              user.user_type === 'vendor' 
                                ? 'bg-emerald-600 text-white' 
                                : user.user_type === 'administrator' 
                                ? 'bg-emerald-700 text-white' 
                                : 'bg-slate-600 text-white'
                            }`}>
                              {user.user_type === 'vendor' ? '🏪 Vendor' : 
                               user.user_type === 'administrator' ? '👨‍💼 Admin' : '🛍️ Buyer'}
                            </span>
                          )}
                          
                          {user.is_online && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white shadow-sm">
                              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                              Online
                            </span>
                          )}
                        </div>

                        {/* Enhanced Last Message Preview */}
                        <div className="mt-1">
                                          <p className={`truncate text-sm ${
                            existingConversation?.unread_count ? 'font-semibold text-gray-800' : 'text-gray-500'
                          }`}>
                            {existingConversation?.last_message?.content ? (
                              (() => {
                                const txt = String(existingConversation.last_message.content || '');
                                const head = txt.slice(0, 24);
                                const tail = txt.slice(24);
                                return (
                                  <span className="flex items-center">
                                    {existingConversation?.unread_count ? (
                                      <>
                                        <strong className="truncate max-w-[110px]">{head}</strong>
                                        <span className="truncate max-w-[110px]">{tail}</span>
                                      </>
                                    ) : (
                                      <span className="truncate max-w-[220px]">{txt}</span>
                                    )}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="italic text-gray-400 flex items-center">
                                <span className="mr-1">💬</span>
                                Start a conversation...
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action Indicator */}
                      <div className="flex-shrink-0" />
                    </div>

                    {/* Hover overlay removed for cleaner look */}
                    
                    {/* Selection Indicator */}
                    {selectedParticipant?.id === user.id && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                      </div>
                    )}
      </motion.div>
                );
              })}
            </div>
          )}
          </ScrollArea>
        </div>
        </div>
      </motion.div>

      {/* Main chat area */}
      <div className="flex-1 grid grid-rows-[auto,1fr,auto] min-h-0">
        {otherParticipant ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-emerald-200/50 p-4 flex-shrink-0 sticky top-[64px] z-30">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden mr-2"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                  {enrichedOtherParticipant?.profile_image || enrichedOtherParticipant?.avatar ? (
                    <img
                      src={getAvatarUrl(enrichedOtherParticipant)}
                      alt={getFullName(enrichedOtherParticipant)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-200">
                      <span className="font-medium text-gray-700">
                        {getUserInitials(enrichedOtherParticipant || undefined)}
                      </span>
                    </div>
                  )}
                  {enrichedOtherParticipant?.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-medium">{getFullName(enrichedOtherParticipant || undefined)}</h3>
                  <p className="text-xs text-gray-500">
                    {enrichedOtherParticipant?.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
                {/* Settings Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Message Settings</DialogTitle>
                      <DialogDescription>
                        Configure your messaging preferences, notifications, and privacy settings.
                      </DialogDescription>
                    </DialogHeader>
                    <MessageSettings />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white pb-20 md:pb-24">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="w-12 h-12 mb-4 text-gray-200" />
                  <p>No messages yet</p>
                  <p className="text-sm text-gray-400">
                    Start the conversation with {getFullName(enrichedOtherParticipant)}
                  </p>
                </div>
              ) : (
                <>
                  {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'
                  )}
                >
                  {/* Show avatar for received messages */}
                  {msg.sender_id !== currentUser?.id && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 md:h-7 md:w-7 rounded-full overflow-hidden border border-gray-200 relative">
                        <img
                          src={getAvatarUrl(((enrichedOtherParticipant as any) || (msg.sender as any)))}
                          alt={getFullName(((enrichedOtherParticipant as any) || (msg.sender as any))) || msg.sender_name || msg.sender?.username || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center bg-gray-200">
                          <span className="text-[10px] md:text-xs font-medium text-gray-600">
                            {getFullName(((enrichedOtherParticipant as any) || (msg.sender as any)))?.[0]?.toUpperCase() ||
                             msg.sender_name?.[0]?.toUpperCase() ||
                             msg.sender?.username?.[0]?.toUpperCase() ||
                             msg.sender?.email?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Edit/Delete button for own messages - removed duplicate */}
                  <div
                    className={cn(
                      'relative rounded-2xl px-4 py-2 max-w-[80%] md:max-w-[60%] group shadow-sm overflow-hidden break-words',
                      msg.sender_id === currentUser?.id
                        ? 'bg-emerald-500 text-white rounded-br-none shadow-emerald-200/40'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none shadow-gray-200/40',
                      // Nudge bubbles away from avatars (received -> right, sent -> left)
                      msg.sender_id !== currentUser?.id ? 'ml-7 md:ml-8' : 'mr-7 md:mr-8'
                    )}
                  >
                    {/* Edit/Delete button inside bubble */}
                    {msg.sender_id === currentUser?.id && (
                      <div className="absolute top-1 right-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shadow-md bg-white/90 hover:bg-white text-emerald-600">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingMessage(msg.content);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMessageMutation.mutate({ id: msg.id })} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {/* Parse and render message content with attachments */}
                    {(() => {
                      const content = msg.content;
                      const attachmentMatch = content.match(/\[ATTACHMENT:(.+?)\]/);
                      
                      if (attachmentMatch) {
                        try {
                          const attachmentData = JSON.parse(attachmentMatch[1]);
                          const textContent = content.replace(/\[ATTACHMENT:.+?\]/, '').trim();
                          
                          return (
                            <>
                              {textContent && <p className="text-sm mb-2">{textContent}</p>}
                              
                              {/* File attachment display */}
                              <div className={cn(
                                "mt-2 p-3 rounded-lg border",
                                msg.sender_id === currentUser?.id
                                  ? "bg-white/10 border-white/20"
                                  : "bg-gray-50 border-gray-200"
                              )}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Paperclip className="w-4 h-4" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachmentData.name}</p>
                                    <p className="text-xs opacity-70">{formatFileSize(attachmentData.size)}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "h-6 px-2 text-xs",
                                      msg.sender_id === currentUser?.id
                                        ? "hover:bg-white/20 text-white"
                                        : "hover:bg-gray-100 text-gray-700"
                                    )}
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = attachmentData.dataUrl;
                                      link.download = attachmentData.name;
                                      link.click();
                                    }}
                                  >
                                    Download
                                  </Button>
                                </div>
                                
                                {/* Image preview */}
                                {attachmentData.isImage && (
                                  <div className="mt-2">
                                    <img
                                      src={attachmentData.dataUrl}
                                      alt={attachmentData.name}
                                      className="rounded cursor-pointer border object-contain w-full max-w-full h-auto max-h-28 md:max-h-36"
                                      onClick={() => {
                                        const newWindow = window.open();
                                        if (newWindow) {
                                          newWindow.document.write(`
                                            <html>
                                              <head><title>${attachmentData.name}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                                <img src="${attachmentData.dataUrl}" style="max-width:100%;max-height:100vh;" />
                                              </body>
                                            </html>
                                          `);
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Non-image file icon */}
                                {!attachmentData.isImage && (
                                  <div className="mt-2 flex items-center justify-center p-4 bg-gray-100 rounded border-2 border-dashed border-gray-300">
                                    <div className="text-center">
                                      <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                      <p className="text-xs text-gray-500">{attachmentData.fileType}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        } catch (e) {
                          // Fallback to regular text if JSON parsing fails
                          return <p className="text-sm">{content}</p>;
                        }
                      } else {
                        // Regular text message
                        return <p className="text-sm">{content}</p>;
                      }
                    })()}
                    
                    <p className="text-xs opacity-80 mt-1 text-right">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {msg.sender_id === currentUser?.id && (
                    <div className="h-6 w-6 md:h-7 md:w-7 ml-2 rounded-full overflow-hidden flex-shrink-0 relative">
                      {currentUser?.profile_image ? (
                        <img
                          src={getAvatarUrl(currentUser as any)}
                          alt={getFullName(currentUser as any)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gray-200">
                          <span className="text-xs font-medium text-gray-600">
                            {currentUser?.first_name?.[0] || 
                             currentUser?.last_name?.[0] || 
                             currentUser?.email?.[0]?.toUpperCase() || 
                             'U'}
                          </span>
                        </div>
                      )}
                      {currentUser?.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message input - inside the chat box */}
        <div
          className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-0 border-t border-emerald-200/50 bg-white p-2 md:p-4 shadow-lg z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* File preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeSelectedFile}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {filePreviewUrl && (
                <div className="mt-2">
                  <img
                    src={filePreviewUrl}
                    alt={selectedFile.name}
                    className="max-h-20 max-w-full object-contain rounded border"
                  />
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="flex items-end gap-2">
              {/* File upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-full hover:bg-gray-100"
                aria-label="Attach file"
                disabled={isSending || isUploading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              
              {/* Message input */}
              <div className={cn(
                "relative flex-1 transition-all",
                // Keep compact only on small screens; full width on md+
                !isInputFocused && !message ? "max-w-[220px] md:max-w-none" : "max-w-none"
              )}>
                <Textarea
                  ref={textareaRef}
                  placeholder={editingMessageId ? 'Edit your message...' : 'Message'}
                  className={cn(
                    "min-h-[24px] max-h-32 overflow-y-hidden resize-none pr-9 py-1 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm",
                    !isInputFocused && !message ? "rounded-full px-4" : "rounded-2xl px-3"
                  )}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleInput}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck={true}
                  inputMode="text"
                  disabled={isSending}
                  rows={1}
                />
                {message && (
                  <button
                    type="button"
                    onClick={() => (editingMessageId ? cancelEditing() : setMessage(''))}
                    className="absolute right-2 bottom-2.5 p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={editingMessageId ? 'Cancel edit' : 'Clear message'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Emoji picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-yellow-500 transition-colors rounded-full hover:bg-gray-100"
                  aria-label="Add emoji"
                  disabled={isSending}
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 right-0 z-10 emoji-picker-container">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => {
                        setMessage(prev => prev + emoji.native);
                        setShowEmojiPicker(false);
                      }}
                      theme="light"
                      previewPosition="none"
                      searchPosition="none"
                      skinTonePosition="none"
                      perLine={8}
                      emojiSize={22}
                    />
                  </div>
                )}
              </div>
              
              {/* Send button */}
              <Button
                type="submit"
                disabled={(!message.trim() && !selectedFile) || isSending || isUploading}
                className="h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 rounded-full shadow-lg hover:shadow-emerald-300/40"
                aria-label={editingMessageId ? 'Update message' : 'Send message'}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Status bar */}
            <div className="mt-1 text-xs text-gray-500 flex justify-between items-center">
              <span>Max file size: 5MB</span>
              <span className={enrichedOtherParticipant?.is_online ? 'text-green-500' : 'text-gray-500'}>
                {enrichedOtherParticipant?.is_online ? 'Online' : 'Offline'}
              </span>
            </div>
          </form>
        </div>
          </>
        ) : (
          <div className="row-span-3 grid place-items-center h-full min-h-[calc(100vh-64px)] p-8 text-center bg-emerald-50/60 relative">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="max-w-md">
              <MessageSquare className="w-20 h-20 mx-auto mb-6 text-gray-300" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                No Conversation Selected
              </h3>
              <p className="text-gray-500 mb-6">
                Select a conversation from the sidebar or start a new one to begin messaging
              </p>
              {isMobile && (
                <Button
                  onClick={() => setIsSidebarOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  View Conversations
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MessagesPage;