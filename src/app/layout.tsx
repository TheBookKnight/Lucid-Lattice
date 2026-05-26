import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

import "./globals.css";

export const metadata: Metadata = {
  title: "Lucid Lattice",
  description: "An offline-first dream journaling PWA for local capture, emotional tagging, and reflective pattern analysis.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lucid Lattice",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050816",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950 text-white antialiased">
      <body className="min-h-full bg-zinc-950 text-white">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
