"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Plus, Search, Cog, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface EquipmentRowItem {
  id: string;
  equipment_code: string;
  equipment_name: string;
  plant_id: string | null;
  category_id: string | null;
  criticality_id: string | null;
  status: string;
  manufacturer: string | null;
  make: string | null;
  created_at: string | null;
  asset_categories: { name: string }[] | null;
  criticality_profiles: { name: string; level: string | null }[] | null;
  plants: { name: string }[] | null;
}

export default function EquipmentListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<EquipmentRowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [plantId, setPlantId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [criticalityId, setCriticalityId] = useState("");
  const [status, setStatus] = useState("");

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [criticalities, setCriticalities] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

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
  }

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, plantId, categoryId, criticalityId, status]);

  useEffect(() => {
    loadEquipments();
  }, [page, debouncedSearch, plantId, categoryId, criticalityId, status]);

  async function loadEquipments() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

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
        status,
        manufacturer,
        make,
        created_at,
        asset_categories(name),
        criticality_profiles(name, level),
        plants(name)
      `,
        { count: "exact" }
      )
      .order("equipment_code");

    if (plantId) query = query.eq("plant_id", plantId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (criticalityId) query = query.eq("criticality_id", criticalityId);
    if (status) query = query.eq("status", status);
    if (debouncedSearch) {
      query = query.or(
        `equipment_code.ilike.%${debouncedSearch}%,equipment_name.ilike.%${debouncedSearch}%`
      );
    }

    const { data, count, error } = await query.range(from, to);

    if (data) {
      setItems((data as unknown as EquipmentRowItem[]) ?? []);
      setTotal(count ?? 0);
    }
    setIsLoading(false);
  }

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
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search equipment code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                <Select
                  value={plantId}
                  onChange={(e) => setPlantId(e.target.value)}
                  placeholder="All plants"
                  options={plants.map((p) => ({ value: p.id, label: p.name }))}
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
            </div>

            {isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                title="No equipment found"
                description="Add your first equipment asset to get started."
                action={
                  <Link href="/equipment/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Equipment
                    </Button>
                  </Link>
                }
              />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "equipment_code",
                    header: "Code / Name",
                    className: "w-64",
                    render: (row) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                          <Cog className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {row.equipment_code}
                          </p>
                          <p className="text-sm text-gray-500">
                            {row.equipment_name}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "asset_categories",
                    header: "Category",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.asset_categories?.[0]?.name ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "criticality_profiles",
                    header: "Criticality",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.criticality_profiles?.[0]?.name ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "plants",
                    header: "Plant",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.plants?.[0]?.name ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                data={items}
                idKey={(row) => row.id}
                onRowClick={(row) => router.push(`/equipment/${row.id}`)}
              />
            )}

            {!isLoading && items.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-4">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
