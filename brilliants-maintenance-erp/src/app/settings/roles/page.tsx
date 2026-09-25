"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Role, Permission, RolePermission } from "@/types/database";
import { Plus, Search, Shield } from "lucide-react";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const supabase = createClient();
  const { organization } = useAuth();

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

  function openDialog() {
    setForm({ name: "", code: "", description: "" });
    setFormError("");
    setIsDialogOpen(true);
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("roles").insert({
      organization_id: organization?.id ?? null,
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      system_role: false,
    });
    setIsSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setIsDialogOpen(false);
    await loadData();
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
          backHref="/settings"
          action={
            <Button onClick={openDialog}>
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
              <Link key={role.id} href={`/settings/roles/${role.id}`} className="block">
                <Card className="h-full hover:border-blue-200 hover:shadow-sm">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 hover:text-blue-600">
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
              </Link>
            ))}
          </div>
        )}

        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Add Role"
          description="Create a new role to assign permissions."
        >
          <form onSubmit={handleAddRole} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Plant Engineer"
              />
            </div>
            <div>
              <Label htmlFor="role_code">Code *</Label>
              <Input
                id="role_code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. PLANT_ENGR"
              />
            </div>
            <div>
              <Label htmlFor="role_description">Description</Label>
              <Textarea
                id="role_description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Add Role"}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </ERPLayout>
  );
}