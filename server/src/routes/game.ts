import { Router, Request, Response } from 'express';
import {
  validateInitData,
  upsertUser,
  generateToken,
  requireAuth,
  AuthPayload,
} from '../middleware/telegramAuth.js';
import { createSession, recordJump, endSession } from '../services/gameSession.js';

const router = Router();

/**
 * POST /api/auth
 * Validate Telegram initData and return JWT.
 */
router.post('/auth', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      res.status(400).json({ error: 'Missing initData' });
      return;
    }

    const tgUser = validateInitData(initData);
    if (!tgUser) {
      res.status(401).json({ error: 'Invalid initData' });
      return;
    }

    // Upsert user in DB
    const userId = await upsertUser(tgUser);

    // Generate JWT
    const token = generateToken({
      userId,
      telegramId: tgUser.id,
      username: tgUser.username,
    });

    res.json({
      token,
      user: {
        id: userId,
        telegramId: tgUser.id,
        username: tgUser.username,
        firstName: tgUser.first_name,
        photoUrl: tgUser.photo_url,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/game/start
 * Create a new game session.
 */
router.post('/game/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const sessionId = await createSession(userId);
    res.json({ sessionId });
  } catch (err) {
    console.error('Game start error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * POST /api/game/jump
 * Record a jump event (for anti-cheat tracking).
 */
router.post('/game/jump', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, chargeTime, score, combo } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const ok = await recordJump(sessionId, {
      chargeTime,
      score,
      combo,
      timestamp: Date.now(),
    });

    if (!ok) {
      res.status(400).json({ error: 'Invalid session' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Jump record error:', err);
    res.status(500).json({ error: 'Failed to record jump' });
  }
});

/**
 * POST /api/game/end
 * End game session, validate and save score.
 */
router.post('/game/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const { sessionId, score, maxCombo, jumpCount, chatId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await endSession(
      sessionId, userId, score, maxCombo, jumpCount, chatId
    );

    res.json(result);
  } catch (err) {
    console.error('Game end error:', err);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

/**
 * GET /api/user/profile
 * Get current user's profile and stats.
 */
router.get('/user/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const { query: dbQuery } = await import('../db/connection.js');

    const result = await dbQuery(
      `SELECT telegram_id, username, first_name, last_name, photo_url, best_score, total_games
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
