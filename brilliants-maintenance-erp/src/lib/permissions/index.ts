import { Permission } from "@/types/database";

export function hasPermission(
  permissions: Permission[],
  module: string,
  action: string
): boolean {
  return permissions.some((p) => p.module === module && p.action === action);
}

export function getModulePermissions(
  permissions: Permission[],
  module: string
): Permission[] {
  return permissions.filter((p) => p.module === module);
}

export function groupPermissionsByModule(
  permissions: Permission[]
): Record<string, Permission[]> {
  return permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );
}

export function canAccessModule(
  permissions: Permission[],
  module: string
): boolean {
  return permissions.some((p) => p.module === module && p.action === "view");
}
