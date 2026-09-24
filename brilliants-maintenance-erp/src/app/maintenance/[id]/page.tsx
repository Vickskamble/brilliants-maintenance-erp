"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetadataRow } from "@/components/common/metadata-row";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  CalendarClock,
} from "lucide-react";

interface ScheduleDetail {
  id: string;
  schedule_no: string | null;
  equipment_id: string | null;
  task_type: string | null;
  frequency: string | null;
  interval_days: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  assigned_to: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from("maintenance_schedules")
      .select(`*, equipment(equipment_code, equipment_name)`)
      .eq("id", id)
      .single();
    if (data) setSchedule(data as unknown as ScheduleDetail);
    setIsLoading(false);
  }

  async function toggleActive() {
    if (!schedule) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("maintenance_schedules")
      .update({ is_active: !schedule.is_active })
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  async function handleDelete() {
    if (!confirm("Delete this maintenance schedule? This cannot be undone."))
      return;
    setIsDeleting(true);
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);
    setIsDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/maintenance");
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!schedule) {
    return (
      <ERPLayout>
        <EmptyState
          title="Schedule not found"
          description="The maintenance schedule you are looking for does not exist."
          action={
            <Link href="/maintenance">
              <Button variant="outline">Back to Maintenance</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const isOverdue =
    schedule.next_run_at && new Date(schedule.next_run_at).getTime() < Date.now();

  return (
    <ERPLayout>
      <PageHeader
        title={schedule.schedule_no ?? "Maintenance Schedule"}
        backHref="/maintenance"
        description={`${schedule.equipment?.equipment_code ?? "No equipment"} · ${
          schedule.task_type ?? "task"
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/maintenance">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="outline" onClick={toggleActive} disabled={isSaving}>
              {schedule.is_active ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {isSaving
                ? "Saving..."
                : schedule.is_active
                  ? "Pause"
                  : "Resume"}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {schedule.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        )}
        {isOverdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            <CalendarClock className="h-3.5 w-3.5" />
            Overdue
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Schedule Details
            </h3>
            <div className="space-y-4">
              <MetadataRow
                label="Equipment"
                value={
                  schedule.equipment
                    ? `${schedule.equipment.equipment_code} - ${schedule.equipment.equipment_name}`
                    : "—"
                }
              />
              <MetadataRow
                label="Task Type"
                value={schedule.task_type?.replace(/_/g, " ") ?? "—"}
              />
              <MetadataRow
                label="Frequency"
                value={schedule.frequency?.replace(/_/g, " ") ?? "—"}
              />
              <MetadataRow
                label="Interval (days)"
                value={schedule.interval_days?.toString() ?? "—"}
              />
              <MetadataRow label="Assigned To" value={schedule.assigned_to} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Run History
            </h3>
            <div className="space-y-4">
              <MetadataRow
                label="Last Run"
                value={
                  schedule.last_run_at
                    ? new Date(schedule.last_run_at).toLocaleString("en-IN")
                    : "—"
                }
              />
              <MetadataRow
                label="Next Run"
                value={
                  schedule.next_run_at
                    ? new Date(schedule.next_run_at).toLocaleString("en-IN")
                    : "—"
                }
              />
              <MetadataRow
                label="Created At"
                value={
                  schedule.created_at
                    ? new Date(schedule.created_at).toLocaleString("en-IN")
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Notes</h3>
            <p className="text-sm text-gray-600">
              {schedule.notes || "No notes provided."}
            </p>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}