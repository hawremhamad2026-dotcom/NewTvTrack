import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

let pool: any = null;
let db: any = null;
let usePostgres = false;

export function getUsePostgres() {
  return usePostgres;
}

export async function initDb() {
  if (!connectionString) {
    console.warn('[Database] DATABASE_URL is not set. Falling back to local JSON database.');
    usePostgres = false;
    return false;
  }

  const isUrlFormat = connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://');
  if (!isUrlFormat) {
    console.warn(
      `[Database] Warning: DATABASE_URL "${connectionString.substring(0, 40)}..." is missing the "postgresql://" protocol and credentials. ` +
      `Please provide the full connection string (e.g. postgresql://user:pass@host:port/db) in your environment variables. ` +
      `Falling back to local JSON database.`
    );
    usePostgres = false;
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase.co') || connectionString.includes('supabase.com') || connectionString.includes('pooler') 
        ? { rejectUnauthorized: false } 
        : undefined,
      connectionTimeoutMillis: 8000, // 8s timeout
      statement_timeout: 5000,       // 5s timeout per statement
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    
    // Auto-bootstrap schemas if they do not exist
    console.log('[Database] Connection verified. Bootstrapping schemas if needed...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS media_items (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        backdrop_path TEXT,
        overview TEXT,
        release_date TEXT,
        genres JSONB,
        rating TEXT,
        runtime INTEGER,
        seasons_count INTEGER,
        episodes_count INTEGER,
        in_watchlist BOOLEAN DEFAULT FALSE,
        is_favorite BOOLEAN DEFAULT FALSE,
        user_rating INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        stopped_watching BOOLEAN DEFAULT FALSE,
        last_watched_at TIMESTAMP,
        seasons JSONB,
        imdb_id TEXT,
        cast JSONB,
        directors JSONB
      );
    `);

    // Ensure columns exist for existing databases with a quick lock timeout to prevent blocking on lock contention
    try {
      await client.query(`SET lock_timeout = '3000';`);
      await client.query(`
        ALTER TABLE media_items ADD COLUMN IF NOT EXISTS cast JSONB;
        ALTER TABLE media_items ADD COLUMN IF NOT EXISTS directors JSONB;
      `);
    } catch (e: any) {
      console.warn('[Database] Failed to alter table media_items. It might be locked or columns may already exist. Error:', e?.message || e);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS watched_episodes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        show_id INTEGER NOT NULL,
        episode_key TEXT NOT NULL,
        watched_at TIMESTAMP DEFAULT NOW()
      );
    `);

    client.release();

    db = drizzle(pool, { schema });
    usePostgres = true;
    console.log('[Database] PostgreSQL / Supabase initialized successfully and schemas are ready.');
    return true;
  } catch (error: any) {
    console.warn('[Database] Failed to connect to PostgreSQL/Supabase database. Error:', error?.message || error);
    console.warn('[Database] Falling back to local JSON database.');
    usePostgres = false;
    if (pool) {
      try {
        await pool.end();
      } catch (e) {}
      pool = null;
    }
    return false;
  }
}

// Fallback chainable mock/dummy for compile safety if db is referenced when usePostgres is false
const createChainable = (): any => {
  const p = new Proxy(function() {}, {
    get: (target, prop) => {
      if (prop === 'then') return (resolve: any) => resolve([]);
      if (prop === 'transaction') return async (cb: any) => cb(p);
      return p;
    },
    apply: () => p
  });
  return p;
};

export function getDb() {
  return usePostgres && db ? db : createChainable();
}

export { db };

