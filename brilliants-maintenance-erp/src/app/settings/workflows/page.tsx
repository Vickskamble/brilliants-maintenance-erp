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
import { ERPModal } from "@/components/erp/erp-modal";
import { LoadingPage } from "@/components/common/loading";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  createWorkflowDefinition,
  deleteWorkflowDefinition,
  getAllowedTransitions,
  listWorkflowDefinitions,
  replaceWorkflowSteps,
  setWorkflowDefinitionStatus,
  updateWorkflowDefinition,
  type WorkflowDefinitionWithSteps,
  type WorkflowStepRow,
} from "@/services/workflow";
import { ArrowRight, ChevronDown, ChevronRight, Pencil, Plus, Power, Trash2 } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  work_order: "Work Order",
  breakdown: "Breakdown",
  equipment: "Equipment",
  inspection: "Inspection",
  calibration: "Calibration",
  maintenance: "Maintenance",
  shutdown: "Shutdown",
  inventory: "Inventory",
  vendor: "Vendor",
};

const MODULE_STATUS_OPTIONS: Record<string, string[]> = {
  work_order: [
    "draft", "submitted", "approved", "planned", "assigned", "in_progress",
    "on_hold", "completed", "verified", "closed", "cancelled",
  ],
  breakdown: ["reported", "diagnosing", "repairing", "restored", "closed", "cancelled"],
  equipment: ["active", "under_maintenance", "standby", "breakdown", "decommissioned"],
  inspection: ["scheduled", "in_progress", "completed", "cancelled"],
  calibration: ["scheduled", "in_progress", "completed", "cancelled"],
  maintenance: ["pending", "scheduled", "in_progress", "completed", "overdue"],
  shutdown: ["draft", "approved", "in_progress", "completed"],
  inventory: ["pending", "approved", "partially_received", "received", "cancelled"],
  vendor: ["active", "inactive", "suspended"],
};

const GENERIC_STATUS_OPTIONS = ["draft", "submitted", "approved", "in_progress", "completed", "cancelled"];

interface StepDraft {
  key: string;
  step_name: string;
  from_status: string;
  to_status: string;
  require_approval: boolean;
}

function statusOptionsFor(module: string): string[] {
  return MODULE_STATUS_OPTIONS[module] ?? GENERIC_STATUS_OPTIONS;
}

