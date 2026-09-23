"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { workOrderSchema, WorkOrderFormValues } from "@/lib/validation/work-orders";
import { WORK_ORDER_TYPES, WORK_ORDER_STATUSES, PRIORITY_LEVELS } from "@/lib/constants";
import { Plant } from "@/types/database";
import { Save, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

const emptyValues: WorkOrderFormValues = {
  work_order_no: "",
  plant_id: "",
  work_request_id: null,
  equipment_id: null,
  maintenance_plan_id: null,
  type: "preventive",
  priority: "medium",
  status: "draft",
  title: "",
  description: null,
  planned_start: null,
  planned_end: null,
  actual_start: null,
  actual_end: null,
  closure_remarks: null,
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [values, setValues] = useState<WorkOrderFormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);

  const [plants, setPlants] = useState<
    { id: string; name: string }[]
  >([]);
  const [allEquipment, setAllEquipment] = useState<
    { id: string; equipment_code: string; equipment_name: string }[]
  >([]);

  useEffect(() => {
    loadRefs();
  }, []);

  async function loadRefs() {
    const [p, e] = await Promise.all([
      supabase.from("plants").select("id, name").order("name"),
      supabase
        .from("equipment")
        .select("id, equipment_code, equipment_name")
        .order("equipment_code"),
    ]);
    if (p.data) setPlants(p.data);
    if (e.data) setAllEquipment(e.data);
    setIsLoadingRefs(false);
  }

  function update(field: keyof WorkOrderFormValues, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value as never }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = workOrderSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("work_orders")
      .insert(parsed.data)
      .select()
      .single();

    setIsSaving(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    router.push(`/work-orders/${data.id}`);
  }

  return (
    <ERPLayout>
      <PageHeader
        title="New Work Order"
        description="Create a new maintenance work order."
        action={
          <Link href="/work-orders">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Work Orders
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-12">
            <SectionTitle icon={FileText} title="Work Order Details" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="work_order_no">Work Order No</Label>
                <Input
                  id="work_order_no"
                  placeholder="e.g. WO-2024-0001"
                  value={values.work_order_no ?? ""}
                  onChange={(e) => update("work_order_no", e.target.value)}
                />
                <FormError message={errors.work_order_no} />
              </div>
              <div>
                <Label htmlFor="plant_id">Plant</Label>
                <Select
                  id="plant_id"
                  value={values.plant_id ?? ""}
                  onChange={(e) => update("plant_id", e.target.value)}
                >
                  <option value="">Select plant</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.plant_id} />
              </div>
              <div>
                <Label htmlFor="equipment_id">Equipment</Label>
                <Select
                  id="equipment_id"
                  value={values.equipment_id ?? ""}
                  onChange={(e) => update("equipment_id", e.target.value || null)}
                >
                  <option value="">None</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.equipment_code} - {eq.equipment_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={values.type}
                  onChange={(e) => update("type", e.target.value)}
                >
                  {WORK_ORDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.type} />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={values.priority}
                  onChange={(e) => update("priority", e.target.value)}
                >
                  {PRIORITY_LEVELS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.priority} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={values.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {WORK_ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.status} />
              </div>
            </div>

            <SectionTitle icon={FileText} title="Schedule" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="planned_start">Planned Start</Label>
                <Input
                  id="planned_start"
                  type="datetime-local"
                  value={values.planned_start ?? ""}
                  onChange={(e) => update("planned_start", e.target.value || null)}
                />
              </div>
              <div>
                <Label htmlFor="planned_end">Planned End</Label>
                <Input
                  id="planned_end"
                  type="datetime-local"
                  value={values.planned_end ?? ""}
                  onChange={(e) => update("planned_end", e.target.value || null)}
                />
                <FormError message={errors.planned_end} />
              </div>
              <div>
                <Label htmlFor="actual_start">Actual Start</Label>
                <Input
                  id="actual_start"
                  type="datetime-local"
                  value={values.actual_start ?? ""}
                  onChange={(e) => update("actual_start", e.target.value || null)}
                />
              </div>
              <div>
                <Label htmlFor="actual_end">Actual End</Label>
                <Input
                  id="actual_end"
                  type="datetime-local"
                  value={values.actual_end ?? ""}
                  onChange={(e) => update("actual_end", e.target.value || null)}
                />
              </div>
            </div>

            <SectionTitle icon={FileText} title="Description" />
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Replace drive belt on pump P-101"
                  value={values.title}
                  onChange={(e) => update("title", e.target.value)}
                />
                <FormError message={errors.title} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Detailed work description..."
                  value={values.description ?? ""}
                  onChange={(e) => update("description", e.target.value || null)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
              <Link href="/work-orders">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Create Work Order"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ERPLayout>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );
}
