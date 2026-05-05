import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import path from "node:path";
import { generateUniqueProductSlug } from "@/app/lib/products-db";
import { ensureProductDir } from "@/app/lib/product-images";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";
import { canonicalizeBrand } from "@/app/lib/brand-normalize";

/**
 * Удаляет пробелы/тире/слеши/точки/подчёркивания, приводит к верхнему
 * регистру. Импорт сверяется по нормализованному SKU, чтобы повторная
 * загрузка того же артикула с другим написанием обновила существующую
 * карточку, а не создала дубль (пользователь видит на сайте «PE9821» и
 * «PE982/1» как два отдельных товара).
 */
function normCompactSku(s: string): string {
  return (s ?? "").replace(/[\s\-_./]+/g, "").toUpperCase();
}

interface ImportItem {
  sku: string;
  name: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}
interface UpdateItem extends ImportItem { id: number; }
interface RejectedItem {
  sku: string;
  rawName: string;
  brand: string;
  price: number;
  reason: "non-gm";
}

function openNonGmDb() {
  const sqlite = new Database(path.join(process.cwd(), "data", "shop-non-gm.db"));
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

function upsertNonGmProducts(items: RejectedItem[], now: string): { saved: number; errors: string[] } {
  if (items.length === 0) return { saved: 0, errors: [] };

  const sqlite = openNonGmDb();
  const errors: string[] = [];
  let saved = 0;

  try {
    const all = sqlite.prepare("SELECT id, sku FROM products").all() as { id: number; sku: string }[];
    const existingSlugs = sqlite.prepare("SELECT slug FROM products").all() as { slug: string }[];
    const normToExisting = new Map<string, { id: number; sku: string }>();
    for (const p of all) {
      const k = normCompactSku(p.sku);
      if (k) normToExisting.set(k, p);
    }
    const takenSlugs = new Set(existingSlugs.map((r) => r.slug).filter(Boolean));
    const uniqueNonGmSlug = (base: string) => {
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

    const tx = sqlite.transaction((rows: RejectedItem[]) => {
      for (const item of rows) {
        const sku = item.sku.trim();
        const name = item.rawName.trim();
        const brand = canonicalizeBrand(item.brand);
        const price = Number(item.price);
        if (!sku || !name || !Number.isFinite(price) || price < 0) {
          errors.push(`Не-GM пропущен: некорректные данные для "${item.sku}"`);
          continue;
        }

        const existing = normToExisting.get(normCompactSku(sku));
        if (existing) {
          update.run({ id: existing.id, name, brand, price: Math.round(price), now });
          saved++;
          continue;
        }

        const slug = uniqueNonGmSlug(generateUniqueProductSlug({ name, brand, sku }));
        insert.run({
          externalId: `non-gm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          slug,
          sku,
          name,
          brand,
          price: Math.round(price),
          now,
        });
        saved++;
      }
    });
    tx(items);
  } catch (e) {
    errors.push(`Ошибка сохранения Не-GM: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    sqlite.close();
  }

  return { saved, errors };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { newItems?: ImportItem[]; updateIds?: UpdateItem[]; rejected?: RejectedItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const newItems = body.newItems ?? [];
  const updateIds = body.updateIds ?? [];
  const rejected = body.rejected ?? [];
  const now = new Date().toISOString();
  const errors: string[] = [];
  let added = 0, updated = 0;

  // Подтягиваем карту slug → categoryId.
  const cats = db.select().from(schema.categories).all();
  const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

  // Карта «нормализованный SKU → существующий товар». Защита от
  // дублей второго уровня: если preview по какой-то причине не
  // распознал совпадение (например, импорт через прямой POST), мы
  // всё равно не создадим вторую карточку.
  const allProducts = db.select().from(schema.products).all();
  const normToExisting = new Map<string, (typeof allProducts)[number]>();
  for (const p of allProducts) {
    const k = normCompactSku(p.sku);
    if (k) normToExisting.set(k, p);
  }

  for (const item of newItems) {
    const sku = item.sku.trim();
    const name = item.name.trim();
    const brand = canonicalizeBrand(item.brand);
    const price = Number(item.price);
    if (!sku || !name || !Number.isFinite(price) || price < 0) {
      errors.push(`Пропущено: некорректные данные для "${item.sku}"`);
      continue;
    }
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    // Defense-in-depth: даже если preview принял это как «новый», но
    // в БД уже есть товар с эквивалентным sku — обновляем его, не
    // создаём дубль.
    const existingByNorm = normToExisting.get(normCompactSku(sku));
    if (existingByNorm) {
      try {
        db.update(schema.products).set({
          name, brand, price: Math.round(price),
          car: item.car, categoryId, updatedAt: now,
        }).where(eq(schema.products.id, existingByNorm.id)).run();
        updated++;
      } catch (e) {
        errors.push(`Ошибка обновления (норм-дубль) ${sku}: ${e instanceof Error ? e.message : String(e)}`);
      }
      continue;
    }
    try {
      const externalId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const slug = generateUniqueProductSlug({ name, brand, sku });
      const inserted = db.insert(schema.products).values({
        externalId, slug, sku, name, brand,
        price: Math.round(price),
        inStock: 1,
        car: item.car,
        categoryId,
        createdAt: now,
        updatedAt: now,
      }).returning({ id: schema.products.id, sku: schema.products.sku }).all();
      // Кэшируем только что вставленный товар: если в одном батче
      // приходят два варианта одного SKU (`GB6116` и `GB-6116`), второй
      // должен попасть в ветку «обновляем», а не создать второй insert.
      if (inserted.length > 0) {
        const k = normCompactSku(inserted[0].sku);
        if (k) normToExisting.set(k, { ...inserted[0] } as (typeof allProducts)[number]);
      }
      ensureProductDir(sku);
      added++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE constraint failed: products\.sku/i.test(msg))
        errors.push(`Артикул "${sku}" уже существует — пропущено`);
      else errors.push(`Ошибка добавления ${sku}: ${msg}`);
    }
  }

  for (const item of updateIds) {
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    try {
      db.update(schema.products).set({
        name: item.name, brand: canonicalizeBrand(item.brand), price: item.price,
        car: item.car, categoryId, updatedAt: now,
      }).where(eq(schema.products.id, item.id)).run();
      updated++;
    } catch (e) {
      errors.push(`Ошибка обновления id=${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (added > 0 || updated > 0) {
    revalidatePublicProductPages();
  }

  const nonGm = upsertNonGmProducts(rejected, now);
  errors.push(...nonGm.errors);

  return NextResponse.json({ added, updated, nonGmSaved: nonGm.saved, errors });
}
