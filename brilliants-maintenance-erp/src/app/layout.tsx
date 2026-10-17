import { AuthProvider } from "@/lib/auth/context";
import { PwaServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import "./globals.css";

export const metadata = {
  title: "Brilliants Industrial Maintenance ERP",
  description:
    "Complete Digital Management System for Industrial Maintenance & Asset Reliability",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/kiosk-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "BEM ERP",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <PwaServiceWorkerRegistrar />
      </body>
    </html>
  );
}
