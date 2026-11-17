import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

// One connection per server process; kept on globalThis so dev reloads reuse it.
const held = globalThis as typeof globalThis & { qwqDb?: Db };

/**
 * The site's SQLite database: view counts and likes. Opened and brought up to date
 * (drizzle/ migrations) on first use, never at build time. DATABASE_PATH points it at
 * the Docker volume in production; locally it's data/qwq.db.
 */
export function getDb(): Db {
  if (held.qwqDb) return held.qwqDb;
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "qwq.db");
  mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  // Readers don't wait on the writer, and a busy write waits a moment instead of failing.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 3000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  held.qwqDb = db;
  return db;
}
