import { z } from 'zod';

// Chat request validation
export const chatValidationSchema = z.object({
  message: z.string()
    .min(1, 'Message is required')
    .max(15000, 'Message must not exceed 15000 characters')
    .trim(),
  
  model: z.string()
    .min(1, 'Model name is required')
    .default('qwen:latest'),
  
  stream: z.boolean()
    .default(false),

  sessionId: z.string()
    .uuid('Invalid session ID format')
    .optional(),
  
  options: z.object({
    temperature: z.number()
      .min(0, 'Temperature must be at least 0')
      .max(2, 'Temperature must not exceed 2')
      .optional(),
    
    top_p: z.number()
      .min(0, 'Top P must be at least 0')
      .max(1, 'Top P must not exceed 1')
      .optional(),
    
    top_k: z.number()
      .int()
      .positive('Top K must be positive')
      .optional(),
    
    max_tokens: z.number()
      .int()
      .positive('Max tokens must be positive')
      .max(4096, 'Max tokens must not exceed 4096')
      .optional(),
    
    repeat_penalty: z.number()
      .min(0, 'Repeat penalty must be at least 0')
      .max(2, 'Repeat penalty must not exceed 2')
      .optional(),
  }).optional(),
});

// Model validation
export const modelValidationSchema = z.object({
  model: z.string()
    .min(1, 'Model name is required'),
});

// Chat history validation
export const chatHistoryValidationSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, 'Message content is required'),
    })
  ).min(1, 'At least one message is required'),
  
  model: z.string()
    .min(1, 'Model name is required')
    .default('qwen:latest'),
  
  stream: z.boolean()
    .default(false),
});