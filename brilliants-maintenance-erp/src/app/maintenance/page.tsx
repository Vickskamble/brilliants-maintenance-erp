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
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ErpCalendar } from "@/components/erp/erp-calendar";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Plus, Search, Wrench, LayoutList, CalendarDays } from "lucide-react";

interface MaintenanceScheduleRowItem {
  id: string;
  schedule_no: string | null;
  equipment_id: string | null;
  task_type: string | null;
  frequency: string | null;
  interval_days: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  assigned_to: string | null;
  is_active: boolean | null;
  notes: string | null;
  equipment: { equipment_code: string; equipment_name: string }[] | null;
}

export default function MaintenanceSchemesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<MaintenanceScheduleRowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState("");

  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarEvents, setCalendarEvents] = useState<
    { id: string; title: string; startDate: string; active: boolean }[]
  >([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    if (view === "calendar") void loadCalendar();
  }, [view, debouncedSearch, status]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("maintenance_schedules")
      .select(
        `
        id,
        schedule_no,
        equipment_id,
        task_type,
        frequency,
        interval_days,
        last_run_at,
        next_run_at,
        assigned_to,
        is_active,
        notes,
        equipment(equipment_code, equipment_name)
      `,
        { count: "exact" }
      )
      .order("next_run_at", { ascending: true });

    if (status) {
      query =
        status === "active"
          ? query.eq("is_active", true)
          : query.eq("is_active", false);
    }
    if (debouncedSearch) {
      query = query.or(
        `schedule_no.ilike.%${debouncedSearch}%,task_type.ilike.%${debouncedSearch}%`
      );
    }

    const { data, count } = await query.range(from, to);
    if (data) setItems(data as unknown as MaintenanceScheduleRowItem[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  async function loadCalendar() {
    setIsCalendarLoading(true);
    let query = supabase
      .from("maintenance_schedules")
      .select(
        `
        id,
        task_type,
        next_run_at,
        is_active,
        equipment(equipment_code)
      `
      )
      .not("next_run_at", "is", null)
      .order("next_run_at", { ascending: true })
      .limit(1000);

    if (status) {
      query =
        status === "active"
          ? query.eq("is_active", true)
          : query.eq("is_active", false);
    }
    if (debouncedSearch) {
      query = query.or(
        `task_type.ilike.%${debouncedSearch}%,equipment.equipment_code.ilike.%${debouncedSearch}%`
      );
    }

    const { data: rows } = await query;
    setCalendarEvents(
      ((rows as unknown as {
        id: string;
        task_type: string | null;
        next_run_at: string;
        is_active: boolean | null;
        equipment: { equipment_code: string }[] | null;
      }[]) ?? []).map((row) => ({
        id: row.id,
        title: `${row.task_type?.replace(/_/g, " ") ?? "PM"} · ${
          row.equipment?.[0]?.equipment_code ?? "General"
        }`,
        startDate: row.next_run_at,
        active: row.is_active ?? true,
      }))
    );
    setIsCalendarLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Maintenance Schemes"
          description="Schedule preventive maintenance tasks for your equipment."
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
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search schedule no or task type..."
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
                  { value: "active", label: "Active only" },
                  { value: "inactive", label: "Inactive only" },
                ]}
              />
            </div>

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
                  onClick={() => setView("calendar")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    view === "calendar"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </button>
              </div>
            </div>

            {view === "calendar" ? (
              isCalendarLoading ? (
                <LoadingPage />
              ) : (
                <div className="p-3">
                  <ErpCalendar
                    events={calendarEvents.map((event) => ({
                      id: event.id,
                      title: event.title,
                      startDate: event.startDate,
                      color: event.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300",
                      onClick: () => router.push(`/maintenance/${event.id}`),
                    }))}
                  />
                </div>
              )
            ) : isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Wrench />}
                title="No maintenance schedules"
                description="Create a maintenance schedule to keep equipment running reliably."
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
                    key: "task_type",
                    header: "Task Type",
                    render: (row) => (
                      <span className="text-sm capitalize text-gray-600">
                        {row.task_type?.replace(/_/g, " ") ?? "-"}
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
                    key: "assigned_to",
                    header: "Assigned To",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.assigned_to ?? "-"}
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