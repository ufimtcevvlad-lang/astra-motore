import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  const host = new URL(SITE_URL).host;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/cart", "/account"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host,
  };
}

