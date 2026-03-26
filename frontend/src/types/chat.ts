export interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  status: 'sending' | 'delivered' | 'read' | 'error';
  conversation_id: string;
  error?: string;
  temp_id?: string;
}

export interface WebSocketMessage {
  type: 'message' | 'ack' | 'new_message' | 'read_receipt';
  id: string;
  conversation_id: string;
  message: Message;
  timestamp: string;
}

export interface MessageAck {
  messageId: string;
  status: 'delivered' | 'read' | 'failed';
  timestamp: string;
}
