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

/**
 * После слияния фото: карточки opel-111–opel-115 удалены, снимки на opel-27/37/38/44/51.
 * Старые slug и прямые ссылки /product/opel-11x ведём на канонический URL.
 */
export function getRemovedDuplicateProductRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  const to = (id: string): string => {
    const p = products.find((x) => x.id === id);
    return p ? productPath(p) : "/";
  };
  const permanent = true as const;
  return [
    { source: "/product/opel-111", destination: to("opel-37"), permanent },
    { source: "/product/opel-112", destination: to("opel-38"), permanent },
    { source: "/product/opel-113", destination: to("opel-27"), permanent },
    { source: "/product/opel-114", destination: to("opel-44"), permanent },
    { source: "/product/opel-115", destination: to("opel-51"), permanent },
    { source: "/product/gm-oe-96353007", destination: to("opel-37"), permanent },
    { source: "/product/mopar-55354563", destination: to("opel-38"), permanent },
    { source: "/product/opel-oe-24583232", destination: to("opel-44"), permanent },
    { source: "/product/gm-oe-55559352", destination: to("opel-51"), permanent },
    { source: "/product/gm-oe-25185121-opel-27", destination: to("opel-27"), permanent },
    /** opel-46: sku на фото/коробке ZFR6U9 вместо внутреннего 90318 */
    { source: "/product/ngk-90318", destination: to("opel-46"), permanent },
  ];
}
