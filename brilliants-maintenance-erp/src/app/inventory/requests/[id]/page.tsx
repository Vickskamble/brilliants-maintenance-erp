"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge as StatusBadgeMeta } from "@/components/common/status-badge";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getMaterialRequestById, type MaterialRequestWithItems } from "@/services/procurement";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { MATERIAL_REQUEST_STATUSES, REQUEST_PRIORITIES } from "@/lib/constants";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  getPendingApprovalForEntity,
  submitForApproval,
  type ApproverContext,
} from "@/services/approvals";
import { downloadMaterialRequestPdf } from "@/lib/pdf/procurement";
import {
  Send,
  FileDown,
  PackageCheck,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";

interface AuditRow {
  id: string;
  action: string;
  user_name: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function MaterialRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();
  const scope = useQueryScope();

  const [mr, setMr] = useState<MaterialRequestWithItems | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [requesterName, setRequesterName] = useState<string | null>(null);
  const [receivedByName, setReceivedByName] = useState<string | null>(null);
  const [hasPendingApproval, setHasPendingApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedPoId, setLinkedPoId] = useState<string | null>(null);

  const { user, profile, roles, organization, plant, hasPermission } = useAuth();

  const approverCtx: ApproverContext | null = user
    ? {
        userId: user.id,
        userName: profile?.name ?? user.email ?? "User",
        roleCodes: roles.map((r) => r.code),
        organizationId: organization?.id ?? null,
        plantId: plant?.id ?? null,
        hasPermission,
      }
    : null;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "items", label: "Items" },
    { key: "history", label: "History" },
  ];

  async function load() {
    setIsLoading(true);
    setError("");
    const res = await getMaterialRequestById(id);
    if (!res.data) {
      setError(res.error ?? "Material request not found");
      setIsLoading(false);
      return;
    }
    setMr(res.data);

    const actorIds = new Set<string>();
    if (res.data.requested_by) actorIds.add(res.data.requested_by);
    if (res.data.received_by) actorIds.add(res.data.received_by);
    if (actorIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...actorIds]);
      for (const p of (profiles ?? []) as { id: string; name: string | null }[]) {
        if (res.data.requested_by === p.id) setRequesterName(p.name);
        if (res.data.received_by === p.id) setReceivedByName(p.name);
      }
    }

    const [auditRes, pending, poRes] = await Promise.all([
      supabase
        .from("audit_logs")
        .select("id, action, user_name, summary, metadata, created_at")
        .eq("entity_type", "material_request")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      getPendingApprovalForEntity("material_request", id),
      supabase
        .from("purchase_orders")
        .select("id")
        .eq("material_request_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (auditRes.data) setAuditLogs(auditRes.data as unknown as AuditRow[]);
    setHasPendingApproval(Boolean(pending));
    if (poRes.data) setLinkedPoId((poRes.data as { id: string }).id);

    setIsLoading(false);
  }

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doSubmitForApproval() {
    if (!mr || !approverCtx) return;
    setIsSubmitting(true);
    const res = await submitForApproval(scope, approverCtx, {
      entityType: "material_request",
      entityId: mr.id,
      toStatus: "submitted",
      fromTitle: mr.title,
    });
    if (res.error) alert(res.error);
    if (!res.created) {
      const { setMaterialRequestStatus } = await import("@/services/procurement");
      const fallback = await setMaterialRequestStatus(mr.id, "submitted");
      if (fallback.error) alert(fallback.error);
    }
    await load();
    setIsSubmitting(false);
  }

  function doDownloadPdf() {
    if (!mr) return;
    void downloadMaterialRequestPdf(mr, {
      plantName: plant?.name ?? null,
      requesterName,
      approvedByName: null,
      approvedAt: null,
      receivedByName,
      receivedAt: mr.received_at,
    });
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (error || !mr) {
    return (
      <ERPLayout>
        <PageHeader
          title="Material Request"
          backHref="/inventory/requests"
          description={error || "Not found"}
          action={
            <Link href="/inventory/requests">
              <Button variant="outline">Back to Requests</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const statusMeta = MATERIAL_REQUEST_STATUSES.find((s) => s.value === mr.status);
  const priorityMeta = REQUEST_PRIORITIES.find((p) => p.value === mr.priority);

  return (
    <ERPLayout>
      <PageHeader
        title={`${mr.request_no} · ${mr.title}`}
        backHref="/inventory/requests"
        description={`${priorityMeta?.label ?? mr.priority} priority`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={doDownloadPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
            {mr.status === "draft" && (
              <Button onClick={() => void doSubmitForApproval()} disabled={isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            {mr.status === "approved" && (
              <Button onClick={() => router.push(`/inventory/requests/${mr.id}/receive`)}>
                <PackageCheck className="mr-2 h-4 w-4" />
                Receive Material
              </Button>
            )}
            {mr.status === "approved" && (
              <Link href={linkedPoId ? `/inventory/orders` : `/inventory/orders`}>
                <Button variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Create PO
                </Button>
              </Link>
            )}
            {mr.status === "ordered" && linkedPoId && (
              <Link href={`/inventory/grn?po=${linkedPoId}`}>
                <Button>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Receive (GRN)
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadgeMeta statusMeta={statusMeta} />
        <Badge className={priorityMeta?.color}>{priorityMeta?.label}</Badge>
        <span className="text-sm text-gray-500">{plant?.name ?? "All plants"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          Requested by{" "}
          <span className="font-medium text-gray-700">{requesterName ?? mr.requested_by ?? "—"}</span>
        </span>
        <span>Created {formatDateTime(mr.created_at)}</span>
        {mr.received_at && (
          <span>
            Received by{" "}
            <span className="font-medium text-gray-700">{receivedByName ?? "—"}</span>{" "}
            on {formatDateTime(mr.received_at)}
          </span>
        )}
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MetadataRow label="Request No" value={mr.request_no} />
              <MetadataRow label="Status" value={statusMeta?.label ?? mr.status} />
              <MetadataRow label="Priority" value={priorityMeta?.label ?? mr.priority} />
              <MetadataRow label="Requested On" value={formatDateTime(mr.created_at)} />
              <MetadataRow
                label="Requested By"
                value={requesterName ?? mr.requested_by ?? "—"}
              />
              <MetadataRow label="Items" value={String(mr.material_request_items.length)} />
              {mr.received_at && (
                <MetadataRow label="Received On" value={formatDateTime(mr.received_at)} />
              )}
              {mr.received_by && (
                <MetadataRow label="Received By" value={receivedByName ?? mr.received_by} />
              )}
            </div>

            {mr.remarks && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700">Remarks</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{mr.remarks}</p>
              </div>
            )}

            <div className="mt-6">
              <ApprovalPanel
                entityType="material_request"
                entityId={mr.id}
                title={mr.title}
                onChange={() => {
                  void load();
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "items" && (
        <Card>
          <CardContent className="p-0">
            {mr.material_request_items.length === 0 ? (
              <EmptyState
                title="No items"
                description="Line items added to this request will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <Th>Part</Th>
                      <Th right>Qty Requested</Th>
                      <Th right>Qty Approved</Th>
                      <Th right>Qty Received</Th>
                      <Th right>Unit</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mr.material_request_items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {item.spare_parts?.part_code ?? "—"}
                          <span className="ml-2 font-normal text-gray-500">
                            {item.spare_parts?.part_name ?? ""}
                          </span>
                        </td>
                        <Td right>{item.quantity_requested}</Td>
                        <Td right>{item.quantity_approved ?? "—"}</Td>
                        <Td right>{item.quantity_received ?? 0}</Td>
                        <Td right>{item.spare_parts?.unit ?? ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardContent className="p-0">
            {auditLogs.length === 0 ? (
              <EmptyState
                title="No history yet"
                description="Submit, approve and receive actions will appear here."
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-gray-900">
                        {log.action.replace(/_/g, " ")}
                        {log.user_name && (
                          <span className="ml-2 font-normal text-gray-500">by {log.user_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(log.created_at)}</p>
                    </div>
                    {log.summary && (
                      <p className="mt-1 text-sm text-gray-600">{log.summary}</p>
                    )}
                    {log.metadata && typeof log.metadata === "object" && (
                      <p className="mt-1 text-xs text-gray-400">
                        {Object.entries(log.metadata)
                          .filter(([k]) => k !== "items")
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ERPLayout>
  );
}

function MetadataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-6 py-4 text-sm text-gray-900 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}
