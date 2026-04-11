# Админ-панель Фаза 1: Фундамент (БД + Авторизация + Каркас)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Установить SQLite + Drizzle, мигрировать данные из NDJSON/TS, создать авторизацию админов с 2FA через Telegram, и собрать каркас админки (layout + дашборд).

**Architecture:** Админка встроена в существующий Next.js проект по маршруту `/admin`. SQLite-база (`data/shop.db`) через Drizzle ORM заменяет NDJSON-файлы и hardcoded products.ts. Авторизация — scrypt + сессионные cookie + 2FA через существующего Telegram-бота. Middleware защищает все `/admin` и `/api/admin` маршруты.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, SQLite (better-sqlite3), Drizzle ORM, scrypt (встроенный в Node.js), Telegram Bot API (существующий бот)

**Spec:** `docs/superpowers/specs/2026-04-11-admin-panel-design.md`

**Фазы проекта:**
- **Фаза 1 (этот план):** БД + Авторизация + Каркас
- Фаза 2: Товары + Категории
- Фаза 3: Заказы
- Фаза 4: Чат и заявки
- Фаза 5: Клиенты, Контент, Аналитика, Настройки

---

## Файловая структура (создаваемые/изменяемые файлы)

```
# Новые файлы
src/app/lib/db/index.ts              — подключение к SQLite, экземпляр Drizzle
src/app/lib/db/schema.ts             — все таблицы Drizzle (полная схема)
src/app/lib/db/migrate.ts            — применение миграций при старте
src/app/lib/admin-auth.ts            — авторизация админов (хэширование, сессии, 2FA)
src/app/lib/admin-middleware.ts      — проверка админской сессии для API и страниц

src/app/admin/layout.tsx             — layout админки (sidebar + рабочая область)
src/app/admin/page.tsx               — дашборд (redirect на /admin/dashboard)
src/app/admin/dashboard/page.tsx     — главная страница админки
src/app/admin/login/page.tsx         — страница входа
src/app/admin/login/verify/page.tsx  — страница ввода 2FA кода

src/app/admin/components/AdminSidebar.tsx    — боковое меню
src/app/admin/components/AdminHeader.tsx     — верхняя панель рабочей области
src/app/admin/components/StatCard.tsx        — карточка метрики на дашборде
src/app/admin/components/RecentOrdersTable.tsx — таблица последних заказов

src/app/api/admin/auth/login/route.ts    — POST: логин + пароль
src/app/api/admin/auth/2fa/route.ts      — POST: проверка 2FA кода
src/app/api/admin/auth/logout/route.ts   — POST: выход
src/app/api/admin/auth/me/route.ts       — GET: текущий админ
src/app/api/admin/dashboard/route.ts     — GET: метрики дашборда

scripts/admin-create.ts              — CLI: создание первого админа
scripts/migrate-to-sqlite.ts         — CLI: миграция данных NDJSON → SQLite

drizzle.config.ts                    — конфигурация Drizzle Kit

# Изменяемые файлы
package.json                         — добавить зависимости и скрипты
src/app/data/products.ts             — читать из SQLite вместо hardcoded массива
src/app/lib/auth.ts                  — переключить на SQLite для users/sessions
src/app/api/send-order/route.ts      — сохранять заказы в SQLite
robots.ts                            — добавить Disallow: /admin
```

---

## Task 1: Установка зависимостей

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Установить Drizzle ORM и SQLite**

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

- [ ] **Step 2: Добавить скрипты в package.json**

В секцию `"scripts"` добавить:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "tsx scripts/migrate-to-sqlite.ts",
"db:studio": "drizzle-kit studio",
"admin:create": "tsx scripts/admin-create.ts"
```

- [ ] **Step 3: Создать конфигурацию Drizzle Kit**

Создать файл `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/app/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/shop.db",
  },
});
```

- [ ] **Step 4: Добавить drizzle/ в .gitignore**

Добавить в `.gitignore`:

```
drizzle/
data/shop.db
data/shop.db-wal
data/shop.db-shm
```

- [ ] **Step 5: Убедиться что всё ставится без ошибок**

```bash
npm run build
```

Expected: Сборка проходит без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add package.json package-lock.json drizzle.config.ts .gitignore
git commit -m "chore: add Drizzle ORM + SQLite dependencies"
```

---

## Task 2: Схема базы данных

**Files:**
- Create: `src/app/lib/db/schema.ts`

