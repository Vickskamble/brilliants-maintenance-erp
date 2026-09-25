import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brilliants Maintenance Kiosk",
    short_name: "BEM Kiosk",
    description:
      "Scan equipment QR codes, view active work orders and complete preventive maintenance from the shop floor.",
    start_url: "/kiosk",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/kiosk-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/kiosk-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}