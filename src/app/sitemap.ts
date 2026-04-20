import type { MetadataRoute } from "next";
import { getAllProductsForSitemap } from "./lib/products-db";
import { productPath } from "./lib/product-slug";
import { SITE_URL } from "./lib/site";
import { CATALOG_SECTIONS } from "./data/catalog-sections";

function parseUpdatedAt(raw: string | undefined | null, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/catalog`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/zapchasti-gm`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/zapchasti-opel`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/zapchasti-chevrolet`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${SITE_URL}/dostavka-zapchastey-ekaterinburg`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    { url: `${SITE_URL}/how-to-order`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contacts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${SITE_URL}/payment`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/consent-personal-data`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${SITE_URL}/cookie-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${SITE_URL}/supply-agreement`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/warranty`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/vin-request`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const products = getAllProductsForSitemap();

  const carFilterRoutes: MetadataRoute.Sitemap = ["opel", "chevrolet"].map((car) => ({
    url: `${SITE_URL}/catalog?car=${car}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const sectionFilterRoutes: MetadataRoute.Sitemap = CATALOG_SECTIONS.map((s) => ({
    url: `${SITE_URL}/catalog?section=${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const uniqueBrands = Array.from(
    new Set(products.map((p) => p.brand).filter((b): b is string => !!b && b.length > 1)),
  ).sort();
  const brandFilterRoutes: MetadataRoute.Sitemap = uniqueBrands.map((brand) => ({
    url: `${SITE_URL}/catalog?brand=${encodeURIComponent(brand)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.55,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => {
    const images = (p.images ?? [])
      .filter((src) => src && src !== "/placeholder-product.svg")
      .map((src) => (src.startsWith("http") ? src : `${SITE_URL}${src}`));
    return {
      url: `${SITE_URL}${productPath(p)}`,
      lastModified: parseUpdatedAt(p.updatedAt, now),
      changeFrequency: "weekly",
      priority: 0.7,
      images: images.length > 0 ? images : undefined,
    };
  });

  return [
    ...staticRoutes,
    ...carFilterRoutes,
    ...sectionFilterRoutes,
    ...brandFilterRoutes,
    ...productRoutes,
  ];
}

