import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.254.105", "100.72.51.81"],
  experimental: {
    viewTransition: true,
  },
  env: {
    WORKOS_COOKIE_MAX_AGE: String(60 * 60 * 24 * 400),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
