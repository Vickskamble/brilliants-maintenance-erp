"use client";

import { useAuth } from "@/lib/auth/context";

export function usePermissions() {
  const { permissions, hasPermission, isLoading } = useAuth();

  const canView = (module: string) => hasPermission(module, "view");
  const canCreate = (module: string) => hasPermission(module, "create");
  const canEdit = (module: string) => hasPermission(module, "edit");
  const canDelete = (module: string) =>
    hasPermission(module, "delete") || hasPermission(module, "archive");
  const canManage = (module: string) => hasPermission(module, "manage");

  return {
    permissions,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    isLoading,
  };
}
