import bcrypt from 'bcryptjs';
import { db } from './db.js';

const adminEmail = process.env.SEED_EMAIL || 'admin@keyone.local';
const adminPass = process.env.SEED_PASSWORD || 'admin1234';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(adminEmail, bcrypt.hashSync(adminPass, 10), 'Admin');
  console.log(`Seeded admin: ${adminEmail} / ${adminPass}`);
} else {
  console.log('Admin already exists.');
}

const samples = [
  {
    category: 'product',
    title: 'KeyOne Plan Overview',
    content:
      'KeyOne is an AI sales assistant for WhatsApp Business. Features: 24/7 auto-replies, lead scoring, hot-lead alerts, CRM dashboard, multi-language (Arabic/English).',
  },
  {
    category: 'pricing',
    title: 'Plans',
    content:
      'Starter: $29/mo (1 number, 1k chats). Growth: $79/mo (3 numbers, 10k chats). Pro: $199/mo (unlimited, priority support). Annual = 2 months free.',
  },
  {
    category: 'offer',
    title: 'Launch Offer',
    content:
      '14-day free trial, no credit card required. 20% off first 3 months for annual signups this month.',
  },
  {
    category: 'faq',
    title: 'Will my number get banned?',
    content:
      'KeyOne uses human-like typing delays, message variation, burst limits, and session rotation to keep your number safe. We recommend warming up new numbers gradually.',
  },
  {
    category: 'script',
    title: 'Closing line',
    content:
      'When the customer is ready: "Awesome! Want me to reserve it now and send the payment link?" / "تمام! تحب أحجزها لك وأرسل لك رابط الدفع الحين؟"',
  },
];

const ins = db.prepare(
  'INSERT INTO training (category, title, content, active) VALUES (?, ?, ?, 1)'
);
const count = db.prepare('SELECT COUNT(*) c FROM training').get().c;
if (count === 0) {
  for (const s of samples) ins.run(s.category, s.title, s.content);
  console.log('Seeded sample knowledge base.');
} else {
  console.log('Knowledge base already populated.');
}

process.exit(0);
