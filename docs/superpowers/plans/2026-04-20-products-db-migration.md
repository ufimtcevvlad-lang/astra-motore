# Переход публичного сайта на чтение товаров из БД — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичный сайт (главная, каталог, бренд-страницы, карточка, поиск, корзина, избранное) читает товары из SQLite вместо статического `src/app/data/products.ts`.

**Architecture:** В таблицу `products` добавляется `slug`. Хелпер `src/app/lib/products-db.ts` экспортирует API идентичный тому, что сейчас дает `data/products.ts`. Галерея фото — из `public/uploads/products/<sku>/`. 16 публичных файлов переключаются с импорта статики на новый хелпер. Сид-скрипт переносит 121 товар в БД один раз.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, better-sqlite3, TypeScript.

**Спека:** [docs/superpowers/specs/2026-04-20-products-db-migration-design.md](../specs/2026-04-20-products-db-migration-design.md)

**Верификация:** нет unit-тестов в проекте. Проверяем через `npx tsc --noEmit`, `npm run build`, и ручной smoke-test в браузере через preview-сервер.

---

## Файловая структура (что меняется)

**Новые:**
- `drizzle/0004_products_slug.sql` — миграция схемы (ADD COLUMN slug + индекс)
- `scripts/seed-products-from-static.ts` — одноразовый сид 121 товара
- `src/app/lib/product-images.ts` — чтение галереи из `public/uploads/products/<sku>/`
- `src/app/lib/products-db.ts` — API доступа к товарам из БД
- `src/app/lib/products-types.ts` — общий тип `Product` (выделяется из `data/products.ts`)
- `src/app/lib/revalidate-products.ts` — хелпер `revalidatePublicProductPages()`

**Правим:**
- `src/app/lib/db/schema.ts` — добавить `slug: text("slug")` + uniqueIndex
- `src/app/lib/product-slug.ts` — убрать чтение массива на модуле, сделать чисто вычислительные функции
- `src/app/api/admin/products/import/confirm/route.ts` — создание папки + revalidate
- `src/app/api/admin/products/route.ts` — revalidate при POST
- `src/app/api/admin/products/[id]/route.ts` — revalidate при PATCH/DELETE
- `src/app/api/admin/products/[id]/quick/route.ts` — revalidate
- `src/app/api/admin/products/[id]/duplicate/route.ts` — revalidate
- `src/app/api/admin/products/bulk/route.ts` — revalidate
- 16 публичных файлов (см. Task 6) — импорты переключаются на `products-db`

**Удаляется (в самом конце):**
- `src/app/data/products.ts`

---

## Task 1: Миграция схемы (добавить slug)

**Files:**
- Modify: `src/app/lib/db/schema.ts`
- Create: `drizzle/0004_products_slug.sql` (через `npm run db:generate`)

- [ ] **Step 1: Добавить `slug` в `products`**

В `src/app/lib/db/schema.ts`, внутри определения `products`, добавь поле сразу после `externalId`:

```ts
slug: text("slug").notNull().default(""),
```

И в объект индексов добавь:

```ts
slugUnique: uniqueIndex("products_slug_unique").on(t.slug),
```

- [ ] **Step 2: Сгенерировать миграцию**

```bash
npm run db:generate
```

Ожидается: создаётся файл `drizzle/0004_*.sql` с `ALTER TABLE products ADD slug ...` и `CREATE UNIQUE INDEX products_slug_unique`. Проверь содержимое — должно быть это.

- [ ] **Step 3: Применить миграцию локально**

```bash
npm run db:migrate
```

Проверить, что не упало и что в БД появилась колонка:
```bash
sqlite3 data/shop.db ".schema products" | grep slug
```
Ожидается: строка с `slug TEXT NOT NULL DEFAULT ''`.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/schema.ts drizzle/
git commit -m "feat(db): add products.slug column with unique index"
```

---

## Task 2: Выделить общий тип Product

**Files:**
- Create: `src/app/lib/products-types.ts`

Сейчас тип `Product` живёт в `src/app/data/products.ts`. При удалении файла сломаются импорты. Выносим тип в отдельный модуль, чтобы на него мог ссылаться и старый файл (пока жив), и новый `products-db.ts`.

- [ ] **Step 1: Создать файл с типом**

`src/app/lib/products-types.ts`:

```ts
/** Строка технической характеристики — пара «название → значение». */
export type ProductSpec = {
  label: string;
  value: string;
};

