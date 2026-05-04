import { query, pool } from './connection.js';

/**
 * Run database migrations – creates all tables if they don't exist.
 */
async function migrate() {
  console.log('🔄 Running database migrations...');

  // Create database if not exists (connect to default 'postgres' db first)
  const adminPool = new (await import('pg')).default.Pool({
    connectionString: process.env.DATABASE_URL?.replace(/\/jumpjump$/, '/postgres'),
  });

  try {
    const dbCheck = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = 'jumpjump'`
    );
    if (dbCheck.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE jumpjump`);
      console.log('✅ Created database: jumpjump');
    }
  } catch (err: any) {
    // Database might already exist or we might not have permission
    if (!err.message?.includes('already exists')) {
      console.warn('Note:', err.message);
    }
  } finally {
    await adminPool.end();
  }

  // Now run schema migrations
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      photo_url TEXT,
      best_score INT DEFAULT 0,
      total_games INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INT REFERENCES users(id),
      start_time TIMESTAMP NOT NULL DEFAULT NOW(),
      end_time TIMESTAMP,
      jump_count INT DEFAULT 0,
      score INT DEFAULT 0,
      max_combo INT DEFAULT 0,
      is_valid BOOLEAN DEFAULT TRUE,
      status VARCHAR(20) DEFAULT 'active',
      jump_log JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      session_id UUID REFERENCES game_sessions(id),
      score INT NOT NULL,
      max_combo INT DEFAULT 0,
      jump_count INT DEFAULT 0,
      duration_seconds INT,
      chat_id BIGINT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Indexes for leaderboard queries
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scores_daily
    ON scores (created_at DESC, score DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scores_user
    ON scores (user_id, score DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scores_chat
    ON scores (chat_id, score DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_best
    ON users (best_score DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_status
    ON game_sessions (user_id, status);
  `);

  console.log('✅ All migrations complete.');
  await pool.end();
}

// Run directly
migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
