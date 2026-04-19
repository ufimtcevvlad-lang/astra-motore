import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, gte, lte, sql, desc, asc, or, isNull } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("search")?.trim() || null;
  const categoryId = url.searchParams.get("categoryId");
  const brand = url.searchParams.get("brand");
  const inStock = url.searchParams.get("inStock");
  const priceFrom = url.searchParams.get("priceFrom");
  const priceTo = url.searchParams.get("priceTo");
  const nocat = url.searchParams.get("nocat") === "1";
  const sort = url.searchParams.get("sort") || "updated";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.products.name, `%${search}%`),
        like(schema.products.sku, `%${search}%`)
      )
    );
  }
  if (categoryId) {
    conditions.push(eq(schema.products.categoryId, Number(categoryId)));
  }
  if (brand) {
    conditions.push(eq(schema.products.brand, brand));
  }
  if (inStock === "yes") {
    conditions.push(gte(schema.products.inStock, 1));
  } else if (inStock === "no") {
    conditions.push(eq(schema.products.inStock, 0));
  }
  if (priceFrom) {
    conditions.push(gte(schema.products.price, Number(priceFrom)));
  }
  if (priceTo) {
    conditions.push(lte(schema.products.price, Number(priceTo)));
  }
  if (nocat) {
    conditions.push(isNull(schema.products.categoryId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(where);

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  const sortColumn =
    sort === "name"
      ? schema.products.name
      : sort === "price"
        ? schema.products.price
        : sort === "inStock"
          ? schema.products.inStock
          : sort === "brand"
            ? schema.products.brand
            : schema.products.updatedAt;
  const orderBy = dir === "asc" ? asc(sortColumn) : desc(sortColumn);

  const items = await db
    .select({
      id: schema.products.id,
      externalId: schema.products.externalId,
      sku: schema.products.sku,
      name: schema.products.name,
      brand: schema.products.brand,
      country: schema.products.country,
      categoryId: schema.products.categoryId,
      categoryTitle: schema.categories.title,
      car: schema.products.car,
      price: schema.products.price,
      inStock: schema.products.inStock,
      image: schema.products.image,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(where)
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset(offset);

  const brandsResult = await db
    .selectDistinct({ brand: schema.products.brand })
    .from(schema.products)
    .orderBy(schema.products.brand);

  const brands = brandsResult.map((r) => r.brand);

  return NextResponse.json({ items, total, page, totalPages, brands });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const priceNum = Number(body.price);
  const inStockNum = body.inStock == null ? 0 : Number(body.inStock);

  if (!name || !sku || !brand) {
    return NextResponse.json(
      { error: "Заполните название, артикул и бренд" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Цена должна быть числом ≥ 0" }, { status: 400 });
  }
  if (!Number.isFinite(inStockNum) || inStockNum < 0) {
    return NextResponse.json({ error: "Остаток должен быть числом ≥ 0" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const externalId = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let product;
  try {
    const result = await db
      .insert(schema.products)
      .values({
        externalId,
        sku,
        name,
        brand,
        country: body.country ?? "",
        categoryId: body.categoryId ?? null,
        car: body.car ?? "",
        price: Math.round(priceNum),
        inStock: Math.round(inStockNum),
        image: body.image ?? "",
        images: body.images ? JSON.stringify(body.images) : "[]",
        description: body.description ?? "",
        longDescription: body.longDescription ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    product = result[0];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: products\.sku/i.test(msg)) {
      return NextResponse.json(
        { error: `Артикул "${sku}" уже существует. Артикулы должны быть уникальны.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Не удалось сохранить товар" }, { status: 500 });
  }

  if (body.specs && Array.isArray(body.specs) && body.specs.length > 0) {
    await db.insert(schema.productSpecs).values(
      body.specs.map((s: { label: string; value: string }, i: number) => ({
        productId: product.id,
        label: s.label,
        value: s.value,
        sortOrder: i,
      }))
    );
  }

  return NextResponse.json(product, { status: 201 });
}
