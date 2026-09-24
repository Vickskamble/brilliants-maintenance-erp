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
import { FormError } from "@/components/ui/form-error";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save } from "lucide-react";

export default function NewInspectionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [plants, setPlants] = useState<{ value: string; label: string }[]>([]);
  const [equipment, setEquipment] = useState<{ value: string; label: string }[]>(
    []
  );
  const [inspectionNo, setInspectionNo] = useState("");
  const [plantId, setPlantId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    if (plantRes.data)
      setPlants(
        plantRes.data.map((p) => ({ value: p.id, label: p.name }))
      );
    if (eqRes.data)
      setEquipment(
        eqRes.data.map((eq) => ({
          value: eq.id,
          label: `${eq.equipment_code} - ${eq.equipment_name}`,
        }))
      );
  }

  async function generateInspectionNo() {
    if (inspectionNo) return inspectionNo;
    const result = await supabase
      .from("inspections")
      .select("*", { count: "exact", head: true });
    const count = result.count ?? 0;
    return `INSP-${String(count + 1).padStart(4, "0")}`;
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!plantId) next.plantId = "Plant is required";
    if (!equipmentId) next.equipmentId = "Equipment is required";
    if (!scheduledDate) next.scheduledDate = "Scheduled date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    const inspection_no = await generateInspectionNo();
    const payload = {
      inspection_no,
      plant_id: plantId,
      equipment_id: equipmentId,
      scheduled_date: scheduledDate || null,
      status: "scheduled",
      remarks: remarks || null,
    };
    const { data, error } = await supabase
      .from("inspections")
      .insert(payload)
      .select()
      .single();
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/inspections/${data.id}`);
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Schedule Inspection"
        description="Create a new equipment inspection record."
        backHref="/inspections"
        action={
          <Link href="/inspections">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inspections
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Inspection Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="inspection_no">Inspection No</Label>
                <Input
                  id="inspection_no"
                  value={inspectionNo}
                  onChange={(e) => setInspectionNo(e.target.value)}
                  placeholder="Auto-generated if blank"
                />
              </div>
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                <FormError message={errors.scheduledDate} />
              </div>
              <div>
                <Label htmlFor="plant_id">Plant</Label>
                <Select
                  id="plant_id"
                  value={plantId}
                  onChange={(e) => setPlantId(e.target.value)}
                >
                  <option value="">Select plant...</option>
                  {plants.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                <FormError message={errors.plantId} />
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
              <div className="md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/inspections")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Schedule Inspection"}
          </Button>
        </div>
      </form>
    </ERPLayout>
  );
}