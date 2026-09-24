"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { Plus, Search, Users } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
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
            <Button onClick={() => setIsDialogOpen(true)}>
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
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50"
                      >
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

        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Add User"
          description="How to grant access for a new user."
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">
              User accounts are created in{" "}
              <span className="font-medium text-gray-900">Supabase Authentication</span>{" "}
              (Dashboard → Authentication → Users → Invite user). Client-side invite is
              not available with the current security settings.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
              <li>Invite the user from the Supabase Dashboard using their email.</li>
              <li>Once the user signs up, they appear in this list automatically.</li>
              <li>Assign them a role from the Roles page to grant permissions.</li>
            </ol>
            <div className="flex items-center justify-end border-t border-gray-100 pt-4">
              <Button type="button" onClick={() => setIsDialogOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
