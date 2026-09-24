"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ErpGantt } from "@/components/erp/erp-gantt";
import { createClient } from "@/lib/supabase/client";
import { Plus, CalendarX, LayoutList, GanttChartSquare } from "lucide-react";

interface ShutdownRow {
  id: string;
  work_order_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  plants: { name: string }[] | null;
}

export default function ShutdownsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<ShutdownRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [view, setView] = useState<"list" | "gantt">("list");
  const [ganttRows, setGanttRows] = useState<
    { id: string; label: string; subtitle: string; start: string | null; end: string | null; status: string }[]
  >([]);
  const [isGanttLoading, setIsGanttLoading] = useState(false);

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    if (view === "gantt") void loadGantt();
  }, [view]);

  async function loadGantt() {
    setIsGanttLoading(true);
    const { data } = await supabase
      .from("work_orders")
      .select("id, work_order_no, title, status, planned_start, planned_end, plants(name)")
      .eq("type", "shutdown")
      .order("planned_start", { ascending: true })
      .limit(1000);

    setGanttRows(
      ((data as unknown as ShutdownRow[]) ?? []).map((row) => ({
        id: row.id,
        label: row.work_order_no,
        subtitle: `${row.title} · ${row.plants?.[0]?.name ?? "-"}`,
        start: row.planned_start,
        end: row.planned_end,
        status: row.status,
      }))
    );
    setIsGanttLoading(false);
  }

  function barColor(status: string): string {
    if (["completed", "verified", "closed"].includes(status)) return "#22c55e";
    if (status === "in_progress") return "#f59e0b";
    if (status === "cancelled") return "#9ca3af";
    if (status === "on_hold") return "#fb923c";
    return "#3b82f6";
  }

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count } = await supabase
      .from("work_orders")
      .select(
        `id, work_order_no, title, type, priority, status, planned_start, planned_end,
         plants(name)`,
        { count: "exact" }
      )
      .eq("type", "shutdown")
      .order("planned_start", { ascending: true })
      .range(from, to);

    if (data) setItems(data as unknown as ShutdownRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plant Shutdowns"
          description="Plan and manage planned plant shutdowns."
          action={
            <Link href="/work-orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Shutdown
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex justify-end border-b border-gray-200 p-3">
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    view === "list"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setView("gantt")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    view === "gantt"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <GanttChartSquare className="h-4 w-4" />
                  Gantt
                </button>
              </div>
            </div>

            {view === "gantt" ? (
              isGanttLoading ? (
                <LoadingPage />
              ) : (
                <div className="p-3">
                  <ErpGantt
                    rows={ganttRows.map((row) => ({
                      id: row.id,
                      label: row.label,
                      subtitle: row.subtitle,
                      start: row.start,
                      end: row.end,
                      color: barColor(row.status),
                      onClick: () => router.push(`/work-orders/${row.id}`),
                    }))}
                  />
                </div>
              )
            ) : isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<CalendarX />}
                title="No shutdowns planned"
                description="Work orders with type &ldquo;Shutdown&rdquo; appear here. Create one to schedule a shutdown."
                action={
                  <Link href="/work-orders/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Shutdown
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      key: "work_order_no",
                      header: "Shutdown",
                      className: "w-40",
                      render: (row) => (
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {row.work_order_no}
                        </span>
                      ),
                    },
                    {
                      key: "title",
                      header: "Title",
                      render: (row) => (
                        <span className="text-sm text-gray-700">{row.title}</span>
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
                      key: "planned_start",
                      header: "Planned Start",
                      render: (row) => (
                        <span className="text-sm text-gray-600">
                          {row.planned_start
                            ? new Date(row.planned_start).toLocaleDateString("en-IN")
                            : "-"}
                        </span>
                      ),
                    },
                    {
                      key: "planned_end",
                      header: "Planned End",
                      render: (row) => (
                        <span className="text-sm text-gray-600">
                          {row.planned_end
                            ? new Date(row.planned_end).toLocaleDateString("en-IN")
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
                  onRowClick={(row) => router.push(`/work-orders/${row.id}`)}
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