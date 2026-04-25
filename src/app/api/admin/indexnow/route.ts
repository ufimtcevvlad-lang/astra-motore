import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { notifyIndexNow } from "@/app/lib/indexnow";
import { getAllProductsForSitemap } from "@/app/lib/products-db";
import { productPath } from "@/app/lib/product-slug";
import { SITE_URL } from "@/app/lib/site";
import { CATALOG_SECTIONS } from "@/app/data/catalog-sections";

function buildAllUrls(): string[] {
  const staticPaths = [
    "/",
    "/catalog",
    "/zapchasti-gm",
    "/zapchasti-opel",
    "/zapchasti-chevrolet",
    "/dostavka-zapchastey-ekaterinburg",
    "/how-to-order",
    "/contacts",
    "/about",
    "/payment",
    "/vin-request",
    "/warranty",
    "/returns",
    "/supply-agreement",
  ];

  const urls = staticPaths.map((p) => (p === "/" ? SITE_URL : `${SITE_URL}${p}`));

  for (const car of ["opel", "chevrolet"]) {
    urls.push(`${SITE_URL}/catalog?car=${car}`);
  }
  for (const s of CATALOG_SECTIONS) {
    urls.push(`${SITE_URL}/catalog?section=${s.slug}`);
  }

  const products = getAllProductsForSitemap();
  for (const p of products) {
    urls.push(`${SITE_URL}${productPath(p)}`);
  }

  return urls;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { urls?: string[] } = {};
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    body = {};
  }

  const urls = body.urls && body.urls.length > 0 ? body.urls : buildAllUrls();
  const result = await notifyIndexNow(urls);

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
