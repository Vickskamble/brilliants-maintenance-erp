"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ERPDataTable } from "@/components/erp/table/erp-data-table";
import { ERPModal } from "@/components/erp/erp-modal";
import { LoadingPage } from "@/components/common/loading";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  createSlaRule,
  listSlaRules,
  setSlaRuleStatus,
  updateSlaRule,
  type SlaRuleRow,
} from "@/services/workflow";
import { Pencil, Plus, Power } from "lucide-react";
import type { ERPColumn } from "@/components/erp/table/erp-table-types";

const MODULE_LABELS: Record<string, string> = {
  work_order: "Work Order",
  breakdown: "Breakdown",
  calibration: "Calibration",
  inspection: "Inspection",
  maintenance: "Maintenance",
};

const SLA_TYPE_LABELS: Record<string, string> = {
  response: "Response",
  resolution: "Resolution",
  completion: "Completion",
};

export default function SlaRulesPage() {
  const scope = useQueryScope();

  const [rules, setRules] = useState<SlaRuleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SlaRuleRow | null>(null);
  const [form, setForm] = useState({
    module: "work_order",
    sla_type: "completion",
    priority: "",
    duration_minutes: "60",
    escalation_role_code: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.organizationId, scope.plantId]);

  async function load() {
    setIsLoading(true);
    const { data, error } = await listSlaRules(scope);
    setRules(data);
    setLoadError(error);
    setIsLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ module: "work_order", sla_type: "completion", priority: "", duration_minutes: "60", escalation_role_code: "" });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: SlaRuleRow) {
    setEditing(row);
    setForm({
      module: row.module,
      sla_type: row.sla_type,
      priority: row.priority ?? "",
      duration_minutes: String(row.duration_minutes),
      escalation_role_code: row.escalation_role_code ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function doSubmit() {
    const minutes = Number(form.duration_minutes);
    if (!minutes || minutes <= 0) {
      setFormError("Duration must be a positive number");
      return;
    }
    setIsSaving(true);
    setFormError(null);

    const payload = {
      module: form.module,
      sla_type: form.sla_type,
      priority: form.priority || null,
      duration_minutes: minutes,
      escalation_role_code: form.escalation_role_code || null,
    };

    const { error } = editing ? await updateSlaRule(editing.id, payload) : await createSlaRule(scope, payload);
    setIsSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    setModalOpen(false);
    void load();
  }

  async function toggleStatus(row: SlaRuleRow) {
    const next = row.status === "active" ? "inactive" : "active";
    const { error } = await setSlaRuleStatus(row.id, next);
    if (!error) void load();
  }

  const columns: ERPColumn<SlaRuleRow>[] = [
    {
      id: "module",
      header: "Module",
      accessorKey: "module",
      cell: (row) => <span className="text-sm text-gray-900">{MODULE_LABELS[row.module] ?? row.module}</span>,
    },
    {
      id: "sla_type",
      header: "SLA Type",
      accessorKey: "sla_type",
      cell: (row) => <span className="text-sm text-gray-900">{SLA_TYPE_LABELS[row.sla_type] ?? row.sla_type}</span>,
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      cell: (row) => (row.priority ? <Badge variant="warning">{row.priority}</Badge> : <span className="text-sm text-gray-300">any</span>),
    },
    {
      id: "duration_minutes",
      header: "Duration (min)",
      accessorKey: "duration_minutes",
      cell: (row) => <span className="text-sm text-gray-900">{row.duration_minutes}</span>,
    },
    {
      id: "escalation_role_code",
      header: "Escalation",
      accessorKey: "escalation_role_code",
      cell: (row) => <span className="text-sm text-gray-700">{row.escalation_role_code ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <Badge variant={row.status === "active" ? "success" : "default"}>{row.status}</Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PermissionGate module="settings" action="view">
        <div className="space-y-6">
          <PageHeader
            title="SLA Rules"
            description="Response, resolution and completion targets per module and priority."
            action={
              <PermissionGate module="settings" action="edit" fallback={null}>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add SLA Rule
                </Button>
              </PermissionGate>
            }
          />

          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <ERPDataTable
                columns={columns}
                data={rules}
                idKey={(row) => row.id}
                loading={false}
                searchPlaceholder="Search SLA rules..."
                defaultPageSize={12}
                tableKey="settings-sla"
                exportFileName="sla-rules"
                emptyTitle="No SLA rules"
                emptyDescription="Add rules to start tracking response resolution targets."
                rowActions={[
                  { label: "Edit", icon: Pencil, onClick: (row) => openEdit(row) },
                  { label: "Deactivate / Activate", icon: Power, onClick: (row) => void toggleStatus(row) },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </PermissionGate>

      <ERPModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit SLA Rule" : "Add SLA Rule"}
        description="SLA targets are evaluated against module status timestamps."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void doSubmit()} disabled={isSaving}>
              {isSaving ? "Saving..." : editing ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sla-module">Module</Label>
              <Select id="sla-module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
                {Object.entries(MODULE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="sla-type">SLA Type</Label>
              <Select id="sla-type" value={form.sla_type} onChange={(e) => setForm({ ...form, sla_type: e.target.value })}>
                {Object.entries(SLA_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sla-priority">Priority</Label>
              <Select id="sla-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="">Any priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="sla-duration">Duration (minutes) *</Label>
              <Input
                id="sla-duration"
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sla-escalation">Escalation role code</Label>
            <Input
              id="sla-escalation"
              value={form.escalation_role_code}
              onChange={(e) => setForm({ ...form, escalation_role_code: e.target.value })}
              placeholder="e.g. maintenance_manager"
            />
          </div>
        </div>
      </ERPModal>
    </ERPLayout>
  );
}