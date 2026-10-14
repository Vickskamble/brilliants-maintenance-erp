"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/lib/auth/context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/common/loading";
import { ERPDenied } from "@/components/auth/denied";

/**
 * Administration areas that require the "settings" view permission. Master
 * data, workflows and SLA pages keep their own module-level gates, so they
 * are intentionally not listed here.
 */
const ADMIN_ROUTE_GUARDS = [
  { prefix: "/reports", module: "reports" },
  { prefix: "/settings/roles", module: "settings" },
  { prefix: "/settings/permissions", module: "settings" },
  { prefix: "/settings/users", module: "settings" },
  { prefix: "/settings/plants", module: "settings" },
  { prefix: "/settings/organization", module: "settings" },
  { prefix: "/settings/import", module: "settings" },
  { prefix: "/settings/audit-logs", module: "settings" },
  { prefix: "/settings/companies", module: "organizations" },
  { prefix: "/settings", module: "settings" },
];

const ADMIN_EXEMPT_PREFIXES = [
  "/settings/master-data",
  "/settings/workflows",
  "/settings/sla",
];

function requiredRoutePermission(
  pathname: string
): { module: string; action: "view" } | null {
  if (ADMIN_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  const match = ADMIN_ROUTE_GUARDS.find((g) => pathname.startsWith(g.prefix));
  if (!match) return null;
  return { module: match.module, action: "view" };
}

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
  const { user, isLoading, plant, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  let denied: { module: string } | null = null;
  if (pathname) {
    const req = requiredRoutePermission(pathname);
    if (req && !hasPermission(req.module, req.action)) {
      denied = req;
    }
  }

  return (
    <div className="erp-shell flex h-screen overflow-hidden bg-gray-50">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          {denied ? (
            <ERPDenied
              title="Access restricted"
              description="You do not have permission to view this area. Contact your administrator if you believe this is a mistake."
            />
          ) : (
            <PlantScopedContent plantId={plant?.id ?? null}>
              {children}
            </PlantScopedContent>
          )}
        </main>
      </div>
    </div>
  );
}
