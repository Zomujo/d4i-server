import postgres, { Sql } from 'postgres';
import { env } from '../config/env';

export const sql = postgres(env.DATABASE_URL, {
  ssl: env.NODE_ENV === 'production' ? 'require' : undefined,
  max: 10
});

export async function withTransaction<T>(
  fn: (trx: Sql) => Promise<T>
): Promise<T> {
  return sql.begin((trx) => fn(trx));
}

