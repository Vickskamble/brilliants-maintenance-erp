"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { equipmentSchema, EquipmentFormValues } from "@/lib/validation/equipment";
import { Save, ArrowLeft, Cog } from "lucide-react";
import Link from "next/link";

const emptyValues: EquipmentFormValues = {
  equipment_code: "",
  equipment_name: "",
  plant_id: "",
  category_id: null,
  parent_equipment_id: null,
  department_id: null,
  section_id: null,
  area_id: null,
  location_id: null,
  cost_center_id: null,
  make: null,
  model: null,
  serial_number: null,
  manufacturer: null,
  capacity_unit: null,
  supplier_vendor_id: null,
  installation_date: null,
  commissioning_date: null,
  purchase_date: null,
  purchase_cost: null,
  warranty_start: null,
  warranty_end: null,
  amc_start: null,
  amc_end: null,
  criticality_id: null,
  status: "active",
  description: null,
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [values, setValues] = useState<EquipmentFormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [criticalities, setCriticalities] = useState<
    { id: string; name: string; level: string | null }[]
  >([]);

  useEffect(() => {
    loadRefs();
  }, []);

  async function loadRefs() {
    const [p, c, cr] = await Promise.all([
      supabase.from("plants").select("id, name").order("name"),
      supabase.from("asset_categories").select("id, name").order("name"),
      supabase
        .from("criticality_profiles")
        .select("id, name, level")
        .order("name"),
    ]);
    if (p.data) setPlants(p.data);
    if (c.data) setCategories(c.data);
    if (cr.data) setCriticalities(cr.data);
    setIsLoadingRefs(false);
  }

  function update(field: keyof EquipmentFormValues, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value as never }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = equipmentSchema.safeParse(values);
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
    const payload = {
      ...parsed.data,
      purchase_cost:
        parsed.data.purchase_cost == null
          ? null
          : Number(parsed.data.purchase_cost),
    };

    const { data, error } = await supabase
      .from("equipment")
      .insert(payload)
      .select()
      .single();

    setIsSaving(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    router.push(`/equipment/${data.id}`);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Add Equipment"
          description="Register a new equipment asset."
          action={
            <Link href="/equipment">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.form && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errors.form}
            </div>
          )}

          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Cog className="h-5 w-5 text-blue-600" />
                Identification
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Equipment Code *"
                  id="equipment_code"
                  value={values.equipment_code}
                  onChange={(e) => update("equipment_code", e.target.value)}
                  error={errors.equipment_code}
                  placeholder="EQ-0001"
                />
                <Input
                  label="Equipment Name *"
                  id="equipment_name"
                  value={values.equipment_name}
                  onChange={(e) => update("equipment_name", e.target.value)}
                  error={errors.equipment_name}
                  placeholder="Centrifugal pump"
                />
                <Select
                  id="plant_id"
                  label="Plant *"
                  value={values.plant_id}
                  onChange={(e) => update("plant_id", e.target.value)}
                  error={errors.plant_id}
                  placeholder="Select plant"
                  options={plants.map((pl) => ({
                    value: pl.id,
                    label: pl.name,
                  }))}
                />
                <Select
                  id="category_id"
                  label="Asset Category"
                  value={values.category_id ?? ""}
                  onChange={(e) =>
                    update("category_id", e.target.value || null)
                  }
                  error={errors.category_id}
                  placeholder="Select category"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
                <Select
                  id="criticality_id"
                  label="Criticality Profile"
                  value={values.criticality_id ?? ""}
                  onChange={(e) =>
                    update("criticality_id", e.target.value || null)
                  }
                  error={errors.criticality_id}
                  placeholder="Select criticality"
                  options={criticalities.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Cog className="h-5 w-5 text-blue-600" />
                Manufacturer &amp; Identifiers
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Manufacturer"
                  id="manufacturer"
                  value={values.manufacturer ?? ""}
                  onChange={(e) => update("manufacturer", e.target.value || null)}
                  placeholder="e.g. Siemens"
                />
                <Input
                  label="Make / Brand"
                  id="make"
                  value={values.make ?? ""}
                  onChange={(e) => update("make", e.target.value || null)}
                  placeholder="e.g. Siemens"
                />
                <Input
                  label="Model"
                  id="model"
                  value={values.model ?? ""}
                  onChange={(e) => update("model", e.target.value || null)}
                  placeholder="e.g. 1LA9"
                />
                <Input
                  label="Serial Number"
                  id="serial_number"
                  value={values.serial_number ?? ""}
                  onChange={(e) =>
                    update("serial_number", e.target.value || null)
                  }
                  placeholder="e.g. SN-2024-0001"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Cog className="h-5 w-5 text-blue-600" />
                Dates &amp; Cost
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  type="date"
                  label="Installation Date"
                  id="installation_date"
                  value={values.installation_date ?? ""}
                  onChange={(e) =>
                    update("installation_date", e.target.value || null)
                  }
                />
                <Input
                  type="date"
                  label="Commissioning Date"
                  id="commissioning_date"
                  value={values.commissioning_date ?? ""}
                  onChange={(e) =>
                    update("commissioning_date", e.target.value || null)
                  }
                />
                <Input
                  type="date"
                  label="Purchase Date"
                  id="purchase_date"
                  value={values.purchase_date ?? ""}
                  onChange={(e) =>
                    update("purchase_date", e.target.value || null)
                  }
                />
                <Input
                  type="number"
                  label="Purchase Cost"
                  id="purchase_cost"
                  value={
                    values.purchase_cost == null
                      ? ""
                      : String(values.purchase_cost)
                  }
                  onChange={(e) =>
                    update(
                      "purchase_cost",
                      e.target.value === ""
                        ? null
                        : Number(e.target.value)
                    )
                  }
                  error={errors.purchase_cost}
                  placeholder="0.00"
                />
                <Select
                  id="status"
                  label="Status"
                  value={values.status}
                  onChange={(e) => update("status", e.target.value)}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "standby", label: "Standby" },
                    { value: "under_maintenance", label: "Under Maintenance" },
                    { value: "breakdown", label: "Breakdown" },
                    { value: "decommissioned", label: "Decommissioned" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Link href="/equipment">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving || isLoadingRefs}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Equipment"}
            </Button>
          </div>
        </form>
      </div>
    </ERPLayout>
  );
}
