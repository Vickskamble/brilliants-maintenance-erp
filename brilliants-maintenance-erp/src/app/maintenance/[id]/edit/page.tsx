"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useQueryScope } from "@/lib/auth/query-scope";
import { FREQUENCY_TYPES } from "@/lib/constants";
import { FormError } from "@/components/ui/form-error";
import { ArrowLeft, Save } from "lucide-react";

const TASK_TYPES = [
  { value: "inspection", label: "Inspection" },
  { value: "cleaning", label: "Cleaning" },
  { value: "lubrication", label: "Lubrication" },
  { value: "calibration", label: "Calibration" },
  { value: "testing", label: "Testing" },
  { value: "replacement", label: "Parts Replacement" },
  { value: "repair", label: "Repair" },
  { value: "overhaul", label: "Overhaul" },
];

interface SelectOption {
  value: string;
  label: string;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function MaintenanceEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();
  const scope = useQueryScope();

  const [equipment, setEquipment] = useState<SelectOption[]>([]);
  const [scheduleNo, setScheduleNo] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [taskType, setTaskType] = useState("");
  const [frequency, setFrequency] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [lastRunAt, setLastRunAt] = useState("");
  const [nextRunAt, setNextRunAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const [scheduleRes, equipmentRes] = await Promise.all([
      supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("equipment")
        .select("id, equipment_code, equipment_name")
        .order("equipment_code"),
    ]);

    if (equipmentRes.data) {
      setEquipment(
        (equipmentRes.data as unknown as { id: string; equipment_code: string; equipment_name: string }[]).map(
          (eq) => ({
            value: eq.id,
            label: `${eq.equipment_code} - ${eq.equipment_name}`,
          })
        )
      );
    }

    const schedule = scheduleRes.data as unknown as {
      schedule_no?: string | null;
      equipment_id?: string | null;
      task_type?: string | null;
      frequency?: string | null;
      interval_days?: number | null;
      last_run_at?: string | null;
      next_run_at?: string | null;
      assigned_to?: string | null;
      is_active?: boolean | null;
      notes?: string | null;
    } | null;

    if (schedule) {
      setScheduleNo(schedule.schedule_no ?? "");
      setEquipmentId(schedule.equipment_id ?? "");
      setTaskType(schedule.task_type ?? "");
      setFrequency(schedule.frequency ?? "");
      setIntervalDays(schedule.interval_days != null ? String(schedule.interval_days) : "");
      setLastRunAt(toLocalInput(schedule.last_run_at));
      setNextRunAt(toLocalInput(schedule.next_run_at));
      setAssignedTo(schedule.assigned_to ?? "");
      setNotes(schedule.notes ?? "");
      setIsActive(schedule.is_active ?? true);
    }
    setIsLoading(false);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!equipmentId) next.equipmentId = "Equipment is required";
    if (!taskType) next.taskType = "Task type is required";
    if (!frequency) next.frequency = "Frequency is required";
    if (!nextRunAt) next.nextRunAt = "Next run date is required";
    if (intervalDays && Number(intervalDays) <= 0)
      next.intervalDays = "Interval must be a positive number";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      equipment_id: equipmentId || null,
      organization_id: scope.organizationId ?? null,
      plant_id: scope.plantId ?? null,
      task_type: taskType || null,
      frequency: frequency || null,
      interval_days: intervalDays ? Number(intervalDays) : null,
      last_run_at: lastRunAt || null,
      next_run_at: nextRunAt || null,
      assigned_to: assignedTo || null,
      is_active: isActive,
      notes: notes || null,
    };
    const { error } = await supabase
      .from("maintenance_schedules")
      .update(payload)
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/maintenance/${id}`);
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPlaceholder />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Edit Maintenance Schedule"
        description="Correct the maintenance schedule entry."
        backHref={`/maintenance/${id}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/maintenance/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Schedule
              </Button>
            </Link>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Schedule</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="schedule_no">Schedule No</Label>
                <Input
                  id="schedule_no"
                  value={scheduleNo}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="equipment_id">Equipment</Label>
                <Select
                  id="equipment_id"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                >
                  <option value="">Select equipment...</option>
                  {equipment.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.equipmentId} />
              </div>
              <div>
                <Label htmlFor="task_type">Task Type</Label>
                <Select
                  id="task_type"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="">Select task type...</option>
                  {TASK_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.taskType} />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="">Select frequency...</option>
                  {FREQUENCY_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.frequency} />
              </div>
              <div>
                <Label htmlFor="interval_days">Interval (days)</Label>
                <Input
                  id="interval_days"
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  placeholder="e.g. 30"
                />
                <FormError message={errors.intervalDays} />
              </div>
              <div>
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Technician name"
                />
              </div>
              <div>
                <Label htmlFor="last_run_at">Last Run</Label>
                <Input
                  id="last_run_at"
                  type="datetime-local"
                  value={lastRunAt}
                  onChange={(e) => setLastRunAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="next_run_at">Next Run</Label>
                <Input
                  id="next_run_at"
                  type="datetime-local"
                  value={nextRunAt}
                  onChange={(e) => setNextRunAt(e.target.value)}
                />
                <FormError message={errors.nextRunAt} />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Active schedule
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/maintenance/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ERPLayout>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-gray-500">
      Loading schedule...
    </div>
  );
}