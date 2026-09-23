"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { Plus, ClipboardCheck } from "lucide-react";

interface InspectionRow {
  id: string;
  inspection_no: string;
  plant_id: string;
  equipment_id: string;
  scheduled_date: string | null;
  performed_at: string | null;
  status: string;
  overall_result: string | null;
  remarks: string | null;
  plants: { name: string }[] | null;
  equipment: { equipment_code: string; equipment_name: string }[] | null;
}

export default function InspectionsListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<InspectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    void load();
  }, [page, status]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("inspections")
      .select(
        `
        id,
        inspection_no,
        plant_id,
        equipment_id,
        scheduled_date,
        performed_at,
        status,
        overall_result,
        remarks,
        plants(name),
        equipment(equipment_code, equipment_name)
      `,
        { count: "exact" }
      )
      .order("scheduled_date", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, count } = await query.range(from, to);
    if (data) setItems(data as unknown as InspectionRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inspections"
          description="Plan and track equipment inspections."
          action={
            <Link href="/inspections/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Inspection
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-end">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
                className="md:w-56"
                options={[
                  { value: "scheduled", label: "Scheduled" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "completed", label: "Completed" },
                  { value: "overdue", label: "Overdue" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>

            {isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck />}
                title="No inspections found"
                description="Schedule your first inspection to start tracking."
                action={
                  <Link href="/inspections/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule Inspection
                    </Button>
                  </Link>
                }
              />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "inspection_no",
                    header: "Inspection No",
                    className: "w-44",
                    render: (row) => (
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {row.inspection_no}
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
                    key: "plants",
                    header: "Plant",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.plants?.[0]?.name ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "scheduled_date",
                    header: "Scheduled",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.scheduled_date
                          ? new Date(row.scheduled_date).toLocaleDateString("en-IN")
                          : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "overall_result",
                    header: "Result",
                    render: (row) => (
                      <span className="text-sm capitalize text-gray-600">
                        {row.overall_result?.replace(/_/g, " ") ?? "-"}
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
                onRowClick={(row) => router.push(`/inspections/${row.id}`)}
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