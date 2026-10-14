"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  getDeviation,
  updateDeviation,
  submitDeviationForApproval,
  submitDeviationForClosure,
  type QmsDeviationRow,
} from "@/services/qms/deviations";
import type { ApproverContext } from "@/services/approvals";
import { AlertTriangle, Send, ClipboardCheck } from "lucide-react";

export default function DeviationDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [dev, setDev] = useState<QmsDeviationRow | null>(null);
  const [investigation, setInvestigation] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const devId = params.id;

  useEffect(() => {
    void load();
  }, [devId]);

  async function load() {
    const res = await getDeviation(devId);
    setDev(res.data);
    if (res.data) {
      setInvestigation(res.data.investigation ?? "");
      setRootCause(res.data.root_cause ?? "");
      setActionPlan(res.data.action_plan ?? "");
      setDescription(res.data.description ?? "");
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

  async function saveNotes() {
    if (!dev) return;
    setIsSaving(true);
    setMessage(null);
    const error = await updateDeviation(dev.id, {
      description: description.trim() || null,
      root_cause: rootCause.trim() || null,
      investigation: investigation.trim() || null,
      action_plan: actionPlan.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setMessage({ kind: "ok", text: "Investigation details saved." });
    await load();
  }

  async function handleSubmit() {
    if (!dev) return;
    setIsSaving(true);
    setMessage(null);
    const res = await submitDeviationForApproval(scope, ctx, dev.id);
    setIsSaving(false);
    if (res.error) {
      setMessage({ kind: "err", text: res.error });
      return;
    }
    if (!res.created) {
      setMessage({ kind: "err", text: "No approval workflow is configured for deviations." });
      return;
    }
    setMessage({ kind: "ok", text: "Deviation submitted for investigation approval." });
    await load();
  }

  async function handleClosure() {
    if (!dev) return;
    setIsSaving(true);
    setMessage(null);
    const error = await updateDeviation(dev.id, { action_plan: actionPlan.trim() || null });
    if (error) {
      setIsSaving(false);
      setMessage({ kind: "err", text: error });
      return;
    }
    const res = await submitDeviationForClosure(scope, ctx, dev.id);
    setIsSaving(false);
    if (res.error) {
      setMessage({ kind: "err", text: res.error });
      return;
    }
    setMessage({ kind: "ok", text: "Actions recorded. Deviation submitted for QA Manager closure." });
    await load();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!dev) {
    return (
      <ERPLayout>
        <div className="py-12 text-center text-sm text-gray-500">Deviation not found.</div>
      </ERPLayout>
    );
  }

  const canEdit = hasPermission("deviation", "edit");

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title={dev.deviation_no} description={dev.title} backHref="/quality/deviations" />

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
              <AlertTriangle className="h-4 w-4 text-gray-400" />
              Deviation
            </CardTitle>
            <StatusBadge status={dev.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Type" value={dev.dev_type} />
              <Field label="Severity" value={dev.severity} />
              <Field label="Reported" value={new Date(dev.reported_at).toLocaleDateString("en-IN")} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {(dev.status === "open" || dev.status === "approved") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Root cause</label>
                  <Textarea rows={3} value={rootCause} onChange={(e) => setRootCause(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Investigation</label>
                  <Textarea rows={3} value={investigation} onChange={(e) => setInvestigation(e.target.value)} disabled={!canEdit} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Action plan</label>
                  <Textarea rows={3} value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {dev.status === "open" && canEdit && (
                <PermissionGate module="deviation" action="edit" fallback={null}>
                  <>
                    <Button size="sm" variant="outline" onClick={saveNotes} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save details"}
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Submit for approval
                    </Button>
                  </>
                </PermissionGate>
              )}
              {dev.status === "approved" && canEdit && (
                <PermissionGate module="deviation" action="edit" fallback={null}>
                  <Button size="sm" onClick={handleClosure} disabled={isSaving}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                    Actions complete — submit for closure
                  </Button>
                </PermissionGate>
              )}
            </div>
          </CardContent>
        </Card>

        <ApprovalPanel entityType="deviation" entityId={dev.id} onChange={load} />
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