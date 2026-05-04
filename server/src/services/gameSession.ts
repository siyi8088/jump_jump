import { query } from '../db/connection.js';
import { config } from '../config.js';

interface JumpEvent {
  chargeTime: number;
  score: number;
  combo: number;
  timestamp: number;
}

/**
 * Create a new game session.
 */
export async function createSession(userId: number): Promise<string> {
  // Invalidate any existing active sessions
  await query(
    `UPDATE game_sessions SET status = 'abandoned' WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const result = await query(
    `INSERT INTO game_sessions (user_id) RETURNING id`,
    [userId]
  );
  return result.rows[0].id;
}

/**
 * Record a jump event.
 */
export async function recordJump(sessionId: string, event: JumpEvent): Promise<boolean> {
  const session = await query(
    `SELECT id, status, jump_count FROM game_sessions WHERE id = $1 AND status = 'active'`,
    [sessionId]
  );

  if (session.rowCount === 0) return false;

  await query(
    `UPDATE game_sessions
     SET jump_count = jump_count + 1,
         score = $2,
         max_combo = GREATEST(max_combo, $3),
         jump_log = jump_log || $4::jsonb
     WHERE id = $1`,
    [sessionId, event.score, event.combo, JSON.stringify([event])]
  );

  return true;
}

/**
 * End a game session, validate and save score.
 * Returns { valid, score, isRecord } or throws on invalid.
 */
export async function endSession(
  sessionId: string,
  userId: number,
  finalScore: number,
  maxCombo: number,
  jumpCount: number,
  chatId?: number,
): Promise<{ valid: boolean; score: number; isRecord: boolean }> {
  // Fetch session
  const sessionResult = await query(
    `SELECT * FROM game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [sessionId, userId]
  );

  if (sessionResult.rowCount === 0) {
    return { valid: false, score: 0, isRecord: false };
  }

  const session = sessionResult.rows[0];

  // ── Anti-cheat validation ──
  const startTime = new Date(session.start_time).getTime();
  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  // 1. Session duration sanity check
  if (durationSeconds > config.maxGameDuration) {
    await invalidateSession(sessionId, 'duration_exceeded');
    return { valid: false, score: 0, isRecord: false };
  }

  // 2. Jump count vs reported
  const serverJumpCount = session.jump_count;
  if (Math.abs(serverJumpCount - jumpCount) > 2) {
    // Allow small discrepancy for last jump
    await invalidateSession(sessionId, 'jump_count_mismatch');
    return { valid: false, score: 0, isRecord: false };
  }

  // 3. Score vs jump count plausibility
  const maxPlausibleScore = jumpCount * config.maxScorePerJump;
  if (finalScore > maxPlausibleScore) {
    await invalidateSession(sessionId, 'score_implausible');
    return { valid: false, score: 0, isRecord: false };
  }

  // 4. Time per jump check
  if (jumpCount > 0) {
    const avgTimePerJump = durationSeconds / jumpCount;
    if (avgTimePerJump < config.minJumpInterval) {
      await invalidateSession(sessionId, 'too_fast');
      return { valid: false, score: 0, isRecord: false };
    }
  }

  // ── Validation passed ──
  // Close session
  await query(
    `UPDATE game_sessions
     SET status = 'completed', end_time = NOW(), score = $2, max_combo = $3, jump_count = $4
     WHERE id = $1`,
    [sessionId, finalScore, maxCombo, jumpCount]
  );

  // Save score
  await query(
    `INSERT INTO scores (user_id, session_id, score, max_combo, jump_count, duration_seconds, chat_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, sessionId, finalScore, maxCombo, jumpCount, durationSeconds, chatId || null]
  );

  // Update user stats
  const userResult = await query(
    `UPDATE users
     SET total_games = total_games + 1,
         best_score = GREATEST(best_score, $2),
         updated_at = NOW()
     WHERE id = $1
     RETURNING best_score`,
    [userId, finalScore]
  );

  const isRecord = userResult.rows[0].best_score === finalScore;

  return { valid: true, score: finalScore, isRecord };
}

async function invalidateSession(sessionId: string, reason: string): Promise<void> {
  await query(
    `UPDATE game_sessions SET status = 'invalidated', is_valid = FALSE, end_time = NOW()
     WHERE id = $1`,
    [sessionId]
  );
  console.warn(`Session ${sessionId} invalidated: ${reason}`);
}
