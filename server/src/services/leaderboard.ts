import { query } from '../db/connection.js';

export type LeaderboardType = 'daily' | 'weekly' | 'all';

interface LeaderboardEntry {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  score: number;
  maxCombo: number;
}

interface LeaderboardResult {
  entries: LeaderboardEntry[];
  userRank: number | null;
  userScore: number | null;
}

/**
 * Get leaderboard by type, optionally filtered by chat_id (group).
 */
export async function getLeaderboard(
  type: LeaderboardType,
  userId: number,
  chatId?: number,
  limit = 100,
): Promise<LeaderboardResult> {
  let dateFilter = '';
  switch (type) {
    case 'daily':
      dateFilter = `AND s.created_at >= NOW() - INTERVAL '1 day'`;
      break;
    case 'weekly':
      dateFilter = `AND s.created_at >= NOW() - INTERVAL '7 days'`;
      break;
    case 'all':
      dateFilter = '';
      break;
  }

  const chatFilter = chatId ? `AND s.chat_id = ${chatId}` : '';

  // Get top scores (best score per user)
  const result = await query(
    `WITH ranked AS (
      SELECT
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.photo_url,
        MAX(s.score) as best_score,
        MAX(s.max_combo) as best_combo,
        u.id as user_id,
        ROW_NUMBER() OVER (ORDER BY MAX(s.score) DESC) as rank
      FROM scores s
      JOIN users u ON u.id = s.user_id
      WHERE 1=1 ${dateFilter} ${chatFilter}
      GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.photo_url
      ORDER BY best_score DESC
      LIMIT $1
    )
    SELECT * FROM ranked`,
    [limit]
  );

  const entries: LeaderboardEntry[] = result.rows.map((row: any) => ({
    rank: parseInt(row.rank, 10),
    telegramId: parseInt(row.telegram_id, 10),
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    score: row.best_score,
    maxCombo: row.best_combo,
  }));

  // Find user's rank
  let userRank: number | null = null;
  let userScore: number | null = null;

  const userEntry = entries.find(e => e.rank > 0 &&
    result.rows.find((r: any) => parseInt(r.user_id, 10) === userId));

  if (userEntry) {
    userRank = userEntry.rank;
    userScore = userEntry.score;
  } else {
    // User not in top N, get their rank separately
    const userRankResult = await query(
      `WITH user_scores AS (
        SELECT user_id, MAX(score) as best_score
        FROM scores
        WHERE 1=1 ${dateFilter} ${chatFilter}
        GROUP BY user_id
      )
      SELECT
        best_score,
        (SELECT COUNT(*) + 1 FROM user_scores us2 WHERE us2.best_score > us.best_score) as rank
      FROM user_scores us
      WHERE us.user_id = $1`,
      [userId]
    );

    if (userRankResult.rowCount! > 0) {
      userRank = parseInt(userRankResult.rows[0].rank, 10);
      userScore = userRankResult.rows[0].best_score;
    }
  }

  return { entries, userRank, userScore };
}
