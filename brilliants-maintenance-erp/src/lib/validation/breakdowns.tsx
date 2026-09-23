import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Breakdown } from "@/types/database";
import { BREAKDOWN_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Save } from "lucide-react";

export const breakdownSchema = z.object({
  report_no: z.string().min(1, "Report no is required"),
  title: z.string().min(1, "Title is required"),
  plant_id: z.string().min(1, "Plant is required"),
  equipment_id: z.string().min(1, "Equipment is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string(),
  reported_at: z.string().min(1, "Reported at is required"),
  downtime_minutes: z.number().nullish(),
  root_cause: z.string(),
  action_taken: z.string(),
  resolution_notes: z.string(),
});

export type BreakdownFormValues = z.infer<typeof breakdownSchema>;

interface BreakdownFormProps {
  initialData?: Breakdown;
  defaultPlantId?: string;
  defaultEquipmentId?: string;
  onCancel: () => void;
  onSaved: (id: string) => void;
}

export default function BreakdownForm({
  initialData,
  defaultPlantId,
  defaultEquipmentId,
  onCancel,
  onSaved,
}: BreakdownFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [equipment, setEquipment] = useState<
    { id: string; equipment_code: string; equipment_name: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BreakdownFormValues>({
    resolver: zodResolver(breakdownSchema),
    defaultValues: {
      report_no: initialData?.breakdown_no ?? "",
      title: initialData?.problem_description ?? "",
      plant_id: initialData?.plant_id ?? defaultPlantId ?? "",
      equipment_id: initialData?.equipment_id ?? defaultEquipmentId ?? "",
      category: "breakdown",
      description: initialData?.problem_description ?? "",
      reported_at: initialData?.reported_at ?? "",
      downtime_minutes: initialData?.downtime_minutes ?? null,
      root_cause: initialData?.root_cause ?? "",
      action_taken: initialData?.action_taken ?? "",
      resolution_notes: initialData?.production_impact ?? "",
    },
  });

  useEffect(() => {
    void loadLists();
  }, []);

  async function loadLists() {
    const [plantRes, eqRes] = await Promise.all([
      supabase.from("plants").select("id, name").order("name"),
      supabase
        .from("equipment")
        .select("id, equipment_code, equipment_name")
        .order("equipment_code"),
    ]);
    if (plantRes.data) setPlants(plantRes.data);
    if (eqRes.data) setEquipment(eqRes.data);
  }

  async function handleSubmit(values: BreakdownFormValues) {
    setIsSaving(true);
    const payload = {
      breakdown_no: values.report_no,
      problem_description: values.title,
      plant_id: values.plant_id,
      equipment_id: values.equipment_id,
      description: values.description || null,
      reported_at: values.reported_at,
      downtime_minutes: values.downtime_minutes ?? null,
      root_cause: values.root_cause || null,
      action_taken: values.action_taken || null,
      resolution_notes: values.resolution_notes || null,
    };
    let result;
    if (initialData) {
      result = await supabase
        .from("breakdowns")
        .update(payload)
        .eq("id", initialData.id)
        .select()
        .single();
    } else {
      result = await supabase.from("breakdowns").insert(payload).select().single();
    }
    setIsSaving(false);
    if (result.error) {
      window.alert(result.error.message);
      return;
    }
    onSaved(result.data.id);
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Breakdown Report</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="report_no">Report No</Label>
            <Input id="report_no" disabled={!!initialData} {...form.register("report_no")} />
            <FormError error={form.formState.errors.report_no} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" {...form.register("category")}>
              {BREAKDOWN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <FormError error={form.formState.errors.category} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
            <FormError error={form.formState.errors.title} />
          </div>
          <div>
            <Label htmlFor="plant_id">Plant</Label>
            <Select id="plant_id" {...form.register("plant_id")}>
              <option value="">Select plant...</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <FormError error={form.formState.errors.plant_id} />
          </div>
          <div>
            <Label htmlFor="equipment_id">Equipment</Label>
            <Select
              id="equipment_id"
              {...form.register("equipment_id")}
              disabled={!form.watch("plant_id")}
            >
              <option value="">Select equipment...</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipment_code} - {eq.equipment_name}
                </option>
              ))}
            </Select>
            <FormError error={form.formState.errors.equipment_id} />
          </div>
          <div>
            <Label htmlFor="reported_at">Reported At</Label>
            <Input id="reported_at" type="datetime-local" {...form.register("reported_at")} />
            <FormError error={form.formState.errors.reported_at} />
          </div>
          <div>
            <Label htmlFor="downtime_minutes">Downtime (minutes)</Label>
            <Input
              id="downtime_minutes"
              type="number"
              min={0}
              {...form.register("downtime_minutes", { valueAsNumber: true })}
            />
            <FormError error={form.formState.errors.downtime_minutes} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
            <FormError error={form.formState.errors.description} />
          </div>
        </div>
      </div>

      {initialData && initialData.status !== "reported" && (
        <>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Diagnosis & Repair</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="root_cause">Root Cause</Label>
                <Textarea id="root_cause" rows={3} {...form.register("root_cause")} />
                <FormError error={form.formState.errors.root_cause} />
              </div>
              <div>
                <Label htmlFor="action_taken">Action Taken</Label>
                <Textarea id="action_taken" rows={3} {...form.register("action_taken")} />
                <FormError error={form.formState.errors.action_taken} />
              </div>
              <div>
                <Label htmlFor="resolution_notes">Resolution Notes</Label>
                <Textarea id="resolution_notes" rows={3} {...form.register("resolution_notes")} />
                <FormError error={form.formState.errors.resolution_notes} />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : initialData ? "Save Changes" : "Report Breakdown"}
        </Button>
      </div>
    </form>
  );
}