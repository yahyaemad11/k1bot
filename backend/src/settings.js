import { db, getSetting, setSetting } from './db.js';

export const SETTING_KEYS = [
  'business_name',
  'admin_whatsapp',
  'ai_provider',
  'ai_model',
  'ai_api_key',
  'min_reply_delay_ms',
  'max_reply_delay_ms',
  'typing_chars_per_sec',
  'max_messages_per_minute',
  'business_hours_enabled',
  'business_hours_start',
  'business_hours_end',
  'off_hours_message',
  'wrong_number_enabled',
  'optout_keywords',
  'optout_reply',
  'wrong_number_reply',
  'auto_reply_enabled',
  'greeting_once',
  'admin_notify_threshold',
];

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  // mask api key in reads
  if (out.ai_api_key) out.ai_api_key_masked = '•••••' + out.ai_api_key.slice(-4);
  return out;
}

export function updateSettings(patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (!SETTING_KEYS.includes(k)) continue;
    if (k === 'ai_api_key' && (v === '' || v === null || v === undefined)) continue;
    setSetting(k, v);
  }
}

export function s(key, fallback = '') {
  return getSetting(key, fallback);
}

export function sInt(key, fallback = 0) {
  const v = parseInt(getSetting(key, ''), 10);
  return Number.isFinite(v) ? v : fallback;
}

export function sBool(key, fallback = false) {
  const v = getSetting(key, fallback ? '1' : '0');
  return v === '1' || v === 'true';
}

export function isInBusinessHours(now = new Date()) {
  if (!sBool('business_hours_enabled')) return true;
  const start = s('business_hours_start', '00:00');
  const end = s('business_hours_end', '23:59');
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const a = sh * 60 + sm;
  const b = eh * 60 + em;
  if (a <= b) return mins >= a && mins <= b;
  return mins >= a || mins <= b; // crosses midnight
}

export function addToBlacklist(jid, reason = 'opt-out') {
  db.prepare(
    'INSERT OR IGNORE INTO blacklist (jid, reason) VALUES (?, ?)'
  ).run(jid, reason);
}

export function isBlacklisted(jid) {
  return !!db.prepare('SELECT 1 FROM blacklist WHERE jid = ?').get(jid);
}

export function removeFromBlacklist(jid) {
  db.prepare('DELETE FROM blacklist WHERE jid = ?').run(jid);
}

export function listBlacklist() {
  return db.prepare('SELECT jid, reason, created_at FROM blacklist ORDER BY created_at DESC').all();
}
