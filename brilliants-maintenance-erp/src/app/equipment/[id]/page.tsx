"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
  updateEquipmentComponent,
  deleteEquipmentComponent,
} from "@/services/equipment";
import { Equipment, EquipmentComponent } from "@/types/database";
import { Pencil, ArrowLeft, Archive, MapPin, Calendar, Wrench, Cog, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

type EquipmentDetail = Equipment & {
  equipment_description?: string | null;
  next_pm_due?: string | null;
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

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [components, setComponents] = useState<EquipmentComponent[]>([]);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);

  async function load() {
    setIsLoading(true);
    const [eqRes, compRes, histRes] = await Promise.all([
      getEquipment(id),
      getEquipmentComponents(id),
      getEquipmentStatusHistory(id),
    ]);
    if (eqRes.data) setEquipment(eqRes.data as unknown as EquipmentDetail);
    if (compRes.data) setComponents(compRes.data as unknown as EquipmentComponent[]);
    if (histRes.data) setHistory(histRes.data as unknown as StatusHistoryRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  // Refresh tabs data on demand (e.g. after component CRUD)
  useEffect(() => {
    load();
  }, [activeTab]);

  async function addNewComponent() {
    const name = window.prompt("Component name");
    if (!name) return;
    const { error } = await addEquipmentComponent(id, { component_name: name });
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
              {equipment.equipment_description && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <p className="text-sm text-gray-600">
                    {equipment.equipment_description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "components" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Components</h3>
              <Button size="sm" onClick={() => addNewComponent()}>
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
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">Next PM Due</label>
                  <p className="mt-1 text-sm text-gray-900">{equipment.next_pm_due ? formatDate(equipment.next_pm_due) : "Not scheduled"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                        <ArrowRight className="h-4 w-4 text-gray-400" />
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

        {/* Placeholder tabs render a friendly empty state */}
        {["work_orders", "breakdowns", "inspections", "calibration", "spares", "documents", "cost"].includes(activeTab) && (
          <EmptyState
            title={`No ${activeTab.replace(/_/g, " ")}`}
            description="This section is ready. Data will appear here once records exist."
          />
        )}
      </div>
    </ERPLayout>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN");
}
