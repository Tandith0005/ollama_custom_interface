import { db } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import AppError from '../../utils/appError.js';
import { 
  ChatSession, 
  ChatMessage, 
  CreateSessionInput, 
  CreateMessageInput,
  UpdateSessionInput,
  ChatSessionWithMessages,
  ModelSettings
} from './chatHistory.types.js';
import { randomUUID } from 'crypto';

class ChatHistoryService {
  // Session methods
  createSession(input: CreateSessionInput): ChatSession {
    const sessionId = randomUUID();
    const { title = 'New Conversation', model = 'qwen:latest' } = input;

    const stmt = db.prepare(`
      INSERT INTO sessions (session_id, title, model)
      VALUES (?, ?, ?)
      RETURNING *
    `);

    const result = stmt.get(sessionId, title, model) as ChatSession;
    logger.info(`Created new chat session: ${sessionId}`);
    return result;
  }

  getSession(sessionId: string): ChatSession | null {
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE session_id = ? AND is_deleted = 0
    `);
    return stmt.get(sessionId) as ChatSession | null;
  }

  getSessionWithMessages(sessionId: string): ChatSessionWithMessages | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const messages = this.getSessionMessages(sessionId);
    return { ...session, messages };
  }

  getAllSessions(options?: { 
    archived?: boolean; 
    limit?: number; 
    offset?: number;
    search?: string;
  }): ChatSession[] {
    let query = 'SELECT * FROM sessions WHERE is_deleted = 0';
    const params: any[] = [];

    if (options?.archived !== undefined) {
      query += ' AND is_archived = ?';
      params.push(options.archived ? 1 : 0);
    }

    if (options?.search) {
      query += ' AND title LIKE ?';
      params.push(`%${options.search}%`);
    }

    query += ' ORDER BY updated_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as ChatSession[];
  }

  updateSession(sessionId: string, input: UpdateSessionInput): ChatSession {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }

    if (input.model !== undefined) {
      updates.push('model = ?');
      params.push(input.model);
    }

    if (input.is_archived !== undefined) {
      updates.push('is_archived = ?');
      params.push(input.is_archived ? 1 : 0);
    }

    if (input.is_deleted !== undefined) {
      updates.push('is_deleted = ?');
      params.push(input.is_deleted ? 1 : 0);
    }

    if (updates.length === 0) {
      return session;
    }

    params.push(sessionId);
    const stmt = db.prepare(`
      UPDATE sessions 
      SET ${updates.join(', ')}
      WHERE session_id = ?
      RETURNING *
    `);

    const result = stmt.get(...params) as ChatSession;
    logger.info(`Updated session: ${sessionId}`);
    return result;
  }

  deleteSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Soft delete
    const stmt = db.prepare(`
      UPDATE sessions SET is_deleted = 1 WHERE session_id = ?
    `);
    stmt.run(sessionId);
    logger.info(`Soft deleted session: ${sessionId}`);
  }

  permanentlyDeleteSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Hard delete (cascade will delete messages)
    const stmt = db.prepare(`DELETE FROM sessions WHERE session_id = ?`);
    stmt.run(sessionId);
    logger.info(`Permanently deleted session: ${sessionId}`);
  }

  // Message methods
  addMessage(input: CreateMessageInput): ChatMessage {
    const session = this.getSession(input.session_id);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const stmt = db.prepare(`
      INSERT INTO messages (session_id, role, content, tokens_used)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `);

    const result = stmt.get(
      input.session_id,
      input.role,
      input.content,
      input.tokens_used || 0
    ) as ChatMessage;

    // Update session updated_at
    db.prepare(`UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`)
      .run(input.session_id);

    logger.info(`Added message to session: ${input.session_id}`);
    return result;
  }

  getSessionMessages(sessionId: string): ChatMessage[] {
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as ChatMessage[];
  }

  getMessage(messageId: number): ChatMessage | null {
    const stmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);
    return stmt.get(messageId) as ChatMessage | null;
  }

  deleteMessage(messageId: number): void {
    const stmt = db.prepare(`DELETE FROM messages WHERE id = ?`);
    const result = stmt.run(messageId);
    if (result.changes === 0) {
      throw new AppError('Message not found', 404);
    }
    logger.info(`Deleted message: ${messageId}`);
  }

  clearSessionMessages(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const stmt = db.prepare(`DELETE FROM messages WHERE session_id = ?`);
    stmt.run(sessionId);
    logger.info(`Cleared messages from session: ${sessionId}`);
  }

  // Model settings methods
  getModelSettings(modelName: string): ModelSettings | null {
    const stmt = db.prepare(`SELECT * FROM model_settings WHERE model_name = ?`);
    return stmt.get(modelName) as ModelSettings | null;
  }

  updateModelSettings(modelName: string, settings: Partial<Omit<ModelSettings, 'id' | 'model_name' | 'updated_at'>>): ModelSettings {
    const existing = this.getModelSettings(modelName);
    
    if (!existing) {
      // Insert new settings
      const stmt = db.prepare(`
        INSERT INTO model_settings (model_name, temperature, top_p, top_k, max_tokens, repeat_penalty)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `);
      return stmt.get(
        modelName,
        settings.temperature || 0.7,
        settings.top_p || 0.9,
        settings.top_k || 40,
        settings.max_tokens || 2048,
        settings.repeat_penalty || 1.1
      ) as ModelSettings;
    }

    // Update existing settings
    const updates: string[] = [];
    const params: any[] = [];

    if (settings.temperature !== undefined) {
      updates.push('temperature = ?');
      params.push(settings.temperature);
    }
    if (settings.top_p !== undefined) {
      updates.push('top_p = ?');
      params.push(settings.top_p);
    }
    if (settings.top_k !== undefined) {
      updates.push('top_k = ?');
      params.push(settings.top_k);
    }
    if (settings.max_tokens !== undefined) {
      updates.push('max_tokens = ?');
      params.push(settings.max_tokens);
    }
    if (settings.repeat_penalty !== undefined) {
      updates.push('repeat_penalty = ?');
      params.push(settings.repeat_penalty);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(modelName);
    const stmt = db.prepare(`
      UPDATE model_settings 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE model_name = ?
      RETURNING *
    `);

    return stmt.get(...params) as ModelSettings;
  }

  // Statistics methods
  getSessionStats(): {
    totalSessions: number;
    totalMessages: number;
    totalTokens: number;
    activeSessions: number;
  } {
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM sessions WHERE is_deleted = 0) as totalSessions,
        (SELECT COUNT(*) FROM messages) as totalMessages,
        (SELECT COALESCE(SUM(tokens_used), 0) FROM messages) as totalTokens,
        (SELECT COUNT(*) FROM sessions WHERE is_deleted = 0 AND is_archived = 0) as activeSessions
    `).get() as any;

    return {
      totalSessions: stats.totalSessions || 0,
      totalMessages: stats.totalMessages || 0,
      totalTokens: stats.totalTokens || 0,
      activeSessions: stats.activeSessions || 0,
    };
  }

  // Export/Import methods
  exportSession(sessionId: string): ChatSessionWithMessages {
    const session = this.getSessionWithMessages(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }
    return session;
  }

  exportAllSessions(): ChatSessionWithMessages[] {
    const sessions = this.getAllSessions();
    return sessions.map(session => {
      const messages = this.getSessionMessages(session.session_id);
      return { ...session, messages };
    });
  }
}

export default new ChatHistoryService();