- [ ] **Step 1: Создать файл схемы со всеми таблицами**

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Админы ───

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  name: text("name").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id),
  ip: text("ip"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const admin2faCodes = sqliteTable("admin_2fa_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id),
  codeHash: text("code_hash").notNull(),
  codeSalt: text("code_salt").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── Каталог ───

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  groupSlug: text("group_slug").notNull(),
  groupName: text("group_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  country: text("country").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id),
  car: text("car").notNull().default(""),
  price: integer("price").notNull(),
  inStock: integer("in_stock").notNull().default(0),
  image: text("image").notNull().default(""),
  images: text("images").notNull().default("[]"), // JSON array
  description: text("description").notNull().default(""),
  longDescription: text("long_description").default(null), // JSON object
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const productSpecs = sqliteTable("product_specs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productAnalogs = sqliteTable("product_analogs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  analogId: integer("analog_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
});

// ─── Заказы и клиенты ───

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  fullName: text("full_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userSessions = sqliteTable("user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull().default(""),
  items: text("items").notNull(), // JSON array of OrderItem
  total: integer("total").notNull(),
  deliveryMethod: text("delivery_method").notNull().default("pickup"),
  deliveryCity: text("delivery_city").notNull().default(""),
  deliveryAddress: text("delivery_address").notNull().default(""),
  deliveryCost: integer("delivery_cost").notNull().default(0),
  deliveryQuote: text("delivery_quote").default(null), // JSON
  cdekPickupPoint: text("cdek_pickup_point").default(null), // JSON
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("new"),
  isUrgent: integer("is_urgent", { mode: "boolean" }).notNull().default(false),
  comment: text("comment").notNull().default(""),
  userAgent: text("user_agent").default(null),
  ip: text("ip").default(null),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orderStatusHistory = sqliteTable("order_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  status: text("status").notNull(),
  comment: text("comment").notNull().default(""),
  notifiedClient: integer("notified_client", { mode: "boolean" })
    .notNull()
    .default(false),
  adminId: integer("admin_id").references(() => admins.id),
  createdAt: text("created_at").notNull(),
});

// ─── Коммуникации ───

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(), // "chat" | "telegram" | "email"
  customerName: text("customer_name").notNull().default(""),
  customerContact: text("customer_contact").notNull().default(""),
  status: text("status").notNull().default("new"), // "new" | "active" | "closed"
  rating: integer("rating").default(null), // 1=bad, 2=good
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  sender: text("sender").notNull(), // "customer" | "admin"
  adminId: integer("admin_id").references(() => admins.id),
  text: text("text").notNull(),
  attachments: text("attachments").notNull().default("[]"), // JSON array
  isInternalNote: integer("is_internal_note", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});

export const quickReplies = sqliteTable("quick_replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Контент ───

export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
  updatedBy: integer("updated_by").references(() => admins.id),
});

export const faqItems = sqliteTable("faq_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  text: text("text").notNull().default(""),
  link: text("link").notNull().default(""),
  image: text("image").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ─── Настройки ───

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON
  updatedAt: text("updated_at").notNull(),
});

// ─── Аналитика ───

export const productViews = sqliteTable("product_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  date: text("date").notNull(), // YYYY-MM-DD
  viewCount: integer("view_count").notNull().default(0),
});

// ─── Согласия ───

