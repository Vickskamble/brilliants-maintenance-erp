"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import {
  getEquipment,
  updateEquipment,
} from "@/services/equipment";
import { equipmentSchema, EquipmentFormValues } from "@/lib/validation/equipment";
import { Save, ArrowLeft, Cog } from "lucide-react";
import Link from "next/link";

export default function EditEquipmentPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [values, setValues] = useState<EquipmentFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [criticalities, setCriticalities] = useState<
    { id: string; name: string; level: string | null }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const [eqRes, p, c, cr] = await Promise.all([
      getEquipment(id),
      supabase.from("plants").select("id, name").order("name"),
      supabase.from("asset_categories").select("id, name").order("name"),
      supabase.from("criticality_profiles").select("id, name, level").order("name"),
    ]);
    if (p.data) setPlants(p.data);
    if (c.data) setCategories(c.data);
    if (cr.data) setCriticalities(cr.data);

    if (eqRes.data) {
      const row = eqRes.data as Record<string, unknown>;
      const initial: EquipmentFormValues = {
        equipment_code: String(row.equipment_code ?? ""),
        equipment_name: String(row.equipment_name ?? ""),
        plant_id: String(row.plant_id ?? ""),
        category_id: (row.category_id as string) ?? null,
        parent_equipment_id: (row.parent_equipment_id as string) ?? null,
        department_id: (row.department_id as string) ?? null,
        section_id: (row.section_id as string) ?? null,
        area_id: (row.area_id as string) ?? null,
        location_id: (row.location_id as string) ?? null,
        cost_center_id: (row.cost_center_id as string) ?? null,
        make: (row.make as string) ?? null,
        model: (row.model as string) ?? null,
        serial_number: (row.serial_number as string) ?? null,
        manufacturer: (row.manufacturer as string) ?? null,
        capacity_unit: (row.capacity_unit as string) ?? null,
        supplier_vendor_id: (row.supplier_vendor_id as string) ?? null,
        installation_date: (row.installation_date as string) ?? null,
        commissioning_date: (row.commissioning_date as string) ?? null,
        purchase_date: (row.purchase_date as string) ?? null,
        purchase_cost: row.purchase_cost == null ? null : Number(row.purchase_cost),
        warranty_start: (row.warranty_start as string) ?? null,
        warranty_end: (row.warranty_end as string) ?? null,
        amc_start: (row.amc_start as string) ?? null,
        amc_end: (row.amc_end as string) ?? null,
        criticality_id: (row.criticality_id as string) ?? null,
        status: (row.status as EquipmentFormValues["status"]) ?? "active",
        description: (row.description as string) ?? null,
      };
      setValues(initial);
      loadDepartments(String(row.plant_id ?? ""));
    }
    setIsLoading(false);
  }

  async function loadDepartments(plant: string) {
    let query = supabase.from("departments").select("id, name").order("name");
    if (plant) query = query.eq("plant_id", plant);
    const { data } = await query;
    if (data) setDepartments(data);
  }

  function update(field: keyof EquipmentFormValues, value: unknown) {
    setValues((prev) => (prev ? { ...prev, [field]: value as never } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;

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

    const { data, error } = await updateEquipment(id, payload);

    setIsSaving(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    router.push(`/equipment/${id}`);
    router.refresh();
  }

  if (isLoading || !values) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Edit Equipment"
          description={values.equipment_code}
          action={
            <Link href={`/equipment/${id}`}>
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
                  onChange={(e) => {
                    update("plant_id", e.target.value);
                    loadDepartments(e.target.value);
                    update("department_id", null);
                  }}
                  error={errors.plant_id}
                  placeholder="Select plant"
                  options={plants.map((pl) => ({
                    value: pl.id,
                    label: pl.name,
                  }))}
                />
                <Select
                  id="department_id"
                  label="Department"
                  value={values.department_id ?? ""}
                  onChange={(e) => update("department_id", e.target.value || null)}
                  error={errors.department_id}
                  placeholder="Select department"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                />
                <Select
                  id="category_id"
                  label="Asset Category"
                  value={values.category_id ?? ""}
                  onChange={(e) => update("category_id", e.target.value || null)}
                  error={errors.category_id}
                  placeholder="Select category"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Select
                  id="criticality_id"
                  label="Criticality Profile"
                  value={values.criticality_id ?? ""}
                  onChange={(e) => update("criticality_id", e.target.value || null)}
                  error={errors.criticality_id}
                  placeholder="Select criticality"
                  options={criticalities.map((c) => ({ value: c.id, label: c.name }))}
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
                  onChange={(e) => update("serial_number", e.target.value || null)}
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
                  onChange={(e) => update("installation_date", e.target.value || null)}
                />
                <Input
                  type="date"
                  label="Commissioning Date"
                  id="commissioning_date"
                  value={values.commissioning_date ?? ""}
                  onChange={(e) => update("commissioning_date", e.target.value || null)}
                />
                <Input
                  type="date"
                  label="Purchase Date"
                  id="purchase_date"
                  value={values.purchase_date ?? ""}
                  onChange={(e) => update("purchase_date", e.target.value || null)}
                />
                <Input
                  type="number"
                  label="Purchase Cost"
                  id="purchase_cost"
                  value={values.purchase_cost == null ? "" : String(values.purchase_cost)}
                  onChange={(e) =>
                    update("purchase_cost", e.target.value === "" ? null : Number(e.target.value))
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
            <Link href={`/equipment/${id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </ERPLayout>
  );
}