/** Расширенное SEO-описание товара по разделам. */
export type ProductLongDescription = {
  purpose?: string;
  symptoms?: string;
  interval?: string;
  install?: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  country: string;
  category: string;
  car: string;
  price: number;
  inStock: number;
  image: string;
  images?: string[];
  description: string;
  analogIds?: string[];
  specs?: ProductSpec[];
  longDescription?: ProductLongDescription;
};
```

- [ ] **Step 2: Переключить `data/products.ts` на новый тип**

В начале `src/app/data/products.ts`:

Было:
```ts
export type ProductSpec = { ... };
export type ProductLongDescription = { ... };
export type Product = { ... };
```

Станет:
```ts
export type { Product, ProductSpec, ProductLongDescription } from "../lib/products-types";
import type { Product, ProductSpec, ProductLongDescription } from "../lib/products-types";
```

(Удали старые определения типов в файле, оставь только массив `products` и хелперы.)

- [ ] **Step 3: Проверить типизацию**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/products-types.ts src/app/data/products.ts
git commit -m "refactor(types): extract Product type to lib/products-types.ts"
```

---

## Task 3: Хелпер фото-галереи

**Files:**
- Create: `src/app/lib/product-images.ts`

- [ ] **Step 1: Написать модуль**

`src/app/lib/product-images.ts`:

```ts
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "products");
const PLACEHOLDER = "/placeholder-product.svg";
const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;

/**
 * Возвращает публичные URL всех фото товара из `public/uploads/products/<sku>/`.
 * Если папки нет или она пустая — возвращает [placeholder].
 */
export function getProductImages(sku: string): string[] {
  const dir = path.join(UPLOADS_ROOT, sku);
  if (!existsSync(dir)) return [PLACEHOLDER];
  try {
    const files = readdirSync(dir)
      .filter((f) => IMG_EXT.test(f))
      .sort();
    if (files.length === 0) return [PLACEHOLDER];
    return files.map((f) => `/uploads/products/${sku}/${f}`);
  } catch {
    return [PLACEHOLDER];
  }
}

/** Создаёт пустую директорию `public/uploads/products/<sku>/`, если её нет. */
export function ensureProductDir(sku: string): void {
  const dir = path.join(UPLOADS_ROOT, sku);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
```

- [ ] **Step 2: Проверить типизацию**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Быстрая sanity-проверка**

```bash
mkdir -p public/uploads/products/TEST-SKU
node -e "const m = require('./src/app/lib/product-images.ts'); console.log(m.getProductImages('TEST-SKU'));"
```

Это не сработает напрямую из-за TS. Вместо этого создай временный `scripts/_check-images.ts`:

```ts
import { getProductImages, ensureProductDir } from "../src/app/lib/product-images";
ensureProductDir("TEST-SKU");
console.log("empty:", getProductImages("TEST-SKU"));
console.log("missing:", getProductImages("DOES-NOT-EXIST"));
```

Запусти: `npx tsx scripts/_check-images.ts`.
Ожидается: для пустой папки — `["/placeholder-product.svg"]`. Для несуществующей — то же самое.
Удали файл после проверки: `rm scripts/_check-images.ts && rm -rf public/uploads/products/TEST-SKU`.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/product-images.ts
git commit -m "feat(lib): product-images helper reads gallery from uploads/products/<sku>"
```

---

## Task 4: Рефакторинг product-slug.ts (убрать чтение массива)

**Files:**
- Modify: `src/app/lib/product-slug.ts`

Сейчас `product-slug.ts` строит глобальную карту `idToSlug` и `slugToProduct` из массива `products` на стадии импорта. После перехода на БД эта карта должна строиться из БД-запроса, но мы избавимся от неё вовсе: slug хранится в БД как поле, а функция `getProductSlug(product)` просто возвращает `product.slug`.

- [ ] **Step 1: Переписать product-slug.ts**

Заменить содержимое `src/app/lib/product-slug.ts` на:

```ts
import type { Product } from "./products-types";

/** Транслитерация кириллицы → латиница (ГОСТ 7.79-2000 Б, упрощённая). */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(s: string): string {
  return s.toLowerCase().split("").map((c) => TRANSLIT[c] ?? c).join("");
}

