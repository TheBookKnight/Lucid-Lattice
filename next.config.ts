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

  async headers() {
    return [
      {
        // Apply cross-origin isolation headers to ALL routes.
        // This enables SharedArrayBuffer in the browser, which is required
        // for the multi-threaded ONNX Runtime WASM backend (ort-wasm-simd-threaded).
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
