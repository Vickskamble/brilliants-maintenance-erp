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
import { StatusBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  PRIORITY_LEVELS,
} from "@/lib/constants";
import { Plus, Search } from "lucide-react";

interface WorkOrderRow {
  id: string;
  work_order_no: string;
  plant_id: string;
  equipment_id: string | null;
  type: string;
  priority: string;
  status: string;
  title: string;
  planned_start: string | null;
  planned_end: string | null;
  created_at: string;
  plants: { name: string } | null;
  equipment: { equipment_code: string; equipment_name: string } | null;
}

export default function WorkOrdersListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [plantId, setPlantId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void loadPlants();
  }, []);

  async function loadPlants() {
    const { data } = await supabase.from("plants").select("id, name").order("name");
    if (data) setPlants(data);
  }

  useEffect(() => {
    load();
  }, [debouncedSearch, plantId, equipmentId, type, priority, status, page]);

  async function load() {
    setIsLoading(true);
    let query = supabase
      .from("work_orders")
      .select(
        `
        id,
        work_order_no,
        plant_id,
        equipment_id,
        type,
        priority,
        status,
        title,
        planned_start,
        planned_end,
        created_at,
        plants(name),
        equipment(equipment_code, equipment_name)
      `,
        { count: "exact" }
      )
      .order("work_order_no");

    if (plantId) query = query.eq("plant_id", plantId);
    if (equipmentId) query = query.eq("equipment_id", equipmentId);
    if (type) query = query.eq("type", type);
    if (priority) query = query.eq("priority", priority);
    if (status) query = query.eq("status", status);
    if (debouncedSearch) {
      query = query.or(
        `work_order_no.ilike.%${debouncedSearch}%,title.ilike.%${debouncedSearch}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    setItems((data as unknown as WorkOrderRow[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Work Orders"
        description="Manage maintenance work orders across plants and priorities."
        action={
          <Link href="/work-orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search work order no or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="min-w-0">
              <option value="">All Plants</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)} className="min-w-0">
              <option value="">All Types</option>
              {WORK_ORDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="min-w-0">
              <option value="">All Priorities</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-0">
              <option value="">All Statuses</option>
              {WORK_ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={[
          {
            key: "work_order_no",
            header: "Work Order No",
            render: (row) => (
              <button
                onClick={() => router.push(`/work-orders/${row.id}`)}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {row.work_order_no}
              </button>
            ),
          },
          {
            key: "title",
            header: "Title",
            render: (row) => (
              <div>
                <p className="font-medium text-gray-900">{row.title}</p>
                <p className="text-xs text-gray-400">
                  {row.equipment?.equipment_code ?? "General"}
                </p>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            render: (row) => {
              const info = WORK_ORDER_TYPES.find((t) => t.value === row.type);
              return <Badge className={info?.color}>{info?.label ?? row.type}</Badge>;
            },
          },
          {
            key: "priority",
            header: "Priority",
            render: (row) => {
              const info = PRIORITY_LEVELS.find((p) => p.value === row.priority);
              return <Badge className={info?.color}>{info?.label ?? row.priority}</Badge>;
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "plant_id",
            header: "Plant",
            render: (row) => (
              <span className="text-sm text-gray-600">{row.plants?.name ?? "-"}</span>
            ),
          },
          {
            key: "created_at",
            header: "Created",
            render: (row) => (
              <span className="text-sm text-gray-500">
                {formatDate(row.created_at)}
              </span>
            ),
          },
        ]}
        data={items}
        loading={isLoading}
        idKey={(row) => row.id}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
      />
    </ERPLayout>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}
