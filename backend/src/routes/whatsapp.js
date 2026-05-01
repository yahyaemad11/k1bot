import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { getWAState, logoutWA } from '../whatsapp.js';

const router = Router();
router.use(authRequired);

router.get('/state', (req, res) => {
  res.json(getWAState());
});

router.post('/logout', async (req, res) => {
  await logoutWA();
  res.json({ ok: true });
});

export default router;
