import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import trainingRoutes from './routes/training.js';
import analyticsRoutes from './routes/analytics.js';
import waRoutes from './routes/whatsapp.js';
import settingsRoutes from './routes/settings.js';
import aiRoutes from './routes/ai.js';
import { startWhatsApp } from './whatsapp.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.corsOrigin.includes('*') || config.corsOrigin.includes(origin))
        return cb(null, true);
      return cb(null, true); // permissive in dev; tighten in prod
    },
    credentials: true,
  })
);

app.use(
  '/api/auth',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authRoutes
);
app.use('/api/leads', leadsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/whatsapp', waRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, env: config.env }));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: config.corsOrigin, credentials: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  try {
    socket.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new Error('invalid_token'));
  }
});

io.on('connection', (socket) => {
  socket.emit('hello', { ok: true });
});

const PORT = process.env.PORT || config.port || 4000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[KeyOne] API listening on :${PORT}`);
  startWhatsApp(io).catch((e) => {
    console.error('[KeyOne] WhatsApp startup error:', e);
  });
});

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
