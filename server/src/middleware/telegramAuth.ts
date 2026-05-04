import { createHmac } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/connection.js';

/**
 * Telegram initData structure after parsing.
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface AuthPayload {
  userId: number;        // Our DB user id
  telegramId: number;    // Telegram user id
  username?: string;
}

/**
 * Validate Telegram WebApp initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Remove hash from params and sort alphabetically
    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // HMAC-SHA256 validation
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(config.botToken)
      .digest();

    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      console.warn('initData hash mismatch');
      return null;
    }

    // Check auth_date is recent (within 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > config.sessionExpiry) {
      console.warn('initData expired');
      return null;
    }

    // Parse user
    const userStr = params.get('user');
    if (!userStr) return null;

    return JSON.parse(userStr) as TelegramUser;
  } catch (err) {
    console.error('Failed to validate initData:', err);
    return null;
  }
}

/**
 * Generate JWT token for authenticated user.
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

/**
 * Verify JWT token.
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware: require valid JWT in Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach user info to request
  (req as any).user = payload;
  next();
}

/**
 * Upsert user in database from Telegram data.
 * Returns our internal user ID.
 */
export async function upsertUser(tgUser: TelegramUser): Promise<number> {
  const result = await query(
    `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       photo_url = EXCLUDED.photo_url,
       updated_at = NOW()
     RETURNING id`,
    [tgUser.id, tgUser.username || null, tgUser.first_name, tgUser.last_name || null, tgUser.photo_url || null]
  );
  return result.rows[0].id;
}
