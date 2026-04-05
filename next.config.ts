import type { NextConfig } from "next";
import {
  getLegacyProductRedirects,
  getRemovedDuplicateProductRedirects,
} from "./src/app/lib/product-slug";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Убираем console.log/info/debug из клиентских чанков в production (error/warn оставляем)
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
  },
  async redirects() {
    return [
      { source: "/podbor-po-vin", destination: "/", permanent: true },
      { source: "/zapchasti-cadillac", destination: "/zapchasti-gm", permanent: true },
      { source: "/zapchasti-hummer", destination: "/zapchasti-gm", permanent: true },
      ...getRemovedDuplicateProductRedirects(),
      ...getLegacyProductRedirects(),
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
