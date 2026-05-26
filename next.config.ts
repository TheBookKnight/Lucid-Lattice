import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  experimental: {
    webVitalsAttribution: ["CLS", "LCP"],
  },
};

export default nextConfig;
