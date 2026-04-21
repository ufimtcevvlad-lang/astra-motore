import type { NextConfig } from "next";
import {
  buildLegacyProductRedirects,
  REMOVED_DUPLICATE_REDIRECTS,
} from "./src/app/lib/legacy-redirects";
import { getAllProducts, getProductByExternalId } from "./src/app/lib/products-db";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    const allProducts = getAllProducts();
    const legacy = buildLegacyProductRedirects(allProducts);
    const removed = REMOVED_DUPLICATE_REDIRECTS.flatMap((r) => {
      const target = getProductByExternalId(`static-${r.toExternalId}`);
      if (!target || !target.slug) return [];
      return [
        {
          source: `/product/${r.fromSlugOrId}`,
          destination: `/product/${target.slug}`,
          permanent: true as const,
        },
      ];
    });
    return [
      { source: "/podbor-po-vin", destination: "/", permanent: true },
      { source: "/zapchasti-cadillac", destination: "/zapchasti-gm", permanent: true },
      { source: "/zapchasti-hummer", destination: "/zapchasti-gm", permanent: true },
      ...removed,
      ...legacy,
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
