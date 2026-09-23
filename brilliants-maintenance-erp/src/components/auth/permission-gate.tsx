"use client";

import { useAuth } from "@/lib/auth/context";
import { ERPDenied } from "./denied";

export function PermissionGate({
  module,
  action,
  children,
  fallback = <ERPDenied />,
}: {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasPermission(module, action)) return <>{fallback}</>;

  return <>{children}</>;
}