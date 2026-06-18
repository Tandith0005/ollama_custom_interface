import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().max(255, 'Title too long').optional(),
  model: z.string().min(1, 'Model name required').optional(),
});

export const updateSessionSchema = z.object({
  title: z.string().max(255, 'Title too long').optional(),
  model: z.string().min(1, 'Model name required').optional(),
  is_archived: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
});

export const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content required'),
  tokens_used: z.number().int().positive().optional(),
});

export const getSessionsQuerySchema = z.object({
  archived: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
});

export const messageIdParamSchema = z.object({
  messageId: z.number().int().positive('Invalid message ID'),
});

export const modelSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  max_tokens: z.number().int().positive().optional(),
  repeat_penalty: z.number().min(0).max(2).optional(),
});