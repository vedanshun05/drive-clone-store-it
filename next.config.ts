import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Per-browser route reuse only; authenticated server data stays uncached.
    staleTimes: { dynamic: 30, static: 30 },
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.freepik.com",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
      },
      {
        protocol: "https",
        hostname: "sgp.cloud.appwrite.io",
      },
    ],
  },
};

export default nextConfig;
