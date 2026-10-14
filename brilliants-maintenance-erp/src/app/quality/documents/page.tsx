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
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  listDocuments,
  type QmsDocumentRow,
} from "@/services/qms/documents";
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function DocumentsPage() {
  const { hasPermission } = useAuth();
  const scope = useQueryScope();
  const [docs, setDocs] = useState<QmsDocumentRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    void listDocuments(scope).then((res) => {
      if (cancel) return;
      setDocs(res.data);
      setIsLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [scope.organizationId, scope.plantId]);

  const filtered = docs.filter(
    (d) =>
      d.doc_code.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Controlled Documents"
          description="SOPs, work instructions and forms with revision control"
          action={
            <PermissionGate module="documents" action="create" fallback={null}>
              <Link href="/quality/documents/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
              </Link>
            </PermissionGate>
          }
        />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No documents"
            description={hasPermission("documents", "create") ? "Create your first controlled document." : "Documents will appear here once published."}
            icon={<FileText className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rev</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                          <Link href={`/quality/documents/${doc.id}`}>{doc.doc_code}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{doc.title}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doc.doc_type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{doc.revision}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(doc.updated_at).toLocaleDateString("en-IN")}
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