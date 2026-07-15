import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

let db: any;

try {
  if (connectionString) {
    const pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  } else {
    throw new Error('DATABASE_URL is not set.');
  }
} catch (error) {
  console.warn('[AI Studio] Database not connected. Please provide DATABASE_URL. Using mock.');
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
  db = createChainable();
}

export { db };
