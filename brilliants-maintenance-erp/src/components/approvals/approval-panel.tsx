"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  canActOnApproval,
  decideApproval,
  getPendingApprovalForEntity,
  listApprovalHistory,
  type ApproverContext,
  type ResolvedApproval,
} from "@/services/approvals";
import { CheckCheck, X, History, ShieldCheck } from "lucide-react";

export function ApprovalPanel({
  entityType,
  entityId,
  title,
  onChange,
}: {
  entityType: string;
  entityId: string;
  title?: string;
  onChange?: () => void | Promise<void>;
}) {
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [history, setHistory] = useState<ResolvedApproval[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [canDecideApprove, setCanDecideApprove] = useState(false);
  const [canDecideReject, setCanDecideReject] = useState(false);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!user) return null;

  const ctx: ApproverContext = {
    userId: user.id,
    userName: profile?.name ?? user.email ?? "User",
    roleCodes: roles.map((r) => r.code),
    hasPermission,
  };

  async function load() {
    setIsLoading(true);
    const [histRes, pending] = await Promise.all([
      listApprovalHistory(entityType, entityId),
      getPendingApprovalForEntity(entityType, entityId),
    ]);
    setHistory(histRes.data);
    if (pending) {
      setPendingId(pending.id);
      setCanDecideApprove(canActOnApproval(ctx, pending, "approve"));
      setCanDecideReject(canActOnApproval(ctx, pending, "reject"));
    } else {
      setPendingId(null);
      setCanDecideApprove(false);
      setCanDecideReject(false);
    }
    setError("");
    setAction(null);
    setReason("");
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, [entityType, entityId, user?.id]);

  async function decide(decision: "approved" | "rejected") {
    if (!pendingId) return;
    if (decision === "rejected" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setIsSaving(true);
    const res = await decideApproval(scope, ctx, {
      approvalId: pendingId,
      decision,
      comment: reason.trim() || undefined,
    });
    setIsSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
    await onChange?.();
  }

  if (!isLoading && history.length === 0 && !pendingId) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6 text-gray-400" />}
            title="No approval requests"
            description={title ? `No approval trail recorded for "${title}".` : "No approval trail recorded for this record."}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-gray-400" />
          Approval Trail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isLoading || history.length === 0) && !pendingId ? (
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6 text-gray-400" />}
            title="No approvals yet"
            description="Approval activity for this record appears here."
          />
        ) : (
          <div className="space-y-3">
            {pendingId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Pending Approval
                    </p>
                    <p className="text-xs text-amber-700">
                      Requested {history[0] ? formatDateTime(history[0].requested_at) : ""}
                    </p>
                  </div>
                  {(canDecideApprove || canDecideReject) && (
                    <div className="flex items-center gap-2">
                      {canDecideApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() =>
                            setAction(action === "approve" ? null : "approve")
                          }
                          disabled={isSaving}
                        >
                          <CheckCheck className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                      )}
                      {canDecideReject && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() =>
                            setAction(action === "reject" ? null : "reject")
                          }
                          disabled={isSaving}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {action && (
                  <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
                    <Textarea
                      rows={2}
                      placeholder={
                        action === "reject"
                          ? "Rejection reason (required)"
                          : "Approval comment (optional)"
                      }
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAction(null);
                          setReason("");
                          setError("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          void decide(action === "approve" ? "approved" : "rejected")
                        }
                        disabled={isSaving}
                        variant={action === "reject" ? "danger" : "primary"}
                      >
                        {isSaving
                          ? "Saving..."
                          : action === "approve"
                            ? "Approve"
                            : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {history.map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Badge variant={h.status === "approved" ? "success" : "danger"}>
                    {h.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-700">
                      {h.step_name ?? "Approval"}
                      {h.approved_by ? (
                        <span className="text-gray-400"> by {h.approved_by}</span>
                      ) : null}
                    </p>
                    {h.comments && (
                      <p className="mt-0.5 text-xs text-gray-500">{h.comments}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {formatDateTime(h.decided_at ?? h.requested_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}