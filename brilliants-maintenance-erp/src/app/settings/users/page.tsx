"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ERPModal } from "@/components/erp/erp-modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Profile, Role } from "@/types/database";
import { Plus, Search, Users } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface AddUserForm {
  name: string;
  email: string;
  phone: string;
  employee_code: string;
  role_id: string;
  plant_id: string;
  password: string;
}

const emptyForm: AddUserForm = {
  name: "",
  email: "",
  phone: "",
  employee_code: "",
  role_id: "",
  plant_id: "",
  password: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<AddUserForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const supabase = createClient();
  const { plants } = useAuth();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("name");

    if (data) {
      setUsers(data);
    }
    setIsLoading(false);
  }

  async function loadRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name");
    if (data) setRoles(data);
  }

  function openDialog() {
    setForm(emptyForm);
    setMessage(null);
    setIsDialogOpen(true);
  }

  function updateField<K extends keyof AddUserForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim() || !form.role_id) {
      setMessage({ kind: "err", text: "Name, email and role are required." });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          employee_code: form.employee_code.trim() || undefined,
          role_id: form.role_id,
          plant_id: form.plant_id || undefined,
          password: form.password || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: json.error ?? "Could not create the user." });
        return;
      }
      setUsers([]);
      setIsLoading(true);
      await loadUsers();
      setMessage({
        kind: "ok",
        text: json.inviteSent
          ? `Invite sent to ${form.email.trim()}. They will set their password from the email link.`
          : `User ${form.name.trim()} created with the given password. Ask them to sign in at /login.`,
      });
    } catch {
      setMessage({ kind: "err", text: "Network error. Try again." });
    } finally {
      setIsSaving(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Manage user accounts and profiles"
          backHref="/settings"
          action={
            <Button onClick={openDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="No users match your search criteria."
            icon={<Users className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Employee Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                              <span className="text-sm font-medium text-white">
                                {getInitials(user.name)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.email || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {user.employee_code || "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {user.phone || "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <ERPModal
          open={isDialogOpen}
          onClose={() => !isSaving && setIsDialogOpen(false)}
          title="Add User"
          description="Create the account, assign a role and they're ready."
          size="md"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? "Creating..." : "Create user"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {message && (
              <div
                className={
                  message.kind === "ok"
                    ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                }
              >
                {message.text}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Full name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Employee code
                </label>
                <Input
                  value={form.employee_code}
                  onChange={(e) => updateField("employee_code", e.target.value)}
                  placeholder="e.g. EMP-042"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="e.g. 98765 43210"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role_id}
                  onChange={(e) => updateField("role_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Plant</label>
                <select
                  value={form.plant_id}
                  onChange={(e) => updateField("plant_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Default plant</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Temporary password{" "}
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Leave blank to send an invite email"
              />
              <p className="text-xs text-gray-400">
                If set, the user can sign in immediately and change it later. If left
                blank, an invite email with a set-password link is sent.
              </p>
            </div>
          </div>
        </ERPModal>
      </div>
    </ERPLayout>
  );
}