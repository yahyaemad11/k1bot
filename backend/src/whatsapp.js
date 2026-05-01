import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import qrcode from 'qrcode';
import { config } from './config.js';
import { db, logEvent } from './db.js';
import {
  s,
  sBool,
  isInBusinessHours,
  isBlacklisted,
  addToBlacklist,
} from './settings.js';
import { generateReply, detectIntent, isOptOut, isWrongNumber } from './ai.js';
import {
  sleep,
  jitter,
  typingDurationMs,
  canSend,
  vary,
  detectLanguage,
} from './utils/humanize.js';

const logger = pino({ level: 'warn' });
const AUTH_DIR = path.join(path.dirname(config.dbPath), 'wa-auth');
fs.mkdirSync(AUTH_DIR, { recursive: true });

let sock = null;
let currentQR = null;
let connectionState = 'disconnected'; // disconnected|connecting|qr|connected
let io = null;
let reconnectAttempts = 0;
let isStarting = false;

// Per-JID debounce: when a customer sends multiple messages quickly, wait until
// they stop typing before generating ONE coalesced reply.
const pendingTimers = new Map(); // jid -> NodeJS.Timeout
const replyingNow = new Set();   // jid -> currently generating a reply (avoid overlap)
const DEBOUNCE_MS = 4500;        // wait ~4.5s of silence before replying

const LABELS = {
  newLead: { name: 'عميل جديد', color: 1 },
  interested: { name: 'مهتم', color: 2 },
  followup: { name: 'متابعة', color: 3 },
  hot: { name: 'عميل ساخن', color: 4 },
  closed: { name: 'تم البيع', color: 5 },
};

function getLeadByJid(jid) {
  return db.prepare('SELECT * FROM leads WHERE jid = ?').get(jid);
}

function upsertLead(jid, name) {
  const existing = getLeadByJid(jid);
  if (existing) {
    if (name && !existing.name) {
      db.prepare('UPDATE leads SET name = ? WHERE id = ?').run(name, existing.id);
    }
    return getLeadByJid(jid);
  }
  const phone = jid.split('@')[0];
  db.prepare(
    'INSERT INTO leads (jid, phone, name, status, last_message_at) VALUES (?, ?, ?, ?, ?)'
  ).run(jid, phone, name || null, 'cold', Math.floor(Date.now() / 1000));
  return getLeadByJid(jid);
}

function saveMessage(leadId, direction, sender, body, waMsgId = null) {
  const info = db
    .prepare(
      'INSERT INTO messages (lead_id, direction, sender, body, wa_msg_id) VALUES (?, ?, ?, ?, ?)'
    )
    .run(leadId, direction, sender, body, waMsgId);
  db.prepare("UPDATE leads SET last_message_at = strftime('%s','now') WHERE id = ?").run(leadId);
  return info.lastInsertRowid;
}

function getRecentHistory(leadId, limit = 16) {
  return db
    .prepare(
      'SELECT direction, body FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT ?'
    )
    .all(leadId, limit)
    .reverse();
}

async function ensureLabel(key) {
  if (!sock || !sock.addLabel) return null;
  try {
    const meta = LABELS[key];
    const created = await sock.addLabel({ name: meta.name, color: meta.color });
    return created?.id || null;
  } catch {
    return null;
  }
}

async function applyLabelToChat(jid, key) {
  try {
    if (sock && sock.addChatLabel) {
      const labelId = await ensureLabel(key);
      if (labelId) await sock.addChatLabel(jid, labelId);
    }
  } catch (e) {
    logEvent('label_error', { jid, key, error: e.message });
  }
}

async function notifyAdmin(text) {
  const adminNum = s('admin_whatsapp', '').replace(/\D/g, '');
  if (!adminNum || !sock) return;
  const adminJid = `${adminNum}@s.whatsapp.net`;
  try {
    await sock.sendMessage(adminJid, { text });
  } catch (e) {
    logEvent('admin_notify_error', { error: e.message });
  }
}

async function humanSend(jid, text) {
  if (!sock) return null;
  // Strict rate guard — if over limit, wait respectfully instead of dropping.
  let tries = 0;
  while (!canSend(jid) && tries < 3) {
    await sleep(jitter(8000, 16000));
    tries++;
  }
  if (!canSend(jid)) {
    logEvent('rate_limited', { jid });
    return null;
  }
  try {
    await sock.presenceSubscribe(jid).catch(() => {});
    await sock.sendPresenceUpdate('composing', jid).catch(() => {});
    await sleep(typingDurationMs(text));
    await sock.sendPresenceUpdate('paused', jid).catch(() => {});
    const sent = await sock.sendMessage(jid, { text });
    return sent?.key?.id || null;
  } catch (e) {
    logEvent('send_error', { jid, error: e.message });
    return null;
  }
}

function emit(event, payload) {
  if (io) io.emit(event, payload);
}

