import { slugifySegment } from "./product-slug";
import type { Product } from "./products-types";

type Redirect = { source: string; destination: string; permanent: true };

/** Редиректы со старых /product/:id и /product/{brand}-{sku} на актуальные slug. */
export function buildLegacyProductRedirects(
  products: Array<Product & { slug?: string }>,
): Redirect[] {
  const redirects: Redirect[] = [];
  const permanent = true as const;
  for (const p of products) {
    const slug = p.slug ?? "";
    if (!slug) continue;
    const dest = `/product/${slug}`;
    redirects.push({ source: `/product/${p.id}`, destination: dest, permanent });
    const oldSlug = `${slugifySegment(p.brand) || "brand"}-${slugifySegment(p.sku) || "sku"}`;
    if (`/product/${oldSlug}` !== dest) {
      redirects.push({ source: `/product/${oldSlug}`, destination: dest, permanent });
    }
  }
  return redirects;
}

/**
 * Фиксированный список редиректов после слияния фото opel-111..opel-115.
 * `toExternalId` — внешний id товара-цели (то, что в старой статике было p.id).
 */
export const REMOVED_DUPLICATE_REDIRECTS: Array<{
  fromSlugOrId: string;
  toExternalId: string;
}> = [
  { fromSlugOrId: "opel-111", toExternalId: "opel-37" },
  { fromSlugOrId: "opel-112", toExternalId: "opel-38" },
  { fromSlugOrId: "opel-113", toExternalId: "opel-27" },
  { fromSlugOrId: "opel-114", toExternalId: "opel-44" },
  { fromSlugOrId: "opel-115", toExternalId: "opel-51" },
  { fromSlugOrId: "gm-oe-96353007", toExternalId: "opel-37" },
  { fromSlugOrId: "mopar-55354563", toExternalId: "opel-38" },
  { fromSlugOrId: "opel-oe-24583232", toExternalId: "opel-44" },
  { fromSlugOrId: "gm-oe-55559352", toExternalId: "opel-51" },
  { fromSlugOrId: "gm-oe-25185121-opel-27", toExternalId: "opel-27" },
  { fromSlugOrId: "ngk-90318", toExternalId: "opel-46" },
];
