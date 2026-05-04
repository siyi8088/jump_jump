import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import gameRoutes from './routes/game.js';
import leaderboardRoutes from './routes/leaderboard.js';

const app = express();

// ─── Security ───
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// ─── Rate limiting ───
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down!' },
});
app.use(limiter);

// Stricter limit for game endpoints
const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many game requests' },
});

// ─── Body parsing ───
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───
app.use('/api', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/game', gameLimiter);

// ─── Health check ───
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ───
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───
app.listen(config.port, () => {
  console.log(`🚀 Jump Jump server running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   CORS origin: ${config.corsOrigin}`);
});

export default app;
