import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  getAllSettings,
  updateSettings,
  SETTING_KEYS,
  listBlacklist,
  addToBlacklist,
  removeFromBlacklist,
} from '../settings.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const all = getAllSettings();
  // never return raw api key
  delete all.ai_api_key;
  res.json({ settings: all, keys: SETTING_KEYS });
});

router.put('/', (req, res) => {
  const patch = req.body || {};
  // normalize phone: digits only
  if (typeof patch.admin_whatsapp === 'string') {
    patch.admin_whatsapp = patch.admin_whatsapp.replace(/\D/g, '');
  }
  updateSettings(patch);
  const all = getAllSettings();
  delete all.ai_api_key;
  res.json({ ok: true, settings: all });
});

router.get('/blacklist', (req, res) => {
  res.json({ items: listBlacklist() });
});

router.post('/blacklist', (req, res) => {
  const { jid, phone, reason } = req.body || {};
  const target = jid || (phone ? `${String(phone).replace(/\D/g, '')}@s.whatsapp.net` : null);
  if (!target) return res.status(400).json({ error: 'missing_jid_or_phone' });
  addToBlacklist(target, reason || 'manual');
  res.json({ ok: true });
});

router.delete('/blacklist/:jid', (req, res) => {
  removeFromBlacklist(req.params.jid);
  res.json({ ok: true });
});

export default router;
