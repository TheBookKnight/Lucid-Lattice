import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lucid Lattice",
    short_name: "Lucid",
    description:
      "Private offline-first dream journaling and subconscious analysis.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050816",
    theme_color: "#050816",

    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    screenshots: [
      {
        src: "/screenshots/mobile-home.png",
        sizes: "390x844",
        type: "image/png",
      },
      {
        src: "/screenshots/desktop-dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}
