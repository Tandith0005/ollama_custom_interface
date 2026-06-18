export interface QwenMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface QwenChatRequest {
  message: string;
  model?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    repeat_penalty?: number;
  };
}

export interface QwenChatResponse {
  model: string;
  created_at: string;
  message: QwenMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface QwenStreamChunk {
  model: string;
  created_at: string;
  message: QwenMessage;
  done: boolean;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}