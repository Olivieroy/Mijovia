import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  connectionLimit: 5,
});
export const db = drizzle(pool);
export async function query<T = any>(
  statement: ReturnType<typeof sql>,
): Promise<T[]> {
  const result = await db.execute(statement);
  return result[0] as unknown as T[];
}
export { sql };
