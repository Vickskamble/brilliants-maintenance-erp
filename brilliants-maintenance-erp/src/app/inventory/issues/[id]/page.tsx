"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ERPModal } from "@/components/erp/erp-modal";
import { useAuth } from "@/lib/auth/context";
import { rel } from "@/lib/postgrest-rel";
import { MATERIAL_ISSUE_STATUSES, MATERIAL_ISSUE_TO_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  cancelMaterialIssue,
  getMaterialIssueById,
  type MaterialIssueRow,
} from "@/services/material-issues";
import {
  downloadMaterialIssuePdf,
  ERP_REPORT_SYSTEM,
  MATERIAL_ISSUE_SLIP_SOURCE,
} from "@/lib/pdf/inventory";
import { ChevronLeft, FileDown, Printer, Ban } from "lucide-react";

export default function MaterialIssueDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, profile, organization, plant, hasPermission } = useAuth();

  const [issue, setIssue] = useState<MaterialIssueRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");

  useEffect(() => {
    setGeneratedAt(
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  }, []);

  async function load() {
    setIsLoading(true);
    setError("");
    const res = await getMaterialIssueById(id);
    if (!res.data) {
      setError(res.error ?? "Material issue not found");
      setIsLoading(false);
      return;
    }
    setIssue(res.data);
    setIsLoading(false);
  }

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function pdfMeta(row: MaterialIssueRow) {
    return {
      organizationName: organization?.display_name,
      plantName: plant?.name,
      issuedByName: row.created_by_name,
      departmentName: rel(row.departments)?.name ?? null,
      equipmentName: rel(row.equipment)?.equipment_name ?? null,
      workOrderNo: rel(row.work_orders)?.work_order_no ?? null,
      generatedBy: profile?.name || user?.email || null,
    };
  }

  async function confirmCancel() {
    if (!issue || !user) return;
    if (!cancelReason.trim()) {
      setCancelError("A cancellation reason is required.");
      return;
    }
    setIsCancelling(true);
    const res = await cancelMaterialIssue(
      issue.id,
      { id: user.id, name: profile?.name ?? user.email ?? null },
      cancelReason.trim()
    );
    setIsCancelling(false);
    if (res.error) {
      setCancelError(res.error);
      return;
    }
    setCancelOpen(false);
    setCancelReason("");
    setCancelError("");
    await load();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (error || !issue) {
    return (
      <ERPLayout>
        <PageHeader
          title="Material Issue"
          backHref="/inventory/issues"
          description={error || "Not found"}
        />
        <EmptyState
          title="Material issue not found"
          description={error || "This issue slip does not exist."}
        />
      </ERPLayout>
    );
  }

  const statusMeta = MATERIAL_ISSUE_STATUSES.find((s) => s.value === issue.status);
  const issuedToType =
    MATERIAL_ISSUE_TO_TYPES.find((t) => t.value === issue.issued_to_type)?.label ??
    issue.issued_to_type;
  const department = rel(issue.departments)?.name ?? null;
  const equipment = rel(issue.equipment)?.equipment_name ?? null;
  const workOrder = rel(issue.work_orders) ?? null;

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <div className="print-only mb-4 hidden border-b-2 border-gray-800 pb-3">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-base font-bold text-gray-900">
                  {organization?.display_name || "Brilliants Industrial Services"}
                </p>
                <p className="text-xs text-gray-600">Plant: {plant?.name || "All plants"}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">Material Issue Slip</p>
                <p className="text-xs text-gray-600">
                  {issue.issue_no} | {formatDate(issue.issue_date)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-600">
              {ERP_REPORT_SYSTEM} | Data source: {MATERIAL_ISSUE_SLIP_SOURCE} | Status:{" "}
              {statusMeta?.label ?? issue.status}
            </p>
          </div>

          <div className="no-print">
            <PageHeader
              title={issue.issue_no}
              backHref="/inventory/issues"
              description={`Material issued to ${issuedToType}`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/inventory/issues">
                    <Button variant="outline">
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void downloadMaterialIssuePdf(issue, pdfMeta(issue))}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  {issue.status === "issued" && hasPermission("inventory", "approve") && (
                    <Button variant="danger" onClick={() => setCancelOpen(true)}>
                      <Ban className="mr-2 h-4 w-4" />
                      Cancel Issue
                    </Button>
                  )}
                </div>
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className={statusMeta?.color}>{statusMeta?.label ?? issue.status}</Badge>
            <span className="text-sm text-gray-500">
              Issued on {formatDate(issue.issue_date)}
            </span>
            {issue.cancelled_at && (
              <span className="text-sm text-red-600">
                Cancelled {formatDateTime(issue.cancelled_at)}
                {issue.cancelled_by_name ? ` by ${issue.cancelled_by_name}` : ""}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                <Metadata label="Issue No" value={issue.issue_no} />
                <Metadata label="Issue Date" value={formatDate(issue.issue_date)} />
                <Metadata label="Issued To Type" value={issuedToType} />
                {department && <Metadata label="Department" value={department} />}
                {equipment && <Metadata label="Equipment" value={equipment} />}
                {workOrder && (
                  <Metadata
                    label="Work Order"
                    value={`${workOrder.work_order_no} · ${workOrder.title}`}
                  />
                )}
                {issue.issued_to_name && (
                  <Metadata label="Received By" value={issue.issued_to_name} />
                )}
                <Metadata label="Issued By" value={issue.created_by_name ?? "—"} />
                <Metadata label="Plant" value={plant?.name ?? "—"} />
                {issue.purpose && <Metadata label="Purpose" value={issue.purpose} />}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Items Issued</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {issue.material_issue_items.length === 0 ? (
                  <EmptyState title="No items" description="This issue has no line items." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <Th>Item</Th>
                          <Th right>Quantity</Th>
                          <Th>Unit</Th>
                          <Th>Remarks</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {issue.material_issue_items.map((item) => {
                          const part = rel(item.spare_parts);
                          return (
                            <tr key={item.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <span className="font-medium">{part?.part_code ?? "—"}</span>
                                <span className="ml-2 text-gray-500">{part?.part_name ?? ""}</span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                {item.unit ?? part?.unit ?? "—"}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.remarks || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {issue.material_issue_items.length} line(s)
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    Total: {issue.total_quantity ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {(issue.remarks || issue.cancel_reason) && (
            <Card>
              <CardContent className="space-y-4 p-6">
                {issue.remarks && <Metadata label="Remarks" value={issue.remarks} />}
                {issue.cancel_reason && (
                  <Metadata label="Cancellation Reason" value={issue.cancel_reason} />
                )}
              </CardContent>
            </Card>
          )}

          <div className="hidden print:block pt-12">
            <div className="grid grid-cols-3 gap-8 text-center text-sm">
              <div className="border-t border-gray-400 pt-2">Issued By (Store)</div>
              <div className="border-t border-gray-400 pt-2">Received By</div>
              <div className="border-t border-gray-400 pt-2">Store In-charge</div>
            </div>
          </div>

          <div className="print-only mt-6 hidden border-t border-gray-400 pt-2 text-[11px] text-gray-600">
            <div className="flex justify-between gap-4">
              <span>{ERP_REPORT_SYSTEM} | System-generated document</span>
              <span>Generated on: {generatedAt || "—"}</span>
            </div>
            <p className="mt-1">
              Data source: {MATERIAL_ISSUE_SLIP_SOURCE} | Generated by:{" "}
              {profile?.name || user?.email || "ERP user"}
            </p>
          </div>

          <ERPModal
            open={cancelOpen}
            onClose={() => {
              setCancelOpen(false);
              setCancelReason("");
              setCancelError("");
            }}
            title={`Cancel ${issue.issue_no}`}
            description="Cancelling puts the issued quantity back into stock via return-in movements. History is preserved."
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelOpen(false);
                    setCancelReason("");
                    setCancelError("");
                  }}
                >
                  Keep Issue
                </Button>
                <Button variant="danger" onClick={() => void confirmCancel()} disabled={isCancelling}>
                  {isCancelling ? "Cancelling..." : "Cancel Issue"}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <Textarea
                rows={3}
                placeholder="Cancellation reason (required)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
            </div>
          </ERPModal>
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}

function Metadata({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "—"}</dd>
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
