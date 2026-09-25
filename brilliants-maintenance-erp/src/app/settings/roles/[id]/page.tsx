"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Role, Permission, RolePermission } from "@/types/database";
import { groupPermissionsByModule } from "@/lib/permissions";
import { Key, Save, Users } from "lucide-react";

export default function RoleDetailPage() {
  const params = useParams();
  const roleId = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();
  const { profile } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<{ id: string; name: string; email: string | null; employee_code: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  async function loadData() {
    setIsLoading(true);
    const [roleRes, permsRes, rpRes, userRes] = await Promise.all([
      supabase.from("roles").select("*").eq("id", roleId).single(),
      supabase.from("permissions").select("*").order("module"),
      supabase.from("role_permissions").select("*").eq("role_id", roleId),
      supabase
        .from("user_roles")
        .select("user_id, profiles(id, name, email, employee_code)")
        .eq("role_id", roleId),
    ]);
    if (roleRes.data) setRole(roleRes.data as Role);
    if (permsRes.data) setPermissions(permsRes.data as Permission[]);
    if (rpRes.data) {
      setGranted(new Set((rpRes.data as RolePermission[]).map((rp) => rp.permission_id)));
    }
    if (userRes.data) {
      setUsers(
        (userRes.data as unknown as { user_id: string; profiles: { id: string; name: string; email: string | null; employee_code: string | null } | null }[])
          .filter((u) => u.profiles)
          .map((u) => ({
            id: u.profiles!.id,
            name: u.profiles!.name,
            email: u.profiles!.email,
            employee_code: u.profiles!.employee_code,
          }))
      );
    }
    setIsLoading(false);
  }

  function toggle(permissionId: string) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  function isRequired(p: Permission): boolean {
    return role?.code === "VIEWER" && p.action !== "view";
  }

  async function save() {
    if (!role) return;
    setIsSaving(true);
    setMessage(null);
    const existing = new Set(
      permissions.map((p) => p.id) // all known permission ids trackable below
    );
    const rpRes = await supabase.from("role_permissions").select("permission_id").eq("role_id", role.id);
    const original = new Set((rpRes.data as RolePermission[] | null)?.map((rp) => rp.permission_id) ?? []);
    const toAdd = [...granted].filter((id) => !original.has(id) && existing.has(id));
    const toRemove = [...original].filter((id) => !granted.has(id));

    let error: string | null = null;
    if (toAdd.length > 0) {
      const { error: addErr } = await supabase.from("role_permissions").insert(
        toAdd.map((permission_id) => ({ role_id: role.id, permission_id }))
      );
      error = addErr?.message ?? null;
    }
    if (!error && toRemove.length > 0) {
      for (const permissionId of toRemove) {
        const { error: delErr } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", role.id)
          .eq("permission_id", permissionId);
        if (delErr) {
          error = delErr.message;
          break;
        }
      }
    }
    setIsSaving(false);
    setMessage(
      error
        ? { kind: "err", text: error }
        : { kind: "ok", text: `Saved ${toAdd.length} added, ${toRemove.length} removed.` }
    );
  }

  const grouped = groupPermissionsByModule(
    permissions.filter(
      (p) =>
        p.module.toLowerCase().includes(search.toLowerCase()) ||
        p.action.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!role) {
    return (
      <ERPLayout>
        <EmptyState
          title="Role not found"
          description="The role you are looking for does not exist."
          action={
            <Link href="/settings/roles">
              <Button variant="outline">Back to Roles</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const totalGranted = granted.size;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title={role.name}
          backHref="/settings/roles"
          description={`${role.code} · ${role.description ?? "No description"} · ${users.length} member${users.length === 1 ? "" : "s"}`}
          action={
            <Button onClick={() => void save()} disabled={isSaving || !profile}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Permissions"}
            </Button>
          }
        />

        {message && (
          <div
            className={
              message.kind === "ok"
                ? "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            }
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder="Search permissions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Badge variant="info">{totalGranted} granted</Badge>
            </div>

            {Object.keys(grouped).length === 0 ? (
              <EmptyState title="No permissions match" description="Try a different search term." />
            ) : (
              Object.entries(grouped).map(([module, perms]) => (
                <Card key={module}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-400" />
                      <h3 className="text-sm font-semibold uppercase text-gray-900">{module}</h3>
                      <Badge variant="default">{perms.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((perm) => {
                        const enabled = granted.has(perm.id);
                        const required = isRequired(perm);
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => (required ? undefined : toggle(perm.id))}
                            title={perm.description ?? perm.action}
                            className={
                              required
                                ? "inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                : enabled
                                  ? "inline-flex items-center gap-1.5 rounded-full border border-blue-600 bg-blue-600 px-3 py-1 text-xs font-medium text-white"
                                  : "inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                            }
                          >
                            {enabled && !required && (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            )}
                            {perm.action}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card className="h-fit">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Members</h3>
                <Badge variant="default">{users.length}</Badge>
              </div>
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users assigned to this role.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <Link key={u.id} href={`/settings/users`} className="block">
                      <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {u.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {u.employee_code && <span className="font-mono">{u.employee_code} · </span>}
                        {u.email ?? ""}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}