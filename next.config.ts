import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
