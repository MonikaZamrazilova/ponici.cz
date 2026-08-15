import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@admin/core", "@admin/ui"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
