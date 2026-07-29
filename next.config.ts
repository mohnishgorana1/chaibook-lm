import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  // serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas", "canvas"],
  typescript: {
    ignoreBuildErrors: true,
  },
  // outputFileTracingIncludes: {
  //   "/api/**/*": [
  //     "./node_modules/pdf-parse/**/*",
  //     "./node_modules/pdfjs-dist/**/*"
  //   ],
  // },
};

export default nextConfig;