export function slugifySegment(s: string): string {
  return transliterate(s)
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractPartType(name: string): string {
  const clean = name.split("|")[0].trim();
  const cutoff = clean.search(/\b[A-Z]{2,}[a-z]*\b|\b[A-Z]\d{2}[A-Z]/);
  const raw = cutoff > 0 ? clean.slice(0, cutoff).trim() : clean;
  const words = raw.split(/\s+/).slice(0, 5);
  return words.join(" ").replace(/[,()]/g, "").trim();
}

/** База slug из имени + бренда + SKU (без учёта коллизий). */
export function baseProductSlug(product: Pick<Product, "name" | "brand" | "sku">): string {
  const partType = slugifySegment(extractPartType(product.name));
  const b = slugifySegment(product.brand) || "brand";
  const k = slugifySegment(product.sku) || "sku";
  return partType ? `${partType}-${b}-${k}` : `${b}-${k}`;
}

/** Возвращает slug товара из его сохранённого поля. */
export function getProductSlug(product: Product & { slug?: string }): string {
  return product.slug && product.slug.length > 0 ? product.slug : baseProductSlug(product);
}

export function productPath(product: Product & { slug?: string }): string {
  return `/product/${getProductSlug(product)}`;
}
```

Обрати внимание: **удаляются** функции `getProductBySlug`, `getLegacyProductRedirects`, `getRemovedDuplicateProductRedirects`. Они переезжают: первая — в `products-db.ts` (Task 5), две вторые — в `src/app/lib/legacy-redirects.ts` (Task 4a).

- [ ] **Step 2: Перенести redirect-хелперы в отдельный модуль**

`src/app/lib/legacy-redirects.ts`:

```ts
import { slugifySegment } from "./product-slug";
import type { Product } from "./products-types";

type Redirect = { source: string; destination: string; permanent: true };

export function buildLegacyProductRedirects(products: Product[]): Redirect[] {
  const redirects: Redirect[] = [];
  const permanent = true as const;
  for (const p of products) {
    const dest = `/product/${(p as Product & { slug?: string }).slug ?? ""}`;
    if (!dest || dest === "/product/") continue;
    redirects.push({ source: `/product/${p.id}`, destination: dest, permanent });
    const oldSlug = `${slugifySegment(p.brand) || "brand"}-${slugifySegment(p.sku) || "sku"}`;
    if (`/product/${oldSlug}` !== dest) {
      redirects.push({ source: `/product/${oldSlug}`, destination: dest, permanent });
    }
  }
  return redirects;
}

/** Фиксированный список редиректов после слияния фото opel-111..opel-115. */
export const REMOVED_DUPLICATE_REDIRECTS: Array<{
  fromSlugOrId: string;
  toOldId: string;
}> = [
  { fromSlugOrId: "opel-111", toOldId: "opel-37" },
  { fromSlugOrId: "opel-112", toOldId: "opel-38" },
  { fromSlugOrId: "opel-113", toOldId: "opel-27" },
  { fromSlugOrId: "opel-114", toOldId: "opel-44" },
  { fromSlugOrId: "opel-115", toOldId: "opel-51" },
  { fromSlugOrId: "gm-oe-96353007", toOldId: "opel-37" },
  { fromSlugOrId: "mopar-55354563", toOldId: "opel-38" },
  { fromSlugOrId: "opel-oe-24583232", toOldId: "opel-44" },
  { fromSlugOrId: "gm-oe-55559352", toOldId: "opel-51" },
  { fromSlugOrId: "gm-oe-25185121-opel-27", toOldId: "opel-27" },
  { fromSlugOrId: "ngk-90318", toOldId: "opel-46" },
];
```

`REMOVED_DUPLICATE_REDIRECTS` резолвится в полные пути там, где используется (Task 5 — `products-db.ts` даст `getProductByExternalId`).

- [ ] **Step 3: Починить вызовы из next.config / middleware**

```bash
grep -rn "getLegacyProductRedirects\|getRemovedDuplicateProductRedirects" next.config.* src/ 2>&1
```

Ожидается одно или два вхождения (обычно в `next.config.ts/js` для редиректов). В каждом месте нужно адаптировать вызов:

```ts
// было
import { getLegacyProductRedirects, getRemovedDuplicateProductRedirects } from "./src/app/lib/product-slug";
const redirects = [...getLegacyProductRedirects(), ...getRemovedDuplicateProductRedirects()];

// станет — редиректы теперь строятся из БД в async redirects():
import { db, schema } from "./src/app/lib/db";
import { buildLegacyProductRedirects, REMOVED_DUPLICATE_REDIRECTS } from "./src/app/lib/legacy-redirects";

async redirects() {
  const rows = db.select().from(schema.products).all();
  const products = rows.map(rowToProduct); // использовать rowToProduct из products-db (Task 5)
  const legacy = buildLegacyProductRedirects(products);
  const byExternalId = new Map(rows.map((r) => [r.externalId, r.slug]));
  const removed = REMOVED_DUPLICATE_REDIRECTS
    .map((r) => {
      const toSlug = byExternalId.get(`static-${r.toOldId}`);
      return toSlug ? { source: `/product/${r.fromSlugOrId}`, destination: `/product/${toSlug}`, permanent: true as const } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return [...legacy, ...removed];
}
```

**Важно:** это правка делается только после Task 5 (products-db.ts) и Task 7 (сид). Сейчас в этом Task достаточно удалить старые функции из `product-slug.ts` — next.config временно перестанет компилироваться; это Ок, починим в Task 8.

- [ ] **Step 4: Проверить типизацию**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Ожидается: ошибки будут — в файлах, которые используют удалённые функции. Это ожидаемо и будет починено в последующих тасках.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/product-slug.ts src/app/lib/legacy-redirects.ts
git commit -m "refactor(slug): remove global slug map, extract legacy redirects"
```

---

## Task 5: Хелпер products-db.ts

**Files:**
- Create: `src/app/lib/products-db.ts`

- [ ] **Step 1: Написать хелпер**

`src/app/lib/products-db.ts`:

```ts
import { db, schema } from "./db";
import { eq, inArray, like, or } from "drizzle-orm";
import type { Product } from "./products-types";
import { baseProductSlug } from "./product-slug";
import { getProductImages } from "./product-images";

type ProductRow = typeof schema.products.$inferSelect;
type CategoryRow = typeof schema.categories.$inferSelect;

/** Конвертирует строку БД в объект Product, добавляет галерею из файловой системы. */
export function rowToProduct(row: ProductRow, categorySlug: string | null): Product {
  const images = getProductImages(row.sku);
  return {
    id: row.externalId,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    country: row.country,
    category: categorySlug ?? "",
    car: row.car,
    price: row.price,
    inStock: row.inStock,
    image: images[0] ?? "/placeholder-product.svg",
    images,
    description: row.description,
  };
}

let categoryIdToSlug: Map<number, string> | null = null;
function loadCategoryMap(): Map<number, string> {
  if (!categoryIdToSlug) {
    const cats = db.select().from(schema.categories).all() as CategoryRow[];
    categoryIdToSlug = new Map(cats.map((c) => [c.id, c.slug]));
  }
  return categoryIdToSlug;
}

/** Сбрасывает кеш карт — вызывается после мутаций в админке. */
export function invalidateProductsDbCache(): void {
  categoryIdToSlug = null;
}

export function getAllProducts(): Product[] {
  const rows = db.select().from(schema.products).all() as ProductRow[];
  const cats = loadCategoryMap();
  return rows.map((r) => rowToProduct(r, r.categoryId != null ? cats.get(r.categoryId) ?? null : null));
}

export function getProductBySlug(slug: string): Product | null {
  const row = db.select().from(schema.products).where(eq(schema.products.slug, slug)).get() as ProductRow | undefined;
  if (!row) return null;
  const cats = loadCategoryMap();
  return rowToProduct(row, row.categoryId != null ? cats.get(row.categoryId) ?? null : null);
}

export function getProductBySku(sku: string): Product | null {
  const row = db.select().from(schema.products).where(eq(schema.products.sku, sku)).get() as ProductRow | undefined;
  if (!row) return null;
  const cats = loadCategoryMap();
  return rowToProduct(row, row.categoryId != null ? cats.get(row.categoryId) ?? null : null);
}

export function getProductByExternalId(externalId: string): Product | null {
  const row = db.select().from(schema.products).where(eq(schema.products.externalId, externalId)).get() as ProductRow | undefined;
  if (!row) return null;
  const cats = loadCategoryMap();
  return rowToProduct(row, row.categoryId != null ? cats.get(row.categoryId) ?? null : null);
}

export function getProductsByCategorySlug(categorySlug: string): Product[] {
  const cat = db.select().from(schema.categories).where(eq(schema.categories.slug, categorySlug)).get() as CategoryRow | undefined;
  if (!cat) return [];
  const rows = db.select().from(schema.products).where(eq(schema.products.categoryId, cat.id)).all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, cat.slug));
}

export function getProductsByBrand(brand: string): Product[] {
  const rows = db.select().from(schema.products).where(eq(schema.products.brand, brand)).all() as ProductRow[];
  const cats = loadCategoryMap();
  return rows.map((r) => rowToProduct(r, r.categoryId != null ? cats.get(r.categoryId) ?? null : null));
}

/** Для страниц /zapchasti-opel и т.п. — фильтр по подстроке в `car`. */
export function getProductsByCarMake(make: string): Product[] {
  const rows = db
    .select()
    .from(schema.products)
    .where(like(schema.products.car, `%${make}%`))
    .all() as ProductRow[];
  const cats = loadCategoryMap();
  return rows.map((r) => rowToProduct(r, r.categoryId != null ? cats.get(r.categoryId) ?? null : null));
}

export function searchProducts(query: string): Product[] {
  const q = `%${query.toLowerCase()}%`;
  const rows = db
    .select()
    .from(schema.products)
    .where(
      or(
        like(schema.products.name, q),
        like(schema.products.brand, q),
        like(schema.products.sku, q),
        like(schema.products.car, q),
      ),
    )
    .all() as ProductRow[];
  const cats = loadCategoryMap();
  return rows.map((r) => rowToProduct(r, r.categoryId != null ? cats.get(r.categoryId) ?? null : null));
}
```

- [ ] **Step 2: Проверить типизацию**

```bash
npx tsc --noEmit 2>&1 | grep products-db | head -10
```

Ожидается: 0 ошибок в `products-db.ts` (ошибки в других файлах ожидаемы, это после Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/products-db.ts
git commit -m "feat(lib): products-db helper — read products from SQLite"
```

---

## Task 6: Сид-скрипт (121 товар)

**Files:**
- Create: `scripts/seed-products-from-static.ts`
- Modify: `package.json` — добавить `"seed:products-static"`

- [ ] **Step 1: Написать скрипт**

`scripts/seed-products-from-static.ts`:

```ts
import { db, schema } from "../src/app/lib/db";
import { eq } from "drizzle-orm";
import { products as staticProducts } from "../src/app/data/products";
import { baseProductSlug } from "../src/app/lib/product-slug";
import { ensureProductDir } from "../src/app/lib/product-images";

function main() {
  const now = new Date().toISOString();
  const cats = db.select().from(schema.categories).all();
  const catSlugToId = new Map(cats.map((c) => [c.slug, c.id]));

  // 1) Собираем уникальные slug'и для 121 товара с учётом коллизий.
  const sorted = [...staticProducts].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const slugs = new Map<string, string>(); // externalId → slug
  const taken = new Set<string>();

  // сначала забираем slug'и, которые уже есть в БД — чтобы не дублировать
  const existing = db.select().from(schema.products).all();
  for (const e of existing) if (e.slug) taken.add(e.slug);

  for (const p of sorted) {
    const base = baseProductSlug(p);
    let s = base;
    if (taken.has(s)) s = `${base}-${p.id}`;
    let n = 2;
    while (taken.has(s)) { s = `${base}-${p.id}-${n}`; n += 1; }
    taken.add(s);
    slugs.set(`static-${p.id}`, s);
  }

  let inserted = 0, updatedSlug = 0, skipped = 0;

  for (const p of sorted) {
    const externalId = `static-${p.id}`;
    const slug = slugs.get(externalId)!;
    const categoryId = p.category ? catSlugToId.get(p.category) ?? null : null;

    const existingBySku = db
      .select()
      .from(schema.products)
      .where(eq(schema.products.sku, p.sku))
      .get();
    const existingByExternal = db
      .select()
      .from(schema.products)
      .where(eq(schema.products.externalId, externalId))
      .get();

    if (existingBySku || existingByExternal) {
      // Товар уже есть — только проставляем slug если пустой.
      const row = existingByExternal ?? existingBySku!;
      if (!row.slug) {
        db.update(schema.products)
          .set({ slug, updatedAt: now })
          .where(eq(schema.products.id, row.id))
          .run();
        updatedSlug += 1;
      } else {
        skipped += 1;
      }
      ensureProductDir(p.sku);
      continue;
    }

    db.insert(schema.products).values({
      externalId,
      slug,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      country: p.country,
      categoryId,
      car: p.car,
      price: p.price,
      inStock: p.inStock,
      image: "",
      images: "[]",
      description: p.description,
      longDescription: p.longDescription ? JSON.stringify(p.longDescription) : null,
      createdAt: now,
      updatedAt: now,
    }).run();
    ensureProductDir(p.sku);
    inserted += 1;
  }

  console.log(`Seed done. inserted=${inserted}, updatedSlug=${updatedSlug}, skipped=${skipped}`);
}

main();
```

- [ ] **Step 2: Добавить npm-скрипт**

В `package.json` в секцию `scripts`:

```json
"seed:products-static": "tsx scripts/seed-products-from-static.ts",
```

- [ ] **Step 3: Запустить сид локально**

```bash
npm run seed:products-static
```

Ожидается: `Seed done. inserted=121, updatedSlug=0, skipped=0`.

- [ ] **Step 4: Проверить, что записалось**

```bash
sqlite3 data/shop.db "SELECT COUNT(*) FROM products WHERE external_id LIKE 'static-%';"
sqlite3 data/shop.db "SELECT sku, slug FROM products WHERE external_id LIKE 'static-%' LIMIT 5;"
```

Ожидается: 121 запись, все с непустым slug.

- [ ] **Step 5: Убедиться в идемпотентности**

Запустить повторно:
```bash
npm run seed:products-static
```
Ожидается: `inserted=0, updatedSlug=0, skipped=121`.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-products-from-static.ts package.json
git commit -m "feat(seed): migrate 121 static products to SQLite"
```

---

## Task 7: Переключить публичные файлы на products-db

**Files (16):** все файлы из `grep -l 'data/products' src/app`.

Каждый файл переводится одинаково: заменяем импорт из `"../data/products"` на нужные функции из `"../lib/products-db"`.

Делаем пачками — типизация после каждой пачки должна быть чище.

- [ ] **Step 1: sitemap.ts**

`src/app/sitemap.ts`:

```ts
// было
import { products } from "./data/products";
import { productPath } from "./lib/product-slug";

// станет
import { getAllProducts } from "./lib/products-db";
import { productPath } from "./lib/product-slug";
// использовать getAllProducts() вместо products
```

Найти все использования `products` в файле, заменить на `const products = getAllProducts();` в начале `default function sitemap()`.

- [ ] **Step 2: catalog-search.ts**

`src/app/lib/catalog-search.ts`:

```ts
// было (строки 1-2)
import { products, type Product } from "../data/products";
import { sortProductsById } from "../data/catalog-sections";

// станет
import type { Product } from "./products-types";
import { getAllProducts } from "./products-db";
import { sortProductsById } from "../data/catalog-sections";
```

Заменить глобальную константу `indexedProducts` на ленивую:

```ts
let cachedIndex: IndexedProduct[] | null = null;
function getIndexedProducts(): IndexedProduct[] {
  if (!cachedIndex) {
    cachedIndex = getAllProducts().map((product) => ({
      product,
      skuNorm: product.sku.toLowerCase(),
      nameNorm: product.name.toLowerCase(),
      brandNorm: product.brand.toLowerCase(),
      carNorm: product.car.toLowerCase(),
      categoryNorm: product.category.toLowerCase(),
    }));
  }
  return cachedIndex;
}

export function invalidateSearchIndex(): void {
  cachedIndex = null;
}
```

Все места, где используется `indexedProducts`, заменить на `getIndexedProducts()`.

- [ ] **Step 3: product-analogs.ts**

`src/app/lib/product-analogs.ts`:

```ts
// было
import { products } from "../data/products";
// станет
import { getAllProducts } from "./products-db";
```

Там, где была глобальная `const analogsMap = buildAnalogsMap(products)`, сделать ленивой функцию.

- [ ] **Step 4: product-description-gen.ts**

`src/app/lib/product-description-gen.ts`:

```ts
// было
import type { Product } from "../data/products";
// станет
import type { Product } from "./products-types";
```

Больше ничего в файле менять не нужно — массив он не читает.

- [ ] **Step 5: Страницы каталога и брендов**

В каждой из страниц:
- `src/app/zapchasti-opel/page.tsx`
- `src/app/zapchasti-gm/page.tsx`
- `src/app/zapchasti-chevrolet/page.tsx`
- `src/app/favorites/FavoritesPageContent.tsx`
- `src/app/product/[slug]/page.tsx`
- `src/app/product/[slug]/ProductClient.tsx`
- `src/app/product/[slug]/_components/ProductSpecs.tsx`
- `src/app/product/[slug]/_components/ProductLongDescription.tsx`
- `src/app/cart/page.tsx`
- `src/app/cart/_components/CartItemRow.tsx`
- `src/app/cart/_components/CartRecommendations.tsx`
- `src/app/components/HomeFeatured.tsx`
- `src/app/components/ProductCatalog.tsx`
- `src/app/components/RecentlyViewed.tsx`
- `src/app/components/CartContext.tsx`
- `src/app/components/home/HomePopularCategories.tsx`
- `src/app/components/catalog/CatalogProductGrid.tsx`
- `src/app/components/catalog/CatalogFilters.tsx`
- `src/app/components/catalog/CatalogProductCard.tsx`
- `src/app/components/catalog/CatalogGroupNav.tsx`

Для каждого:
1. Заменить `import { products } from ".../data/products"` на `import { getAllProducts } from ".../lib/products-db"`.
2. Заменить `import { type Product } from ".../data/products"` на `import type { Product } from ".../lib/products-types"`.
3. Если файл использует `products` как глобальную константу на уровне модуля (вне функции) — заменить на вызов `getAllProducts()` внутри функции (компонента/server-component).

**Важно:** клиентские компоненты (`"use client"`) НЕ должны вызывать `getAllProducts()` напрямую — это серверная функция с доступом к БД. Они должны получать товары через пропсы от серверного родителя. Если встречается `"use client"` с прямым чтением `products` — передаём через пропсы из родительской server-component.

Для CartContext (state-менеджер корзины в клиенте): если он читает `products` только для обогащения item-данных, заменяем на вариант, где CartItem хранит минимум (id/sku/name/price), а картинки/описание тянутся в месте рендера через fetch к API или прокидывание через server-component.

Конкретный план для CartContext:
- Проверить, что из `products` реально нужно (обычно image/name/price для уже добавленных).
- Если CartContext использует `products` только для lookup внутри addItem — переписать так, чтобы `addToCart(product)` принимал уже полный объект Product от вызывающего кода (там где есть доступ к серверным данным).

Аналогично для RecentlyViewed и Favorites — хранят id, рендерят карточки. Делаем API-эндпоинт `GET /api/products/by-ids?ids=...` или server-component с prefetch.

Это самая сложная часть; она разбита на подшаги в процессе выполнения.

- [ ] **Step 6: Server-side API для клиентских компонентов**

`src/app/api/public/products/by-ids/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { inArray } from "drizzle-orm";
import { rowToProduct } from "@/app/lib/products-db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ items: [] });
  const rows = db.select().from(schema.products).where(inArray(schema.products.externalId, ids)).all();
  const cats = db.select().from(schema.categories).all();
  const catMap = new Map(cats.map((c) => [c.id, c.slug]));
  const items = rows.map((r) => rowToProduct(r, r.categoryId != null ? catMap.get(r.categoryId) ?? null : null));
  return NextResponse.json({ items });
}
```

Клиентские компоненты (CartContext, RecentlyViewed, Favorites) читают этот эндпоинт вместо импорта `products`.

- [ ] **Step 7: Прогнать типизацию**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Ожидается: 0 ошибок (кроме `next.config.*` — чинится в Task 8).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: switch 16 public files from static products.ts to products-db"
```

---

## Task 8: Починить next.config редиректы

**Files:**
- Modify: `next.config.ts` (или `.js`/`.mjs`, что есть в проекте)

- [ ] **Step 1: Найти файл**

```bash
ls next.config.*
```

- [ ] **Step 2: Адаптировать редиректы**

Заменить импорт старых функций на асинхронное построение из БД:

```ts
// было
import { getLegacyProductRedirects, getRemovedDuplicateProductRedirects } from "./src/app/lib/product-slug";
const productRedirects = [...getLegacyProductRedirects(), ...getRemovedDuplicateProductRedirects()];

// станет — внутри async redirects():
async redirects() {
  const { db, schema } = await import("./src/app/lib/db");
  const { buildLegacyProductRedirects, REMOVED_DUPLICATE_REDIRECTS } = await import("./src/app/lib/legacy-redirects");
  const { rowToProduct } = await import("./src/app/lib/products-db");

  const rows = db.select().from(schema.products).all();
  const cats = db.select().from(schema.categories).all();
  const catMap = new Map(cats.map((c) => [c.id, c.slug]));
  const products = rows.map((r) => rowToProduct(r, r.categoryId != null ? catMap.get(r.categoryId) ?? null : null));

  const legacy = buildLegacyProductRedirects(products);

  const byExternalId = new Map(rows.map((r) => [r.externalId, r.slug]));
  const removed = REMOVED_DUPLICATE_REDIRECTS
    .map((r) => {
      const toSlug = byExternalId.get(`static-${r.toOldId}`);
      return toSlug
        ? { source: `/product/${r.fromSlugOrId}`, destination: `/product/${toSlug}`, permanent: true as const }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return [...legacy, ...removed, /* ...другие редиректы если были */];
}
```

- [ ] **Step 3: Собрать**

```bash
npm run build 2>&1 | tail -40
```

Ожидается: сборка проходит, никаких ошибок типа «Cannot find module data/products» и «getLegacyProductRedirects is not defined».

- [ ] **Step 4: Commit**

```bash
git add next.config.*
git commit -m "fix(next-config): rebuild legacy redirects from DB"
```

---

## Task 9: Ревалидация в админке

**Files:**
- Create: `src/app/lib/revalidate-products.ts`
- Modify: 6 admin API-файлов

- [ ] **Step 1: Хелпер ревалидации**

`src/app/lib/revalidate-products.ts`:

```ts
import { revalidatePath } from "next/cache";
import { invalidateProductsDbCache } from "./products-db";
import { invalidateSearchIndex } from "./catalog-search";

/** Ревалидирует все публичные маршруты, затрагиваемые изменением товаров. */
export function revalidatePublicProductPages(slugs: string[] = []): void {
  invalidateProductsDbCache();
  invalidateSearchIndex();
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/zapchasti-opel");
  revalidatePath("/zapchasti-gm");
  revalidatePath("/zapchasti-chevrolet");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/product/${slug}`);
  }
}
```

- [ ] **Step 2: Подключить в admin API (6 файлов)**

В каждом из:
- `src/app/api/admin/products/route.ts` (POST)
- `src/app/api/admin/products/[id]/route.ts` (PATCH/DELETE)
- `src/app/api/admin/products/[id]/quick/route.ts`
- `src/app/api/admin/products/[id]/duplicate/route.ts`
- `src/app/api/admin/products/bulk/route.ts`
- `src/app/api/admin/products/import/confirm/route.ts`

Добавить в начале файла:
```ts
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";
import { ensureProductDir } from "@/app/lib/product-images";
```

В конце обработчика (перед `return NextResponse.json(...)`):

```ts
revalidatePublicProductPages();
```

В **import/confirm** и **POST /admin/products** — дополнительно создать папку фото для каждого нового SKU:

```ts
for (const item of newItems) {
  ensureProductDir(item.sku.trim());
}
```

- [ ] **Step 3: Собрать и проверить**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -20
```

Ожидается: 0 ошибок.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(admin): revalidate public pages + create photo dir on product mutations"
```

---

## Task 10: Локальная проверка в браузере

**Цель:** убедиться, что после миграции 121 товара сайт выглядит и работает идентично.

- [ ] **Step 1: Запустить dev-сервер**

В `.claude/launch.json` dev запускается на порту 3101. Через preview-инструменты:

```
preview_start
```

- [ ] **Step 2: Smoke-test главной**

Открыть `/`. Проверить:
- HomeFeatured показывает товары (картинки placeholder — это Ок, реальные фото зальёт парсер позже)
- Категории ведут на страницы каталога
- Поиск работает (нажать на иконку лупы, ввести "свеча")

- [ ] **Step 3: Smoke-test каталога**

Открыть `/catalog`. Проверить:
- Список полный (>121 если локальная БД уже с импортами)
- Фильтры по бренду, категории работают
- Клик на карточку открывает страницу товара

- [ ] **Step 4: Smoke-test бренд-страниц**

- `/zapchasti-opel` — только Opel
- `/zapchasti-gm` — GM
- `/zapchasti-chevrolet` — Chevrolet

- [ ] **Step 5: Карточка товара**

Взять любой SKU из статического файла, открыть `/product/<slug>`.
Проверить:
- Страница открывается (не 404)
- Название, цена, бренд, car-совместимость на месте
- Описание то же, что было в статике
- Галерея = placeholder (Ок)

- [ ] **Step 6: Корзина и избранное**

- Добавить товар в корзину, перейти в `/cart` — товар там, можно изменить количество, удалить.
- Добавить в избранное, перейти в `/favorites` — товар там.

- [ ] **Step 7: Поиск**

URL `/?q=свеча` или через поисковую строку. Результаты должны быть.

- [ ] **Step 8: Админка — создание**

Открыть `/admin/products`. Создать новый товар. Проверить:
- Перейти на `/` — новый товар виден (после ревалидации).
- Перейти в `/catalog` — тоже виден.

- [ ] **Step 9: Если что-то сломано — чинить**

Смотреть логи: `preview_logs`. Править код, перезагружать страницу.

- [ ] **Step 10: Commit проверочных правок (если были)**

```bash
git add -A
git commit -m "fix: local smoke-test adjustments"
```

---

## Task 11: Удалить data/products.ts

**Files:**
- Delete: `src/app/data/products.ts`

- [ ] **Step 1: Удалить файл**

```bash
rm src/app/data/products.ts
```

- [ ] **Step 2: Проверить, что ничто не ссылается**

```bash
grep -rn 'data/products' src/ scripts/ next.config.* 2>&1
```

Ожидается: пусто. Если есть — значит Task 7 что-то пропустил, правим.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Ожидается: 0 ошибок.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -20
```

Ожидается: успешная сборка.

- [ ] **Step 5: Локальная проверка ещё раз**

Повторить smoke-test из Task 10 (шаги 2–7). Всё должно работать.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete data/products.ts (replaced by products-db + SQLite)"
```

---

## Task 12: Деплой на VPS

**Цель:** залить изменения на прод без даунтайма.

- [ ] **Step 1: Push ветки**

```bash
git push origin claude/hungry-clarke-699fd6
```

- [ ] **Step 2: SSH на VPS**

```bash
ssh root@5.42.117.221
cd /path/to/astra-motors  # уточнить через `pm2 show astra-motors`
```

- [ ] **Step 3: Забрать ветку, миграцию, сид**

На VPS:
```bash
git fetch
git checkout claude/hungry-clarke-699fd6
npm ci
npm run db:migrate
npm run seed:products-static
```

Ожидается:
- Миграция применилась (появилась колонка slug).
- Сид добавил 121 товар или, если они уже есть — все пропущены/обновлены по slug.

- [ ] **Step 4: Сборка и перезапуск**

```bash
npm run build
pm2 restart astra-motors
```

- [ ] **Step 5: Проверка**

С локалки (без VPN!):
```bash
curl -sI https://gmshop66.ru/ | head -3
curl -s https://gmshop66.ru/catalog | grep -c 'product-card\|article'
```

Открыть сайт в браузере, проверить главную, каталог, одну карточку.

- [ ] **Step 6: Мердж в main после проверки**

Локально:
```bash
git checkout main
git merge claude/hungry-clarke-699fd6
git push origin main
```

На VPS:
```bash
git fetch
git checkout main
git pull
pm2 restart astra-motors
```

---

## Откат (если что-то пошло не так)

Код:
```bash
git revert <SHA последнего merge>
git push
# на VPS: git pull && npm ci && npm run build && pm2 restart astra-motors
```

БД: slug-колонка остаётся (не мешает), импортированные из сида `static-*` товары можно удалить через:
```sql
DELETE FROM products WHERE external_id LIKE 'static-%';
```

Но это не нужно делать — они не мешают старому коду, просто игнорируются им.