async function handleIncoming(m) {
  if (!m.message || m.key.fromMe) return;
  const jid = m.key.remoteJid;
  if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
  if (isBlacklisted(jid)) return; // respect opt-out silently

  const text =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    m.message.videoMessage?.caption ||
    '';
  if (!text.trim()) return;

  // Mark chat as read (WhatsApp compliance — don't read-block + appear human).
  try {
    await sock.readMessages([m.key]);
  } catch {}

  const pushName = m.pushName || null;
  const lead = upsertLead(jid, pushName);

  saveMessage(lead.id, 'in', 'customer', text, m.key.id);
  emit('message:new', { leadId: lead.id, jid, direction: 'in', body: text });

  if (lead.takeover) return; // human is handling

  // ── Opt-out: instant, no debounce (we want to acknowledge immediately) ───
  if (isOptOut(text)) {
    const reply = s('optout_reply', 'تم إيقاف الرسائل. شكراً لك 🙏');
    const id = await humanSend(jid, reply);
    if (id) saveMessage(lead.id, 'out', 'ai', reply, id);
    addToBlacklist(jid, 'opt-out');
    db.prepare("UPDATE leads SET status = 'lost' WHERE id = ?").run(lead.id);
    emit('lead:update', { id: lead.id, status: 'lost' });
    logEvent('opt_out', { jid });
    return;
  }

  // ── Wrong-number: only consider it within the first 2 messages from a lead.
  // After that, the conversation has context and "wrong number" phrases are noise.
  const inboundCount = db
    .prepare("SELECT COUNT(*) c FROM messages WHERE lead_id = ? AND direction = 'in'")
    .get(lead.id).c;
  if (inboundCount <= 2 && isWrongNumber(text)) {
    const reply = s('wrong_number_reply', 'اعتذر عن الإزعاج 🙏');
    const id = await humanSend(jid, reply);
    if (id) saveMessage(lead.id, 'out', 'ai', reply, id);
    addToBlacklist(jid, 'wrong-number');
    db.prepare("UPDATE leads SET status = 'lost', notes = 'رقم غلط' WHERE id = ?").run(lead.id);
    emit('lead:update', { id: lead.id, status: 'lost' });
    return;
  }

  // ── Auto-reply master switch ─────────────────────────────────────────────
  if (!sBool('auto_reply_enabled', true)) return;

  // ── Business hours gate (instant — only on first message) ───────────────
  if (!isInBusinessHours()) {
    if (inboundCount === 1) {
      const reply = s('off_hours_message', '');
      if (reply) {
        const id = await humanSend(jid, reply);
        if (id) saveMessage(lead.id, 'out', 'ai', reply, id);
      }
    }
    return;
  }

  // Label as new lead on first message
  if (inboundCount === 1) applyLabelToChat(jid, 'newLead');

  // ── Debounced reply: wait until customer stops sending, then reply ONCE.
  // This prevents the bot from replying to each message in a 2-3 message burst.
  if (pendingTimers.has(jid)) clearTimeout(pendingTimers.get(jid));
  const timer = setTimeout(() => {
    pendingTimers.delete(jid);
    processCoalescedReply(jid, lead.id, pushName).catch((e) =>
      console.error('[WA] coalesced reply error:', e)
    );
  }, DEBOUNCE_MS);
  pendingTimers.set(jid, timer);
}

