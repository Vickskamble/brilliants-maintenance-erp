"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { MetadataRow } from "@/components/common/metadata-row";
import {
  getEquipment,
  getEquipmentComponents,
  getEquipmentStatusHistory,
  addEquipmentComponent,
  deleteEquipmentComponent,
} from "@/services/equipment";
import { Equipment, EquipmentComponent } from "@/types/database";
import { Pencil, ArrowLeft, MapPin, Cog, Plus, Trash2, Package } from "lucide-react";
import Link from "next/link";

type EquipmentDetail = Equipment & {
  asset_categories?: { name: string } | null;
  criticality_profiles?: { name: string } | null;
  plants?: { name: string } | null;
  locations?: { name: string } | null;
  departments?: { name: string } | null;
  sections?: { name: string } | null;
  cost_centers?: { name: string } | null;
};

interface StatusHistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  reason: string | null;
}

interface WorkOrderRow {
  id: string;
  work_order_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  planned_start: string | null;
}

interface BreakdownRow {
  id: string;
  breakdown_no: string;
  severity: string | null;
  status: string;
  reported_at: string;
}

interface InspectionRow {
  id: string;
  inspection_no: string;
  status: string;
  overall_result: string | null;
  scheduled_date: string | null;
  performed_at: string | null;
}

