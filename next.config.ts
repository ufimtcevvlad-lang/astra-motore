import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      { source: "/podbor-po-vin", destination: "/", permanent: true },
      { source: "/zapchasti-cadillac", destination: "/zapchasti-gm", permanent: true },
      { source: "/zapchasti-hummer", destination: "/zapchasti-gm", permanent: true },
    ];
  },
};

export default nextConfig;
