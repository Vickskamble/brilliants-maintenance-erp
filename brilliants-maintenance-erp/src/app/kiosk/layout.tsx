import type { Metadata } from "next";
import { KioskShell } from "@/components/kiosk/kiosk-shell";

export const metadata: Metadata = {
  title: "Maintenance Kiosk",
  manifest: "/kiosk-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BEM Kiosk",
    statusBarStyle: "black-translucent",
  },
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KioskShell>{children}</KioskShell>;
}
