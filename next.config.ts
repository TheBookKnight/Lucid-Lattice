import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

function getAppVersion(): string {
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.1.0";
  } catch {
    return process.env.npm_package_version || "0.1.0";
  }
}

function getGitCommit(): string {
  if (process.env.NEXT_PUBLIC_GIT_COMMIT) {
    return process.env.NEXT_PUBLIC_GIT_COMMIT;
  }
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7);
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "dev";
  }
}

const appVersion = getAppVersion();
const gitCommit = getGitCommit();
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },

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
