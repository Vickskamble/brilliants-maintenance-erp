"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/common/loading";

/**
 * Keys page children by the active plant id so that switching the plant in the
 * header remounts the current page. Every page reloads its data with the new
 * plant scope directly on mount.
 */
function PlantScopedContent({
  plantId,
  children,
}: {
  plantId: string | null;
  children: React.ReactNode;
}) {
  const key = plantId ?? "no-plant";
  return (
    <>
      {React.Children.toArray(children).map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { key: `${key}-${i}` })
          : child
      )}
    </>
  );
}

export function ERPLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, plant } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500">Loading ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="erp-shell flex h-screen overflow-hidden bg-gray-50">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          <PlantScopedContent plantId={plant?.id ?? null}>
            {children}
          </PlantScopedContent>
        </main>
      </div>
    </div>
  );
}
