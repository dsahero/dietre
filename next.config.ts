import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silences the Next.js dev-server cross-origin warning when the app is
  // reached via 127.0.0.1 instead of localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
