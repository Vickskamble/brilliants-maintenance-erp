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
import { PermissionGate } from "@/components/auth/permission-gate";
import { useQueryScope } from "@/lib/auth/query-scope";
import { listDeviations, type QmsDeviationRow } from "@/services/qms/deviations";
import { AlertTriangle, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function DeviationsPage() {
  const scope = useQueryScope();
  const [rows, setRows] = useState<QmsDeviationRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    void listDeviations(scope).then((res) => {
      if (cancel) return;
      setRows(res.data);
      setIsLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [scope.organizationId, scope.plantId]);

  const filtered = rows.filter(
    (d) =>
      d.deviation_no.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Deviations"
          description="Non-conformances and deviations with investigation"
          action={
            <PermissionGate module="deviation" action="create" fallback={null}>
              <Link href="/quality/deviations/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Deviation
                </Button>
              </Link>
            </PermissionGate>
          }
        />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search deviations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No deviations"
            description="Reported deviations appear here once recorded."
            icon={<AlertTriangle className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                          <Link href={`/quality/deviations/${d.id}`}>{d.deviation_no}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{d.title}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{d.dev_type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{d.severity}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(d.reported_at).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ERPLayout>
  );
}