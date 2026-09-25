"use client";

import { useAuth } from "@/lib/auth/context";
import { LoadingPage } from "@/components/common/loading";
import { KioskLogin } from "@/components/kiosk/kiosk-login";
import { KioskBottomNav } from "@/components/kiosk/kiosk-bottom-nav";
import { LogOut, Wrench } from "lucide-react";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white">
        <LoadingPage />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white">
        <KioskLogin />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-blue-700 px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          <div>
            <p className="text-sm font-bold leading-tight">Maintenance Kiosk</p>
            <p className="text-xs text-blue-200">{profile?.name ?? user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
        >
          <LogOut className="h-4 w-4" />
          Exit
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <KioskBottomNav />
    </div>
  );
}