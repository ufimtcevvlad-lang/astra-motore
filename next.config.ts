import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
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
    ];
  },
};

export default nextConfig;
