import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brilliants Industrial Maintenance ERP",
    short_name: "BEM ERP",
    description:
      "Complete Digital Management System for Industrial Maintenance & Asset Reliability",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/kiosk-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}