export const consents = sqliteTable("consents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  consentPersonalData: integer("consent_personal_data", { mode: "boolean" })
    .notNull()
    .default(false),
  consentMarketing: integer("consent_marketing", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/lib/db/schema.ts
git commit -m "feat: add complete Drizzle database schema"
```

---

## Task 3: Подключение к БД и миграции

**Files:**
- Create: `src/app/lib/db/index.ts`
- Create: `src/app/lib/db/migrate.ts`

- [ ] **Step 1: Создать подключение к базе**

Создать `src/app/lib/db/index.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "shop.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
```

- [ ] **Step 2: Создать скрипт применения миграций**

Создать `src/app/lib/db/migrate.ts`:

```typescript
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import path from "path";

export function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  migrate(db, { migrationsFolder });
}
```

- [ ] **Step 3: Сгенерировать начальную миграцию**

```bash
npx drizzle-kit generate
```

Expected: Создаётся папка `drizzle/` с SQL-миграцией.

- [ ] **Step 4: Убедиться что миграция применяется**

```bash
mkdir -p data
npx tsx -e "const {runMigrations} = require('./src/app/lib/db/migrate'); runMigrations(); console.log('OK')"
```

Expected: Файл `data/shop.db` создан, таблицы созданы, вывод: `OK`.

- [ ] **Step 5: Коммит**

```bash
git add src/app/lib/db/index.ts src/app/lib/db/migrate.ts drizzle/
git commit -m "feat: SQLite connection and initial migration"
```

---

## Task 4: Скрипт миграции данных из NDJSON → SQLite

**Files:**
- Create: `scripts/migrate-to-sqlite.ts`

- [ ] **Step 1: Написать скрипт миграции**

```typescript
import { db, schema } from "../src/app/lib/db";
import { runMigrations } from "../src/app/lib/db/migrate";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function readNdjson<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  return fs
    .readFileSync(filepath, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function main() {
  console.log("Running migrations...");
  runMigrations();

  // 1. Categories
  console.log("Migrating categories...");
  const { CATALOG_SECTIONS, CATALOG_GROUPS } = await import(
    "../src/app/data/catalog-sections"
  );
  const now = new Date().toISOString();

  for (let i = 0; i < CATALOG_SECTIONS.length; i++) {
    const s = CATALOG_SECTIONS[i];
    const group = CATALOG_GROUPS.find((g: any) => g.slug === s.group);
    db.insert(schema.categories)
      .values({
        slug: s.slug,
        title: s.title,
        groupSlug: s.group,
        groupName: group?.name ?? s.group,
        sortOrder: i,
        createdAt: now,
      })
      .run();
  }
  console.log(`  → ${CATALOG_SECTIONS.length} categories`);

  // 2. Products
  console.log("Migrating products...");
  const { products: rawProducts } = await import("../src/app/data/products");

  const catRows = db.select().from(schema.categories).all();
  const catMap = new Map(catRows.map((c) => [c.title, c.id]));

  for (const p of rawProducts) {
    const categoryId = catMap.get(p.category) ?? null;
    db.insert(schema.products)
      .values({
        externalId: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        country: p.country,
        categoryId,
        car: p.car,
        price: p.price,
        inStock: p.inStock,
        image: p.image,
        images: JSON.stringify(p.images ?? []),
        description: p.description,
        longDescription: p.longDescription
          ? JSON.stringify(p.longDescription)
          : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Get the inserted product ID
    const inserted = db
      .select()
      .from(schema.products)
      .where(
        require("drizzle-orm").eq(schema.products.externalId, p.id)
      )
      .get();

    if (inserted && p.specs) {
      for (let i = 0; i < p.specs.length; i++) {
        db.insert(schema.productSpecs)
          .values({
            productId: inserted.id,
            label: p.specs[i].label,
            value: p.specs[i].value,
            sortOrder: i,
          })
          .run();
      }
    }
  }
  console.log(`  → ${rawProducts.length} products`);

  // 3. Product analogs
  console.log("Migrating product analogs...");
  const allProducts = db.select().from(schema.products).all();
  const extIdMap = new Map(allProducts.map((p) => [p.externalId, p.id]));
  let analogCount = 0;

  for (const p of rawProducts) {
    if (!p.analogIds?.length) continue;
    const productId = extIdMap.get(p.id);
    if (!productId) continue;

    for (const analogExtId of p.analogIds) {
      const analogId = extIdMap.get(analogExtId);
      if (!analogId) continue;
      db.insert(schema.productAnalogs)
        .values({ productId, analogId })
        .run();
      analogCount++;
    }
  }
  console.log(`  → ${analogCount} analog links`);

  // 4. Users
  console.log("Migrating users...");
  type UserNdjson = {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    passwordSalt: string;
    passwordHash: string;
    createdAt: string;
  };
  const usersData = readNdjson<UserNdjson>("users.ndjson");
  for (const u of usersData) {
    db.insert(schema.users)
      .values({
        externalId: u.id,
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        passwordHash: u.passwordHash,
        passwordSalt: u.passwordSalt,
        createdAt: u.createdAt,
      })
      .run();
  }
  console.log(`  → ${usersData.length} users`);

  // 5. Orders
  console.log("Migrating orders...");
  type OrderNdjson = {
    name: string;
    phone: string;
    comment?: string;
    items: Array<{ name: string; quantity: number; price: number; sum: number }>;
    total: number;
    deliveryMethod?: string;
    deliveryCity?: string;
    deliveryQuote?: object | null;
    cdekPickupPoint?: object | null;
    paymentMethod?: string;
    consentPersonalData?: boolean;
    consentMarketing?: boolean;
    createdAt: string;
    userAgent?: string;
    ip?: string;
  };
  const ordersData = readNdjson<OrderNdjson>("orders.ndjson");
  for (let i = 0; i < ordersData.length; i++) {
    const o = ordersData[i];
    const orderNumber = String(1000 + i + 1);
    db.insert(schema.orders)
      .values({
        orderNumber,
        customerName: o.name,
        customerPhone: o.phone,
        customerEmail: "",
        items: JSON.stringify(o.items),
        total: o.total,
        deliveryMethod: o.deliveryMethod ?? "pickup",
        deliveryCity: o.deliveryCity ?? "",
        deliveryAddress: "",
        deliveryCost: o.deliveryQuote
          ? (o.deliveryQuote as any).deliverySum ?? 0
          : 0,
        deliveryQuote: o.deliveryQuote
          ? JSON.stringify(o.deliveryQuote)
          : null,
        cdekPickupPoint: o.cdekPickupPoint
          ? JSON.stringify(o.cdekPickupPoint)
          : null,
        paymentMethod: o.paymentMethod ?? "cash",
        status: "delivered",
        isUrgent: false,
        comment: o.comment ?? "",
        userAgent: o.userAgent ?? null,
        ip: o.ip ?? null,
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
      })
      .run();
  }
  console.log(`  → ${ordersData.length} orders`);

  // 6. Consents
  console.log("Migrating consents...");
  type ConsentNdjson = {
    ip: string;
    userAgent: string;
    consentPersonalData: boolean;
    consentMarketing?: boolean;
    createdAt: string;
  };
  const consentsData = readNdjson<ConsentNdjson>("consents.ndjson");
  for (const c of consentsData) {
    db.insert(schema.consents)
      .values({
        ip: c.ip,
        userAgent: c.userAgent,
        consentPersonalData: c.consentPersonalData,
        consentMarketing: c.consentMarketing ?? false,
        createdAt: c.createdAt,
      })
      .run();
  }
  console.log(`  → ${consentsData.length} consents`);

  console.log("\nMigration complete!");
}

main().catch(console.error);
```

- [ ] **Step 2: Запустить миграцию**

```bash
npm run db:migrate
```

Expected: Все данные перенесены, вывод показывает количество записей по каждой таблице.

- [ ] **Step 3: Проверить данные в БД**

```bash
npx tsx -e "
  const {db, schema} = require('./src/app/lib/db');
  console.log('Products:', db.select().from(schema.products).all().length);
  console.log('Categories:', db.select().from(schema.categories).all().length);
  console.log('Users:', db.select().from(schema.users).all().length);
  console.log('Orders:', db.select().from(schema.orders).all().length);
"
```

Expected: Числа совпадают с исходными данными (products ~99, categories 13).

- [ ] **Step 4: Коммит**

```bash
git add scripts/migrate-to-sqlite.ts
git commit -m "feat: data migration script NDJSON/TS → SQLite"
```

---

## Task 5: Авторизация админов — серверная логика

**Files:**
- Create: `src/app/lib/admin-auth.ts`

- [ ] **Step 1: Написать модуль авторизации админов**

```typescript
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "am_admin_session";
const ADMIN_SESSION_TTL_HOURS = 24;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 min
const MAX_CODE_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15 min

// In-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

function hashPassword(password: string, salt?: string) {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, resolvedSalt, 64).toString("hex");
  return { salt: resolvedSalt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isLoginBlocked(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() < entry.blockedUntil) return true;
  if (Date.now() >= entry.blockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return false;
}

export function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const entry = loginAttempts.get(ip) ?? { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOGIN_BLOCK_MS;
  }
  loginAttempts.set(ip, entry);
}

export function verifyAdminLogin(login: string, password: string) {
  const admin = db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.login, login))
    .get();

  if (!admin) return null;
  if (!verifyPassword(password, admin.passwordSalt, admin.passwordHash)) return null;
  return { id: admin.id, name: admin.name, telegramChatId: admin.telegramChatId };
}

export function create2faCode(adminId: number) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { salt, hash } = hashPassword(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  // Delete old codes for this admin
  db.delete(schema.admin2faCodes)
    .where(eq(schema.admin2faCodes.adminId, adminId))
    .run();

  db.insert(schema.admin2faCodes)
    .values({
      adminId,
      codeHash: hash,
      codeSalt: salt,
      attempts: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  return code;
}

export function verify2faCode(adminId: number, code: string) {
  const record = db
    .select()
    .from(schema.admin2faCodes)
    .where(eq(schema.admin2faCodes.adminId, adminId))
    .get();

  if (!record) return { ok: false as const, reason: "no-code" };
  if (new Date(record.expiresAt) < new Date()) return { ok: false as const, reason: "expired" };
  if (record.attempts >= MAX_CODE_ATTEMPTS) return { ok: false as const, reason: "too-many-attempts" };

  // Increment attempts
  db.update(schema.admin2faCodes)
    .set({ attempts: record.attempts + 1 })
    .where(eq(schema.admin2faCodes.id, record.id))
    .run();

  if (!verifyPassword(code, record.codeSalt, record.codeHash)) {
    return { ok: false as const, reason: "invalid" };
  }

  // Delete used code
  db.delete(schema.admin2faCodes)
    .where(eq(schema.admin2faCodes.id, record.id))
    .run();

  return { ok: true as const };
}

export function createAdminSession(adminId: number, ip?: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000
  );

  db.insert(schema.adminSessions)
    .values({
      tokenHash,
      adminId,
      ip: ip ?? null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  return { token, expiresAt };
}

export function deleteAdminSession(token: string) {
  const tokenHash = hashToken(token);
  db.delete(schema.adminSessions)
    .where(eq(schema.adminSessions.tokenHash, tokenHash))
    .run();
}

export function getAdminBySessionToken(token: string) {
  const tokenHash = hashToken(token);
  const session = db
    .select()
    .from(schema.adminSessions)
    .where(eq(schema.adminSessions.tokenHash, tokenHash))
    .get();

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    db.delete(schema.adminSessions)
      .where(eq(schema.adminSessions.id, session.id))
      .run();
    return null;
  }

  const admin = db
    .select({
      id: schema.admins.id,
      login: schema.admins.login,
      name: schema.admins.name,
      telegramChatId: schema.admins.telegramChatId,
    })
    .from(schema.admins)
    .where(eq(schema.admins.id, session.adminId))
    .get();

  return admin ?? null;
}

export async function getSessionAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAdminBySessionToken(token);
}

export function createAdmin(input: {
  login: string;
  password: string;
  name: string;
  telegramChatId: string;
}) {
  const { salt, hash } = hashPassword(input.password);
  const now = new Date().toISOString();

  db.insert(schema.admins)
    .values({
      login: input.login,
      passwordHash: hash,
      passwordSalt: salt,
      name: input.name,
      telegramChatId: input.telegramChatId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export { ADMIN_SESSION_COOKIE };
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/lib/admin-auth.ts
git commit -m "feat: admin authentication module (login, 2FA, sessions)"
```

---

## Task 6: Admin middleware (защита маршрутов)

**Files:**
- Create: `src/app/lib/admin-middleware.ts`

- [ ] **Step 1: Создать middleware для API и страниц**

```typescript
import { NextResponse } from "next/server";
import { getSessionAdmin, ADMIN_SESSION_COOKIE } from "./admin-auth";

export async function requireAdmin() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { authorized: true as const, admin };
}

export async function requireAdminOrRedirect() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return { authorized: false as const };
  }
  return { authorized: true as const, admin };
}
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/lib/admin-middleware.ts
git commit -m "feat: admin middleware for route protection"
```

---

## Task 7: API — авторизация админов

**Files:**
- Create: `src/app/api/admin/auth/login/route.ts`
- Create: `src/app/api/admin/auth/2fa/route.ts`
- Create: `src/app/api/admin/auth/logout/route.ts`
- Create: `src/app/api/admin/auth/me/route.ts`

- [ ] **Step 1: POST /api/admin/auth/login**

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminLogin,
  create2faCode,
  isLoginBlocked,
  recordLoginAttempt,
  ADMIN_SESSION_COOKIE,
} from "@/app/lib/admin-auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  if (isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через 15 минут." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { login, password } = body;

  if (!login || !password) {
    return NextResponse.json(
      { error: "Введите логин и пароль" },
      { status: 400 }
    );
  }

  const admin = verifyAdminLogin(login, password);
  if (!admin) {
    recordLoginAttempt(ip, false);
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 }
    );
  }

  recordLoginAttempt(ip, true);

  // Generate 2FA code and send via Telegram
  const code = create2faCode(admin.id);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && admin.telegramChatId) {
    await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: admin.telegramChatId,
          text: `🔐 Код входа в админку: *${code}*\n\nДействует 5 минут.`,
          parse_mode: "Markdown",
        }),
      }
    );
  }

  return NextResponse.json({
    ok: true,
    adminId: admin.id,
    message: "Код отправлен в Telegram",
  });
}
```

- [ ] **Step 2: POST /api/admin/auth/2fa**

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  verify2faCode,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
} from "@/app/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { adminId, code } = body;

  if (!adminId || !code) {
    return NextResponse.json(
      { error: "Введите код" },
      { status: 400 }
    );
  }

  const result = verify2faCode(adminId, code);
  if (!result.ok) {
    const messages: Record<string, string> = {
      "no-code": "Код не найден. Войдите заново.",
      expired: "Код истёк. Войдите заново.",
      "too-many-attempts": "Слишком много попыток. Войдите заново.",
      invalid: "Неверный код",
    };
    return NextResponse.json(
      { error: messages[result.reason] ?? "Ошибка проверки кода" },
      { status: 401 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? undefined;
  const { token, expiresAt } = createAdminSession(adminId, ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
```

- [ ] **Step 3: POST /api/admin/auth/logout**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { deleteAdminSession, ADMIN_SESSION_COOKIE } from "@/app/lib/admin-auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    deleteAdminSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
```

- [ ] **Step 4: GET /api/admin/auth/me**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";

export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  return NextResponse.json({
    id: result.admin.id,
    login: result.admin.login,
    name: result.admin.name,
  });
}
```

- [ ] **Step 5: Коммит**

```bash
git add src/app/api/admin/auth/
git commit -m "feat: admin auth API routes (login, 2FA, logout, me)"
```

---

## Task 8: CLI — создание первого админа

**Files:**
- Create: `scripts/admin-create.ts`

- [ ] **Step 1: Написать CLI-скрипт**

```typescript
import { createAdmin } from "../src/app/lib/admin-auth";
import { runMigrations } from "../src/app/lib/db/migrate";
import { db, schema } from "../src/app/lib/db";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  runMigrations();

  const existing = db.select().from(schema.admins).all();
  if (existing.length > 0) {
    console.log(`\nУже есть ${existing.length} админ(ов):`);
    for (const a of existing) {
      console.log(`  - ${a.login} (${a.name})`);
    }
    const proceed = await ask("\nДобавить ещё одного? (y/n): ");
    if (proceed.toLowerCase() !== "y") {
      rl.close();
      return;
    }
  }

  console.log("\n--- Создание админа ---\n");

  const login = await ask("Логин: ");
  const password = await ask("Пароль: ");
  const name = await ask("Имя: ");
  const telegramChatId = await ask("Telegram Chat ID: ");

  if (!login || !password || !name || !telegramChatId) {
    console.error("Все поля обязательны.");
    rl.close();
    process.exit(1);
  }

  createAdmin({ login, password, name, telegramChatId });
  console.log(`\nАдмин "${login}" создан!`);
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Проверить работу**

```bash
npm run admin:create
```

Expected: Интерактивный ввод данных, админ создаётся в БД.

- [ ] **Step 3: Коммит**

```bash
git add scripts/admin-create.ts
git commit -m "feat: CLI script for creating admin users"
```

---

## Task 9: Страница входа в админку

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/verify/page.tsx`

- [ ] **Step 1: Страница логина**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка входа");
        return;
      }

      // Redirect to 2FA page with adminId
      router.push(`/admin/login/verify?id=${data.adminId}`);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-amber-500">AM</div>
          <div className="mt-1 text-sm text-slate-400">Панель управления</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Логин</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Проверяем..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Страница ввода 2FA кода**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: Number(adminId), code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка проверки");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (!adminId) {
    router.push("/admin/login");
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-amber-500">AM</div>
          <div className="mt-1 text-sm text-slate-400">
            Код отправлен в Telegram
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Введите 6-значный код
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-lg tracking-widest focus:border-indigo-500 focus:outline-none"
              placeholder="000000"
              autoFocus
              required
              maxLength={6}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Проверяем..." : "Подтвердить"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/login")}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            Назад к входу
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/login/
git commit -m "feat: admin login page with 2FA code verification"
```

---

## Task 10: Layout админки (sidebar + header)

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/components/AdminSidebar.tsx`
- Create: `src/app/admin/components/AdminHeader.tsx`

- [ ] **Step 1: AdminSidebar**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Дашборд", icon: "📊" },
  { href: "/admin/products", label: "Товары", icon: "📦" },
  { href: "/admin/categories", label: "Категории", icon: "📁" },
  { href: "/admin/orders", label: "Заказы", icon: "🛒", badge: true },
  { href: "/admin/conversations", label: "Чат и заявки", icon: "💬", badge: true },
  { href: "/admin/customers", label: "Клиенты", icon: "👥" },
  { href: "/admin/content", label: "Контент", icon: "📝" },
  { href: "/admin/analytics", label: "Аналитика", icon: "📈" },
];

const SETTINGS_ITEM = { href: "/admin/settings", label: "Настройки", icon: "⚙️" };

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-[#1e1e2e] text-slate-300">
      {/* Logo */}
      <div className="border-b border-white/5 px-4 py-4">
        <div className="text-lg font-bold text-amber-400">AM</div>
        <div className="text-xs text-slate-500">Astra Motors</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-l-[3px] border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-l-[3px] border-transparent hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="my-2 border-t border-white/5" />

        <Link
          href={SETTINGS_ITEM.href}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            pathname.startsWith(SETTINGS_ITEM.href)
              ? "border-l-[3px] border-indigo-500 bg-indigo-500/10 text-indigo-300"
              : "border-l-[3px] border-transparent hover:bg-white/5"
          }`}
        >
          <span>{SETTINGS_ITEM.icon}</span>
          <span>{SETTINGS_ITEM.label}</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-3">
        <div className="text-xs text-slate-400">{adminName}</div>
        <button
          onClick={handleLogout}
          className="mt-1 text-xs text-slate-500 hover:text-red-400"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: AdminHeader**

```tsx
export function AdminHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  const date = new Date().toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-4">
        {children}
        <span className="text-sm text-slate-400">{date}</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Layout админки**

```tsx
import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/app/lib/admin-auth";
import { AdminSidebar } from "./components/AdminSidebar";

export const metadata = {
  title: "Админка — Astra Motors",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getSessionAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar adminName={admin.name} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Redirect /admin → /admin/dashboard**

Создать `src/app/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/dashboard");
}
```

- [ ] **Step 5: Коммит**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/app/admin/components/
git commit -m "feat: admin layout with sidebar navigation"
```

---

## Task 11: Дашборд

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/components/StatCard.tsx`
- Create: `src/app/admin/components/RecentOrdersTable.tsx`
- Create: `src/app/api/admin/dashboard/route.ts`

- [ ] **Step 1: StatCard компонент**

```tsx
export function StatCard({
  label,
  value,
  subtitle,
  subtitleColor,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: "green" | "red" | "gray";
}) {
  const colorClass =
    subtitleColor === "green"
      ? "text-green-500"
      : subtitleColor === "red"
        ? "text-red-500"
        : "text-slate-400";

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {subtitle && (
        <div className={`mt-0.5 text-xs ${colorClass}`}>{subtitle}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: RecentOrdersTable компонент**

```tsx
import Link from "next/link";

type RecentOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-amber-50", text: "text-amber-700", label: "Новый" },
  processing: { bg: "bg-indigo-50", text: "text-indigo-700", label: "В обработке" },
  shipped: { bg: "bg-blue-50", text: "text-blue-700", label: "Отправлен" },
  delivered: { bg: "bg-green-50", text: "text-green-700", label: "Доставлен" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Отменён" },
};

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="px-4 py-3 font-semibold text-slate-800">
        Последние заказы
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-4 py-2 font-medium">№</th>
            <th className="px-4 py-2 font-medium">Клиент</th>
            <th className="px-4 py-2 font-medium">Сумма</th>
            <th className="px-4 py-2 font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.new;
            return (
              <tr
                key={order.id}
                className="border-b border-slate-50 hover:bg-slate-50"
              >
                <td className="px-4 py-2.5 font-medium text-indigo-500">
                  <Link href={`/admin/orders/${order.id}`}>
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {order.customerName}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  {order.total.toLocaleString("ru-RU")} ₽
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: API дашборда**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { desc, eq, gte, sql } from "drizzle-orm";

export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() - 1
  ).toISOString();

  // Orders today
  const ordersToday = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, todayStart))
    .get()?.count ?? 0;

  // Orders yesterday
  const ordersYesterday = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(
      sql`${schema.orders.createdAt} >= ${yesterdayStart} AND ${schema.orders.createdAt} < ${todayStart}`
    )
    .get()?.count ?? 0;

  // Revenue today
  const revenueToday = db
    .select({ sum: sql<number>`coalesce(sum(${schema.orders.total}), 0)` })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, todayStart))
    .get()?.sum ?? 0;

  // Revenue yesterday
  const revenueYesterday = db
    .select({ sum: sql<number>`coalesce(sum(${schema.orders.total}), 0)` })
    .from(schema.orders)
    .where(
      sql`${schema.orders.createdAt} >= ${yesterdayStart} AND ${schema.orders.createdAt} < ${todayStart}`
    )
    .get()?.sum ?? 0;

  // New conversations (unanswered)
  const newConversations = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(eq(schema.conversations.status, "new"))
    .get()?.count ?? 0;

  // Total products
  const totalProducts = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .get()?.count ?? 0;

  // Recent orders
  const recentOrders = db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      customerName: schema.orders.customerName,
      total: schema.orders.total,
      status: schema.orders.status,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt))
    .limit(5)
    .all();

  return NextResponse.json({
    ordersToday,
    ordersDiff: ordersToday - ordersYesterday,
    revenueToday,
    revenueDiff: revenueToday - revenueYesterday,
    newConversations,
    totalProducts,
    recentOrders,
  });
}
```

- [ ] **Step 4: Страница дашборда**

```tsx
"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import { StatCard } from "../components/StatCard";
import { RecentOrdersTable } from "../components/RecentOrdersTable";

