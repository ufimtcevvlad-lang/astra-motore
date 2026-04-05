import { products, type Product } from "../data/products";

/** Латиница + цифры для сегментов URL (бренд на этикетке + артикул). */
function slugifySegment(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baseProductSlug(brand: string, sku: string): string {
  const b = slugifySegment(brand) || "brand";
  const k = slugifySegment(sku) || "sku";
  return `${b}-${k}`;
}

function assignSlugs(list: Product[]): {
  idToSlug: Map<string, string>;
  slugToProduct: Map<string, Product>;
} {
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const slugToProduct = new Map<string, Product>();
  const idToSlug = new Map<string, string>();

  for (const p of sorted) {
    const base = baseProductSlug(p.brand, p.sku);
    let slug = base;
    if (slugToProduct.has(slug)) {
      slug = `${base}-${slugifySegment(p.id) || "item"}`;
    }
    let n = 2;
    while (slugToProduct.has(slug)) {
      slug = `${base}-${slugifySegment(p.id) || "item"}-${n}`;
      n += 1;
    }
    slugToProduct.set(slug, p);
    idToSlug.set(p.id, slug);
  }

  return { idToSlug, slugToProduct };
}

const { idToSlug, slugToProduct } = assignSlugs(products);

export function getProductSlug(product: Product): string {
  return idToSlug.get(product.id) ?? baseProductSlug(product.brand, product.sku);
}

export function getProductBySlug(slug: string): Product | undefined {
  return slugToProduct.get(slug);
}

export function productPath(product: Product): string {
  return `/product/${getProductSlug(product)}`;
}

/** Постоянные редиректы со старых URL `/product/:id` на канонические slug. */
export function getLegacyProductRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return products.map((p) => ({
    source: `/product/${p.id}`,
    destination: productPath(p),
    permanent: true as const,
  }));
}
