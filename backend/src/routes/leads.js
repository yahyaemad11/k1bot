import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { adminSendMessage, setTakeover } from '../whatsapp.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const { status, q } = req.query;
  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY last_message_at DESC NULLS LAST, id DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json({ leads: rows });
});

router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not_found' });
  const messages = db
    .prepare(
      'SELECT id, direction, sender, body, created_at FROM messages WHERE lead_id = ? ORDER BY id ASC'
    )
    .all(lead.id);
  res.json({ lead, messages });
});

router.patch('/:id', (req, res) => {
  const allowed = ['status', 'notes', 'name'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (k in req.body) {
      fields.push(`${k} = ?`);
      values.push(req.body[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'no_fields' });
  values.push(req.params.id);
  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.post('/:id/takeover', async (req, res) => {
  const { on } = req.body || {};
  await setTakeover(parseInt(req.params.id, 10), !!on);
  res.json({ ok: true });
});

// Delete only the messages of a lead (keep the lead record itself).
router.delete('/:id/messages', (req, res) => {
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not_found' });
  const r = db.prepare('DELETE FROM messages WHERE lead_id = ?').run(lead.id);
  db.prepare('UPDATE leads SET last_message_at = NULL, score = 0 WHERE id = ?').run(lead.id);
  res.json({ ok: true, deleted: r.changes });
});

// Delete a lead entirely (messages cascade).
router.delete('/:id', (req, res) => {
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not_found' });
  db.prepare('DELETE FROM leads WHERE id = ?').run(lead.id);
  res.json({ ok: true });
});

// Bulk delete: { ids: [1,2,3] }
router.post('/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n) => parseInt(n, 10)).filter(Number.isFinite) : [];
  if (!ids.length) return res.status(400).json({ error: 'no_ids' });
  const placeholders = ids.map(() => '?').join(',');
  const r = db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids);
  res.json({ ok: true, deleted: r.changes });
});

router.post('/:id/reply', async (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not_found' });
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'empty' });
  try {
    await adminSendMessage(lead.jid, text);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
