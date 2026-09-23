"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { Role, Permission, RolePermission } from "@/types/database";
import { Plus, Search, Shield } from "lucide-react";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [rolesRes, permsRes, rpRes] = await Promise.all([
      supabase.from("roles").select("*").order("name"),
      supabase.from("permissions").select("*").order("module"),
      supabase.from("role_permissions").select("*"),
    ]);

    if (rolesRes.data) setRoles(rolesRes.data);
    if (permsRes.data) setPermissions(permsRes.data);
    if (rpRes.data) setRolePermissions(rpRes.data);
    setIsLoading(false);
  }

  function getRolePermissionCount(roleId: string): number {
    return rolePermissions.filter((rp) => rp.role_id === roleId).length;
  }

  function getPermissionModules(roleId: string): string[] {
    const rpIds = rolePermissions
      .filter((rp) => rp.role_id === roleId)
      .map((rp) => rp.permission_id);
    return [
      ...new Set(
        permissions
          .filter((p) => rpIds.includes(p.id))
          .map((p) => p.module)
      ),
    ];
  }

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          description="Manage roles and permission assignments"
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            title="No roles found"
            description="No roles match your search criteria."
            icon={<Shield className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="hover:border-blue-200">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {role.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {role.description || "No description"}
                      </p>
                    </div>
                    {role.system_role && (
                      <Badge variant="info">System</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      {getRolePermissionCount(role.id)} permissions
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {getPermissionModules(role.id)
                        .slice(0, 5)
                        .map((module) => (
                          <Badge key={module} variant="default">
                            {module}
                          </Badge>
                        ))}
                      {getPermissionModules(role.id).length > 5 && (
                        <Badge variant="default">
                          +{getPermissionModules(role.id).length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ERPLayout>
  );
}
