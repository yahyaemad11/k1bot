import { Router } from 'express';
import { db } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const CATEGORIES = ['product', 'faq', 'pricing', 'offer', 'script', 'policy'];

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM training ORDER BY category, id DESC')
    .all();
  res.json({ items: rows });
});

router.post('/', (req, res) => {
  const { category, title, content, active = 1 } = req.body || {};
  if (!CATEGORIES.includes(category))
    return res.status(400).json({ error: 'bad_category', allowed: CATEGORIES });
  if (!title || !content) return res.status(400).json({ error: 'missing_fields' });
  const info = db
    .prepare(
      'INSERT INTO training (category, title, content, active) VALUES (?, ?, ?, ?)'
    )
    .run(category, title, content, active ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const allowed = ['category', 'title', 'content', 'active'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (k in req.body) {
      fields.push(`${k} = ?`);
      values.push(req.body[k]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'no_fields' });
  fields.push("updated_at = strftime('%s','now')");
  values.push(req.params.id);
  db.prepare(`UPDATE training SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM training WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
