import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Anti-cheat thresholds
  minJumpInterval: 0.8,      // seconds – minimum time per jump
  maxScorePerJump: 50,       // max plausible score per single jump
  maxGameDuration: 3600,     // 1 hour max game session
  sessionExpiry: 24 * 3600,  // JWT token expiry (24h)
};
