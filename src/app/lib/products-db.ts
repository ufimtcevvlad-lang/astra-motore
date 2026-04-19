import { db, schema } from "./db";
import { eq, like, or } from "drizzle-orm";
import type { Product } from "./products-types";
import { getProductImages } from "./product-images";
import { baseProductSlug } from "./product-slug";

type ProductRow = typeof schema.products.$inferSelect;
type CategoryRow = typeof schema.categories.$inferSelect;

/** Конвертирует строку БД в объект Product, добавляет галерею из файловой системы. */
export function rowToProduct(
  row: ProductRow & { slug?: string },
  categorySlug: string | null,
): Product & { slug: string } {
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
    slug: row.slug ?? "",
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

function catSlugForRow(row: ProductRow): string | null {
  if (row.categoryId == null) return null;
  return loadCategoryMap().get(row.categoryId) ?? null;
}

export function getAllProducts(): Array<Product & { slug: string }> {
  const rows = db.select().from(schema.products).all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catSlugForRow(r)));
}

export function getProductBySlug(slug: string): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catSlugForRow(row));
}

export function getProductBySku(sku: string): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.sku, sku))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catSlugForRow(row));
}

export function getProductByExternalId(
  externalId: string,
): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.externalId, externalId))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catSlugForRow(row));
}

export function getProductsByCategorySlug(
  categorySlug: string,
): Array<Product & { slug: string }> {
  const cat = db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, categorySlug))
    .get() as CategoryRow | undefined;
  if (!cat) return [];
  const rows = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.categoryId, cat.id))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, cat.slug));
}

export function getProductsByBrand(brand: string): Array<Product & { slug: string }> {
  const rows = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.brand, brand))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catSlugForRow(r)));
}

/** Для страниц /zapchasti-opel и т.п. — фильтр по подстроке в `car`. */
export function getProductsByCarMake(make: string): Array<Product & { slug: string }> {
  const rows = db
    .select()
    .from(schema.products)
    .where(like(schema.products.car, `%${make}%`))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catSlugForRow(r)));
}

/** Все URL фото карточки (галерея или одно изображение с плейсхолдером). */
export function getProductImageUrls(product: Pick<Product, "images" | "image">): string[] {
  if (product.images && product.images.length > 0) return product.images;
  return [product.image];
}

/** Генерирует уникальный slug для товара: база + при коллизиях суффикс -2, -3... */
export function generateUniqueProductSlug(
  product: Pick<Product, "name" | "brand" | "sku">,
  excludeProductId?: number,
): string {
  const base = baseProductSlug(product);
  const rows = db
    .select({ id: schema.products.id, slug: schema.products.slug })
    .from(schema.products)
    .all() as Array<{ id: number; slug: string }>;
  const taken = new Set(
    rows.filter((r) => r.id !== excludeProductId).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function searchProducts(query: string): Array<Product & { slug: string }> {
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
  return rows.map((r) => rowToProduct(r, catSlugForRow(r)));
}
