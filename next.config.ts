import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs as a separate `npm run lint` step so it never blocks builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
