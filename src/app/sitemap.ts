import type { MetadataRoute } from "next";
import { products } from "./data/products";
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
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}

