import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { seedCategories } from "./seed-categories";

const DB_PATH = path.join(process.cwd(), "data", "shop.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };

try {
  seedCategories();
} catch (e) {
  console.error(e);
}
