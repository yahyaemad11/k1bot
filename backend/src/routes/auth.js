import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';

const router = Router();

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// Signup is intentionally disabled — this is a private, single-tenant system.
// Use: npm run seed  (or POST /api/auth/change-password) to manage the owner account.
router.post('/signup', (req, res) => {
  res.status(403).json({ error: 'signup_disabled' });
});

router.post('/change-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body || {};
  if (!email || !oldPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'invalid_input' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash))
    return res.status(401).json({ error: 'invalid_credentials' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  if (!bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'invalid_credentials' });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

export default router;
