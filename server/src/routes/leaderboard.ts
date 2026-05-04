import { Router, Request, Response } from 'express';
import { requireAuth, AuthPayload } from '../middleware/telegramAuth.js';
import { getLeaderboard, LeaderboardType } from '../services/leaderboard.js';

const router = Router();

/**
 * GET /api/leaderboard/:type
 * type = daily | weekly | all
 * Query params: chatId (optional, for group leaderboard)
 */
router.get('/:type', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user as AuthPayload;
    const type = req.params.type as LeaderboardType;

    if (!['daily', 'weekly', 'all'].includes(type)) {
      res.status(400).json({ error: 'Invalid leaderboard type' });
      return;
    }

    const chatId = req.query.chatId ? parseInt(req.query.chatId as string, 10) : undefined;

    const result = await getLeaderboard(type, userId, chatId);
    res.json(result);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
