import { getPool } from './index';

/**
 * Execute a raw SQL query using the shared pg Pool.
 * Replaces per-file `neon()` calls for ensureTable() and similar DDL.
 */
export async function rawQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}
