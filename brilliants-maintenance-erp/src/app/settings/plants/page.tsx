"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Plant } from "@/types/database";
import { Plus, Search, Building2, Layers, X } from "lucide-react";

interface DepartmentRow {
  id: string;
  code: string | null;
  name: string;
  department_type: string | null;
  status: string;
}

const DEPARTMENT_TYPES = [
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "instrumentation", label: "Instrumentation" },
  { value: "production", label: "Production" },
  { value: "utilities", label: "Utilities" },
  { value: "civil", label: "Civil" },
];

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    timezone: "UTC",
    status: "active",
  });
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptPlant, setDeptPlant] = useState<Plant | null>(null);
  const [deptList, setDeptList] = useState<DepartmentRow[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", department_type: "mechanical" });
  const [deptMsg, setDeptMsg] = useState("");
  const supabase = createClient();
  const { organization } = useAuth();

  useEffect(() => {
    loadPlants();
  }, []);

  async function loadPlants() {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .order("name");

    if (data) {
      setPlants(data);
    }
    setIsLoading(false);
  }

  function openDialog() {
    setForm({ name: "", code: "", address: "", timezone: "UTC", status: "active" });
    setFormError("");
    setIsDialogOpen(true);
  }

  async function handleAddPlant(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("plants").insert({
      organization_id: organization?.id ?? null,
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim() || null,
      timezone: form.timezone || null,
      status: form.status,
    });
    setIsSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setIsDialogOpen(false);
    await loadPlants();
  }

  function openDepartments(plant: Plant) {
    setDeptPlant(plant);
    setDeptList([]);
    setDeptForm({ name: "", code: "", department_type: "mechanical" });
    setDeptMsg("");
    setDeptDialogOpen(true);
    setDeptLoading(true);
    void loadDepartments(plant.id);
  }

  async function loadDepartments(plantId: string) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, code, name, department_type, status")
      .eq("plant_id", plantId)
      .order("name");
    if (data) setDeptList(data as DepartmentRow[]);
    setDeptLoading(false);
  }

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    const plant = deptPlant;
    if (!plant) return;
    if (!deptForm.name.trim()) {
      setDeptMsg("Department name is required");
      return;
    }
    setDeptSaving(true);
    const { error } = await supabase.from("departments").insert({
      organization_id: organization?.id ?? null,
      plant_id: plant.id,
      name: deptForm.name.trim(),
      code: deptForm.code.trim() || null,
      department_type: deptForm.department_type || null,
    });
    setDeptSaving(false);
    if (error) {
      setDeptMsg(error.message);
      return;
    }
    setDeptForm({ name: "", code: "", department_type: "mechanical" });
    setDeptMsg("");
    await loadDepartments(plant.id);
  }

  const filteredPlants = plants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plants"
          description="Manage plant locations and assignments"
          backHref="/settings"
          action={
            <Button onClick={openDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Button>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search plants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filteredPlants.length === 0 ? (
          <EmptyState
            title="No plants found"
            description="No plants match your search criteria."
            icon={<Building2 className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlants.map((plant) => (
              <Card key={plant.id} className="hover:border-blue-200">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {plant.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Code: {plant.code}
                      </p>
                    </div>
                    <StatusBadge status={plant.status} />
                  </div>
                  {plant.address && (
                    <p className="mt-3 text-xs text-gray-500">
                      {plant.address}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => openDepartments(plant)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Departments
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Add Plant"
          description="Register a new plant location."
        >
          <form onSubmit={handleAddPlant} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <Label htmlFor="plant_name">Plant Name *</Label>
              <Input
                id="plant_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Pune Plant"
              />
            </div>
            <div>
              <Label htmlFor="plant_code">Code *</Label>
              <Input
                id="plant_code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. PUN"
              />
            </div>
            <div>
              <Label htmlFor="plant_address">Address</Label>
              <Textarea
                id="plant_address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plant_timezone">Timezone</Label>
              <Input
                id="plant_timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plant_status">Status</Label>
              <Select
                id="plant_status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Add Plant"}
              </Button>
            </div>
          </form>
        </Dialog>

        <Dialog
          open={deptDialogOpen}
          onClose={() => setDeptDialogOpen(false)}
          title={`Departments — ${deptPlant?.name ?? ""}`}
          description="Departments belonging to this plant."
        >
          <div className="space-y-4">
            {deptMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {deptMsg}
              </div>
            )}

            {deptLoading ? (
              <p className="py-4 text-center text-sm text-gray-500">Loading departments...</p>
            ) : deptList.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                No departments yet for this plant.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-100 p-2">
                {deptList.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">
                        {d.code ?? "—"}
                        {d.department_type ? ` · ${d.department_type}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddDepartment} className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Add department
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="dept_name">Department Name *</Label>
                  <Input
                    id="dept_name"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Mechanical"
                  />
                </div>
                <div>
                  <Label htmlFor="dept_code">Code</Label>
                  <Input
                    id="dept_code"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="e.g. MECH"
                  />
                </div>
                <div>
                  <Label htmlFor="dept_type">Type</Label>
                  <Select
                    id="dept_type"
                    value={deptForm.department_type}
                    onChange={(e) => setDeptForm({ ...deptForm, department_type: e.target.value })}
                  >
                    {DEPARTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
                <Button type="submit" disabled={deptSaving}>
                  <Plus className="mr-2 h-4 w-4" />
                  {deptSaving ? "Saving..." : "Add Department"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
