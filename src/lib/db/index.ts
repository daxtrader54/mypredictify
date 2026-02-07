import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
  }

  const sql: NeonQueryFunction<boolean, boolean> = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

export * from './schema';
