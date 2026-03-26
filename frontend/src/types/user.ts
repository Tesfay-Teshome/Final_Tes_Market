export interface User {
  avatar: string | null | undefined;
  image: any;
  display_name?: string;  // Made optional with ?
  id: string;
  email: string;
  user_type?: 'buyer' | 'vendor' | 'administrator';
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  profile_image?: string | null;
  is_online?: boolean;
  last_seen?: string;
  store_name?: string;
  phone?: string;
  username?: string;
  status?: string;
  last_login?: string;
  date_joined?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

export interface Message {
  sender_avatar: string | null | undefined;
  sender_name: string | undefined;
  conversation_id: string;
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string;
  sender: Pick<User, 'id' | 'full_name' | 'profile_image' | 'email' | 'user_type' | 'display_name' | 'first_name' | 'last_name' | 'username'>;
  recipient?: Pick<User, 'id' | 'full_name' | 'profile_image' | 'email' | 'user_type' | 'display_name' | 'first_name' | 'last_name'>;
  created_at: string;
  updated_at?: string;  // Add updated_at as optional
  is_read: boolean;
  conversation: string;
  temp_id?: string;  // For optimistic updates
  status?: 'sending' | 'sent' | 'error';  // For tracking message state
  read_at?: string | null;  // For tracking when message was read
}

export interface Conversation {
  other_participant: any;
  id: string;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}
