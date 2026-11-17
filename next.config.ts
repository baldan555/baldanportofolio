import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // a self-contained server in .next/standalone, so the Cloud Run container needs no node_modules (see Dockerfile)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // pin the root to this folder: a stray package-lock.json one level up (in Downloads) made Next guess the wrong one
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
