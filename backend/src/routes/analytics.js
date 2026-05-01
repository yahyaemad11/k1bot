import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/summary', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) c FROM leads').get().c;
  const byStatus = db
    .prepare('SELECT status, COUNT(*) c FROM leads GROUP BY status')
    .all()
    .reduce((acc, r) => ({ ...acc, [r.status]: r.c }), {});
  const totalMessages = db.prepare('SELECT COUNT(*) c FROM messages').get().c;
  const inbound = db
    .prepare("SELECT COUNT(*) c FROM messages WHERE direction = 'in'")
    .get().c;
  const outbound = db
    .prepare("SELECT COUNT(*) c FROM messages WHERE direction = 'out'")
    .get().c;
  const closed = byStatus.closed || 0;
  const conversionRate = totalLeads ? +((closed / totalLeads) * 100).toFixed(2) : 0;

  // Last 7 days
  const series = db
    .prepare(
      `SELECT date(created_at, 'unixepoch') d, COUNT(*) c
       FROM leads WHERE created_at >= strftime('%s','now','-7 days')
       GROUP BY d ORDER BY d`
    )
    .all();

  res.json({
    totalLeads,
    byStatus,
    totalMessages,
    inbound,
    outbound,
    conversionRate,
    series,
  });
});

router.get('/export', (req, res) => {
  const rows = db
    .prepare(
      'SELECT id, jid, phone, name, status, score, notes, created_at, last_message_at FROM leads ORDER BY id'
    )
    .all();
  const header = 'id,jid,phone,name,status,score,notes,created_at,last_message_at';
  const csv =
    header +
    '\n' +
    rows
      .map((r) =>
        [
          r.id,
          r.jid,
          r.phone || '',
          (r.name || '').replace(/,/g, ' '),
          r.status,
          r.score,
          (r.notes || '').replace(/[\r\n,]/g, ' '),
          r.created_at,
          r.last_message_at || '',
        ].join(',')
      )
      .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
});

export default router;
