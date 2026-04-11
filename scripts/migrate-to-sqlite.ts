/**
 * scripts/migrate-to-sqlite.ts
 *
 * Мигрирует все данные из NDJSON-файлов и hardcoded TypeScript в SQLite.
 * Запуск: npm run db:migrate
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../src/app/lib/db/schema";
import { products as productsData } from "../src/app/data/products";
import { CATALOG_SECTIONS, CATALOG_GROUPS } from "../src/app/data/catalog-sections";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "shop.db");
const MIGRATIONS_FOLDER = path.join(ROOT, "drizzle");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

async function readNdjson<T>(filename: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠  ${filename} не найден — пропускаем`);
    return [];
  }
  const rows: T[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) rows.push(JSON.parse(trimmed) as T);
  }
  return rows;
}

// ─── Типы NDJSON ──────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

interface OrderRow {
  name: string;
  phone: string;
  comment?: string;
  items: unknown;
  total: number;
  deliveryMethod?: string;
  deliveryCity?: string;
  deliveryQuote?: unknown;
  cdekPickupPoint?: unknown;
  paymentMethod?: string;
  createdAt: string;
  userAgent?: string;
  ip?: string;
}

interface ConsentRow {
  ip: string;
  userAgent: string;
  consentPersonalData: boolean;
  consentMarketing: boolean;
  createdAt: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 0. Удаляем старую БД
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("🗑  Удалена старая БД:", DB_PATH);
  }

  // Открываем свежее соединение напрямую (не через src/app/lib/db, которая кешируется)
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // 1. Миграции (создание схемы)
  console.log("\n📦 Применяем миграции Drizzle…");
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("   ✓ Схема создана");

  // 2. Категории
  console.log("\n📂 Категории…");

  const groupNameMap: Record<string, string> = {};
  for (const g of CATALOG_GROUPS) {
    groupNameMap[g.slug] = g.title;
  }

  for (let i = 0; i < CATALOG_SECTIONS.length; i++) {
    const s = CATALOG_SECTIONS[i];
    await db.insert(schema.categories).values({
      slug: s.slug,
      title: s.title,
      groupSlug: s.groupSlug,
      groupName: groupNameMap[s.groupSlug] ?? s.groupSlug,
      sortOrder: i,
      createdAt: now(),
    });
  }
  console.log(`   ✓ ${CATALOG_SECTIONS.length} категорий`);

  // Карта title → category.id
  const allCategories = await db.select().from(schema.categories);
  const categoryByTitle = new Map<string, number>();
  for (const cat of allCategories) {
    categoryByTitle.set(cat.title, cat.id);
  }

  // 3. Товары
  console.log("\n🛒 Товары…");

  const externalToDbId = new Map<string, number>();

  for (const p of productsData) {
    const categoryId = categoryByTitle.get(p.category) ?? null;
    const imagesJson = JSON.stringify(p.images ?? []);
    const longDescJson = p.longDescription ? JSON.stringify(p.longDescription) : null;

    const [inserted] = await db
      .insert(schema.products)
      .values({
        externalId: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        country: p.country ?? "",
        categoryId,
        car: p.car ?? "",
        price: p.price,
        inStock: p.inStock,
        image: p.image ?? "",
        images: imagesJson,
        description: p.description ?? "",
        longDescription: longDescJson,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning({ id: schema.products.id });

    externalToDbId.set(p.id, inserted.id);
  }
  console.log(`   ✓ ${productsData.length} товаров`);

  // 4. Характеристики товаров
  console.log("\n📋 Характеристики товаров…");

  let specsCount = 0;
  for (const p of productsData) {
    if (!p.specs || p.specs.length === 0) continue;
    const dbId = externalToDbId.get(p.id);
    if (!dbId) continue;

    for (let i = 0; i < p.specs.length; i++) {
      const spec = p.specs[i];
      await db.insert(schema.productSpecs).values({
        productId: dbId,
        label: spec.label,
        value: spec.value,
        sortOrder: i,
      });
      specsCount++;
    }
  }
  console.log(`   ✓ ${specsCount} характеристик`);

  // 5. Аналоги товаров
  console.log("\n🔗 Аналоги товаров…");

  let analogsCount = 0;
  for (const p of productsData) {
    if (!p.analogIds || p.analogIds.length === 0) continue;
    const dbId = externalToDbId.get(p.id);
    if (!dbId) continue;

    for (const analogExternalId of p.analogIds) {
      const analogDbId = externalToDbId.get(analogExternalId);
      if (!analogDbId) {
        console.warn(`     ⚠ Аналог не найден: ${analogExternalId} (для ${p.id})`);
        continue;
      }
      await db.insert(schema.productAnalogs).values({
        productId: dbId,
        analogId: analogDbId,
      });
      analogsCount++;
    }
  }
  console.log(`   ✓ ${analogsCount} связей аналогов`);

  // 6. Пользователи
  console.log("\n👤 Пользователи…");

  const userRows = await readNdjson<UserRow>("users.ndjson");
  for (const u of userRows) {
    await db.insert(schema.users).values({
      externalId: u.id,
      email: u.email ?? "",
      phone: u.phone ?? "",
      fullName: u.fullName ?? "",
      passwordHash: u.passwordHash ?? "",
      passwordSalt: u.passwordSalt ?? "",
      createdAt: u.createdAt ?? now(),
    });
  }
  console.log(`   ✓ ${userRows.length} пользователей`);

  // 7. Заказы
  console.log("\n📦 Заказы…");

  const orderRows = await readNdjson<OrderRow>("orders.ndjson");
  for (let i = 0; i < orderRows.length; i++) {
    const o = orderRows[i];
    const orderNumber = String(1001 + i);

    await db.insert(schema.orders).values({
      orderNumber,
      customerName: o.name ?? "",
      customerPhone: o.phone ?? "",
      customerEmail: "",
      items: typeof o.items === "string" ? o.items : JSON.stringify(o.items ?? []),
      total: o.total ?? 0,
      deliveryMethod: o.deliveryMethod ?? "pickup",
      deliveryCity: o.deliveryCity ?? "",
      deliveryAddress: "",
      deliveryCost: 0,
      deliveryQuote: o.deliveryQuote ? JSON.stringify(o.deliveryQuote) : null,
      cdekPickupPoint: o.cdekPickupPoint ? JSON.stringify(o.cdekPickupPoint) : null,
      paymentMethod: o.paymentMethod ?? "cash",
      status: "delivered",
      isUrgent: false,
      comment: o.comment ?? "",
      userAgent: o.userAgent ?? null,
      ip: o.ip ?? null,
      createdAt: o.createdAt ?? now(),
      updatedAt: o.createdAt ?? now(),
    });
  }
  console.log(`   ✓ ${orderRows.length} заказов`);

  // 8. Согласия
  console.log("\n✅ Согласия (consents)…");

  const consentRows = await readNdjson<ConsentRow>("consents.ndjson");
  for (const c of consentRows) {
    await db.insert(schema.consents).values({
      ip: c.ip ?? "",
      userAgent: c.userAgent ?? "",
      consentPersonalData: c.consentPersonalData ?? false,
      consentMarketing: c.consentMarketing ?? false,
      createdAt: c.createdAt ?? now(),
    });
  }
  console.log(`   ✓ ${consentRows.length} согласий`);

  // 9. Сессии (опционально, не переносим — короткоживущие)
  const sessionRows = await readNdjson<unknown>("sessions.ndjson");
  if (sessionRows.length > 0) {
    console.log(`\n   ℹ  sessions.ndjson: ${sessionRows.length} записей — сессии не переносим (они короткоживущие)`);
  }

  // Закрываем соединение
  sqlite.close();

  // Итог
  console.log("\n✅ Миграция завершена!\n");
  console.log("Итого:");
  console.log(`  Категорий:      ${CATALOG_SECTIONS.length}`);
  console.log(`  Товаров:        ${productsData.length}`);
  console.log(`  Характеристик:  ${specsCount}`);
  console.log(`  Аналогов:       ${analogsCount}`);
  console.log(`  Пользователей:  ${userRows.length}`);
  console.log(`  Заказов:        ${orderRows.length}`);
  console.log(`  Согласий:       ${consentRows.length}`);
  console.log("");
}

main().catch((err) => {
  console.error("❌ Ошибка миграции:", err);
  process.exit(1);
});
