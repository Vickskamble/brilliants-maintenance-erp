"use client";

import { use, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { WORK_ORDER_TYPES, PRIORITY_LEVELS, WORK_ORDER_STATUSES } from "@/lib/constants";
import { WorkOrder } from "@/types/database";
import { ChevronLeft, Save } from "lucide-react";

export default function EditWorkOrderPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const supabase = createClient();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [equipment, setEquipment] = useState<{ id: string; equipment_code: string; equipment_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const [wo, pl, eq] = await Promise.all([
      supabase.from("work_orders").select("*").eq("id", id).single(),
      supabase.from("plants").select("id, name").order("name"),
      supabase.from("equipment").select("id, equipment_code, equipment_name").order("equipment_code"),
    ]);
    if (wo.data) setWorkOrder(wo.data as WorkOrder);
    if (pl.data) setPlants(pl.data);
    if (eq.data) setEquipment(eq.data);
    setIsLoading(false);
  }

  if (isLoading) {
    return <ERPLayout><LoadingPage /></ERPLayout>;
  }

  if (!workOrder) {
    return <ERPLayout><EmptyState title="Work order not found" description="This work order does not exist." /></ERPLayout>;
  }

  function update<K extends keyof WorkOrder>(key: K, value: string | number | null) {
    setWorkOrder((prev) => (prev ? { ...prev, [key]: value as WorkOrder[K] } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workOrder) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        title: workOrder.title,
        description: workOrder.description,
        type: workOrder.type,
        priority: workOrder.priority,
        plant_id: workOrder.plant_id,
        equipment_id: workOrder.equipment_id,
        planned_start: workOrder.planned_start,
        planned_end: workOrder.planned_end,
        actual_start: workOrder.actual_start,
        actual_end: workOrder.actual_end,
      })
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/work-orders/${id}`);
    router.refresh();
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Edit Work Order"
        description={`${workOrder.work_order_no} · ${workOrder.title}`}
        action={
          <Link href={`/work-orders/${id}`}>
            <Button variant="outline"><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={workOrder.title} onChange={(e) => update("title", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select id="type" value={workOrder.type} onChange={(e) => update("type", e.target.value)}>
                  {WORK_ORDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" value={workOrder.priority} onChange={(e) => update("priority", e.target.value)}>
                  {PRIORITY_LEVELS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="plant_id">Plant</Label>
                <Select id="plant_id" value={workOrder.plant_id ?? ""} onChange={(e) => update("plant_id", e.target.value || null)}>
                  <option value="">None</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="equipment_id">Equipment</Label>
                <Select id="equipment_id" value={workOrder.equipment_id ?? ""} onChange={(e) => update("equipment_id", e.target.value || null)}>
                  <option value="">None</option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.equipment_code} - {eq.equipment_name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="planned_start">Planned Start</Label>
                <Input id="planned_start" type="datetime-local" value={workOrder.planned_start ?? ""} onChange={(e) => update("planned_start", e.target.value || null as never)} />
              </div>
              <div>
                <Label htmlFor="planned_end">Planned End</Label>
                <Input id="planned_end" type="datetime-local" value={workOrder.planned_end ?? ""} onChange={(e) => update("planned_end", e.target.value || null as never)} />
              </div>
              <div>
                <Label htmlFor="actual_start">Actual Start</Label>
                <Input id="actual_start" type="datetime-local" value={workOrder.actual_start ?? ""} onChange={(e) => update("actual_start", e.target.value || null as never)} />
              </div>
              <div>
                <Label htmlFor="actual_end">Actual End</Label>
                <Input id="actual_end" type="datetime-local" value={workOrder.actual_end ?? ""} onChange={(e) => update("actual_end", e.target.value || null as never)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={workOrder.description ?? ""} onChange={(e) => update("description", e.target.value || null as never)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
              <Link href={`/work-orders/${id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />{isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ERPLayout>
  );
}
