import type { MetadataRoute } from "next";
import { products } from "./data/products";

const siteUrl = "https://astramotors.shop";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/zapchasti-gm`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/zapchasti-opel`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/zapchasti-chevrolet`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/zapchasti-cadillac`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/zapchasti-hummer`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/how-to-order`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contacts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/product/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}

