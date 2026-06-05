import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  experimental: {
    webVitalsAttribution: ["CLS", "LCP"],
  },

  async rewrites() {
    return [
      {
        source: "/models/:path*",
        destination: "https://huggingface.co/:path*",
      },
      {
        source: "/api/resolve-cache/:path*",
        destination: "https://huggingface.co/api/resolve-cache/:path*",
      },
    ];
  },
};

export default nextConfig;
