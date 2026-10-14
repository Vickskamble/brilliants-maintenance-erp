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
  getCapa,
  updateCapa,
  submitCapaForApproval,
  submitCapaForClosure,
  type QmsCapaRow,
} from "@/services/qms/capas";
import type { ApproverContext } from "@/services/approvals";
import { ClipboardCheck, Send } from "lucide-react";

export default function CapaDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, profile, roles, hasPermission } = useAuth();
  const scope = useQueryScope();
  const [capa, setCapa] = useState<QmsCapaRow | null>(null);
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [effectivenessCheck, setEffectivenessCheck] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const capaId = params.id;

  useEffect(() => {
    void load();
  }, [capaId]);

  async function load() {
    const res = await getCapa(capaId);
    setCapa(res.data);
    if (res.data) {
      setRootCause(res.data.root_cause ?? "");
      setCorrectiveAction(res.data.corrective_action ?? "");
      setPreventiveAction(res.data.preventive_action ?? "");
      setEffectivenessCheck(res.data.effectiveness_check ?? "");
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

  async function savePlan() {
    if (!capa) return;
    setIsSaving(true);
    setMessage(null);
    const error = await updateCapa(capa.id, {
      root_cause: rootCause.trim() || null,
      corrective_action: correctiveAction.trim() || null,
      preventive_action: preventiveAction.trim() || null,
      effectiveness_check: effectivenessCheck.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }
    setMessage({ kind: "ok", text: "CAPA plan saved." });
    await load();
  }

  async function handleSubmit() {
    if (!capa) return;
    setIsSaving(true);
    setMessage(null);
    const res = await submitCapaForApproval(scope, ctx, capa.id);
    setIsSaving(false);
    if (res.error) {
      setMessage({ kind: "err", text: res.error });
      return;
    }
    if (!res.created) {
      setMessage({ kind: "err", text: "No approval workflow is configured for CAPA." });
      return;
    }
    setMessage({ kind: "ok", text: "CAPA plan submitted for approval." });
    await load();
  }

  async function handleClosure() {
    if (!capa) return;
    setIsSaving(true);
    setMessage(null);
    const error = await updateCapa(capa.id, {
      corrective_action: correctiveAction.trim() || null,
      preventive_action: preventiveAction.trim() || null,
      effectiveness_check: effectivenessCheck.trim() || null,
    });
    if (error) {
      setIsSaving(false);
      setMessage({ kind: "err", text: error });
      return;
    }
    const res = await submitCapaForClosure(scope, ctx, capa.id);
    setIsSaving(false);
    if (res.error) {
      setMessage({ kind: "err", text: res.error });
      return;
    }
    setMessage({ kind: "ok", text: "Actions marked implemented. CAPA submitted for QA Manager closure." });
    await load();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!capa) {
    return (
      <ERPLayout>
        <div className="py-12 text-center text-sm text-gray-500">CAPA not found.</div>
      </ERPLayout>
    );
  }

  const canEdit = hasPermission("capa", "edit");

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader title={capa.capa_no} description={capa.title} backHref="/quality/capas" />

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
              <ClipboardCheck className="h-4 w-4 text-gray-400" />
              CAPA
            </CardTitle>
            <StatusBadge status={capa.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Source" value={capa.source_type} />
              <Field label="Reference" value={capa.source_ref ?? "—"} />
              <Field label="Risk level" value={capa.risk_level} />
            </div>

            {capa.description && <p className="text-sm text-gray-600">{capa.description}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Root cause</label>
                <Textarea rows={3} value={rootCause} onChange={(e) => setRootCause(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Corrective action</label>
                <Textarea rows={3} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Preventive action</label>
                <Textarea rows={3} value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Effectiveness check</label>
                <Textarea rows={3} value={effectivenessCheck} onChange={(e) => setEffectivenessCheck(e.target.value)} disabled={!canEdit} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {capa.status === "initiated" && canEdit && (
                <PermissionGate module="capa" action="edit" fallback={null}>
                  <>
                    <Button size="sm" variant="outline" onClick={savePlan} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save plan"}
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Submit plan for approval
                    </Button>
                  </>
                </PermissionGate>
              )}
              {capa.status === "approved" && canEdit && (
                <PermissionGate module="capa" action="edit" fallback={null}>
                  <Button size="sm" onClick={handleClosure} disabled={isSaving}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                    Mark implemented — submit for closure
                  </Button>
                </PermissionGate>
              )}
            </div>
          </CardContent>
        </Card>

        <ApprovalPanel entityType="capa" entityId={capa.id} onChange={load} />
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