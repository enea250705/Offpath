const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT UNIQUE NOT NULL,
      password    TEXT,
      display_name TEXT NOT NULL,
      provider    TEXT NOT NULL DEFAULT 'email',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
      destination_city    TEXT NOT NULL,
      destination_country TEXT NOT NULL,
      intro               TEXT,
      share_line          TEXT,
      payload             JSONB NOT NULL,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guide_messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id    UUID REFERENCES trips(id) ON DELETE CASCADE,
      user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      product_id  TEXT NOT NULL,
      verified_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email      TEXT NOT NULL,
      code       TEXT NOT NULL,
      payload    TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS payload TEXT;
  `);

  console.log('Database ready');
}

module.exports = { pool, initDb };
