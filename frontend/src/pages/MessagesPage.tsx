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
    queryClient.setQueryData<Conversation[]>(['conversations', currentUser?.id], (old) => {
      if (!old) return old;
      return old.map((c) => (c.id === conversationId ? ({ ...c, unread_count: 0 } as Conversation) : c));
    });
  }, [conversationId, currentUser?.id, queryClient]);
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
          // Remove current vendor from the list
          users = users.filter(user => user.id !== currentUser.id);
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
    } catch { }
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
    try { localStorage.setItem('msg_notify_enabled', notifyEnabled ? '1' : '0'); } catch { }
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
    const conversation = conversations.find((c: Conversation) => String(c.id) === String(conversationId));
    if (!conversation) return null;

    // Handle both cases where participants might be objects or just IDs
    const otherParticipant = conversation.participants?.find((p: unknown) => {
      // If participant is an object with an id property
      if (p && typeof p === 'object' && 'id' in p) {
        return String((p as { id: string }).id) !== String(currentUser.id);
      }
      // If participant is just an ID
      return String(p) !== String(currentUser.id);
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
        } catch { }
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
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [conversationId, otherParticipant?.id, WS_ENABLED]);

  // Handle URL ID synchronization
  useEffect(() => {
    // If conversationId is in URL but not found in conversations, or if it's fundamentally invalid
    if (conversationId && conversations.length > 0 && !isLoadingConversations) {
      const exists = conversations.some(c => String(c.id) === String(conversationId));
      if (!exists && !selectedParticipant) {
        // Redirection to clean URL if ID is invalid
        console.log('🧹 Cleaning invalid conversation ID from URL:', conversationId);
        navigate('/messages', { replace: true });
      }
    }
  }, [conversationId, conversations, isLoadingConversations, selectedParticipant, navigate]);

  useEffect(() => {
    if (!otherParticipant?.id) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const fetchUserDetails = async () => {
      try {
        const response = await adminAPI.getUsers({ id: otherParticipant.id });
        const users = Array.isArray(response.data) ? response.data : (response.data?.results ?? []);
        const found = users.find((u: any) => String(u.id) === String(otherParticipant.id));
        if (!cancelled && found) setOtherDetails(found);
      } catch (_) {
        // ignore — use data already in the participant object
      }
    };
    fetchUserDetails();
    intervalId = window.setInterval(fetchUserDetails, 30000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [otherParticipant?.id]);

  // If conversationId is in the URL but not yet in our list, fetch it directly
  useEffect(() => {
    if (!conversationId || !currentUser?.id) return;
    if (isLoadingConversations) return; // Wait for initial load

    const alreadyLoaded = conversations?.some((c: Conversation) => String(c.id) === String(conversationId));
    if (alreadyLoaded) return;

    // Directly fetch the specific conversation by ID
    const fetchMissingConversation = async () => {
      try {
        const response = await messagingAPI.getConversation(conversationId);
        if (response?.data) {
          // Inject it into the React Query cache so the UI can find it
          queryClient.setQueryData<Conversation[]>(['conversations', currentUser?.id], (old = []) => {
            const exists = old.some(c => String(c.id) === String(conversationId));
            if (exists) return old;
            return [response.data, ...old];
          });
        }
      } catch (err) {
        console.warn('Failed to load conversation by URL ID:', conversationId, err);
        // Fallback: If we couldn't load the conversation by ID, redirect to clean URL
        navigate('/messages', { replace: true });
      }
    };

    fetchMissingConversation();
  }, [conversationId, conversations, currentUser?.id, queryClient, navigate, isLoadingConversations]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    return messages;
  }, [messages]);




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
          queryKey: ['conversations', currentUser?.id],
          refetchType: 'active'
        })
      ]);

      // Notify other components (like Navbar) to sync their unread count instantly
      window.dispatchEvent(new CustomEvent('messagesRead'));

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
      (msg) => {
        if (!msg || msg.is_read) return false;
        const senderId = (msg as any).sender_id ?? (msg as any).sender?.id;
        if (!senderId) return false;
        return String(senderId) !== String(currentUser.id);
      }
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
              Notification.requestPermission().then(() => { });
            }
            if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
              new Notification(senderName, { body: preview || 'New message', silent: false });
            }
          }
        } catch { }
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
              queryClient.setQueryData<Conversation[]>(['conversations', currentUser?.id], (old = []) => {
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
        queryClient.setQueryData<Conversation[]>(['conversations', currentUser?.id], (old = []) => {
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
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser?.id] });

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
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser?.id] });
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
      queryClient.setQueryData(['conversations', currentUser?.id], conversations);

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
        queryClient.setQueryData(['conversations', currentUser?.id], (old: Conversation[] | undefined) =>
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
        } catch { }
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
    <div className="relative h-[calc(100vh-80px)] bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex overflow-hidden pt-2">
      {/* Mobile backdrop when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <div
          className="absolute inset-x-0 top-[80px] h-[calc(100vh-80px)] bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <motion.div
        className={cn(
          "bg-emerald-50/40 backdrop-blur-xl border-r-2 border-emerald-200 flex flex-col transition-all duration-300 ease-in-out shadow-2xl z-40",
          isSidebarOpen ? "w-80" : "w-0",
          isMobile && "absolute left-0 top-[80px] h-[calc(100vh-80px)]"
        )}
        initial={false}
        animate={{
          width: isSidebarOpen ? 320 : 0,
          x: isMobile && !isSidebarOpen ? -320 : 0
        }}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="px-4 pt-5 pb-4 border-b border-emerald-100/70 bg-gradient-to-b from-white to-emerald-50/40 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow shadow-emerald-200">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Messages</h2>
              </div>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-emerald-50 text-emerald-600"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400 z-10" />
              <Input
                type="text"
                placeholder="Search conversations..."
                className="relative z-10 pl-10 pr-8 rounded-2xl bg-white/90 border border-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-400/30 focus:border-emerald-300 shadow-sm h-10 text-sm placeholder:text-gray-400 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 rounded-full hover:bg-emerald-50 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
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
                        className={`relative group cursor-pointer transition-all duration-200 rounded-2xl mx-2 my-1 border ${selectedParticipant?.id === user.id || (existingConversation?.id && String(conversationId) === String(existingConversation.id))
                          ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-200'
                          : 'bg-white border-gray-200 shadow-sm hover:border-emerald-200 hover:shadow-md hover:bg-emerald-50/50'
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
                            {(existingConversation?.unread_count ?? 0) > 0 && (
                              <span className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 px-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                <span className="text-white text-[10px] font-black tracking-tight">
                                  {(existingConversation?.unread_count ?? 0) > 9 ? '9+' : existingConversation?.unread_count}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Enhanced User Info Section */}
                          <div className="min-w-0 flex-1">
                            {/* Name and Time */}
                            <div className="flex items-center justify-between mb-1.5">
                              <h3 className={cn(
                                "text-[15px] truncate",
                                existingConversation?.unread_count ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                              )}>
                                {getFullName(user)}
                              </h3>
                              {existingConversation?.last_message?.created_at && (
                                <span className="text-[10px] text-gray-400 ml-2 whitespace-nowrap font-medium">
                                  {formatDistanceToNow(new Date(existingConversation.last_message.created_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>

                            {/* Badges and Online Status */}
                            <div className="flex items-center gap-2 mb-1.5">
                              {user.user_type && (
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm",
                                  user.user_type === 'vendor' ? "bg-emerald-600 text-white" :
                                    user.user_type === 'administrator' ? "bg-slate-700 text-white" :
                                      "bg-emerald-100/50 text-emerald-700"
                                )}>
                                  {user.user_type === 'vendor' ? 'Vendor' :
                                    user.user_type === 'administrator' ? 'Admin' : 'Buyer'}
                                </span>
                              )}

                              {user.is_online && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Online
                                </span>
                              )}
                            </div>

                            {/* Message Preview or Username */}
                            <div className="flex items-center justify-between">
                              <p className={cn(
                                "text-sm truncate",
                                existingConversation?.unread_count ? "text-emerald-700 font-bold" : "text-gray-400"
                              )}>
                                {existingConversation?.last_message?.content
                                  ? existingConversation.last_message.content
                                  : user.username ? `@${user.username}` : 'Start chatting...'}
                              </p>
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          {selectedParticipant?.id === user.id && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <motion.div
                                layoutId="selection-dot"
                                className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                              />
                            </div>
                          )}
                        </div>
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
      <div className={cn("flex-1 min-h-0", otherParticipant ? "grid grid-rows-[auto,1fr,auto]" : "flex flex-col")}>
        {otherParticipant ? (
          <>
            {/* Chat header */}
            <div className="bg-white/85 backdrop-blur-xl border-b border-emerald-100/60 px-5 py-4 flex-shrink-0 sticky top-0 z-40 shadow-[0_4px_24px_rgba(16,185,129,0.07)] mt-6 mx-2 rounded-t-2xl">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden mr-3 hover:bg-emerald-50 text-emerald-700"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="relative h-11 w-11 rounded-full overflow-hidden ring-2 ring-emerald-50 shadow-sm transition-transform hover:scale-105">
                  {enrichedOtherParticipant?.profile_image || enrichedOtherParticipant?.avatar ? (
                    <img
                      src={getAvatarUrl(enrichedOtherParticipant)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-50">
                      <span className="font-bold text-emerald-700 text-lg">
                        {getUserInitials(enrichedOtherParticipant || undefined)}
                      </span>
                    </div>
                  )}
                  {enrichedOtherParticipant?.is_online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse"></span>
                  )}
                </div>
                <div className="ml-3.5 flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight">
                    {getFullName(enrichedOtherParticipant || undefined)}
                    {enrichedOtherParticipant?.user_type === 'vendor' && (
                      <span className="ml-2 bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none">Vendor</span>
                    )}
                  </h3>
                  <p className="text-[11px] font-medium mt-0.5 flex items-center gap-1.5">
                    {enrichedOtherParticipant?.is_online ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Now
                      </span>
                    ) : (
                      <span className="text-gray-400">{getUserStatus(enrichedOtherParticipant as any)}</span>
                    )}
                  </p>
                </div>
                {/* Settings Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-full transition-all">
                      <Settings className="h-5 w-5" />
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
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-20 md:pb-24 shadow-inner">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] mt-4 text-center p-8 bg-emerald-50/30 rounded-3xl mx-4 border border-emerald-100/50 backdrop-blur-sm shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
                  <div className="w-20 h-20 bg-white/60 rounded-full shadow-lg flex items-center justify-center mb-6 border border-emerald-50 backdrop-blur-md">
                    <MessageSquare className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-xl mb-2">Start a Conversation</h4>
                  <p className="text-sm text-gray-500 max-w-[240px]">
                    Connect with <span className="font-bold text-emerald-700">{getFullName(enrichedOtherParticipant)}</span> to discuss products, orders, and business inquiries.
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
                          'relative rounded-2xl px-4 py-3 max-w-[80%] md:max-w-[65%] group overflow-hidden break-words transition-all duration-200',
                          msg.sender_id === currentUser?.id
                            ? 'bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-600 text-white rounded-tr-sm shadow-lg shadow-emerald-200/50'
                            : 'bg-white border border-gray-100/80 text-gray-800 rounded-tl-sm shadow-md shadow-gray-100/70',
                          msg.sender_id !== currentUser?.id ? 'ml-9 md:ml-10' : 'mr-9 md:mr-10'
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
              className="sticky bottom-0 bg-white p-3 md:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 border-t-2 border-gray-200"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            >
              {/* File preview */}
              {selectedFile && (
                <div className="absolute bottom-full left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-emerald-50 shadow-2xl animate-in slide-in-from-bottom-5">
                  <div className="flex items-center justify-between max-w-lg mx-auto bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    <div className="flex items-center space-x-3 truncate">
                      {selectedFile.type.startsWith('image/') ? (
                        <div className="h-14 w-14 rounded-xl overflow-hidden shadow-md ring-2 ring-white">
                          <img src={filePreviewUrl!} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Paperclip className="h-6 w-6 text-emerald-500" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-bold text-gray-800 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }} className="h-8 w-8 rounded-full hover:bg-white text-gray-400">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="flex items-end gap-3 max-w-6xl mx-auto">
                  {/* File upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-emerald-600 transition-all rounded-full hover:bg-emerald-50 active:scale-90"
                    aria-label="Attach file"
                    disabled={isSending || isUploading}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf"
                  />

                  {/* Message input */}
                  <div className={cn(
                    "relative flex-1 transition-all duration-500",
                    !isInputFocused && !message ? "max-w-[280px] md:max-w-none" : "max-w-none"
                  )}>
                    <textarea
                      ref={textareaRef}
                      placeholder={editingMessageId ? 'Revise your message...' : 'Message...'}
                      className={cn(
                        "w-full min-h-[46px] max-h-40 overflow-y-auto resize-none py-3 pr-12 bg-gray-50/50 border border-emerald-100/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 text-[15px] transition-all shadow-inner placeholder:text-gray-300",
                        !isInputFocused && !message ? "rounded-full px-6" : "rounded-[24px] px-5"
                      )}
                      rows={1}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        resizeComposer();
                      }}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }
                        if (e.key === 'Escape' && editingMessageId) {
                          cancelEditing();
                        }
                      }}
                    />

                    {/* Character limit/indicator could go here */}
                    {(message || editingMessageId) && (
                      <button
                        type="button"
                        onClick={() => (editingMessageId ? cancelEditing() : setMessage(''))}
                        className="absolute right-3.5 bottom-3 p-1.5 rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100/50 transition-colors"
                        aria-label={editingMessageId ? 'Cancel edit' : 'Clear message'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Emoji Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-3 text-gray-400 hover:text-amber-500 transition-all rounded-full hover:bg-amber-50 active:scale-90"
                      aria-label="Add emoji"
                      disabled={isSending}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-16 right-0 z-50 shadow-2xl rounded-2xl border border-emerald-50 animate-in fade-in zoom-in-95 duration-200">
                        <Picker
                          data={data}
                          onEmojiSelect={(emoji: any) => {
                            setMessage(prev => prev + emoji.native);
                            setShowEmojiPicker(false);
                            setTimeout(resizeComposer, 0);
                          }}
                          theme="light"
                          set="native"
                        />
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  <Button
                    type="submit"
                    disabled={(!message.trim() && !selectedFile) || isSending || isUploading}
                    className={cn(
                      "h-12 w-12 p-0 rounded-full shadow-lg transition-all active:scale-90 flex-shrink-0 disabled:opacity-40",
                      message.trim() || selectedFile
                        ? "bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-emerald-200/50 text-white"
                        : "bg-emerald-50 text-emerald-200 shadow-none cursor-not-allowed"
                    )}
                    aria-label={editingMessageId ? 'Update message' : 'Send message'}
                  >
                    {isSending || isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className={cn("w-5 h-5", message.trim() || selectedFile ? "ml-0.5" : "")} />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-emerald-100/30 blur-3xl animate-pulse" />
              <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-green-100/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {isMobile && (
              <Button
                variant="ghost"
                className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5 text-emerald-700" />
              </Button>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-md relative z-10 flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center mb-8 shadow-inner ring-8 ring-white/50 relative">
                <MessageSquare className="w-10 h-10 text-emerald-500 relative z-10" />
                <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur animate-ping" />
              </div>

              <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-800 to-green-600 bg-clip-text text-transparent mb-4">
                Your Messages
              </h3>
              <p className="text-gray-500 mb-10 leading-relaxed text-balance">
                Choose a conversation from the left, or start a new chat to send a message.
              </p>

              {isMobile ? (
                <Button
                  onClick={() => setIsSidebarOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-7 shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all font-bold text-lg active:scale-95"
                >
                  <MessageSquare className="w-5 h-5 mr-3" />
                  View Conversations
                </Button>
              ) : (
                <div className="flex gap-3 items-center text-sm font-bold text-emerald-600/80 bg-emerald-50/50 px-6 py-3 rounded-full border border-emerald-100/50 backdrop-blur-sm">
                  <ArrowLeft className="w-4 h-4 animate-bounce-x" /> Select a chat to start typing
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MessagesPage;