"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function MaintenanceNewPage() {
  const router = useRouter();
  const supabase = createClient();

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

  useEffect(() => {
    void loadLists();
  }, []);

  async function loadLists() {
    const { data } = await supabase
      .from("equipment")
      .select("id, equipment_code, equipment_name")
      .order("equipment_code");
    if (data) {
      setEquipment(
        data.map((eq) => ({
          value: eq.id,
          label: `${eq.equipment_code} - ${eq.equipment_name}`,
        }))
      );
    }
  }

  async function generateScheduleNo() {
    if (scheduleNo) return scheduleNo;
    const result = await supabase
      .from("maintenance_schedules")
      .select("*", { count: "exact", head: true });
    const count = result.count ?? 0;
    return `MAINT-${String(count + 1).padStart(4, "0")}`;
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
    const schedule_no = await generateScheduleNo();
    const payload = {
      schedule_no,
      equipment_id: equipmentId || null,
      task_type: taskType || null,
      frequency: frequency || null,
      interval_days: intervalDays ? Number(intervalDays) : null,
      last_run_at: lastRunAt || null,
      next_run_at: nextRunAt || null,
      assigned_to: assignedTo || null,
      is_active: isActive,
      notes: notes || null,
    };
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert(payload)
      .select()
      .single();
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/maintenance/${data.id}`);
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Add Maintenance Schedule"
        description="Define a recurring preventive maintenance task."
        action={
          <div className="flex items-center gap-2">
            <Link href="/maintenance">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Maintenance
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
                  onChange={(e) => setScheduleNo(e.target.value)}
                  placeholder="Auto-generated if blank"
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
            onClick={() => router.push("/maintenance")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Create Schedule"}
          </Button>
        </div>
      </form>
    </ERPLayout>
  );
}
