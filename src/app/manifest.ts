import type { MetadataRoute } from "next";
import { church } from "@/lib/church";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: church.name,
    short_name: church.shortName,
    description: "Church updates, devotionals and events from Abiding Word Of Grace Missions.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6ef",
    theme_color: "#5b2c5e",
    lang: "en-NG",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
