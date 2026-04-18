/**
 * scripts/apply-migrations.ts
 *
 * Применяет drizzle-миграции из папки ./drizzle к ./data/shop.db.
 * Безопасно для повторных запусков — drizzle сам отслеживает применённое
 * в таблице __drizzle_migrations.
 *
 * Запуск: npx tsx scripts/apply-migrations.ts
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "shop.db");
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log(`→ Применяю миграции из ${MIGRATIONS_FOLDER} к ${DB_PATH}`);
migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
console.log("→ Готово.");

sqlite.close();