interface CalibrationRow {
  id: string;
  schedule_no: string | null;
  task_type: string | null;
  frequency: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean | null;
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [components, setComponents] = useState<EquipmentComponent[]>([]);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationRow[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [componentForm, setComponentForm] = useState({
    component_name: "",
    component_type: "",
    serial_number: "",
    criticality: "normal",
  });
  const [componentError, setComponentError] = useState("");

  async function load() {
    setIsLoading(true);
    const [eqRes, compRes, histRes, woRes, bdRes, inspRes, calRes] = await Promise.all([
      getEquipment(id),
      getEquipmentComponents(id),
      getEquipmentStatusHistory(id),
      supabase
        .from("work_orders")
        .select(
          "id, work_order_no, title, type, priority, status, planned_start"
        )
        .eq("equipment_id", id)
        .order("work_order_no"),
      supabase
        .from("breakdowns")
        .select("id, breakdown_no, severity, status, reported_at")
        .eq("equipment_id", id)
        .order("reported_at", { ascending: false }),
      supabase
        .from("inspections")
        .select("id, inspection_no, status, overall_result, scheduled_date, performed_at")
        .eq("equipment_id", id)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("maintenance_schedules")
        .select("id, schedule_no, task_type, frequency, last_run_at, next_run_at, is_active")
        .eq("equipment_id", id)
        .eq("task_type", "calibration")
        .order("next_run_at", { ascending: true }),
    ]);
    if (eqRes.data) setEquipment(eqRes.data as unknown as EquipmentDetail);
    if (compRes.data) setComponents(compRes.data as unknown as EquipmentComponent[]);
    if (histRes.data) setHistory(histRes.data as unknown as StatusHistoryRow[]);
    if (woRes.data) setWorkOrders(woRes.data as unknown as WorkOrderRow[]);
    if (bdRes.data) setBreakdowns(bdRes.data as unknown as BreakdownRow[]);
    if (inspRes.data) setInspections(inspRes.data as unknown as InspectionRow[]);
    if (calRes.data) setCalibrations(calRes.data as unknown as CalibrationRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    load();
  }, [activeTab]);

  function openAddDialog() {
    setComponentForm({
      component_name: "",
      component_type: "",
      serial_number: "",
      criticality: "normal",
    });
    setComponentError("");
    setIsDialogOpen(true);
  }

  async function addNewComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!componentForm.component_name.trim()) {
      setComponentError("Component name is required");
      return;
    }
    setComponentError("");
    const { error } = await addEquipmentComponent(id, {
      component_name: componentForm.component_name.trim(),
      component_type: componentForm.component_type.trim() || null,
      serial_number: componentForm.serial_number.trim() || null,
      criticality: componentForm.criticality,
    });
    if (error) {
      setComponentError(error.message);
      return;
    }
    setIsDialogOpen(false);
    void load();
  }

  async function removeComponent(componentId: string) {
    const { error } = await deleteEquipmentComponent(componentId);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!equipment) {
    return (
      <ERPLayout>
        <EmptyState
          title="Equipment not found"
          description="The equipment asset you are looking for does not exist."
          action={
            <Link href="/equipment">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Equipment
              </Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "components", label: "Components" },
    { key: "maintenance", label: "Maintenance" },
    { key: "work_orders", label: "Work Orders" },
    { key: "breakdowns", label: "Breakdowns" },
    { key: "inspections", label: "Inspections" },
    { key: "calibration", label: "Calibration" },
    { key: "spares", label: "Spares" },
    { key: "documents", label: "Documents" },
    { key: "cost", label: "Cost" },
    { key: "history", label: "History" },
  ];

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title={equipment.equipment_name}
          description={`${equipment.equipment_code} · ${equipment.asset_categories?.name ?? "Uncategorised"}`}
          action={
            <div className="flex items-center gap-2">
              <Link href={`/equipment/${equipment.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" onClick={() => router.push("/equipment")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={equipment.status} />
          <Badge>{equipment.criticality_profiles?.name ?? "No criticality"}</Badge>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {equipment.plants?.name ?? "No plant"}
          </div>
          {equipment.location_id && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Cog className="h-4 w-4" />
              {equipment.locations?.name ?? "No location"}
            </div>
          )}
        </div>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <Card>
            <CardContent className="space-y-0 p-0">
              <div className="grid grid-cols-1 gap-px bg-gray-100 md:grid-cols-2">
                <MetadataRow label="Manufacturer" value={equipment.manufacturer} />
                <MetadataRow label="Make" value={equipment.make} />
                <MetadataRow label="Model" value={equipment.model} />
                <MetadataRow label="Serial Number" value={equipment.serial_number} />
                <MetadataRow label="Plant" value={equipment.plants?.name} />
                <MetadataRow label="Department" value={equipment.departments?.name} />
                <MetadataRow label="Section" value={equipment.sections?.name} />
                <MetadataRow label="Area" value={equipment.sections?.name} />
                <MetadataRow label="Location" value={equipment.locations?.name} />
                <MetadataRow label="Cost Center" value={equipment.cost_centers?.name} />
              </div>
              {equipment.description && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <p className="text-sm text-gray-600">{equipment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "components" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Components</h3>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            </div>
            {components.length === 0 ? (
              <EmptyState
                title="No components"
                description="Add components for line-replaceable units and spares."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Serial</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Criticality</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {components.map((c) => (
                        <tr key={c.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{c.component_code}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.component_name}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.component_type ?? "-"}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{c.serial_number ?? "-"}</td>
                          <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={c.criticality ?? "normal"} /></td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeComponent(c.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Installation Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.installation_date)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Commissioning Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.commissioning_date)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Warranty Ends</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.warranty_end)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "work_orders" && (
          <LinkTable
            emptyTitle="No work orders"
            emptyDescription="Work orders raised for this equipment will appear here."
            columns={["No.", "Title", "Type", "Priority", "Status"]}
            rows={workOrders.map((w) => ({
              id: w.id,
              href: `/work-orders/${w.id}`,
              cells: [
                <span key="no" className="font-mono text-sm font-medium text-gray-900">{w.work_order_no}</span>,
                <span key="title" className="text-sm text-gray-600">{w.title}</span>,
                <span key="type" className="text-sm capitalize text-gray-500">{w.type.replace(/_/g, " ")}</span>,
                <span key="pr" className="text-sm capitalize text-gray-500">{w.priority}</span>,
                <StatusBadge key="st" status={w.status} />,
              ],
            }))}
          />
        )}

        {activeTab === "breakdowns" && (
          <LinkTable
            emptyTitle="No breakdowns"
            emptyDescription="Breakdowns recorded for this equipment will appear here."
            columns={["No.", "Severity", "Status", "Reported At"]}
            rows={breakdowns.map((b) => ({
              id: b.id,
              href: `/breakdowns/${b.id}`,
              cells: [
                <span key="no" className="font-mono text-sm font-medium text-gray-900">{b.breakdown_no}</span>,
                <span key="sev" className="text-sm capitalize text-gray-500">{b.severity?.replace(/_/g, " ") ?? "-"}</span>,
                <StatusBadge key="st" status={b.status} />,
                <span key="date" className="text-sm text-gray-500">{formatDateTime(b.reported_at)}</span>,
              ],
            }))}
          />
        )}

        {activeTab === "inspections" && (
          <LinkTable
            emptyTitle="No inspections"
            emptyDescription="Inspection records for this equipment will appear here."
            columns={["No.", "Status", "Result", "Scheduled"]}
            rows={inspections.map((i) => ({
              id: i.id,
              href: `/inspections/${i.id}`,
              cells: [
                <span key="no" className="font-mono text-sm font-medium text-gray-900">{i.inspection_no}</span>,
                <StatusBadge key="st" status={i.status} />,
                <span key="res" className="text-sm capitalize text-gray-500">{i.overall_result?.replace(/_/g, " ") ?? "-"}</span>,
                <span key="date" className="text-sm text-gray-500">{formatDate(i.scheduled_date)}</span>,
              ],
            }))}
          />
        )}

        {activeTab === "calibration" && (
          <LinkTable
            emptyTitle="No calibration schedules"
            emptyDescription="Calibration schedules for this equipment will appear here."
            columns={["Schedule", "Task", "Frequency", "Last Run", "Next Run", "Status"]}
            rows={calibrations.map((c) => ({
              id: c.id,
              href: `/maintenance/${c.id}`,
              cells: [
                <span key="no" className="font-mono text-sm font-medium text-gray-900">{c.schedule_no ?? "-"}</span>,
                <span key="task" className="text-sm capitalize text-gray-600">{c.task_type?.replace(/_/g, " ") ?? "-"}</span>,
                <span key="freq" className="text-sm capitalize text-gray-500">{c.frequency?.replace(/_/g, " ") ?? "-"}</span>,
                <span key="last" className="text-sm text-gray-500">{formatDate(c.last_run_at)}</span>,
                <span key="next" className="text-sm text-gray-500">{formatDate(c.next_run_at)}</span>,
                c.is_active ? <Badge key="act" variant="success">Active</Badge> : <Badge key="act" variant="default">Inactive</Badge>,
              ],
            }))}
          />
        )}

        {activeTab === "spares" && (
          <EmptyState
            icon={<Package />}
            title="No spares linked"
            description="Parts linked to this equipment will appear here once they are associated."
          />
        )}

        {["documents", "cost"].includes(activeTab) && (
          <EmptyState
            title="Not available yet"
            description="This section has no tracking yet in the current release."
          />
        )}

        {activeTab === "history" && (
          <Card>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <EmptyState title="No status changes" />
              ) : (
                <div className="divide-y divide-gray-200">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={h.old_status ?? "n/a"} />
                        <span className="text-gray-400">→</span>
                        <StatusBadge status={h.new_status} />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{formatDateTime(h.changed_at)}</p>
                        {h.reason && <p className="text-xs text-gray-400">{h.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Add Component"
        description="Register a line-replaceable unit or spare component."
      >
        <form onSubmit={addNewComponent} className="space-y-4">
          {componentError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {componentError}
            </div>
          )}
          <div>
            <Label htmlFor="component_name">Component Name *</Label>
            <Input
              id="component_name"
              value={componentForm.component_name}
              onChange={(e) => setComponentForm({ ...componentForm, component_name: e.target.value })}
              placeholder="e.g. Impeller"
            />
          </div>
          <div>
            <Label htmlFor="component_type">Type</Label>
            <Input
              id="component_type"
              value={componentForm.component_type}
              onChange={(e) => setComponentForm({ ...componentForm, component_type: e.target.value })}
              placeholder="e.g. wearing part"
            />
          </div>
          <div>
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={componentForm.serial_number}
              onChange={(e) => setComponentForm({ ...componentForm, serial_number: e.target.value })}
              placeholder="e.g. SN-2024-0081"
            />
          </div>
          <div>
            <Label htmlFor="criticality">Criticality</Label>
            <Select
              id="criticality"
              value={componentForm.criticality}
              onChange={(e) => setComponentForm({ ...componentForm, criticality: e.target.value })}
            >
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="normal">Normal</option>
            </Select>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </div>
        </form>
      </Dialog>
    </ERPLayout>
  );
}

function LinkTable({
  emptyTitle,
  emptyDescription,
  columns,
  rows,
}: {
  emptyTitle: string;
  emptyDescription: string;
  columns: string[];
  rows: { id: string; href: string; cells: React.ReactNode[] }[];
}) {
  const router = useRouter();
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((c) => (
                <th key={c} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(r.href)}>
                {r.cells.map((c, i) => (
                  <td key={i} className="whitespace-nowrap px-6 py-4">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN");
}