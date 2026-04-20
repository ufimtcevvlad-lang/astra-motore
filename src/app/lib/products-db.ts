import { db, schema } from "./db";
import { eq, like, or, and } from "drizzle-orm";

const notHidden = () => eq(schema.products.hidden, false);
import type { Product } from "./products-types";
import { getProductImages } from "./product-images";
import { baseProductSlug } from "./product-slug";

type ProductRow = typeof schema.products.$inferSelect;
type CategoryRow = typeof schema.categories.$inferSelect;

/** Конвертирует строку БД в объект Product, добавляет галерею из файловой системы. */
function parseDbImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {}
  return [];
}

export function rowToProduct(
  row: ProductRow & { slug?: string },
  categoryTitle: string | null,
): Product & { slug: string } {
  const fsImages = getProductImages(row.sku);
  const hasFsImages = fsImages.length > 0 && fsImages[0] !== "/placeholder-product.svg";
  const dbImages = parseDbImages(row.images);
  const fallbackDbImage = typeof row.image === "string" && row.image.length > 0 ? row.image : null;
  const images = hasFsImages
    ? fsImages
    : dbImages.length > 0
      ? dbImages
      : fallbackDbImage
        ? [fallbackDbImage]
        : ["/placeholder-product.svg"];
  return {
    id: row.externalId,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    country: row.country,
    category: categoryTitle ?? "",
    car: row.car,
    price: row.price,
    inStock: row.inStock,
    image: images[0] ?? "/placeholder-product.svg",
    images,
    description: row.description,
    slug: row.slug ?? "",
  };
}

let categoryIdToTitle: Map<number, string> | null = null;
function loadCategoryTitleMap(): Map<number, string> {
  if (!categoryIdToTitle) {
    const cats = db.select().from(schema.categories).all() as CategoryRow[];
    categoryIdToTitle = new Map(cats.map((c) => [c.id, c.title]));
  }
  return categoryIdToTitle;
}

/** Сбрасывает кеш карт — вызывается после мутаций в админке. */
export function invalidateProductsDbCache(): void {
  categoryIdToTitle = null;
}

function catTitleForRow(row: ProductRow): string | null {
  if (row.categoryId == null) return null;
  return loadCategoryTitleMap().get(row.categoryId) ?? null;
}

export function getAllProducts(): Array<Product & { slug: string }> {
  const rows = db
    .select()
    .from(schema.products)
    .where(notHidden())
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catTitleForRow(r)));
}

export function getProductBySlug(slug: string): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.slug, slug), notHidden()))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catTitleForRow(row));
}

export function getProductBySku(sku: string): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.sku, sku), notHidden()))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catTitleForRow(row));
}

export function getProductByExternalId(
  externalId: string,
): (Product & { slug: string }) | null {
  const row = db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.externalId, externalId), notHidden()))
    .get() as ProductRow | undefined;
  if (!row) return null;
  return rowToProduct(row, catTitleForRow(row));
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
    .where(and(eq(schema.products.categoryId, cat.id), notHidden()))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, cat.title));
}

export function getProductsByBrand(brand: string): Array<Product & { slug: string }> {
  const rows = db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.brand, brand), notHidden()))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catTitleForRow(r)));
}

/** Для страниц /zapchasti-opel и т.п. — фильтр по подстроке в `car`. */
export function getProductsByCarMake(make: string): Array<Product & { slug: string }> {
  const rows = db
    .select()
    .from(schema.products)
    .where(and(like(schema.products.car, `%${make}%`), notHidden()))
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catTitleForRow(r)));
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
      and(
        or(
          like(schema.products.name, q),
          like(schema.products.brand, q),
          like(schema.products.sku, q),
          like(schema.products.car, q),
        ),
        notHidden(),
      ),
    )
    .all() as ProductRow[];
  return rows.map((r) => rowToProduct(r, catTitleForRow(r)));
}
