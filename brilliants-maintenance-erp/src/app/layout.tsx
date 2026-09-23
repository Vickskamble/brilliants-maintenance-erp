import { AuthProvider } from "@/lib/auth/context";
import "./globals.css";

export const metadata = {
  title: "Brilliants Industrial Maintenance ERP",
  description:
    "Complete Digital Management System for Industrial Maintenance & Asset Reliability",
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
