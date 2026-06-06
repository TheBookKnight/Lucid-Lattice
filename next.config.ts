import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

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
