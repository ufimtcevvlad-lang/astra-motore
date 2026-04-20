import type { MetadataRoute } from "next";
import { getAllProducts } from "./lib/products-db";
import { productPath } from "./lib/product-slug";
import { SITE_URL } from "./lib/site";

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
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/consent-personal-data`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${SITE_URL}/cookie-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${SITE_URL}/supply-agreement`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/warranty`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/returns`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/vin-request`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const productRoutes: MetadataRoute.Sitemap = getAllProducts().map((p) => {
    const images = (p.images ?? [])
      .filter((src) => src && src !== "/placeholder-product.svg")
      .map((src) => (src.startsWith("http") ? src : `${SITE_URL}${src}`));
    return {
      url: `${SITE_URL}${productPath(p)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      images: images.length > 0 ? images : undefined,
    };
  });

  return [...staticRoutes, ...productRoutes];
}

