"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { ERPDataTable } from "@/components/erp/table/erp-data-table";
import { exportRowsToCsv } from "@/components/erp/table/erp-table-export";
import { createClient } from "@/lib/supabase/client";
import {
  Cog,
  Plus,
  Eye,
  Pencil,
  Download,
} from "lucide-react";
import Link from "next/link";
import type {
  ERPColumn,
  ERPBulkAction,
  ERPRowAction,
} from "@/components/erp/table/erp-table-types";

interface EquipmentRowItem {
  id: string;
  equipment_code: string;
  equipment_name: string;
  plant_id: string | null;
  category_id: string | null;
  criticality_id: string | null;
  department_id: string | null;
  status: string;
  manufacturer: string | null;
  make: string | null;
  created_at: string | null;
  asset_categories: { name: string }[] | null;
  criticality_profiles: { name: string; level: string | null }[] | null;
  plants: { name: string }[] | null;
  departments: { name: string }[] | null;
}

export default function EquipmentListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<EquipmentRowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [plantId, setPlantId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [criticalityId, setCriticalityId] = useState("");
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [criticalities, setCriticalities] = useState<
    { id: string; name: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadDepartments(plantId);
    setDepartmentId("");
  }, [plantId]);

  async function loadFilterOptions() {
    const [plantsRes, categoriesRes, critRes] = await Promise.all([
      supabase.from("plants").select("id, name").order("name"),
      supabase.from("asset_categories").select("id, name").order("name"),
      supabase
        .from("criticality_profiles")
        .select("id, name")
        .order("name"),
    ]);
    if (plantsRes.data) setPlants(plantsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (critRes.data) setCriticalities(critRes.data);
    loadDepartments("");
  }

  async function loadDepartments(plant: string) {
    let query = supabase.from("departments").select("id, name").order("name");
    if (plant) query = query.eq("plant_id", plant);
    const { data } = await query;
    if (data) setDepartments(data);
  }

  useEffect(() => {
    loadEquipments();
  }, [plantId, categoryId, criticalityId, status, departmentId]);

  async function loadEquipments() {
    setIsLoading(true);

    let query = supabase
      .from("equipment")
      .select(
        `
        id,
        equipment_code,
        equipment_name,
        plant_id,
        category_id,
        criticality_id,
        department_id,
        status,
        manufacturer,
        make,
        created_at,
        asset_categories(name),
        criticality_profiles(name, level),
        plants(name),
        departments(name)
      `
      )
      .order("equipment_code");

    if (plantId) query = query.eq("plant_id", plantId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (criticalityId) query = query.eq("criticality_id", criticalityId);
    if (status) query = query.eq("status", status);
    if (departmentId) query = query.eq("department_id", departmentId);

    const { data, error } = await query;

    if (data) {
      setItems((data as unknown as EquipmentRowItem[]) ?? []);
    }
    setIsLoading(false);
  }

  const columns: ERPColumn<EquipmentRowItem>[] = [
    {
      id: "code",
      header: "Code / Name",
      width: 260,
      className: "w-64",
      accessorFn: (row) => row.equipment_code,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Cog className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {row.equipment_code}
            </p>
            <p className="text-sm text-gray-500">{row.equipment_name}</p>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      filterable: true,
      filterPlaceholder: "Filter category",
      accessorFn: (row) => row.asset_categories?.[0]?.name ?? "",
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.asset_categories?.[0]?.name ?? "-"}
        </span>
      ),
    },
    {
      id: "criticality",
      header: "Criticality",
      filterable: true,
      filterPlaceholder: "Filter criticality",
      accessorFn: (row) => row.criticality_profiles?.[0]?.name ?? "",
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.criticality_profiles?.[0]?.name ?? "-"}
        </span>
      ),
    },
    {
      id: "plant",
      header: "Plant",
      accessorFn: (row) => row.plants?.[0]?.name ?? "",
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.plants?.[0]?.name ?? "-"}
        </span>
      ),
    },
    {
      id: "department",
      header: "Department",
      filterable: true,
      filterPlaceholder: "Filter department",
      accessorFn: (row) => row.departments?.[0]?.name ?? "",
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.departments?.[0]?.name ?? "-"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const rowActions: ERPRowAction<EquipmentRowItem>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row) => router.push(`/equipment/${row.id}`),
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: (row) => router.push(`/equipment/${row.id}/edit`),
    },
  ];

  const bulkActions: ERPBulkAction<EquipmentRowItem>[] = [
    {
      label: "Export Selected",
      icon: Download,
      variant: "secondary",
      onClick: (rows) => {
        const header = [
          "Code",
          "Name",
          "Category",
          "Criticality",
          "Plant",
          "Department",
          "Status",
        ];
        exportRowsToCsv(
          "equipment-selected",
          header,
          rows.map((r) => [
            r.equipment_code,
            r.equipment_name,
            r.asset_categories?.[0]?.name ?? "",
            r.criticality_profiles?.[0]?.name ?? "",
            r.plants?.[0]?.name ?? "",
            r.departments?.[0]?.name ?? "",
            r.status,
          ])
        );
      },
    },
  ];

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Equipment"
          description="Manage equipment assets, components and maintenance records."
          action={
            <Link href="/equipment/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="grid flex-1 grid-cols-2 gap-3 border-b border-gray-200 p-4 lg:grid-cols-5">
              <Select
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                placeholder="All plants"
                options={plants.map((p) => ({ value: p.id, label: p.name }))}
              />
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                placeholder="All departments"
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="All categories"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                value={criticalityId}
                onChange={(e) => setCriticalityId(e.target.value)}
                placeholder="All criticality"
                options={criticalities.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
                options={[
                  { value: "active", label: "Active" },
                  { value: "standby", label: "Standby" },
                  { value: "under_maintenance", label: "Under Maintenance" },
                  { value: "breakdown", label: "Breakdown" },
                  { value: "restored", label: "Restored" },
                  { value: "decommissioned", label: "Decommissioned" },
                ]}
              />
            </div>

            <ERPDataTable
              columns={columns}
              data={items}
              idKey={(row) => row.id}
              loading={isLoading}
              onRowClick={(row) => router.push(`/equipment/${row.id}`)}
              rowActions={rowActions}
              bulkActions={bulkActions}
              searchPlaceholder="Search equipment code or name..."
              defaultPageSize={12}
              tableKey="equipment"
              exportFileName="equipment"
              emptyTitle="No equipment found"
              emptyDescription="Add your first equipment asset to get started."
              emptyAction={
                <Link href="/equipment/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Equipment
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}