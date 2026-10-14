"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  getChange,
  updateChange,
  moveChange,
  submitChangeForRiskApproval,
  submitChangeForClosure,
  type QmsChangeRow,
} from "@/services/qms/changes";
import type { ApproverContext } from "@/services/approvals";
import { GitPullRequest, Send, CheckCircle2, SearchCheck } from "lucide-react";

export default function ChangeDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [change, setChange] = useState<QmsChangeRow | null>(null);
  const [riskAssessment, setRiskAssessment] = useState("");
  const [implementationPlan, setImplementationPlan] = useState("");
  const [verificationResults, setVerificationResults] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const changeId = params.id;

  useEffect(() => {
    void load();
  }, [changeId]);

  async function load() {
    const res = await getChange(changeId);
    setChange(res.data);
    if (res.data) {
      setRiskAssessment(res.data.risk_assessment ?? "");
      setImplementationPlan(res.data.implementation_plan ?? "");
      setVerificationResults(res.data.verification_results ?? "");
    }
    setIsLoading(false);
  }

  if (!user) return null;

  const ctx: ApproverContext = {
    userId: user.id,
    userName: profile?.name ?? user.email ?? "User",
    roleCodes: roles.map((r) => r.code),
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    hasPermission,
  };

  async function run(fn: () => Promise<string | null>, okText: string) {
    if (!change) return;
    setIsSaving(true);
    setMessage(null);
    const error = await fn();
    setIsSaving(false);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setMessage({ kind: "ok", text: okText });
    await load();
  }

  async function savePlan() {
    if (!change) return;
    setIsSaving(true);
    setMessage(null);
    const error = await updateChange(change.id, {
      risk_assessment: riskAssessment.trim() || null,
      implementation_plan: implementationPlan.trim() || null,
      verification_results: verificationResults.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setMessage({ kind: "ok", text: "Change details saved." });
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!change) {
    return (
      <ERPLayout>
        <div className="py-12 text-center text-sm text-gray-500">Change request not found.</div>
      </ERPLayout>
    );
  }

  const canEdit = hasPermission("change_control", "edit");

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title={change.change_no} description={change.title} backHref="/quality/change-control" />

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

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GitPullRequest className="h-4 w-4 text-gray-400" />
              Change request
            </CardTitle>
            <StatusBadge status={change.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Type" value={change.change_type} />

            {change.description && <p className="text-sm text-gray-600">{change.description}</p>}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Risk assessment</label>
                <Textarea rows={4} value={riskAssessment} onChange={(e) => setRiskAssessment(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Implementation plan</label>
                <Textarea rows={4} value={implementationPlan} onChange={(e) => setImplementationPlan(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Verification results</label>
                <Textarea rows={4} value={verificationResults} onChange={(e) => setVerificationResults(e.target.value)} disabled={!canEdit} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {canEdit && (
                <PermissionGate module="change_control" action="edit" fallback={null}>
                  <>
                    <Button size="sm" variant="outline" onClick={savePlan} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save details"}
                    </Button>
                    {change.status === "submitted" && (
                      <Button size="sm" onClick={() => run(() => moveChange(change.id, "risk_review"), "Risk review started.")} disabled={isSaving}>
                        <SearchCheck className="mr-1.5 h-3.5 w-3.5" />
                        Start risk review
                      </Button>
                    )}
                    {change.status === "risk_review" && (
                      <Button size="sm" onClick={() => run(async () => (await submitChangeForRiskApproval(scope, ctx, change.id)).error ?? null, "Change submitted for QA risk approval.")} disabled={isSaving}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Submit for risk approval
                      </Button>
                    )}
                    {change.status === "approved" && (
                      <Button size="sm" onClick={() => run(() => moveChange(change.id, "verified"), "Implementation marked verified.")} disabled={isSaving}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Mark implementation verified
                      </Button>
                    )}
                    {change.status === "verified" && (
                      <Button size="sm" onClick={() => run(async () => (await submitChangeForClosure(scope, ctx, change.id)).error ?? null, "Change submitted for QA Manager closure.")} disabled={isSaving}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Submit for closure
                      </Button>
                    )}
                  </>
                </PermissionGate>
              )}
            </div>
          </CardContent>
        </Card>

        <ApprovalPanel entityType="change" entityId={change.id} onChange={load} />
      </div>
    </ERPLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{value}</p>
    </div>
  );
}