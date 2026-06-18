export interface ChatSession {
  id: number;
  session_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_deleted: boolean;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  created_at: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export interface CreateSessionInput {
  title?: string;
  model?: string;
}

export interface CreateMessageInput {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
}

export interface UpdateSessionInput {
  title?: string;
  model?: string;
  is_archived?: boolean;
  is_deleted?: boolean;
}

export interface ModelSettings {
  id: number;
  model_name: string;
  temperature: number;
  top_p: number;
  top_k: number;
  max_tokens: number;
  repeat_penalty: number;
  updated_at: string;
}