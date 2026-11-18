import type { NextConfig } from "next";
import { resolve } from "node:path";
import { deploymentOrigins } from "./src/lib/origins";

const { site, app } = deploymentOrigins();
const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, "../.."),
  turbopack: { root: resolve(__dirname, "../..") },
  env: {
    NEXT_PUBLIC_RELEASE_ID: process.env.RELEASE_ID || new Date().toISOString(),
    NEXT_PUBLIC_ALAMUT_SITE_ORIGIN:
      app || process.env.MULTI_APP === "1" ? site.origin : "",
    NEXT_PUBLIC_ALAMUT_APP_ORIGIN: app?.origin || "",
    NEXT_PUBLIC_ALAMUT_MULTI_APP: process.env.MULTI_APP || "1",
    NEXT_PUBLIC_ALAMUT_DRIVER_URL:
      process.env.DRIVER_URL || "http://driver.localhost:3002",
    NEXT_PUBLIC_ALAMUT_OWNER_URL:
      process.env.OWNER_URL || "http://owner.localhost:3003",
    NEXT_PUBLIC_ALAMUT_INSPECTOR_URL:
      process.env.INSPECTOR_URL || "http://inspector.localhost:3004",
    NEXT_PUBLIC_ALAMUT_ADMIN_URL:
      process.env.ADMIN_URL || "http://admin.localhost:8001",
  },
  output: "standalone",
  experimental: {
    // Allow a 10 MiB file plus multipart headers through to Django's file limit.
    proxyClientMaxBodySize: 12 * 1024 * 1024,
  },
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (process.env.MULTI_APP !== "0") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8001"}/api/:path*/`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/pwa/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