export default function WorkflowsPage() {
  const scope = useQueryScope();

  const [definitions, setDefinitions] = useState<WorkflowDefinitionWithSteps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowDefinitionWithSteps | null>(null);
  const [form, setForm] = useState({ module: "work_order", name: "", description: "" });
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [previewModule, setPreviewModule] = useState("work_order");
  const [previewStatus, setPreviewStatus] = useState("draft");
  const [previewResult, setPreviewResult] = useState<string[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.organizationId, scope.plantId]);

  useEffect(() => {
    let cancelled = false;
    setIsPreviewLoading(true);
    void getAllowedTransitions(previewModule, previewStatus).then((result) => {
      if (cancelled) return;
      setPreviewResult(result);
      setIsPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [previewModule, previewStatus]);

  async function load() {
    setIsLoading(true);
    const { data, error } = await listWorkflowDefinitions(scope);
    setDefinitions(data);
    setLoadError(error);
    setIsLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ module: "work_order", name: "", description: "" });
    setSteps([newStep("", 0)]);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(definition: WorkflowDefinitionWithSteps) {
    setEditing(definition);
    setForm({
      module: definition.module,
      name: definition.name,
      description: definition.description ?? "",
    });
    setSteps(
      [...definition.workflow_steps]
        .sort((a, b) => a.order_index - b.order_index)
        .map((step, index) => ({
          key: String(index),
          step_name: step.step_name,
          from_status: step.from_status,
          to_status: step.to_status,
          require_approval: step.require_approval,
        }))
    );
    setFormError(null);
    setModalOpen(true);
  }

  function newStep(prefix: string, index: number): StepDraft {
    return {
      key: `s-${prefix}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      step_name: "",
      from_status: "",
      to_status: "",
      require_approval: false,
    };
  }

  function addStep() {
    setSteps((current) => [...current, newStep(steps.length ? "a" : "b", steps.length)]);
  }

  function removeStep(key: string) {
    setSteps((current) => current.filter((step) => step.key !== key));
  }

  async function doSubmit() {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    const validSteps: Omit<WorkflowStepRow, "id" | "workflow_definition_id">[] = [];
    for (const step of steps) {
      if (!step.step_name.trim() || !step.from_status || !step.to_status) {
        setFormError("Each step needs a name, from-status and to-status");
        return;
      }
      validSteps.push({
        order_index: validSteps.length,
        step_name: step.step_name.trim(),
        from_status: step.from_status,
        to_status: step.to_status,
        required_roles: null,
        require_approval: step.require_approval,
        approval_role_code: step.require_approval ? "approver" : null,
      });
    }

    setIsSaving(true);
    setFormError(null);

    if (editing) {
      const { error } = await updateWorkflowDefinition(editing, {
        name: form.name.trim(),
        description: form.description,
      });
      if (error) {
        setIsSaving(false);
        setFormError(error);
        return;
      }
      const { error: stepsError } = await replaceWorkflowSteps(editing.id, validSteps);
      setIsSaving(false);
      if (stepsError) {
        setFormError(stepsError);
        return;
      }
    } else {
      const { error } = await createWorkflowDefinition(scope, {
        module: form.module,
        name: form.name.trim(),
        description: form.description,
        steps: validSteps,
      });
      setIsSaving(false);
      if (error) {
        setFormError(error);
        return;
      }
    }

    setModalOpen(false);
    void load();
  }

  async function toggleStatus(definition: WorkflowDefinitionWithSteps) {
    const next = definition.status === "active" ? "inactive" : "active";
    const { error } = await setWorkflowDefinitionStatus(definition.id, next);
    if (!error) void load();
  }

  async function remove(definition: WorkflowDefinitionWithSteps) {
    if (!window.confirm(`Delete workflow "${definition.name}"? Its steps will also be removed.`)) return;
    const { error } = await deleteWorkflowDefinition(definition.id);
    if (!error) {
      if (expandedId === definition.id) setExpandedId(null);
      void load();
    }
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  const statusOptions = statusOptionsFor(previewModule);

  return (
    <ERPLayout>
      <PermissionGate module="settings" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Workflows"
            description="Define status-transition workflows and approval requirements per module."
            action={
              <PermissionGate module="settings" action="edit" fallback={null}>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workflow
                </Button>
              </PermissionGate>
            }
          />

          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {definitions.length === 0 && !loadError && (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">
                  No workflows defined yet. Create one to control allowed status transitions for a module.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {definitions.map((definition) => {
              const expanded = expandedId === definition.id;
              return (
                <Card key={definition.id}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <button
                        onClick={() => setExpandedId(expanded ? null : definition.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{definition.name}</p>
                          {definition.description && (
                            <p className="truncate text-xs text-gray-500">{definition.description}</p>
                          )}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="info">{MODULE_LABELS[definition.module] ?? definition.module}</Badge>
                        <span className="hidden text-xs text-gray-400 sm:inline">
                          {definition.workflow_steps.length} steps
                        </span>
                        <Badge
                          variant={definition.status === "active" ? "success" : "default"}
                        >
                          {definition.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(definition)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void toggleStatus(definition)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Activate / Deactivate"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void remove(definition)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-100 px-5 py-3">
                        {definition.workflow_steps.length === 0 ? (
                          <p className="text-sm text-gray-400">No steps.</p>
                        ) : (
                          <ol className="space-y-2">
                            {[...definition.workflow_steps]
                              .sort((a, b) => a.order_index - b.order_index)
                              .map((step) => (
                                <li key={step.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-xs text-gray-400">{step.order_index + 1}.</span>
                                  <span className="font-medium text-gray-700">{step.step_name}</span>
                                  <span className="flex items-center gap-1.5 text-gray-500">
                                    <Badge variant="default">{step.from_status}</Badge>
                                    <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                                    <Badge variant="info">{step.to_status}</Badge>
                                  </span>
                                  {step.require_approval && (
                                    <Badge variant="warning">
                                      approval ({step.approval_role_code ?? "approver"})
                                    </Badge>
                                  )}
                                </li>
                              ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-gray-900">Allowed transitions preview</p>
              <p className="mt-1 text-xs text-gray-500">
                Shows the next statuses allowed by active workflows for a module + current status.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  value={previewModule}
                  onChange={(e) => {
                    setPreviewModule(e.target.value);
                    setPreviewStatus(statusOptionsFor(e.target.value)[0] ?? "");
                  }}
                >
                  {Object.keys(MODULE_LABELS).map((module) => (
                    <option key={module} value={module}>
                      {MODULE_LABELS[module]}
                    </option>
                  ))}
                </Select>
                <Select value={previewStatus} onChange={(e) => setPreviewStatus(e.target.value)}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap items-center gap-2">
                  {isPreviewLoading ? (
                    <span className="text-xs text-gray-400">Checking...</span>
                  ) : previewResult.length === 0 ? (
                    <Badge variant="default">No restriction (all transitions allowed)</Badge>
                  ) : (
                    previewResult.map((status) => (
                      <Badge key={status} variant="info">
                        {status}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>

      <ERPModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New Workflow Definition"}
        description="Steps map from→to statuses of the existing module statuses."
        size="lg"
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
              <Label htmlFor="wf-module">Module</Label>
              <Select
                id="wf-module"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                disabled={!!editing}
              >
                {Object.keys(MODULE_LABELS).map((module) => (
                  <option key={module} value={module}>
                    {MODULE_LABELS[module]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="wf-name">Name *</Label>
              <Input
                id="wf-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Work Order approval flow"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="wf-description">Description</Label>
            <Input
              id="wf-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Steps</p>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add step
              </Button>
            </div>

            {steps.length === 0 && <p className="mb-2 text-xs text-gray-400">No steps yet.</p>}

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className="grid grid-cols-1 items-end gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
                >
                  <span className="text-xs text-gray-400">{index + 1}</span>
                  <Input
                    value={step.step_name}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...step, step_name: e.target.value };
                      setSteps(next);
                    }}
                    placeholder="Step name"
                  />
                  <Select
                    value={step.from_status}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...step, from_status: e.target.value };
                      setSteps(next);
                    }}
                  >
                    <option value="">From</option>
                    {statusOptionsFor(form.module).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={step.to_status}
                    onChange={(e) => {
                      const next = [...steps];
                      next[index] = { ...step, to_status: e.target.value };
                      setSteps(next);
                    }}
                  >
                    <option value="">To</option>
                    {statusOptionsFor(form.module).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => removeStep(step.key)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <label className="flex items-center gap-2 text-xs text-gray-600 sm:col-span-4 sm:pl-7">
                    <input
                      type="checkbox"
                      checked={step.require_approval}
                      onChange={(e) => {
                        const next = [...steps];
                        next[index] = { ...step, require_approval: e.target.checked };
                        setSteps(next);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Requires approval
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ERPModal>
    </ERPLayout>
  );
}