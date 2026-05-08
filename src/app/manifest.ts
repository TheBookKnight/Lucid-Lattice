import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lucid Lattice",
    short_name: "Lucid Lattice",
    description: "Offline-first dream journaling and reflective analysis for mobile home screens.",
    start_url: basePath + "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: basePath + "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: basePath + "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
