"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MetadataRow } from "@/components/common/metadata-row";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Trash2, ClipboardCheck } from "lucide-react";

const STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-50 text-blue-700" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-yellow-50 text-yellow-700",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-50 text-green-700",
  },
  { value: "overdue", label: "Overdue", color: "bg-red-50 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-700" },
];

const RESULTS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "conditional", label: "Conditional" },
  { value: "observation", label: "Observation" },
];

interface InspectionDetail {
  id: string;
  inspection_no: string;
  plant_id: string;
  equipment_id: string;
  scheduled_date: string | null;
  performed_at: string | null;
  status: string;
  overall_result: string | null;
  remarks: string | null;
  plants?: { name: string } | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

export default function InspectionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from("inspections")
      .select(`*, plants(name), equipment(equipment_code, equipment_name)`)
      .eq("id", id)
      .single();
    if (data) setInspection(data as unknown as InspectionDetail);
    setIsLoading(false);
  }

  async function updateStatus(status: string) {
    setIsSaving(true);
    const payload: Record<string, string | null> = { status };
    if (status === "completed" && inspection && !inspection.performed_at) {
      payload.performed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("inspections").update(payload).eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  async function updateResult(overall_result: string) {
    setIsSaving(true);
    const { error } = await supabase
      .from("inspections")
      .update({ overall_result })
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  async function handleDelete() {
    if (!confirm("Delete this inspection? This cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("inspections").delete().eq("id", id);
    setIsDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/inspections");
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!inspection) {
    return (
      <ERPLayout>
        <EmptyState
          title="Inspection not found"
          description="The inspection record you are looking for does not exist."
          action={
            <Link href="/inspections">
              <Button variant="outline">Back to Inspections</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const statusMeta = STATUSES.find((s) => s.value === inspection.status);

  return (
    <ERPLayout>
      <PageHeader
        title={inspection.inspection_no}
        backHref="/inspections"
        description={`Inspection · ${inspection.plants?.name ?? "No plant"}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/inspections">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusBadge statusMeta={statusMeta} />
        {inspection.overall_result && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize">
            {inspection.overall_result.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Inspection Details
            </h3>
            <div className="space-y-4">
              <MetadataRow
                label="Equipment"
                value={
                  inspection.equipment
                    ? `${inspection.equipment.equipment_code} - ${inspection.equipment.equipment_name}`
                    : "—"
                }
              />
              <MetadataRow label="Plant" value={inspection.plants?.name ?? "—"} />
              <MetadataRow
                label="Scheduled"
                value={
                  inspection.scheduled_date
                    ? new Date(inspection.scheduled_date).toLocaleString("en-IN")
                    : "—"
                }
              />
              <MetadataRow
                label="Performed At"
                value={
                  inspection.performed_at
                    ? new Date(inspection.performed_at).toLocaleString("en-IN")
                    : "—"
                }
              />
              <MetadataRow label="Remarks" value={inspection.remarks} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Result
            </h3>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Overall Result
            </label>
            <Select
              id="overall_result"
              value={inspection.overall_result ?? ""}
              onChange={(e) => updateResult(e.target.value)}
              disabled={isSaving}
              placeholder="Not recorded"
              options={RESULTS}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Status
            </h3>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Inspection Status
            </label>
            <Select
              id="status"
              value={inspection.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={isSaving}
              options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            {inspection.status !== "completed" &&
              inspection.status !== "cancelled" && (
                <Button
                  variant="primary"
                  className="mt-4 w-full"
                  disabled={isSaving}
                  onClick={() => updateStatus("completed")}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Mark Completed
                </Button>
              )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}