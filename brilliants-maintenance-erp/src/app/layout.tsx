import { AuthProvider } from "@/lib/auth/context";
import "./globals.css";

export const metadata = {
  title: "Brilliants Industrial Maintenance ERP",
  description:
    "Complete Digital Management System for Industrial Maintenance & Asset Reliability",
  icons: {
    icon: "/kiosk-icon.svg",
    apple: "/kiosk-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "BEM Kiosk",
    statusBarStyle: "black-translucent",
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
      </body>
    </html>
  );
}
