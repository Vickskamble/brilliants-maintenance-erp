"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { Plus, Gauge } from "lucide-react";

interface CalibrationRow {
  id: string;
  schedule_no: string | null;
  equipment_id: string | null;
  task_type: string | null;
  frequency: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  assigned_to: string | null;
  is_active: boolean | null;
  equipment: { equipment_code: string; equipment_name: string }[] | null;
}

export default function CalibrationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<CalibrationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    void load();
  }, [page]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count } = await supabase
      .from("maintenance_schedules")
      .select(
        `id, schedule_no, equipment_id, task_type, frequency, last_run_at, next_run_at, assigned_to, is_active,
         equipment(equipment_code, equipment_name)`,
        { count: "exact" }
      )
      .eq("task_type", "calibration")
      .order("next_run_at", { ascending: true })
      .range(from, to);

    if (data) setItems(data as unknown as CalibrationRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Calibration"
          description="Track instrument and gauge calibration schedules."
          action={
            <Link href="/maintenance/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Gauge />}
                title="No calibration schedules"
                description="Calibration tasks live under Maintenance — add a schedule with task type &ldquo;calibration&rdquo; to see it here."
                action={
                  <Link href="/maintenance/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Schedule
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      key: "schedule_no",
                      header: "Schedule",
                      className: "w-40",
                      render: (row) => (
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {row.schedule_no ?? "-"}
                        </span>
                      ),
                    },
                    {
                      key: "equipment",
                      header: "Equipment",
                      render: (row) => (
                        <span className="text-sm text-gray-700">
                          {row.equipment?.[0]?.equipment_code ?? "-"}
                        </span>
                      ),
                    },
                    {
                      key: "frequency",
                      header: "Frequency",
                      render: (row) => (
                        <span className="text-sm capitalize text-gray-600">
                          {(row.frequency ?? "-").replace(/_/g, " ")}
                        </span>
                      ),
                    },
                    {
                      key: "last_run_at",
                      header: "Last Run",
                      render: (row) => (
                        <span className="text-sm text-gray-600">
                          {row.last_run_at
                            ? new Date(row.last_run_at).toLocaleDateString("en-IN")
                            : "-"}
                        </span>
                      ),
                    },
                    {
                      key: "next_run_at",
                      header: "Next Run",
                      render: (row) => (
                        <span className="text-sm text-gray-600">
                          {row.next_run_at
                            ? new Date(row.next_run_at).toLocaleDateString("en-IN")
                            : "-"}
                        </span>
                      ),
                    },
                    {
                      key: "is_active",
                      header: "Status",
                      render: (row) =>
                        row.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        ),
                    },
                  ]}
                  data={items}
                  idKey={(row) => row.id}
                  onRowClick={(row) => router.push(`/maintenance/${row.id}`)}
                />
                {!isLoading && items.length > 0 && (
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalItems={total}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}