import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Menu,
  Loader2,
  ArrowLeft,
  Search,
  X,
  Smile,
  Paperclip,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
  Users,
  Clock,
  Star,
  Bell,
  Moon,
  Sun,
  Download,
} from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useToast } from '@/components/ui/use-toast';
import { useAppSelector } from '@/lib/hooks';
import api, { messagingAPI, adminAPI, authAPI, buildApiUrl, resolveMediaUrl } from '@/services/api';
import { User as BaseUser, Conversation, Message } from '@/types/user';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import MessageSettings from '@/components/messaging/MessageSettings';

type User = BaseUser & {
  display_name?: string;
  avatar?: string;
  image?: string;
  is_online?: boolean;
  username?: string;
};

/**
 * Luxury palette tokens (from Home.tsx design)
 * Deep emerald + champagne gold accents = premium, editorial feel.
 */
const LUX = {
  ink: '#04130E',
  emeraldDeep: '#022C22',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',
  paper: '#FBF9F4',
};

const getUserInitials = (user?: User | null): string => {
  if (!user) return '';
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  if (user.full_name) {
    const names = user.full_name.split(' ').filter(Boolean);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
  }
  return user.email?.[0]?.toUpperCase() || '';
};

const getAvatarUrl = (user?: User | null): string | undefined => {
  if (!user) return undefined;
  const imageUrl = user.profile_image || user.avatar || user.image;
  return resolveMediaUrl(imageUrl);
};

const getFullName = (user?: User | null): string => {
  if (!user) return 'Unknown User';
  if (user.full_name) return user.full_name;
  if (user.username) return user.username;
  if (user.email) return user.email.split('@')[0];
  return 'Unknown User';
};

const getUserTypeDisplay = (user?: User | null): string => {
  if (!user?.user_type) return '';
  const types: Record<string, string> = {
    vendor: 'Vendor',
    buyer: 'Buyer',
    administrator: 'Admin',
  };
  return types[user.user_type] || user.user_type;
};

const getUserStatus = (user?: User | null): string => {
  if (!user) return 'Offline';
  if (user.is_online) return 'Online';
  if (user.last_seen) {
    return `Last seen ${formatDistanceToNow(new Date(user.last_seen))} ago`;
  }
  return 'Offline';
};

const getUserStatusColor = (user?: User | null): string => {
  if (!user) return 'gray';
  return user.is_online ? 'green' : 'gray';
};

const formatLastMessage = (content?: string): string => {
  if (!content) return '';
  if (content.includes('[ATTACHMENT:')) {
    const isImage =
      content.includes('"isImage":true') ||
      content.includes('"fileType":"image') ||
      content.toLowerCase().includes('.png') ||
      content.toLowerCase().includes('.jpg') ||
      content.toLowerCase().includes('.jpeg') ||
      content.toLowerCase().includes('.webp') ||
      content.toLowerCase().includes('.gif');
    const prefix = isImage ? '📷 Image' : '📁 File';
    const attachmentIndex = content.indexOf('[ATTACHMENT:');
    const textBefore = content.substring(0, attachmentIndex).trim();
    if (textBefore) {
      return `${prefix}: ${textBefore}`;
    }
    return prefix;
  }
  return content;
};

