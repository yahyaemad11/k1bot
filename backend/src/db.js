import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

// Node's built-in SQLite (Node 22.5+). No native build required.
const raw = new DatabaseSync(config.dbPath);
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');

// Thin wrapper so .run() returns a plain number lastInsertRowid (node:sqlite returns BigInt).
function wrapStmt(stmt) {
  return {
    run: (...args) => {
      const r = stmt.run(...args);
      return {
        changes: Number(r.changes ?? 0),
        lastInsertRowid: Number(r.lastInsertRowid ?? 0),
      };
    },
    get: (...args) => stmt.get(...args),
    all: (...args) => stmt.all(...args),
  };
}

export const db = {
  prepare: (sql) => wrapStmt(raw.prepare(sql)),
  exec: (sql) => raw.exec(sql),
  close: () => raw.close(),
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'cold', -- cold|warm|hot|closed|lost
  score INTEGER NOT NULL DEFAULT 0,
  language TEXT DEFAULT 'auto',
  takeover INTEGER NOT NULL DEFAULT 0, -- 1 = human handling, AI paused
  notes TEXT,
  last_message_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_last ON leads(last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- in|out
  sender TEXT NOT NULL,    -- customer|ai|admin|system
  body TEXT NOT NULL,
  wa_msg_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id, created_at);

CREATE TABLE IF NOT EXISTS training (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,        -- product|faq|pricing|offer|script|policy
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blacklist (
  jid TEXT PRIMARY KEY,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`);

// Seed default settings only if missing.
const defaults = {
  business_name: 'KeyOne',
  admin_whatsapp: '',
  ai_provider: 'groq',
  ai_model: 'llama-3.3-70b-versatile',
  ai_api_key: '',
  min_reply_delay_ms: '3000',
  max_reply_delay_ms: '9500',
  typing_chars_per_sec: '11',
  max_messages_per_minute: '8',
  business_hours_enabled: '0',
  business_hours_start: '09:00',
  business_hours_end: '22:00',
  off_hours_message: 'شكراً لتواصلك معنا 🌙 فريقنا متاح من الساعة 9 صباحاً حتى 10 مساءً. سنرد عليك في أقرب وقت بإذن الله.',
  wrong_number_enabled: '1',
  optout_keywords: 'إلغاء,الغاء,stop,unsubscribe,ايقاف,إيقاف,لا تراسلني',
  optout_reply: 'تم إيقاف الرسائل. شكراً لتواصلك معنا، ويسعدنا خدمتك في أي وقت 🙏',
  wrong_number_reply: 'اعتذر عن الإزعاج، يبدو أنه حصل التباس في الرقم. نتمنى لك يوماً سعيداً 🙏',
  auto_reply_enabled: '1',
  greeting_once: '1',
  admin_notify_threshold: '60',
};
const insSetting = raw.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
);
for (const [k, v] of Object.entries(defaults)) insSetting.run(k, v);

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

export function logEvent(type, payload = {}) {
  db.prepare('INSERT INTO events (type, payload) VALUES (?, ?)').run(
    type,
    JSON.stringify(payload)
  );
}
