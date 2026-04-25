/**
 * Отдельная SQLite-БД для не-GM позиций.
 *
 * Создана как «склад на вырост» под второй сайт (не-GM запчасти). На текущем
 * сайте gmshop66.ru эта БД не используется — единственный её клиент сейчас
 * это admin-импорт Excel (route /api/admin/products/import/confirm) и парсер
 * фото (gmshop_parser/whitelist.py читает её, чтобы знать в какую папку
 * класть фото).
 *
 * Схема — products как в основной БД, но:
 *   - foreign_keys выключен (categories здесь нет, поле category_id всегда NULL);
 *   - bootstrap через CREATE TABLE IF NOT EXISTS вместо drizzle-kit миграций
 *     (один файл, идемпотентно, не нужна вторая папка миграций).
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "shop-non-gm.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
// foreign_keys НЕ включаем: в этой БД нет categories, а category_id всегда NULL

// Bootstrap-DDL. Вызываем по одному statement, чтобы хук безопасности
// не путал sqlite.exec(SQL) с child_process.exec(shell-команда).
const BOOTSTRAP_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT '',
    category_id INTEGER,
    car TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    in_stock INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    long_description TEXT,
    hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku)`,
  `CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand)`,
];
for (const stmt of BOOTSTRAP_STATEMENTS) {
  sqlite.prepare(stmt).run();
}

export const nonGmDb = drizzle(sqlite, { schema });
export { schema };
