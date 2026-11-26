import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MIMO — İngilizce Öğren",
    short_name: "MIMO",
    description:
      "Hazırlık İngilizcesi: kelime, dinleme ve okuma. Çevrimdışı paketlerle internetsiz pratik.",
    // Installed PWA opens the offline workspace (works without network).
    start_url: "/offline",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f1",
    theme_color: "#fd860a",
    categories: ["education", "lifestyle"],
    lang: "tr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Çevrimdışı pratik",
        short_name: "Pratik",
        description: "İndirdiğin kelime paketleriyle çalış",
        url: "/offline/quiz",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Kelime paketi",
        short_name: "Paketler",
        description: "Çevrimdışı paket alanı",
        url: "/offline",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
