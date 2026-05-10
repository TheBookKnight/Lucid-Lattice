import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: basePath + "/",
    name: "Lucid Lattice",
    short_name: "Lucid Lattice",
    description: "Offline-first dream journaling and reflective analysis for mobile home screens.",
    start_url: basePath + "/",
    scope: basePath + "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050816",
    theme_color: "#050816",
    icons: [
      {
        src: basePath + "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: basePath + "/icons/icon-192x192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: basePath + "/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: basePath + "/screenshots/mobile-home.png",
        sizes: "390x844",
        type: "image/png",
      },
      {
        src: basePath + "/screenshots/desktop-dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}
