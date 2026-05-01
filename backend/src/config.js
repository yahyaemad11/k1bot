import 'dotenv/config';
import path from 'path';
import fs from 'fs';

const root = path.resolve(process.cwd());
const dbPath = process.env.DB_PATH || './data/keyone.db';
const dbAbs = path.isAbsolute(dbPath) ? dbPath : path.join(root, dbPath);
fs.mkdirSync(path.dirname(dbAbs), { recursive: true });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  dbPath: dbAbs,
  ai: {
    provider: (process.env.AI_PROVIDER || 'groq').toLowerCase(),
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    groqApiKey: process.env.GROQ_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  adminWhatsapp: (process.env.ADMIN_WHATSAPP || '').replace(/\D/g, ''),
  antiBan: {
    minReplyDelayMs: parseInt(process.env.MIN_REPLY_DELAY_MS || '1500', 10),
    maxReplyDelayMs: parseInt(process.env.MAX_REPLY_DELAY_MS || '6500', 10),
    typingCharsPerSec: parseInt(process.env.TYPING_CHARS_PER_SEC || '18', 10),
    maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '12', 10),
  },
};
