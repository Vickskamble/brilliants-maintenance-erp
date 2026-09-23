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
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { BREAKDOWN_STATUSES } from "@/lib/constants";
import { Plus, Search, AlertTriangle } from "lucide-react";

interface BreakdownRowItem {
  id: string;
  breakdown_no: string | null;
  plant_id: string | null;
  equipment_id: string | null;
  problem_description: string | null;
  severity: string | null;
  status: string;
  reported_at: string | null;
  downtime_minutes: number | null;
  plants: { name: string }[] | null;
  equipment: { equipment_code: string; equipment_name: string }[] | null;
}

export default function BreakdownsListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<BreakdownRowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [page, debouncedSearch, status]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("breakdowns")
      .select(
        `
        id,
        breakdown_no,
        plant_id,
        equipment_id,
        problem_description,
        severity,
        status,
        reported_at,
        downtime_minutes,
        plants(name),
        equipment(equipment_code, equipment_name)
      `,
        { count: "exact" }
      )
      .order("reported_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (debouncedSearch) {
      query = query.or(
        `breakdown_no.ilike.%${debouncedSearch}%,problem_description.ilike.%${debouncedSearch}%`
      );
    }

    const { data, count } = await query.range(from, to);
    if (data) setItems(data as unknown as BreakdownRowItem[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Breakdowns"
          description="Track equipment failures, downtime and resolutions."
          action={
            <Link href="/breakdowns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Report Breakdown
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
                  placeholder="Search breakdown no or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
                className="md:w-56"
                options={[
                  ...BREAKDOWN_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  })),
                ]}
              />
            </div>

            {isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle />}
                title="No breakdowns found"
                description="Report your first breakdown to start tracking downtime."
                action={
                  <Link href="/breakdowns/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Report Breakdown
                    </Button>
                  </Link>
                }
              />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "breakdown_no",
                    header: "Breakdown No",
                    className: "w-40",
                    render: (row) => (
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {row.breakdown_no ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "problem_description",
                    header: "Description",
                    render: (row) => (
                      <span className="text-sm text-gray-700">
                        {row.problem_description ?? "-"}
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
                    key: "equipment",
                    header: "Equipment",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.equipment?.[0]?.equipment_code ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "reported_at",
                    header: "Reported",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.reported_at
                          ? new Date(row.reported_at).toLocaleDateString("en-IN")
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "downtime_minutes",
                    header: "Downtime",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.downtime_minutes != null
                          ? `${row.downtime_minutes} min`
                          : "-"}
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
                onRowClick={(row) => router.push(`/breakdowns/${row.id}`)}
              />
            )}

            {!isLoading && items.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}