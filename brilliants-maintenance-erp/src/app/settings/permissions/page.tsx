"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { Permission } from "@/types/database";
import { Search, Key } from "lucide-react";
import { groupPermissionsByModule } from "@/lib/permissions";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    const { data } = await supabase
      .from("permissions")
      .select("*")
      .order("module");

    if (data) {
      setPermissions(data);
    }
    setIsLoading(false);
  }

  const filteredPermissions = permissions.filter(
    (p) =>
      p.module.toLowerCase().includes(search.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = groupPermissionsByModule(filteredPermissions);

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Permissions"
          description="View all system permissions"
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([module, perms]) => (
              <Card key={module}>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase">
                      {module}
                    </h3>
                    <Badge variant="default">{perms.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <Badge key={perm.id} variant="default">
                        {perm.action}
                      </Badge>
                    ))}
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