function MessagesPage() {
  const { toast } = useToast();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, loading: authLoading } = useAppSelector((state) => state.auth);

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('messages-theme') === 'dark';
    } catch {
      return true;
    }
  });

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
  const [inputHasText, setInputHasText] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('msg_notify_enabled') === '1';
    } catch {
      return false;
    }
  });

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastNotifiedMessageId = useRef<string | number | null>(null);
  const inputRafRef = useRef<number | null>(null);
  const BASE_INPUT_HEIGHT = 36;

  const resizeComposer = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newH = Math.min(ta.scrollHeight, 200);
    ta.style.height = `${Math.max(BASE_INPUT_HEIGHT, newH)}px`;
  }, []);

  const compressImageFile = useCallback(
    (file: File, maxDim = 1280, quality = 0.7): Promise<string> => {
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
    },
    []
  );

  const WS_ENABLED =
    ((import.meta as any).env?.VITE_WS_ENABLED || '').toString().toLowerCase() === 'true';

  // Theme toggle effect
  useEffect(() => {
    try {
      localStorage.setItem('messages-theme', darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode]);

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return messagingAPI.updateMessage(id, { content });
    },
    onMutate: async ({ id, content }) => {
      if (!conversationId) return;
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const previous = queryClient.getQueryData<Message[]>(['messages', conversationId]) || [];
      queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) =>
        old.map((m) =>
          String(m.id) === String(id)
            ? { ...m, content, updated_at: new Date().toISOString() }
            : m
        )
      );
      queryClient.setQueryData<Conversation[]>(['conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) => {
          if (
            conv.id === conversationId &&
            conv.last_message &&
            String(conv.last_message.id) === String(id)
          ) {
            const updated = {
              ...conv,
              last_message: { ...conv.last_message, content, updated_at: new Date().toISOString() },
            } as Conversation;
            return updated;
          }
          return conv;
        });
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
    },
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Message updated' });
    },
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
      const next = (previous || []).filter((m) => String(m.id) !== String(id));
      queryClient.setQueryData<Message[]>(['messages', conversationId], next);
      const newLast = next.length ? next[next.length - 1] : undefined;
      queryClient.setQueryData<Conversation[]>(['conversations'], (old) => {
        if (!old) return old;
        return old.map((conv) =>
          conv.id === conversationId
            ? ({ ...conv, last_message: newLast } as Conversation)
            : conv
        );
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
    },
  });

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingOriginalContent(msg.content || '');
    setMessage(msg.content || '');
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.value = msg.content || '';
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.max(
          BASE_INPUT_HEIGHT,
          Math.min(textareaRef.current.scrollHeight, 200)
        )}px`;
      }
      setInputHasText(!!(msg.content || ''));
    }, 0);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingOriginalContent('');
    setMessage('');
    setInputHasText(false);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = `${BASE_INPUT_HEIGHT}px`;
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuOpenId !== null) setActionMenuOpenId(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (!conversationId) return;
    queryClient.setQueryData<Conversation[]>(
      ['conversations', currentUser?.id],
      (old) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === conversationId ? ({ ...c, unread_count: 0 } as Conversation) : c
        );
      }
    );
  }, [conversationId, currentUser?.id, queryClient]);

  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView);
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { data: availableUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['messaging-users', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        let users: User[] = [];
        let response;
        if (currentUser.user_type === 'buyer') {
          response = await adminAPI.getUsers({
            user_type: 'vendor',
            status: 'approved',
          });
          users = Array.isArray(response.data) ? response.data : [];
        } else if (currentUser.user_type === 'vendor') {
          response = await adminAPI.getUsers({
            user_type: 'administrator',
          });
          users = Array.isArray(response.data) ? response.data : [];
          users = users.filter((user) => user.id !== currentUser.id);
        } else {
          const [vendorsResponse, adminsResponse] = await Promise.all([
            adminAPI.getUsers({ user_type: 'vendor' }),
            adminAPI.getUsers({ user_type: 'administrator' }),
          ]);
          const allUsers = [
            ...(Array.isArray(vendorsResponse.data) ? vendorsResponse.data : []),
            ...(Array.isArray(adminsResponse.data) ? adminsResponse.data : []),
          ];
          const userMap = new Map();
          allUsers.forEach((user) => {
            if (user.id !== currentUser.id) {
              userMap.set(user.id, user);
            }
          });
          users = Array.from(userMap.values());
        }
        return users.filter((user) => user.is_active !== false);
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

  const {
    data: conversations = [],
    refetch: refetchConversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        return [];
      }
      try {
        const response = await messagingAPI.getConversations();
        if (!response?.data || !Array.isArray(response.data)) {
          toast({
            title: 'Error',
            description: 'Received invalid conversations data from server',
            variant: 'destructive',
          });
          return [];
        }
        const filteredConversations = response.data.filter((conversation) => {
          try {
            if (!conversation?.id) {
              return false;
            }
            if (!conversation.participants || !Array.isArray(conversation.participants)) {
              return false;
            }
            if (conversation.is_group) {
              return false;
            }
            const participants = Array.isArray(conversation.participants)
              ? conversation.participants
              : [];
            if (participants.length !== 2) {
              return false;
            }
            const isParticipant = participants.some((participant: unknown) => {
              try {
                const participantId =
                  participant && typeof participant === 'object' && 'id' in participant
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
        throw error;
      }
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!currentUser?.id,
  });

  const unreadTotal = useMemo(() => {
    try {
      return (conversations || []).reduce(
        (sum: number, c: any) => sum + (c?.unread_count || 0),
        0
      );
    } catch {
      return 0;
    }
  }, [conversations]);

  const {
    data: messagesData = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
    error: messagesError,
  } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) {
        return [];
      }
      try {
        const response = await messagingAPI.getMessages(conversationId);
        if (!response?.data || !Array.isArray(response.data)) {
          return [];
        }
        const validMessages = response.data.filter((msg): msg is Message => {
          if (!msg || typeof msg !== 'object') {
            return false;
          }
          const hasValidId = typeof msg.id === 'string' || typeof msg.id === 'number';
          const hasValidContent = typeof msg.content === 'string';
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
        throw error;
      }
    },
    enabled: !!conversationId,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5000,
  });

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

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const id = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(id);
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    try {
      localStorage.setItem('msg_notify_enabled', notifyEnabled ? '1' : '0');
    } catch {}
  }, [notifyEnabled]);

  const getUserDisplayName = (user: User): string => {
    const name = [user.full_name, user.username, user.email?.split('@')[0], 'User'].find(Boolean);
    return typeof name === 'string' ? name : 'User';
  };

  const otherParticipant = useMemo(() => {
    if (!currentUser?.id) return null;
    if (selectedParticipant) {
      return selectedParticipant;
    }
    if (!conversationId || !conversations) return null;
    const conversation = conversations.find(
      (c: Conversation) => String(c.id) === String(conversationId)
    );
    if (!conversation) return null;
    const otherParticipant = conversation.participants?.find((p: unknown) => {
      if (p && typeof p === 'object' && 'id' in p) {
        return String((p as { id: string }).id) !== String(currentUser.id);
      }
      return String(p) !== String(currentUser.id);
    });
    if (!otherParticipant) return null;
    if (typeof otherParticipant === 'string') {
      return availableUsers?.find((u: User) => u.id === otherParticipant) || null;
    }
    return otherParticipant as User;
  }, [conversationId, conversations, currentUser, availableUsers, selectedParticipant]);

  const [otherDetails, setOtherDetails] = useState<User | null>(null);
  const enrichedOtherParticipant = useMemo(() => {
    if (!otherParticipant) return null;
    return { ...otherParticipant, ...otherDetails } as User;
  }, [otherParticipant, otherDetails]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryRef = useRef<number>(0);

  useEffect(() => {
    if (!WS_ENABLED || !conversationId) return;
    const buildUrl = (accessToken: string) => {
      const explicit = (import.meta as any).env?.VITE_WS_URL as string | undefined;
      if (explicit) {
        try {
          const u = new URL(explicit);
          u.pathname = `/ws/chat/${conversationId}/`;
          u.search = `?token=${encodeURIComponent(accessToken)}`;
          return u.toString();
        } catch {}
      }
      const apiBase = buildApiUrl();
      const origin =
        apiBase ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
      try {
        const u = new URL(origin);
        const pageIsHttps =
          typeof window !== 'undefined' && window.location.protocol === 'https:';
        u.protocol = pageIsHttps ? 'wss:' : u.protocol === 'https:' ? 'wss:' : 'ws:';
        u.pathname = `/ws/chat/${conversationId}/`;
        u.search = `?token=${encodeURIComponent(accessToken)}`;
        return u.toString();
      } catch {
        const pageIsHttps =
          typeof window !== 'undefined' && window.location.protocol === 'https:';
        const proto = pageIsHttps ? 'wss' : 'ws';
        return `${proto}://localhost:8000/ws/chat/${conversationId}/?token=${encodeURIComponent(
          accessToken
        )}`;
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
      if (!token) return;
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }
      const wsUrl = buildUrl(token);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        retryRef.current = 0;
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'user_status' || data?.type === 'broadcast_user_status') {
            if (String(data.user_id) === String(otherParticipant?.id)) {
              setOtherDetails(
                (prev) =>
                  ({
                    ...(prev || ({} as any)),
                    is_online: !!data.is_online,
                  } as any)
              );
            }
          }
        } catch (e) {}
      };
      ws.onerror = (err) => {
        console.warn('WebSocket error', err);
      };
      ws.onclose = async (ev) => {
        wsRef.current = null;
        console.warn('WebSocket closed', { code: ev.code, reason: ev.reason });
        if (ev.code === 4001) {
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
          } catch (_) {}
        }
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

  useEffect(() => {
    if (conversationId && conversations.length > 0 && !isLoadingConversations) {
      const exists = conversations.some((c) => String(c.id) === String(conversationId));
      if (!exists && !selectedParticipant) {
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
        const users = Array.isArray(response.data)
          ? response.data
          : response.data?.results ?? [];
        const found = users.find((u: any) => String(u.id) === String(otherParticipant.id));
        if (!cancelled && found) setOtherDetails(found);
      } catch (_) {}
    };
    fetchUserDetails();
    intervalId = window.setInterval(fetchUserDetails, 30000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [otherParticipant?.id]);

  useEffect(() => {
    if (!conversationId || !currentUser?.id) return;
    if (isLoadingConversations) return;
    const alreadyLoaded = conversations?.some(
      (c: Conversation) => String(c.id) === String(conversationId)
    );
    if (alreadyLoaded) return;
    const fetchMissingConversation = async () => {
      try {
        const response = await messagingAPI.getConversation(conversationId);
        if (response?.data) {
          queryClient.setQueryData<Conversation[]>(
            ['conversations', currentUser?.id],
            (old = []) => {
              const exists = old.some((c) => String(c.id) === String(conversationId));
              if (exists) return old;
              return [response.data, ...old];
            }
          );
        }
      } catch (err) {
        console.warn('Failed to load conversation by URL ID:', conversationId, err);
        navigate('/messages', { replace: true });
      }
    };
    fetchMissingConversation();
  }, [conversationId, conversations, currentUser?.id, queryClient, navigate, isLoadingConversations]);

  useEffect(() => {
    if (isMobile && conversationId) {
      setIsSidebarOpen(false);
    }
  }, [conversationId, isMobile]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    return messages;
  }, [messages]);

  const markMessagesAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!conversationId || !currentUser?.id || messageIds.length === 0) return;
      try {
        queryClient.setQueryData<Message[]>(
          ['messages', conversationId],
          (old = []) =>
            old.map((msg) =>
              messageIds.includes(msg.id) && !msg.is_read
                ? {
                    ...msg,
                    is_read: true,
                    read_at: new Date().toISOString(),
                  }
                : msg
            )
        );
        await messagingAPI.markMessagesAsRead(conversationId, messageIds);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['messages', conversationId],
            refetchType: 'active',
          }),
          queryClient.invalidateQueries({
            queryKey: ['conversations', currentUser?.id],
            refetchType: 'active',
          }),
        ]);
        window.dispatchEvent(new CustomEvent('messagesRead'));
      } catch (error) {
        queryClient.invalidateQueries({
          queryKey: ['messages', conversationId],
          refetchType: 'active',
        });
      }
    },
    [conversationId, currentUser?.id, queryClient]
  );

  useEffect(() => {
    if (!conversationId || !currentUser?.id || !messages?.length) return;
    const unreadMessages = messages.filter((msg) => {
      if (!msg || msg.is_read) return false;
      const senderId = (msg as any).sender_id ?? (msg as any).sender?.id;
      if (!senderId) return false;
      return String(senderId) !== String(currentUser.id);
    });
    if (unreadMessages.length === 0) return;
    const messageIds = unreadMessages.map((msg) => msg.id).filter(Boolean);
    if (messageIds.length === 0) return;
    const timer = setTimeout(() => {
      markMessagesAsRead(messageIds);
    }, 100);
    return () => clearTimeout(timer);
  }, [conversationId, currentUser?.id, messages, markMessagesAsRead]);

  useEffect(() => {
    if (!Array.isArray(messages) || !currentUser?.id) return;
    const latestIncoming = [...messages]
      .filter((m) => m && m.sender_id !== currentUser.id)
      .slice(-1)[0];
    if (!latestIncoming) return;
    const latestId = latestIncoming.id;
    if (latestId && latestId !== lastNotifiedMessageId.current) {
      lastNotifiedMessageId.current = latestId;
      const senderName =
        latestIncoming.sender?.full_name || latestIncoming.sender_name || 'New message';
      const preview =
        typeof latestIncoming.content === 'string'
          ? latestIncoming.content.slice(0, 120)
          : '';
      if (notifyEnabled) {
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().then(() => {});
            }
            if (
              Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              new Notification(senderName, {
                body: preview || 'New message',
                silent: false,
              });
            }
          }
        } catch {}
      }
    }
  }, [messages, currentUser?.id, notifyEnabled]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, recipientId }: { content: string; recipientId: string }) => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      setIsSending(true);
      let targetConversationId = conversationId;
      let targetRecipientId = recipientId;
      if (!targetRecipientId && targetConversationId) {
        const conversation = conversations?.find((c) => c.id === targetConversationId);
        if (conversation?.participants) {
          const otherParticipant = conversation.participants.find((p) => {
            const participantId = typeof p === 'object' ? p.id : p;
            return participantId && participantId !== currentUser.id;
          });
          if (otherParticipant) {
            targetRecipientId =
              typeof otherParticipant === 'object'
                ? otherParticipant.id
                : otherParticipant;
          }
        }
      }
      if (!targetRecipientId) {
        const errorMsg =
          'No recipient specified and could not determine recipient from conversation';
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
        sender_name: undefined,
      };
      if (targetConversationId) {
        queryClient.setQueryData<Message[]>(['messages', targetConversationId], (old = []) => [
          ...old,
          tempMessage,
        ]);
      }
      try {
        if (!targetConversationId) {
          try {
            const conversationResponse = await messagingAPI.getOrCreateConversation(
              targetRecipientId
            );
            if (conversationResponse?.data?.id) {
              targetConversationId = conversationResponse.data.id;
              navigate(`/messages/${targetConversationId}`, { replace: true });
              queryClient.setQueryData<Conversation[]>(
                ['conversations', currentUser?.id],
                (old = []) => {
                  if (!conversationResponse.data) {
                    return old || [];
                  }
                  return [conversationResponse.data, ...(old || [])];
                }
              );
              if (!targetConversationId) {
                const errorMsg = 'No conversation ID available after creation';
                throw new Error(errorMsg);
              }
              tempMessage.conversation_id = targetConversationId;
              tempMessage.conversation = targetConversationId;
              queryClient.setQueryData<Message[]>(
                ['messages', targetConversationId],
                (old = []) => {
                  return [tempMessage];
                }
              );
            } else {
              throw new Error('Failed to create conversation');
            }
          } catch (error) {
            throw new Error('Failed to start conversation');
          }
        }
        const response = await messagingAPI.sendMessage(
          targetConversationId!,
          content,
          targetRecipientId
        );
        queryClient.setQueryData<Message[]>(['messages', targetConversationId], (old = []) => {
          if (!old) return [response.data];
          return old.map((msg) =>
            msg.temp_id === tempMessageId ? { ...response.data, status: 'sent' } : msg
          );
        });
        queryClient.setQueryData<Conversation[]>(
          ['conversations', currentUser?.id],
          (old = []) => {
            if (!old) return old;
            return old.map((conv) => {
              if (conv.id === targetConversationId) {
                return {
                  ...conv,
                  last_message: response.data,
                  updated_at: new Date().toISOString(),
                  unread_count: 0,
                };
              }
              return conv;
            });
          }
        );
        return response.data;
      } finally {
        setIsSending(false);
      }
    },
    onMutate: async ({ content, recipientId }) => {
      const tempMessageId = `temp-${Date.now()}`;
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const previousMessages =
        queryClient.getQueryData<Message[]>(['messages', conversationId]) || [];
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
        conversation: '',
      };
      if (conversationId) {
        queryClient.setQueryData<Message[]>(
          ['messages', conversationId],
          (old = []) => [...old, optimisticMessage]
        );
      }
      return {
        previousMessages,
        tempMessageId,
        optimisticMessage,
      };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser?.id] });
      setMessage('');
      removeSelectedFile();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (error, variables, context) => {
      console.error('Error sending message:', error);
      if (conversationId) {
        queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => {
          if (!old) return [];
          return old.map((msg) => {
            if (msg.temp_id === context?.tempMessageId) {
              return {
                ...msg,
                status: 'error',
                error: error.message || 'Failed to send message',
              };
            }
            return msg;
          });
        });
      }
      toast({
        title: 'Message not sent',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
        action: (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (variables.content && variables.recipientId) {
                sendMessageMutation.mutate({
                  content: variables.content,
                  recipientId: variables.recipientId,
                });
              }
            }}
          >
            Retry
          </Button>
        ),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser?.id] });
    },
  });

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
      const convsResponse = await messagingAPI.getConversations();
      const conversations = Array.isArray(convsResponse.data) ? convsResponse.data : [];
      queryClient.setQueryData(['conversations', currentUser?.id], conversations);
      const existingConv = conversations.find((conv) => {
        if (!conv?.participants) return false;
        const participantIds = conv.participants.map((p: unknown) =>
          typeof p === 'object' && p !== null && 'id' in p ? (p as { id: string }).id : p
        );
        return participantIds.includes(user.id);
      });
      let conversation = existingConv;
      if (!existingConv) {
        const createResponse = await messagingAPI.createConversation([user.id]);
        if (!createResponse?.data) {
          throw new Error('Failed to create conversation: No data in response');
        }
        conversation = createResponse.data;
        queryClient.setQueryData(
          ['conversations', currentUser?.id],
          (old: Conversation[] | undefined) =>
            Array.isArray(old) ? [...old, conversation] : [conversation]
        );
      }
      if (!conversation?.id) {
        throw new Error('Failed to get or create conversation: No conversation ID');
      }
      if (isMobile) {
        setIsSidebarOpen(false);
      }
      navigate(`/messages/${conversation.id}`);
      queryClient.invalidateQueries({
        queryKey: ['messages', conversation.id],
        refetchType: 'active',
      });
    } catch (error) {
      console.error('Error in handleStartConversation:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start conversation';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const next = target.value;
    if (inputRafRef.current) cancelAnimationFrame(inputRafRef.current);
    inputRafRef.current = requestAnimationFrame(() => {
      target.style.height = 'auto';
      const newH = Math.min(target.scrollHeight, 200);
      target.style.height = `${Math.max(BASE_INPUT_HEIGHT, newH)}px`;
    });
    setMessage((prev) => (prev === next ? prev : next));
    if (next.length === 0) {
      target.style.height = `${BASE_INPUT_HEIGHT}px`;
    }
  };

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
    const rawValue = textareaRef.current?.value ?? message;
    const trimmedMessage = rawValue.trim();
    if (!trimmedMessage && !selectedFile) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message or select a file to send',
        variant: 'destructive',
      });
      return;
    }
    if (trimmedMessage.length > 2000) {
      toast({
        title: 'Message Too Long',
        description: 'Message must be less than 2000 characters',
        variant: 'destructive',
      });
      return;
    }
    if (!currentUser?.id) {
      toast({
        title: 'Not Logged In',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }
    if (editingMessageId) {
      try {
        await updateMessageMutation.mutateAsync({
          id: String(editingMessageId),
          content: trimmedMessage,
        });
        setEditingMessageId(null);
        setEditingOriginalContent('');
        setMessage('');
        removeSelectedFile();
      } catch (error) {}
      return;
    }
    let targetConversationId = conversationId;
    let targetRecipientId: string | undefined;
    let targetConversation: Conversation | undefined;
    if (targetConversationId && conversations) {
      targetConversation = conversations.find((c) => c.id === targetConversationId);
      if (targetConversation?.participants) {
        const otherParticipant = targetConversation.participants.find((p) => {
          try {
            const participantId =
              p && typeof p === 'object' && 'id' in p ? p.id : p;
            return String(participantId) !== String(currentUser?.id);
          } catch (e) {
            console.warn('Error processing participant:', p, e);
            return false;
          }
        });
        if (otherParticipant) {
          targetRecipientId =
            typeof otherParticipant === 'object' ? otherParticipant.id : otherParticipant;
        }
      }
    } else if (selectedParticipant?.id) {
      targetRecipientId = selectedParticipant.id;
      if (conversations) {
        const existingConv = conversations.find((conv) => {
          if (!conv?.participants) return false;
          return conv.participants.some((p) => {
            const participantId =
              p && typeof p === 'object' && 'id' in p ? p.id : p;
            return String(participantId) === String(targetRecipientId);
          });
        });
        if (existingConv) {
          targetConversationId = existingConv.id;
          targetConversation = existingConv;
          navigate(`/messages/${targetConversationId}`, { replace: true });
        }
      }
    }
    if (!targetRecipientId && !targetConversationId) {
      toast({
        title: 'No Recipient',
        description: 'Please select a recipient to send a message',
        variant: 'destructive',
      });
      return;
    }
    let isCreatingConversation = false;
    if (!targetConversationId && targetRecipientId) {
      isCreatingConversation = true;
      try {
        const loadingToast = toast({
          title: 'Please wait',
          description: 'Starting conversation...',
          variant: 'default',
          duration: 0,
        });
        const response = await messagingAPI.getOrCreateConversation(targetRecipientId);
        if (response?.data?.id) {
          targetConversationId = response.data.id;
          navigate(`/messages/${targetConversationId}`, { replace: true });
          queryClient.setQueryData(['conversations'], (old: any) => {
            const updated = Array.isArray(old)
              ? old.some((c: any) => c.id === response.data.id)
                ? old
                : [response.data, ...old]
              : [response.data];
            return updated;
          });
          await queryClient.invalidateQueries({
            queryKey: ['messages', targetConversationId],
            refetchType: 'active',
          });
          await new Promise((resolve) => setTimeout(resolve, 200));
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
        toast({
          title: 'Error',
          description: `Failed to start conversation: ${errorMessage}`,
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }
    }
    if (!targetConversationId) {
      toast({
        title: 'Error',
        description: 'Could not create or find conversation',
        variant: 'destructive',
      });
      return;
    }
    if (isCreatingConversation) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
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
        profile_image: currentUser.profile_image,
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
      recipient_id: targetRecipientId || '',
    };
    queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
      return Array.isArray(old) ? [...old, tempMessage] : [tempMessage];
    });
    setMessage('');
    setInputHasText(false);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = `${BASE_INPUT_HEIGHT}px`;
    }
    try {
      if (!targetConversationId) {
        throw new Error('No conversation ID available');
      }
      let attachment = null;
      if (selectedFile) {
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
        try {
          queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((m) =>
              m.id === tempId
                ? {
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
                        })}]`,
                  }
                : m
            );
          });
        } catch {}
      }
      console.log('Sending message to API...');
      let messageContent = trimmedMessage;
      if (attachment) {
        const attachmentData = {
          type: 'file_attachment',
          name: attachment.name,
          size: attachment.size,
          fileType: attachment.type,
          dataUrl: attachment.dataUrl,
          isImage: attachment.isImage,
        };
        if (trimmedMessage) {
          messageContent = `${trimmedMessage}\n\n[ATTACHMENT:${JSON.stringify(attachmentData)}]`;
        } else {
          messageContent = `[ATTACHMENT:${JSON.stringify(attachmentData)}]`;
        }
      }
      removeSelectedFile();
      const { data } = await messagingAPI.sendMessage(
        targetConversationId,
        messageContent,
        targetRecipientId!
      );
      const serverMessage = data;
      console.log('Message sent via API:', serverMessage);
      queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((msg) =>
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
                updated_at: serverMessage.updated_at || new Date().toISOString(),
              }
            : msg
        );
      });
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((conv) =>
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
                    profile_image: currentUser.profile_image,
                  },
                },
                updated_at: new Date().toISOString(),
              }
            : conv
        );
      });
      console.log('Message sent successfully, polling will handle updates');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['messages', targetConversationId],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['conversations'],
          refetchType: 'active',
        }),
      ]);
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      queryClient.setQueryData(['messages', targetConversationId], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Failed to send message',
              }
            : msg
        );
      });
      toast({
        title: 'Failed to send message',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while sending your message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: darkMode
            ? `linear-gradient(135deg, ${LUX.ink}, ${LUX.emeraldDeep})`
            : `linear-gradient(135deg, ${LUX.cream}, #ffffff 50%, #ecf6f1)`,
        }}
      >
        <motion.div
          className="text-center p-10 rounded-3xl shadow-2xl max-w-md mx-4 border"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: darkMode ? 'rgba(15,25,40,0.95)' : '#fff',
            borderColor: darkMode ? `${LUX.gold}44` : 'rgba(6,78,59,0.15)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
            }}
          >
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: LUX.goldSoft }} />
          </div>
          <h2
            className="font-serif text-2xl font-bold mb-2"
            style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
          >
            Loading...
          </h2>
          <p style={{ color: darkMode ? 'rgba(255,255,255,0.7)' : '#4b5563' }}>
            Please wait while we load your messages
          </p>
        </motion.div>
      </div>
    );
  }

  if (!currentUser?.id) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: darkMode
            ? `linear-gradient(135deg, ${LUX.ink}, ${LUX.emeraldDeep})`
            : `linear-gradient(135deg, ${LUX.cream}, #ffffff 50%, #ecf6f1)`,
        }}
      >
        <motion.div
          className="text-center p-10 rounded-3xl shadow-2xl max-w-md mx-4 border"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: darkMode ? 'rgba(15,25,40,0.95)' : '#fff',
            borderColor: darkMode ? `${LUX.gold}44` : 'rgba(6,78,59,0.15)',
          }}
        >
          <h2
            className="font-serif text-2xl font-bold mb-2"
            style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
          >
            Authentication Required
          </h2>
          <p className="mb-6" style={{ color: darkMode ? 'rgba(255,255,255,0.7)' : '#4b5563' }}>
            Please log in to view messages
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="px-7 py-3 rounded-xl font-semibold text-white tracking-wide"
            style={{
              background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
            }}
          >
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex overflow-hidden',
        isMobile ? 'h-[calc(100dvh-64px)] pt-6 px-3 pb-3' : 'h-[calc(100dvh-64px)] pt-6 px-3 pb-3 gap-3'
      )}
      style={{
        background: darkMode
          ? `linear-gradient(135deg, ${LUX.ink} 0%, ${LUX.emeraldDeep} 50%, ${LUX.ink} 100%)`
          : LUX.cream,
      }}
    >
      {/* Luxury gradient overlay for dark mode */}
      {darkMode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.08), transparent 55%)',
          }}
        />
      )}

      {/* Mobile backdrop when sidebar is open */}
      {isMobile && isSidebarOpen && (
        <motion.div
          className="absolute inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: darkMode ? 'rgba(4,19,14,0.6)' : 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={cn(
          'flex flex-col transition-all duration-300 ease-in-out z-50 overflow-hidden',
          isMobile
            ? 'absolute left-0 top-6 h-[calc(100%-24px)] border-r'
            : 'border rounded-2xl',
          isSidebarOpen ? 'w-[300px] sm:w-[340px]' : 'w-0'
        )}
        style={{
          background: darkMode
            ? 'linear-gradient(180deg, rgba(2,44,34,0.92) 0%, rgba(4,19,14,0.95) 100%)'
            : 'rgba(255,255,255,0.98)',
          borderColor: darkMode ? `${LUX.gold}33` : 'rgba(6,78,59,0.15)',
          boxShadow: darkMode ? '0 20px 60px -20px rgba(0,0,0,0.6)' : '0 20px 60px -20px rgba(6,78,59,0.15)',
        }}
        initial={false}
        animate={{
          width: isSidebarOpen ? (isMobile ? 300 : 340) : 0,
          x: isMobile && !isSidebarOpen ? -300 : 0,
        }}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Header with theme toggle */}
          <div
            className={cn(
              'px-5 pb-4 border-b sticky top-0 z-10',
              isMobile ? 'pt-6' : 'pt-5'
            )}
            style={{
              background: darkMode ? 'rgba(2,44,34,0.6)' : 'rgba(255,255,255,0.9)',
              borderColor: darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    boxShadow: `0 8px 24px -8px ${LUX.emerald}`,
                  }}
                >
                  <MessageSquare className="w-4.5 h-4.5" style={{ color: LUX.goldSoft }} />
                </div>
                <h2
                  className="font-serif text-xl font-semibold"
                  style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                >
                  Messages
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Theme Toggle Button */}
                <motion.button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-xl transition-all"
                  style={{
                    background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(6,78,59,0.08)',
                    border: `1px solid ${darkMode ? `${LUX.gold}33` : 'rgba(6,78,59,0.15)'}`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" style={{ color: LUX.goldSoft }} />
                  ) : (
                    <Moon className="h-4 w-4" style={{ color: LUX.emerald }} />
                  )}
                </motion.button>
                {isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-xl transition-colors"
                    style={{
                      background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(6,78,59,0.08)',
                      border: `1px solid ${darkMode ? `${LUX.gold}33` : 'rgba(6,78,59,0.15)'}`,
                    }}
                  >
                    <X
                      className="h-4 w-4"
                      style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                    />
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 z-10"
                style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-3 rounded-xl h-11 text-sm transition-all outline-none"
                style={{
                  background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(6,78,59,0.04)',
                  border: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'}`,
                  color: darkMode ? '#fff' : LUX.emeraldDeep,
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Users List */}
          <div
            className="messages-page-scroll flex-1 min-h-0 overflow-y-auto pt-2 pb-6"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: darkMode ? `${LUX.gold}44 transparent` : `${LUX.emerald}44 transparent`,
            }}
          >
            <style>{`
              .messages-page-scroll::-webkit-scrollbar {
                width: 6px;
              }
              .messages-page-scroll::-webkit-scrollbar-track {
                background: ${darkMode ? 'transparent' : 'rgba(6,78,59,0.05)'};
                border-radius: 10px;
              }
              .messages-page-scroll::-webkit-scrollbar-thumb {
                background: ${darkMode ? `${LUX.gold}44` : `${LUX.emerald}44`};
                border-radius: 10px;
                transition: background 0.2s ease;
              }
              .messages-page-scroll::-webkit-scrollbar-thumb:hover {
                background: ${darkMode ? `${LUX.gold}66` : `${LUX.emerald}66`};
              }
            `}</style>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-8">
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: darkMode
                      ? 'linear-gradient(135deg, rgba(6,78,59,0.3), rgba(2,44,34,0.3))'
                      : 'rgba(6,78,59,0.08)',
                    border: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'}`,
                  }}
                >
                  <Users
                    className="w-8 h-8"
                    style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                  />
                </div>
                <p
                  className="font-medium mb-1"
                  style={{ color: darkMode ? 'rgba(255,255,255,0.9)' : LUX.emeraldDeep }}
                >
                  {searchQuery ? 'No matching users found' : 'No users available'}
                </p>
                <p
                  className="text-xs"
                  style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#6b7280' }}
                >
                  {searchQuery ? 'Try adjusting your search' : 'Start by adding some contacts'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {filteredUsers.map((user: User, index: number) => {
                  const existingConversation = conversations?.find((conv) => {
                    if (!Array.isArray(conv.participants)) return false;
                    const participantIds = conv.participants.map((p) =>
                      typeof p === 'object' ? String(p.id) : String(p)
                    );
                    return (
                      participantIds.includes(String(user.id)) &&
                      participantIds.includes(String(currentUser?.id))
                    );
                  });
                  const active =
                    selectedParticipant?.id === user.id ||
                    (existingConversation?.id &&
                      String(conversationId) === String(existingConversation.id));
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'relative group cursor-pointer transition-all duration-300 rounded-xl my-1 overflow-hidden',
                        active && 'shadow-lg'
                      )}
                      style={{
                        background: active
                          ? darkMode
                            ? `linear-gradient(135deg, rgba(6,78,59,0.3), rgba(2,44,34,0.3))`
                            : `linear-gradient(135deg, rgba(6,78,59,0.12), rgba(6,95,70,0.08))`
                          : 'transparent',
                        border: `1px solid ${
                          active
                            ? darkMode
                              ? `${LUX.gold}44`
                              : LUX.emerald
                            : 'transparent'
                        }`,
                      }}
                      onClick={() => {
                        if (existingConversation?.id) {
                          if (isMobile) setIsSidebarOpen(false);
                          navigate(`/messages/${existingConversation.id}`);
                        } else {
                          handleStartConversation(user);
                        }
                      }}
                    >
                      {/* Gold accent line on active */}
                      {active && (
                        <div
                          className="absolute top-0 left-0 right-0 h-px"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)`,
                          }}
                        />
                      )}
                      <div className="flex items-center p-3.5 space-x-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                          {user.profile_image ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover ring-2 transition-all"
                              src={getAvatarUrl(user)}
                              alt={getFullName(user)}
                              style={{
                                borderColor: active
                                  ? LUX.gold
                                  : darkMode
                                  ? `${LUX.gold}33`
                                  : 'rgba(6,78,59,0.15)',
                              }}
                            />
                          ) : (
                            <div
                              className="h-12 w-12 rounded-full flex items-center justify-center ring-2 transition-all"
                              style={{
                                background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                                borderColor: active
                                  ? LUX.gold
                                  : darkMode
                                  ? `${LUX.gold}33`
                                  : 'rgba(6,78,59,0.15)',
                              }}
                            >
                              <span
                                className="font-semibold"
                                style={{ color: LUX.goldSoft, fontSize: '0.9rem' }}
                              >
                                {getUserInitials(user)}
                              </span>
                            </div>
                          )}
                          {/* Online indicator */}
                          {user.is_online && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                              style={{
                                background: '#22c55e',
                                borderColor: darkMode ? LUX.ink : '#fff',
                              }}
                            />
                          )}
                        </div>

                        {/* User info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3
                              className="text-sm font-semibold truncate"
                              style={{
                                color: darkMode
                                  ? '#fff'
                                  : LUX.emeraldDeep,
                              }}
                            >
                              {getFullName(user)}
                            </h3>
                            {existingConversation?.last_message?.created_at && (
                              <span
                                className="text-[10px] whitespace-nowrap font-medium"
                                style={{
                                  color: darkMode
                                    ? 'rgba(255,255,255,0.5)'
                                    : '#6b7280',
                                }}
                              >
                                {formatDistanceToNow(
                                  new Date(existingConversation.last_message.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {user.user_type && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase"
                                style={{
                                  background:
                                    user.user_type === 'vendor'
                                      ? darkMode
                                        ? 'rgba(59,130,246,0.2)'
                                        : 'rgba(59,130,246,0.1)'
                                      : user.user_type === 'administrator'
                                      ? darkMode
                                        ? 'rgba(168,85,247,0.2)'
                                        : 'rgba(168,85,247,0.1)'
                                      : darkMode
                                      ? 'rgba(100,116,139,0.2)'
                                      : 'rgba(100,116,139,0.1)',
                                  color:
                                    user.user_type === 'vendor'
                                      ? '#60a5fa'
                                      : user.user_type === 'administrator'
                                      ? '#c084fc'
                                      : '#94a3b8',
                                  border: `1px solid ${
                                    user.user_type === 'vendor'
                                      ? 'rgba(59,130,246,0.3)'
                                      : user.user_type === 'administrator'
                                      ? 'rgba(168,85,247,0.3)'
                                      : 'rgba(100,116,139,0.3)'
                                  }`,
                                }}
                              >
                                {user.user_type === 'vendor'
                                  ? 'Vendor'
                                  : user.user_type === 'administrator'
                                  ? 'Admin'
                                  : 'Buyer'}
                              </span>
                            )}
                            {user.is_online && (
                              <span
                                className="flex items-center gap-1 text-[10px] font-medium"
                                style={{ color: '#22c55e' }}
                              >
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Online
                              </span>
                            )}
                          </div>
                          {existingConversation?.last_message?.content && (
                            <p
                              className="text-xs mt-1 truncate"
                              style={{
                                color: darkMode
                                  ? 'rgba(255,255,255,0.6)'
                                  : '#6b7280',
                              }}
                            >
                              {formatLastMessage(existingConversation.last_message.content)}
                            </p>
                          )}
                        </div>

                        {/* Unread badge */}
                        {(existingConversation?.unread_count ?? 0) > 0 && (
                          <span
                            className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${LUX.gold}, #B8902F)`,
                              color: LUX.emeraldDeep,
                            }}
                          >
                            {existingConversation?.unread_count ?? 0}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main chat area */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        {otherParticipant ? (
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            {/* Chat header */}
            <div
              className={cn(
                'px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 z-40',
                isMobile ? 'rounded-t-xl' : 'rounded-t-2xl'
              )}
              style={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(2,44,34,0.95), rgba(4,19,14,0.95))'
                  : 'rgba(255,255,255,0.98)',
                borderBottom: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.1)'}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center">
                {isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 mr-2 rounded-xl transition-colors"
                    style={{
                      background: darkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(6,78,59,0.08)',
                    }}
                  >
                    <Menu
                      className="h-5 w-5"
                      style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                    />
                  </button>
                )}
                <div
                  className="relative h-11 w-11 rounded-full overflow-hidden ring-2"
                  style={{
                    borderColor: darkMode ? LUX.gold : LUX.emerald,
                  }}
                >
                  {enrichedOtherParticipant?.profile_image ||
                  enrichedOtherParticipant?.avatar ? (
                    <img
                      src={getAvatarUrl(enrichedOtherParticipant)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                      }}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: LUX.goldSoft, fontSize: '1rem' }}
                      >
                        {getUserInitials(enrichedOtherParticipant || undefined)}
                      </span>
                    </div>
                  )}
                  {enrichedOtherParticipant?.is_online && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                      style={{
                        background: '#22c55e',
                        borderColor: darkMode ? LUX.ink : '#fff',
                      }}
                    />
                  )}
                </div>
                <div className="ml-3.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-semibold"
                      style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                    >
                      {getFullName(enrichedOtherParticipant || undefined)}
                    </h3>
                    {enrichedOtherParticipant?.user_type === 'vendor' && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                        style={{
                          background: darkMode
                            ? 'rgba(59,130,246,0.2)'
                            : 'rgba(59,130,246,0.1)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59,130,246,0.3)',
                        }}
                      >
                        Vendor
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: enrichedOtherParticipant?.is_online
                        ? '#22c55e'
                        : darkMode
                        ? 'rgba(255,255,255,0.5)'
                        : '#6b7280',
                    }}
                  >
                    {enrichedOtherParticipant?.is_online
                      ? 'Active Now'
                      : getUserStatus(enrichedOtherParticipant as any)}
                  </p>
                </div>

                {/* Settings */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="p-2 rounded-xl transition-colors"
                      style={{
                        background: darkMode
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(6,78,59,0.08)',
                      }}
                    >
                      <Settings
                        className="h-5 w-5"
                        style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    className={cn(
                      'max-w-4xl max-h-[90dvh] overflow-y-auto border'
                    )}
                    style={{
                      background: darkMode
                        ? `linear-gradient(135deg, ${LUX.ink}, ${LUX.emeraldDeep})`
                        : '#fff',
                      borderColor: darkMode ? `${LUX.gold}33` : 'rgba(6,78,59,0.15)',
                      color: darkMode ? '#E6EDF3' : LUX.emeraldDeep,
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle
                        className="font-serif"
                        style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                      >
                        Message Settings
                      </DialogTitle>
                      <DialogDescription
                        style={{
                          color: darkMode
                            ? 'rgba(255,255,255,0.7)'
                            : '#6b7280',
                        }}
                      >
                        Configure your messaging preferences, notifications, and
                        privacy settings.
                      </DialogDescription>
                    </DialogHeader>
                    <MessageSettings />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className={cn(
                'flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 pb-6'
              )}
              style={{
                background: darkMode
                  ? `linear-gradient(180deg, ${LUX.ink} 0%, ${LUX.emeraldDeep} 50%, ${LUX.ink} 100%)`
                  : `linear-gradient(180deg, ${LUX.paper} 0%, ${LUX.cream} 50%, ${LUX.paper} 100%)`,
              }}
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                  />
                </div>
              ) : messages?.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center min-h-[200px] p-8 rounded-2xl mx-4 border relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: darkMode
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.9)',
                    borderColor: darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.1)',
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    }}
                  >
                    <MessageSquare
                      className="w-8 h-8"
                      style={{ color: LUX.goldSoft }}
                    />
                  </div>
                  <h4
                    className="font-serif font-semibold text-lg mb-2"
                    style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                  >
                    Start a Conversation
                  </h4>
                  <p
                    className="text-sm text-center max-w-[280px]"
                    style={{
                      color: darkMode
                        ? 'rgba(255,255,255,0.7)'
                        : '#6b7280',
                    }}
                  >
                    Connect with{' '}
                    <span
                      className="font-semibold"
                      style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                    >
                      {getFullName(enrichedOtherParticipant)}
                    </span>{' '}
                    to discuss products, orders, and business inquiries.
                  </p>
                </motion.div>
              ) : (
                <>
                  {filteredMessages.map((msg) => {
                    const isOwn = msg.sender_id === currentUser?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        className={cn('w-full flex', isOwn ? 'justify-end' : 'justify-start')}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className={cn('flex items-end gap-2 max-w-[75%] sm:max-w-[65%]')}>
                          {/* Avatar for received */}
                          {!isOwn && (
                            <div
                              className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 ring-2"
                              style={{ borderColor: darkMode ? LUX.gold : LUX.emerald }}
                            >
                              <img
                                src={getAvatarUrl(
                                  (enrichedOtherParticipant as any) || (msg.sender as any)
                                )}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className={cn('relative group')}>
                            {/* Message bubble */}
                            <div
                              className={cn(
                                'rounded-2xl overflow-hidden break-words relative',
                                (() => {
                                  const c = msg.content;
                                  const isImg =
                                    c.match(/\[ATTACHMENT:/) &&
                                    (() => {
                                      try {
                                        return JSON.parse(
                                          c.match(/\[ATTACHMENT:(.+?)\]/)?.[1] || '{}'
                                        ).isImage;
                                      } catch {
                                        return false;
                                      }
                                    })();
                                  return isImg ? 'p-1' : 'px-4 py-2.5';
                                })()
                              )}
                              style={{
                                background: isOwn
                                  ? `linear-gradient(135deg, ${LUX.emeraldSoft}, ${LUX.emeraldDeep})`
                                  : darkMode
                                  ? 'rgba(255,255,255,0.08)'
                                  : 'rgba(255,255,255,1)',
                                border: `1px solid ${
                                  isOwn
                                    ? 'rgba(255,255,255,0.15)'
                                    : darkMode
                                    ? `${LUX.gold}22`
                                    : 'rgba(6,78,59,0.12)'
                                }`,
                                color: isOwn ? '#fff' : darkMode ? '#fff' : LUX.emeraldDeep,
                                borderBottomRightRadius: isOwn ? 4 : 16,
                                borderBottomLeftRadius: isOwn ? 16 : 4,
                              }}
                            >
                              {/* Edit/Delete menu */}
                              {isOwn && (
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-1 rounded-full bg-white/90 hover:bg-white">
                                        <MoreHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingMessageId(msg.id);
                                          setEditingMessage(msg.content);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          deleteMessageMutation.mutate({ id: msg.id })
                                        }
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}

                              {/* Message content */}
                              {(() => {
                                const content = msg.content;
                                const attachmentMatch = content.match(/\[ATTACHMENT:(.+?)\]/);
                                if (attachmentMatch) {
                                  try {
                                    const attachmentData = JSON.parse(attachmentMatch[1]);
                                    const textContent = content
                                      .replace(/\[ATTACHMENT:.+?\]/, '')
                                      .trim();
                                    if (attachmentData.isImage) {
                                      return (
                                        <div className="relative group">
                                          {textContent && (
                                            <p className="text-sm mb-2 px-3 pt-2">{textContent}</p>
                                          )}
                                          <img
                                            src={attachmentData.dataUrl}
                                            alt={attachmentData.name}
                                            className="max-w-full max-h-64 rounded-xl cursor-pointer"
                                            onClick={() => {
                                              const newWindow = window.open();
                                              if (newWindow) {
                                                newWindow.document.write(
                                                  `<html><head><title>${attachmentData.name}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${attachmentData.dataUrl}" style="max-width:100%;max-height:100vh;" /></body></html>`
                                                );
                                              }
                                            }}
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const link = document.createElement('a');
                                              link.href = attachmentData.dataUrl;
                                              link.download = attachmentData.name;
                                              link.click();
                                            }}
                                            className="absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{
                                              background: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
                                            }}
                                          >
                                            <Download className="w-4 h-4" style={{ color: darkMode ? '#fff' : '#000' }} />
                                          </button>
                                          <p className="text-[10px] opacity-70 text-right px-2 pb-1 pt-0.5">
                                            {formatDistanceToNow(new Date(msg.created_at), {
                                              addSuffix: true,
                                            })}
                                          </p>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div>
                                        {textContent && (
                                          <p className="text-sm mb-2">{textContent}</p>
                                        )}
                                        <div
                                          className={cn(
                                            'flex items-center gap-2 p-2.5 rounded-xl',
                                            isOwn
                                              ? 'bg-white/15 border border-white/20'
                                              : darkMode
                                              ? 'bg-black/40 border border-gray-700/50'
                                              : 'bg-gray-100 border border-gray-200'
                                          )}
                                        >
                                          <Paperclip className="w-4 h-4 opacity-70" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">
                                              {attachmentData.name}
                                            </p>
                                            <p className="text-[10px] opacity-60">
                                              {formatFileSize(attachmentData.size)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } catch (e) {
                                    return <p className="text-sm">{content}</p>;
                                  }
                                } else {
                                  return <p className="text-sm">{content}</p>;
                                }
                              })()}

                              {/* Timestamp for non-image messages */}
                              {!msg.content.match(/\[ATTACHMENT:/) && (
                                <p
                                  className={cn(
                                    'text-[10px] mt-1',
                                    isOwn ? 'text-right text-white/70' : 'opacity-60'
                                  )}
                                  style={{
                                    color: isOwn
                                      ? undefined
                                      : darkMode
                                      ? 'rgba(255,255,255,0.5)'
                                      : '#6b7280',
                                  }}
                                >
                                  {formatDistanceToNow(new Date(msg.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Avatar for sent */}
                          {isOwn && (
                            <div
                              className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 ring-2"
                              style={{ borderColor: darkMode ? LUX.gold : LUX.emerald }}
                            >
                              <img
                                src={getAvatarUrl(currentUser as any)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message input */}
            <div
              className={cn(
                'flex-shrink-0 z-40',
                isMobile ? 'p-3' : 'p-4 px-6 rounded-b-2xl'
              )}
              style={{
                background: darkMode
                  ? 'linear-gradient(135deg, rgba(2,44,34,0.95), rgba(4,19,14,0.95))'
                  : 'rgba(255,255,255,0.98)',
                borderTop: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.1)'}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* File preview */}
              {selectedFile && (
                <motion.div
                  className="mb-3 p-3 rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: darkMode
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(6,78,59,0.04)',
                    border: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedFile.type.startsWith('image/') ? (
                        <div
                          className="h-12 w-12 rounded-xl overflow-hidden ring-2"
                          style={{
                            borderColor: darkMode ? LUX.gold : LUX.emerald,
                          }}
                        >
                          <img src={filePreviewUrl!} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: darkMode
                              ? 'rgba(6,78,59,0.3)'
                              : 'rgba(6,78,59,0.1)',
                          }}
                        >
                          <Paperclip
                            className="h-6 w-6"
                            style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                          />
                        </div>
                      )}
                      <div>
                        <p
                          className="text-sm font-semibold truncate max-w-[200px]"
                          style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                        >
                          {selectedFile.name}
                        </p>
                        <p
                          className="text-[10px] font-medium uppercase tracking-wider"
                          style={{
                            color: darkMode
                              ? 'rgba(255,255,255,0.5)'
                              : '#6b7280',
                          }}
                        >
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreviewUrl(null);
                      }}
                      className="p-1.5 rounded-full transition-colors"
                      style={{
                        background: darkMode
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(6,78,59,0.1)',
                      }}
                    >
                      <X
                        className="h-4 w-4"
                        style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                      />
                    </button>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="overflow-visible">
                <div className="flex items-center gap-2 overflow-visible relative">
                  {/* File upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl transition-all flex-shrink-0"
                    style={{
                      background: darkMode
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(6,78,59,0.06)',
                      border: `1px solid ${
                        darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'
                      }`,
                    }}
                    disabled={isSending || isUploading}
                  >
                    <Paperclip
                      className="h-5 w-5"
                      style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                    />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf"
                  />

                  {/* Message input container */}
                  <div className="relative flex-1 overflow-visible">
                    <textarea
                      ref={textareaRef}
                      placeholder={
                        editingMessageId ? 'Revise your message...' : 'Type a message...'
                      }
                      className={cn(
                        'w-full min-h-[44px] max-h-32 overflow-y-hidden resize-none py-3 text-sm transition-all outline-none rounded-2xl px-4'
                      )}
                      style={{
                        background: darkMode
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(6,78,59,0.04)',
                        border: `1px solid ${
                          isInputFocused
                            ? darkMode
                              ? LUX.gold
                              : LUX.emerald
                            : darkMode
                            ? `${LUX.gold}22`
                            : 'rgba(6,78,59,0.12)'
                        }`,
                        color: darkMode ? '#fff' : LUX.emeraldDeep,
                        boxShadow: isInputFocused
                          ? darkMode
                            ? `0 0 15px ${LUX.gold}22`
                            : `0 0 15px rgba(6,78,59,0.1)`
                          : 'none',
                      }}
                      rows={1}
                      defaultValue={message}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        setInputHasText(!!target.value);
                        if (inputRafRef.current)
                          cancelAnimationFrame(inputRafRef.current);
                        inputRafRef.current = requestAnimationFrame(() => {
                          target.style.height = 'auto';
                          target.style.height = `${Math.max(
                            BASE_INPUT_HEIGHT,
                            Math.min(target.scrollHeight, 128)
                          )}px`;
                        });
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
                  </div>

                  {/* Emoji */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 rounded-xl transition-all flex-shrink-0"
                      style={{
                        background: darkMode
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(6,78,59,0.06)',
                        border: `1px solid ${
                          darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'
                        }`,
                      }}
                      disabled={isSending}
                    >
                      <Smile
                        className="h-5 w-5"
                        style={{ color: darkMode ? LUX.goldSoft : LUX.emerald }}
                      />
                    </button>
                    {showEmojiPicker && (
                      <div
                        className={cn(
                          'emoji-picker-container absolute bottom-14 right-0 z-50 rounded-2xl',
                          isMobile ? 'w-[280px]' : 'w-[320px]'
                        )}
                        style={{
                          border: `1px solid ${
                            darkMode ? `${LUX.gold}33` : 'rgba(6,78,59,0.15)'
                          }`,
                          background: darkMode
                            ? 'linear-gradient(135deg, rgba(2,44,34,0.98), rgba(4,19,14,0.98))'
                            : 'rgba(255,255,255,0.98)',
                          boxShadow: darkMode
                            ? '0 20px 60px -20px rgba(0,0,0,0.6)'
                            : '0 20px 60px -20px rgba(6,78,59,0.15)',
                        }}
                      >
                      <style>{`
                        .emoji-picker-container em-emoji-picker {
                          --ep-size: ${isMobile ? '14px' : '16px'};
                          --ep-font-family: system-ui;
                          --ep-font-size: ${isMobile ? '11px' : '12px'};
                          height: ${isMobile ? '240px' : '280px'};
                          width: 100%;
                          border-radius: 12px;
                          overflow: auto;
                        }
                        .emoji-picker-container em-emoji-picker * {
                          font-size: ${isMobile ? '11px' : '12px'} !important;
                        }
                        .emoji-picker-container em-emoji-picker .emoji-section {
                          padding: 2px;
                        }
                        .emoji-picker-container em-emoji-picker .emoji-section-title {
                          font-size: ${isMobile ? '10px' : '11px'} !important;
                          padding: 2px 6px;
                        }
                        .emoji-picker-container em-emoji-picker .nav {
                          padding: 2px;
                          height: ${isMobile ? '28px' : '32px'};
                        }
                        .emoji-picker-container em-emoji-picker .nav button {
                          padding: 2px;
                          font-size: ${isMobile ? '12px' : '14px'} !important;
                          height: ${isMobile ? '24px' : '28px'};
                          width: ${isMobile ? '24px' : '28px'};
                        }
                        .emoji-picker-container em-emoji-picker .search {
                          padding: 2px;
                          height: ${isMobile ? '32px' : '36px'};
                        }
                        .emoji-picker-container em-emoji-picker .search input {
                          font-size: ${isMobile ? '11px' : '12px'} !important;
                          padding: 4px 6px;
                          height: ${isMobile ? '24px' : '28px'};
                        }
                        .emoji-picker-container em-emoji-picker .emoji {
                          margin: 1px;
                        }
                        .emoji-picker-container em-emoji-picker h2,
                        .emoji-picker-container em-emoji-picker .header,
                        .emoji-picker-container em-emoji-picker .title,
                        .emoji-picker-container em-emoji-picker .epr-header {
                          font-size: ${isMobile ? '10px' : '11px'} !important;
                          padding: 2px 6px !important;
                          margin: 0 !important;
                          height: auto !important;
                          display: none !important;
                        }
                        .emoji-picker-container em-emoji-picker .epr-header,
                        .emoji-picker-container em-emoji-picker .epr-preview {
                          display: none !important;
                        }
                      `}</style>
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => {
                          const emojiChar = emoji.native || emoji.emoji;
                          if (textareaRef.current) {
                            textareaRef.current.value =
                              textareaRef.current.value + emojiChar;
                            setMessage(textareaRef.current.value);
                            setInputHasText(true);
                            resizeComposer();
                          }
                          setShowEmojiPicker(false);
                        }}
                        theme={darkMode ? 'dark' : 'light'}
                        set="native"
                        emojiSize={isMobile ? 16 : 18}
                        maxFrequentRows={1}
                        perLine={isMobile ? 6 : 7}
                        previewPosition="none"
                        previewEmoji={false}
                      />
                    </div>
                  )}
                  </div>

                  {/* Send */}
                  <motion.button
                    type="submit"
                    disabled={(!inputHasText && !selectedFile) || isSending || isUploading}
                    className="p-2.5 rounded-xl flex-shrink-0 transition-all"
                    style={{
                      background:
                        inputHasText || selectedFile
                          ? `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`
                          : darkMode
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(6,78,59,0.06)',
                      border: `1px solid ${
                        inputHasText || selectedFile
                          ? LUX.gold
                          : darkMode
                          ? `${LUX.gold}22`
                          : 'rgba(6,78,59,0.12)'
                      }`,
                      opacity:
                        (!inputHasText && !selectedFile) || isSending || isUploading
                          ? 0.5
                          : 1,
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSending || isUploading ? (
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        style={{ color: LUX.goldSoft }}
                      />
                    ) : (
                      <Send
                        className="w-5 h-5"
                        style={{
                          color:
                            inputHasText || selectedFile
                              ? LUX.goldSoft
                              : darkMode
                              ? 'rgba(255,255,255,0.5)'
                              : LUX.emerald,
                        }}
                      />
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          // Empty state - no conversation selected
          <motion.div
            className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: darkMode
                ? `linear-gradient(135deg, ${LUX.ink}, ${LUX.emeraldDeep})`
                : LUX.cream,
            }}
          >
            {/* Decorative elements */}
            {darkMode && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full blur-3xl animate-pulse"
                  style={{ background: `${LUX.gold}08` }}
                />
                <div
                  className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] rounded-full blur-3xl animate-pulse"
                  style={{ background: `${LUX.emerald}08`, animationDelay: '1s' }}
                />
              </div>
            )}

            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 left-4 z-10 p-2 rounded-xl transition-colors"
                style={{
                  background: darkMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(6,78,59,0.08)',
                }}
              >
                <Menu
                  className="h-5 w-5"
                  style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
                />
              </button>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-md relative z-10 flex flex-col items-center"
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
                style={{
                  background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                  boxShadow: `0 20px 60px -20px ${LUX.emerald}`,
                }}
              >
                <MessageSquare
                  className="w-10 h-10"
                  style={{ color: LUX.goldSoft }}
                />
              </div>
              <h3
                className="font-serif text-3xl font-semibold mb-4"
                style={{ color: darkMode ? '#fff' : LUX.emeraldDeep }}
              >
                Your Messages
              </h3>
              <p
                className="mb-8 max-w-[280px]"
                style={{
                  color: darkMode ? 'rgba(255,255,255,0.7)' : '#6b7280',
                }}
              >
                Choose a conversation from the sidebar, or start a new chat to send a message.
              </p>
              {isMobile ? (
                <motion.button
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-8 py-3.5 rounded-xl font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    color: LUX.goldSoft,
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  View Conversations
                </motion.button>
              ) : (
                <div
                  className="flex gap-3 items-center px-6 py-3 rounded-full"
                  style={{
                    background: darkMode
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(6,78,59,0.06)',
                    border: `1px solid ${darkMode ? `${LUX.gold}22` : 'rgba(6,78,59,0.12)'}`,
                    color: darkMode ? LUX.goldSoft : LUX.emerald,
                  }}
                >
                  <ArrowLeft className="w-4 h-4 animate-bounce-x" />
                  <span className="text-sm font-medium">Select a chat to start messaging</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;
