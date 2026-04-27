import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { nonGmDb } from "@/app/lib/db/non-gm";
import { eq } from "drizzle-orm";
import { generateUniqueProductSlug } from "@/app/lib/products-db";
import { ensureProductDir } from "@/app/lib/product-images";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

/**
 * Нормализованный SKU для дедупа: «GB-6116» и «GB6116» — один товар.
 * Без этого повторный импорт того же артикула с другим написанием
 * создавал бы вторую карточку (видели на сайте `PE9821` и `PE982/1`
 * как два разных товара).
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
interface NonGmItem {
  sku: string;
  rawName: string;
  brand: string;
  price: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { newItems?: ImportItem[]; updateIds?: UpdateItem[]; nonGmItems?: NonGmItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const newItems = body.newItems ?? [];
  const updateIds = body.updateIds ?? [];
  const nonGmItems = body.nonGmItems ?? [];
  const now = new Date().toISOString();
  const errors: string[] = [];
  let added = 0, updated = 0;
  let nonGmAdded = 0, nonGmSkipped = 0;

  // Подтягиваем карту slug → categoryId.
  const cats = db.select().from(schema.categories).all();
  const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

  // Карта «нормализованный SKU → существующий товар» — defense in depth:
  // если preview по какой-то причине не отметил это как duplicate, мы
  // всё равно не создадим вторую карточку. Перед каждым insert ищем
  // существующего по norm-key, и если есть — делаем update вместо insert.
  const allProducts = db.select().from(schema.products).all();
  const normToExisting = new Map<string, (typeof allProducts)[number]>();
  for (const p of allProducts) {
    const k = normCompactSku(p.sku);
    if (k) normToExisting.set(k, p);
  }

  for (const item of newItems) {
    const sku = item.sku.trim();
    const name = item.name.trim();
    const brand = item.brand.trim();
    const price = Number(item.price);
    if (!sku || !name || !Number.isFinite(price) || price < 0) {
      errors.push(`Пропущено: некорректные данные для "${item.sku}"`);
      continue;
    }
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    // Если в БД уже есть товар с эквивалентным sku (после нормализации),
    // обновляем его, не создаём дубль. Это страхует на случай если в
    // одном батче пришли два варианта одного артикула («GB6116» и
    // «GB-6116»): первый запишется, второй обновит первого.
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
        name: item.name, brand: item.brand, price: item.price,
        car: item.car, categoryId, updatedAt: now,
      }).where(eq(schema.products.id, item.id)).run();
      updated++;
    } catch (e) {
      errors.push(`Ошибка обновления id=${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Не-GM позиции — отдельная БД shop-non-gm.db. На сайте gmshop66.ru они
  // не светятся; нужны парсеру фото для маршрутизации в ~/Pictures/сортировка не gm/.
  // Дедуп: проверяем не только точное совпадение sku, но и нормализованное —
  // чтобы «PE973/3» и «PE9733» считались одним товаром.
  const allNonGm = nonGmDb.select().from(schema.products).all();
  const nonGmNormSet = new Set(allNonGm.map((p) => normCompactSku(p.sku)).filter(Boolean));
  for (const item of nonGmItems) {
    const sku = item.sku.trim();
    const rawName = item.rawName.trim();
    const brand = item.brand.trim();
    const price = Number(item.price);
    if (!sku || !rawName || !Number.isFinite(price) || price < 0) {
      errors.push(`Не-GM пропущено: некорректные данные для "${item.sku}"`);
      continue;
    }
    const nk = normCompactSku(sku);
    if (nk && nonGmNormSet.has(nk)) {
      nonGmSkipped++;
      continue;
    }
    try {
      const result = nonGmDb
        .insert(schema.products)
        .values({
          externalId: `non-gm-${sku}`,
          slug: "",
          sku,
          name: rawName,
          brand,
          price: Math.round(price),
          inStock: 1,
          car: "",
          categoryId: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: schema.products.sku })
        .run();
      if (result.changes > 0) {
        nonGmAdded++;
        if (nk) nonGmNormSet.add(nk);
      } else {
        nonGmSkipped++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Не-GM ошибка ${sku}: ${msg}`);
    }
  }

  if (added > 0 || updated > 0) {
    revalidatePublicProductPages();
  }

  return NextResponse.json({ added, updated, nonGmAdded, nonGmSkipped, errors });
}
