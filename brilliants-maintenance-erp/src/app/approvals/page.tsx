"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { ERPModal } from "@/components/erp/erp-modal";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { PermissionGate } from "@/components/auth/permission-gate";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  canActOnApproval,
  decideApproval,
  listMyApprovalRequests,
  listPendingApprovals,
  type ApproverContext,
  type PendingApproval,
} from "@/services/approvals";
import { ShieldCheck, CheckCheck, X, ExternalLink } from "lucide-react";

export default function ApprovalsPage() {
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [mine, setMine] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deciding, setDeciding] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const ctx: ApproverContext = {
    userId: user.id,
    userName: profile?.name ?? user.email ?? "User",
    roleCodes: roles.map((r) => r.code),
    hasPermission,
  };

  const load = async () => {
    setIsLoading(true);
    const [pendingRes, mineRes] = await Promise.all([
      listPendingApprovals(ctx),
      listMyApprovalRequests(user.id),
    ]);
    setPending(pendingRes.data);
    setMine(mineRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function confirmDecision() {
    if (!deciding) return;
    if (deciding.action === "reject" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setIsSaving(true);
    const res = await decideApproval(scope, ctx, {
      approvalId: deciding.id,
      decision: deciding.action === "approve" ? "approved" : "rejected",
      comment: reason.trim() || undefined,
    });
    setIsSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDeciding(null);
    setReason("");
    setError("");
    await load();
  }

  function approvalList(): PendingApproval[] {
    return tab === "pending" ? pending : mine;
  }

  return (
    <ERPLayout>
      <PermissionGate module="approval" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Approvals"
            description="Review and decide pending approval requests."
            backHref="/dashboard"
          />

          <Tabs
            tabs={[
              { key: "pending", label: `My Approvals (${pending.length})` },
              { key: "mine", label: `My Requests (${mine.length})` },
            ]}
            active={tab}
            onChange={setTab}
          />

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <LoadingPage />
              ) : approvalList().length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="h-6 w-6 text-gray-400" />}
                  title={
                    tab === "pending"
                      ? "No pending approvals"
                      : "No requests submitted"
                  }
                  description={
                    tab === "pending"
                      ? "You have no approval requests awaiting your decision."
                      : "Approval requests you have submitted appear here."
                  }
                />
              ) : (
                <div className="divide-y divide-gray-200">
                  {approvalList().map((approval) => {
                    const canApprove = canActOnApproval(ctx, approval, "approve");
                    const canReject = canActOnApproval(ctx, approval, "reject");
                    return (
                      <div key={approval.id} className="px-6 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="info">
                                {approval.entity_type.replace(/_/g, " ")}
                              </Badge>
                              {approval.entity_no && (
                                <span className="font-mono text-xs font-medium text-blue-600">
                                  {approval.entity_no}
                                </span>
                              )}
                              {approval.status === "pending" && (
                                <Badge variant="warning">Pending</Badge>
                              )}
                              {approval.status === "approved" && (
                                <Badge variant="success">Approved</Badge>
                              )}
                              {approval.status === "rejected" && (
                                <Badge variant="danger">Rejected</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {approval.entity_title}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {approval.step_name ?? "Approval"} · requested by{" "}
                              <span className="font-medium text-gray-700">
                                {approval.requested_by === user.id
                                  ? "me"
                                  : approval.requested_by?.slice(0, 8)}
                              </span>{" "}
                              · {formatDateTime(approval.requested_at)}
                            </p>
                            {approval.comments && (
                              <p className="mt-1 text-xs text-gray-400">
                                {approval.comments}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {approval.status === "pending" && canApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  setDeciding({ id: approval.id, action: "approve" })
                                }
                              >
                                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                            )}
                            {approval.status === "pending" && canReject && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  setDeciding({ id: approval.id, action: "reject" })
                                }
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            )}
                            <Link href={approval.entity_link}>
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ERPModal
          open={deciding !== null}
          onClose={() => {
            setDeciding(null);
            setReason("");
            setError("");
          }}
          title={deciding?.action === "approve" ? "Approve request" : "Reject request"}
          description={
            deciding?.action === "approve"
              ? "Confirm the approval for this request."
              : "Rejecting requires a reason."
          }
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDeciding(null);
                  setReason("");
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void confirmDecision()}
                disabled={isSaving}
                variant={deciding?.action === "reject" ? "danger" : "primary"}
              >
                {isSaving ? "Saving..." : deciding?.action === "approve" ? "Approve" : "Reject"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Textarea
              rows={3}
              placeholder={
                deciding?.action === "reject"
                  ? "Rejection reason (required)"
                  : "Approval comment (optional)"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </ERPModal>
      </PermissionGate>
    </ERPLayout>
  );
}