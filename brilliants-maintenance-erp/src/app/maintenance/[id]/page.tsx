"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { useAuth } from "@/lib/auth/context";
import { performPm } from "@/services/kiosk";
import {
  ArrowLeft,
  Pause,
  Play,
  CalendarClock,
  Clock3,
  CheckCircle2,
  Pencil,
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

interface RunLogRow {
  id: string;
  completed_at: string;
  notes: string | null;
  duration_minutes: number | null;
  profiles: { name: string }[] | null;
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();
  const { user, organization, plant } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [runLogs, setRunLogs] = useState<RunLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

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
    const { data: runs } = await supabase
      .from("maintenance_run_logs")
      .select(
        "id, completed_at, notes, duration_minutes, profiles:completed_by(name)"
      )
      .eq("maintenance_schedule_id", id)
      .order("completed_at", { ascending: false })
      .limit(20);
    if (runs) setRunLogs(runs as unknown as RunLogRow[]);
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

  async function completePm() {
    if (!schedule) return;
    const notes = window.prompt("Completion notes (optional)", "") ?? null;
    const minutesInput = window.prompt("Time taken (minutes, optional)", "");
    const durationMinutes = minutesInput
      ? Math.max(0, Number(minutesInput) || 0)
      : undefined;
    setIsCompleting(true);
    const { error } = await performPm(
      schedule.id,
      notes?.trim() || null,
      {
        organizationId: organization?.id ?? null,
        plantId: plant?.id ?? null,
      },
      { id: user?.id, name: undefined },
      durationMinutes
    );
    setIsCompleting(false);
    if (error) {
      window.alert(error);
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
        description={`${schedule.equipment?.equipment_code ?? "No equipment"}${
          schedule.equipment?.equipment_name
            ? ` · ${schedule.equipment.equipment_name}`
            : ""
        } · ${schedule.task_type ?? "task"}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/maintenance">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/maintenance/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={toggleActive}
              disabled={isSaving}
            >
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
            <Button onClick={completePm} disabled={isCompleting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isCompleting ? "Completing..." : "Complete PM"}
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
              {runLogs.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Completed Runs
                  </p>
                  <ul className="space-y-3">
                    {runLogs.map((run) => (
                      <li
                        key={run.id}
                        className="rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <p className="text-xs font-medium text-gray-900">
                          {new Date(run.completed_at).toLocaleString("en-IN")}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {run.profiles?.[0]?.name ?? "Unknown"} ·{" "}
                          {run.duration_minutes != null
                            ? `${run.duration_minutes} min`
                            : "duration n/a"}
                        </p>
                        {run.notes && (
                          <p className="mt-1 text-xs text-gray-600">
                            {run.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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