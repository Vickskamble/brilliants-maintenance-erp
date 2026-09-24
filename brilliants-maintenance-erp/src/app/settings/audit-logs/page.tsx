"use client";

import { useCallback, useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { useQueryScope } from "@/lib/auth/query-scope";
import { AuditLogRow, listAuditLogs, listAttachmentTypes } from "@/services/platform";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export default function AuditLogsPage() {
  const scope = useQueryScope();
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [types, setTypes] = useState<{ value: string; label: string }[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await listAuditLogs(scope, {
      entityType: typeFilter === "all" ? undefined : typeFilter,
      limit: 150,
    });
    setItems(res.data);
    setError(res.error);
    setIsLoading(false);
  }, [scope, typeFilter]);

  useEffect(() => {
    void load();
    void listAttachmentTypes().then((t) => setTypes(t));
  }, [load]);

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Audit Logs"
          description="Central activity trail recorded across work orders, attachments and other modules."
          backHref="/settings"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-56"
          >
            <option value="all">All entity types</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-gray-400">
              No audit entries yet. Actions recorded as you use the system.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {items.map((a) => (
                  <div key={a.id} className="flex flex-col gap-1 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{a.action}</Badge>
                      <Badge variant="info">{a.entity_type.replace(/_/g, " ")}</Badge>
                      {a.entity_title && (
                        <span className="text-sm font-medium text-gray-800">
                          {a.entity_title}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {a.summary ?? a.entity_id ?? "-"}
                    </p>
                    {a.user_name && (
                      <p className="text-xs text-gray-400">by {a.user_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ERPLayout>
  );
}