// Process a single coalesced reply for this lead. Reads ALL inbound messages
// since the last outbound reply, generates ONE response, sends it.
async function processCoalescedReply(jid, leadId, pushName) {
  if (replyingNow.has(jid)) return; // already generating; skip duplicate trigger
  replyingNow.add(jid);
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
    if (!lead || lead.takeover) return;

    // Find timestamp of last outbound message; gather inbound messages after that.
    const lastOut = db
      .prepare("SELECT created_at FROM messages WHERE lead_id = ? AND direction = 'out' ORDER BY id DESC LIMIT 1")
      .get(leadId);
    const sinceTs = lastOut?.created_at || 0;
    const newInbound = db
      .prepare(
        "SELECT body FROM messages WHERE lead_id = ? AND direction = 'in' AND created_at >= ? ORDER BY id ASC"
      )
      .all(leadId, sinceTs)
      .map((r) => r.body);

    // Combine into one user turn (Baileys gives messages individually; treat
    // them as one logical message so the AI doesn't reply twice).
    const combinedText = newInbound.join('\n').trim();
    if (!combinedText) return;

    // Intent scoring on the combined text — the strongest signal wins.
    const intent = detectIntent(combinedText);
    const newScore = Math.min(100, lead.score + intent.score);
    let newStatus = lead.status;
    const hotThreshold = parseInt(s('admin_notify_threshold', '60'), 10);
    if (newScore >= hotThreshold || intent.level === 'hot') newStatus = 'hot';
    else if (newScore >= 20 || intent.level === 'warm') newStatus = 'warm';

    if (newStatus !== lead.status || newScore !== lead.score) {
      db.prepare('UPDATE leads SET score = ?, status = ? WHERE id = ?').run(
        newScore,
        newStatus,
        lead.id
      );
      if (newStatus === 'warm') applyLabelToChat(jid, 'interested');
      if (newStatus === 'hot' && lead.status !== 'hot') {
        applyLabelToChat(jid, 'hot');
        await notifyAdmin(
          `🔥 عميل جاهز للإغلاق — تواصل الآن\n` +
            `الاسم: ${lead.name || pushName || '—'}\n` +
            `الرقم: +${jid.split('@')[0]}\n` +
            `آخر رسالة: "${combinedText.slice(0, 200)}"`
        );
        logEvent('hot_lead', { leadId: lead.id, jid });
      }
      emit('lead:update', { id: lead.id, status: newStatus, score: newScore });
    }

    // Generate AI reply against the combined text + recent history.
    const lang = detectLanguage(combinedText);
    const history = getRecentHistory(lead.id, 16);
    let reply;
    try {
      reply = await generateReply({ history, userText: combinedText, lang });
    } catch (e) {
      logEvent('ai_error', { error: e.message });
      return;
    }
    if (!reply) return;
    reply = vary(reply, lang);

    const waId = await humanSend(jid, reply);
    if (waId) {
      saveMessage(lead.id, 'out', 'ai', reply, waId);
      emit('message:new', { leadId: lead.id, jid, direction: 'out', body: reply });
    }
  } finally {
    replyingNow.delete(jid);
  }
}

export async function startWhatsApp(socketIo) {
  if (socketIo) io = socketIo;
  if (isStarting) return sock;
  isStarting = true;
  try {
    // Tear down any previous socket cleanly to avoid duplicate event handlers.
    if (sock) {
      try { sock.ev.removeAllListeners(); } catch {}
      try { sock.end?.(undefined); } catch {}
      sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['KeyOne', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 25_000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        currentQR = await qrcode.toDataURL(qr);
        connectionState = 'qr';
        emit('wa:qr', { qr: currentQR });
        emit('wa:state', { state: connectionState });
      }
      if (connection === 'open') {
        currentQR = null;
        connectionState = 'connected';
        reconnectAttempts = 0;
        emit('wa:state', { state: connectionState });
        logEvent('wa_connected', {});
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        const restartRequired = code === DisconnectReason.restartRequired; // 515 — common right after pairing
        logEvent('wa_disconnected', { code });

        if (loggedOut) {
          // Old session was unlinked from the phone — wipe stale creds so a
          // fresh QR will be generated on the next start.
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          } catch (e) {
            console.error('[WA] failed to clear auth dir:', e.message);
          }
          currentQR = null;
          connectionState = 'connecting';
          emit('wa:state', { state: connectionState });
          await sleep(jitter(800, 1500));
          startWhatsApp().catch((e) => console.error('[WA] reconnect after logout error:', e));
          return;
        }

        // Show 'connecting' (not 'disconnected') so the UI doesn't flash an error during transient restarts.
        connectionState = 'connecting';
        emit('wa:state', { state: connectionState });

        const delay = restartRequired
          ? jitter(500, 1500) // restart fast — creds are fine
          : Math.min(30_000, 1500 * Math.pow(1.6, reconnectAttempts));
        reconnectAttempts++;
        await sleep(delay);
        startWhatsApp().catch((e) => console.error('[WA] reconnect error:', e));
      } else if (connection === 'connecting') {
        connectionState = 'connecting';
        emit('wa:state', { state: connectionState });
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        try {
          await handleIncoming(m);
        } catch (e) {
          console.error('[WA] handleIncoming error:', e);
        }
      }
    });

    return sock;
  } finally {
    isStarting = false;
  }
}

export function getWAState() {
  return { state: connectionState, qr: currentQR };
}

export async function adminSendMessage(jid, text) {
  if (!sock) throw new Error('WhatsApp not connected');
  if (isBlacklisted(jid)) throw new Error('blacklisted');
  const lead = upsertLead(jid);
  const id = await humanSend(jid, text);
  if (id) {
    saveMessage(lead.id, 'out', 'admin', text, id);
    emit('message:new', { leadId: lead.id, jid, direction: 'out', body: text });
  }
  return id;
}

export async function setTakeover(leadId, on) {
  db.prepare('UPDATE leads SET takeover = ? WHERE id = ?').run(on ? 1 : 0, leadId);
  emit('lead:update', { id: leadId, takeover: on ? 1 : 0 });
}

export async function logoutWA() {
  try {
    if (sock) await sock.logout();
  } catch {}
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  connectionState = 'disconnected';
  emit('wa:state', { state: connectionState });
}
