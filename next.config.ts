import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  serverExternalPackages: [
    "@google-cloud/vertexai",
    "google-auth-library",
    "mammoth",
    "xlsx",
    "pptxgenjs",
  ],
};

export default nextConfig;
