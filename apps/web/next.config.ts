import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// /api/* se reenvía al backend (Railway). El navegador solo habla con este origen: la cookie de sesión funciona sin CORS.
const API_URL = process.env.API_URL ?? "http://localhost:4317";

const nextConfig: NextConfig = {
  transpilePackages: ["@cp/shared"],
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
