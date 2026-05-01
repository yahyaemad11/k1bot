import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { generateReply, detectIntent } from '../ai.js';
import { detectLanguage } from '../utils/humanize.js';

const router = Router();
router.use(authRequired);

// POST /api/ai/test { text, history?: [{direction, body}] }
router.post('/test', async (req, res) => {
  const { text, history = [] } = req.body || {};
  if (!text) return res.status(400).json({ error: 'missing_text' });
  const lang = detectLanguage(text);
  const intent = detectIntent(text);
  try {
    const reply = await generateReply({ history, userText: text, lang });
    res.json({ reply, lang, intent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
