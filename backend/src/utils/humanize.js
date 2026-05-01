import { sInt } from '../settings.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function jitter(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

// Realistic typing duration based on text length + DB-configurable delays.
export function typingDurationMs(text) {
  const minD = sInt('min_reply_delay_ms', 2000);
  const maxD = sInt('max_reply_delay_ms', 7000);
  const cps = Math.max(1, sInt('typing_chars_per_sec', 16));
  const base = ((text || '').length / cps) * 1000;
  const noise = jitter(minD, maxD);
  return Math.min(25000, Math.max(minD, Math.floor(base + noise * 0.5)));
}

// Token-bucket per JID + global — both must pass.
const perJid = new Map();
const globalBucket = [];
export function canSend(jid) {
  const limit = sInt('max_messages_per_minute', 10);
  const now = Date.now();
  // per-JID
  const arr = (perJid.get(jid) || []).filter((t) => now - t < 60_000);
  if (arr.length >= limit) return false;
  // global (3x per-JID as sane upper bound)
  const g = globalBucket.filter((t) => now - t < 60_000);
  while (globalBucket.length) globalBucket.shift();
  globalBucket.push(...g);
  if (g.length >= limit * 3) return false;
  arr.push(now);
  perJid.set(jid, arr);
  globalBucket.push(now);
  return true;
}

const FILLERS_AR = ['تمام،', 'طيب،', 'ممتاز،', 'حلو،', 'جميل،'];
const FILLERS_EN = ['Sure,', 'Got it,', 'Awesome,', 'Perfect,'];

export function vary(text, lang = 'auto') {
  if (!text) return text;
  if (Math.random() < 0.3) {
    const isAr = lang === 'ar' || /[\u0600-\u06FF]/.test(text);
    const pool = isAr ? FILLERS_AR : FILLERS_EN;
    const f = pool[Math.floor(Math.random() * pool.length)];
    if (!text.startsWith(f)) text = `${f} ${text}`;
  }
  if (Math.random() < 0.15) text = text.replace(/\.$/, '');
  return text;
}

export function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text || '') ? 'ar' : 'en';
}
