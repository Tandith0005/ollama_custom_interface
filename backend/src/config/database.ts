import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { envVars } from './envVars.js';

// Ensure E drive directory exists
const DB_DIR = 'E:/ollama-chat-history';
const DB_PATH = path.join(DB_DIR, 'chat-history.db');

// Create directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`📁 Created database directory: ${DB_DIR}`);
}

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
db.exec(`
  -- Sessions table (for grouping conversations)
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    model TEXT DEFAULT 'qwen:latest',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0
  );

  -- Messages table
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);

  -- Trigger to automatically update updated_at
  CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at 
  AFTER UPDATE ON sessions
  BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = NEW.session_id;
  END;

  -- Create table for model settings
  CREATE TABLE IF NOT EXISTS model_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT UNIQUE NOT NULL,
    temperature REAL DEFAULT 0.7,
    top_p REAL DEFAULT 0.9,
    top_k INTEGER DEFAULT 40,
    max_tokens INTEGER DEFAULT 2048,
    repeat_penalty REAL DEFAULT 1.1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default model settings if not exists
  INSERT OR IGNORE INTO model_settings (model_name) VALUES ('qwen:latest');
`);

// Close database connection on process exit
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

export { db, DB_PATH, DB_DIR };