type DashboardData = {
  ordersToday: number;
  ordersDiff: number;
  revenueToday: number;
  revenueDiff: number;
  newConversations: number;
  totalProducts: number;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div>
      <AdminHeader title="Дашборд" />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard
          label="Заказы сегодня"
          value={data.ordersToday}
          subtitle={
            data.ordersDiff >= 0
              ? `+${data.ordersDiff} к вчера`
              : `${data.ordersDiff} к вчера`
          }
          subtitleColor={data.ordersDiff >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Выручка сегодня"
          value={`${data.revenueToday.toLocaleString("ru-RU")} ₽`}
          subtitle={
            data.revenueDiff >= 0
              ? `+${data.revenueDiff.toLocaleString("ru-RU")} ₽`
              : `${data.revenueDiff.toLocaleString("ru-RU")} ₽`
          }
          subtitleColor={data.revenueDiff >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Новые заявки"
          value={data.newConversations}
          subtitle="без ответа"
          subtitleColor={data.newConversations > 0 ? "red" : "gray"}
        />
        <StatCard
          label="Товаров"
          value={data.totalProducts}
          subtitle="в каталоге"
          subtitleColor="gray"
        />
      </div>

      <RecentOrdersTable orders={data.recentOrders} />
    </div>
  );
}
```

- [ ] **Step 5: Коммит**

```bash
git add src/app/admin/dashboard/ src/app/admin/components/ src/app/api/admin/dashboard/
git commit -m "feat: admin dashboard with stats and recent orders"
```

---

## Task 12: Скрыть /admin от поисковиков

**Files:**
- Modify: `src/app/robots.ts` (добавить Disallow: /admin)

- [ ] **Step 1: Добавить /admin в robots.txt**

В файле `src/app/robots.ts` добавить в правила `Disallow: /admin`:

Найти массив `rules` и добавить `/admin` в `disallow`.

- [ ] **Step 2: Проверить сборку**

```bash
npm run build
```

Expected: Сборка проходит без ошибок, `/admin` страницы включены.

- [ ] **Step 3: Коммит**

```bash
git add src/app/robots.ts
git commit -m "feat: hide /admin from search engine crawlers"
```

---

## Результат Фазы 1

После выполнения всех задач:

1. **SQLite база** работает с полной схемой (все таблицы для будущих фаз)
2. **Данные мигрированы** из NDJSON и products.ts в SQLite
3. **Авторизация** — логин + пароль + 2FA через Telegram, сессии на 24ч, блокировка IP
4. **Каркас админки** — sidebar с навигацией, layout с проверкой авторизации
5. **Дашборд** — 4 карточки метрик + таблица последних заказов
6. **CLI** — `npm run admin:create` для создания первого админа
7. **Безопасность** — `/admin` скрыт от поисковиков, все роуты защищены

**Следующий шаг:** Фаза 2 — управление товарами и категориями через админку.
