import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function normCompactSku(value) {
  return String(value ?? "").replace(/[\s\-_./]+/g, "").toUpperCase();
}

function slugify(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-z0-9а-я]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "non-gm";
}

function openNonGmDb(dbPath = path.join(process.cwd(), "data", "shop-non-gm.db")) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
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
    );
  `);
  return sqlite;
}

export function upsertNonGmProducts(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) return { saved: 0, errors: [] };

  const sqlite = openNonGmDb(options.dbPath);
  const errors = [];
  let saved = 0;
  const now = new Date().toISOString();

  try {
    const all = sqlite.prepare("SELECT id, sku FROM products").all();
    const existingSlugs = sqlite.prepare("SELECT slug FROM products").all();
    const normToExisting = new Map();
    for (const p of all) {
      const key = normCompactSku(p.sku);
      if (key) normToExisting.set(key, p);
    }

    const takenSlugs = new Set(existingSlugs.map((r) => r.slug).filter(Boolean));
    const uniqueSlug = (base) => {
      if (!takenSlugs.has(base)) {
        takenSlugs.add(base);
        return base;
      }
      let n = 2;
      while (takenSlugs.has(`${base}-${n}`)) n += 1;
      const slug = `${base}-${n}`;
      takenSlugs.add(slug);
      return slug;
    };

    const insert = sqlite.prepare(`
      INSERT INTO products (
        external_id, slug, sku, name, brand, price, in_stock, created_at, updated_at
      ) VALUES (
        @externalId, @slug, @sku, @name, @brand, @price, 1, @now, @now
      )
    `);
    const update = sqlite.prepare(`
      UPDATE products
      SET name = @name, brand = @brand, price = @price, updated_at = @now
      WHERE id = @id
    `);

    const tx = sqlite.transaction((rows) => {
      for (const item of rows) {
        const sku = String(item.sku ?? "").trim();
        const name = String(item.name ?? item.rawName ?? "").trim();
        const brand = String(item.brand ?? "").trim();
        const price = Number(item.price);
        if (!sku || !name || !Number.isFinite(price) || price < 0) {
          errors.push(`Не-GM пропущен: некорректные данные для "${sku || item.sku}"`);
          continue;
        }

        const normalizedSku = normCompactSku(sku);
        const existing = normToExisting.get(normalizedSku);
        if (existing) {
          update.run({ id: existing.id, name, brand, price: Math.round(price), now });
          saved++;
          continue;
        }

        const slug = uniqueSlug(slugify(`${name}-${brand}-${sku}`));
        insert.run({
          externalId: `non-gm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          slug,
          sku,
          name,
          brand,
          price: Math.round(price),
          now,
        });
        normToExisting.set(normalizedSku, { id: sqlite.prepare("SELECT last_insert_rowid() AS id").get().id, sku });
        saved++;
      }
    });

    tx(items);
  } catch (error) {
    errors.push(`Ошибка сохранения Не-GM: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    sqlite.close();
  }

  return { saved, errors };
}
