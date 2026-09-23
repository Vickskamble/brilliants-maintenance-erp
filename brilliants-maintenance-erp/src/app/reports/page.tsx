"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import {
  Cog,
  ClipboardList,
  AlertTriangle,
  Package,
  Wrench,
  Building2,
} from "lucide-react";

interface ReportData {
  equipmentCount: number;
  workOrderCount: number;
  breakdownCount: number;
  sparePartCount: number;
  scheduleCount: number;
  plantCount: number;
  workOrderByStatus: { status: string; count: number }[];
  breakdownByStatus: { status: string; count: number }[];
  openWorkOrders: number;
  activeBreakdowns: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [eq, wo, bd, sp, ms, pl] = await Promise.all([
      supabase
        .from("equipment")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("work_orders")
        .select("status", { count: "exact", head: true }),
      supabase
        .from("breakdowns")
        .select("status", { count: "exact", head: true }),
      supabase
        .from("spare_parts")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("maintenance_schedules")
        .select("id", { count: "exact", head: true }),
      supabase.from("plants").select("id", { count: "exact", head: true }),
    ]);

    const woRows = await supabase
      .from("work_orders")
      .select("status");
    const bdRows = await supabase
      .from("breakdowns")
      .select("status");

    const workOrderByStatus = aggregate(woRows.data?.map((r) => r.status));
    const breakdownByStatus = aggregate(bdRows.data?.map((r) => r.status));
    const openWorkOrders = (workOrderByStatus.filter(
      (s) => !["completed", "closed", "cancelled"].includes(s.status)
    ) ?? []).reduce((acc, s) => acc + s.count, 0);
    const activeBreakdowns = (breakdownByStatus.filter(
      (s) => ["reported", "diagnosing", "repairing"].includes(s.status)
    ) ?? []).reduce((acc, s) => acc + s.count, 0);

    setData({
      equipmentCount: eq.count ?? 0,
      workOrderCount: wo.count ?? 0,
      breakdownCount: bd.count ?? 0,
      sparePartCount: sp.count ?? 0,
      scheduleCount: ms.count ?? 0,
      plantCount: pl.count ?? 0,
      workOrderByStatus,
      breakdownByStatus,
      openWorkOrders,
      activeBreakdowns,
    });
    setIsLoading(false);
  }

  function aggregate(statuses: (string | null)[] | undefined) {
    const counts: Record<string, number> = {};
    (statuses ?? []).forEach((s) => {
      const key = s ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }

  const statusVariant = (
    status: string
  ): "default" | "success" | "warning" | "danger" | "info" => {
    if (["completed", "restored", "active", "approved", "pass"].includes(status))
      return "success";
    if (["reported", "overdue", "fail"].includes(status)) return "danger";
    if (["in_progress", "assigned", "repairing"].includes(status))
      return "warning";
    if (["planned", "scheduled"].includes(status)) return "info";
    return "default";
  };

  const totalWorkOrders = data?.workOrderCount ?? 0;
  const totalBreakdowns = data?.breakdownCount ?? 0;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Operational overview across equipment, work orders and breakdowns."
        />

        {isLoading || !data ? (
          <LoadingPage />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={<Cog className="h-5 w-5 text-blue-600" />}
                label="Equipment"
                value={data.equipmentCount}
                sub="Assets in registry"
                accent="bg-blue-50"
              />
              <StatCard
                icon={<ClipboardList className="h-5 w-5 text-indigo-600" />}
                label="Work Orders"
                value={data.workOrderCount}
                sub={`${data.openWorkOrders} open`}
                accent="bg-indigo-50"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                label="Breakdowns"
                value={data.breakdownCount}
                sub={`${data.activeBreakdowns} unresolved`}
                accent="bg-red-50"
              />
              <StatCard
                icon={<Package className="h-5 w-5 text-emerald-600" />}
                label="Spare Parts"
                value={data.sparePartCount}
                sub="Inventory items"
                accent="bg-emerald-50"
              />
              <StatCard
                icon={<Wrench className="h-5 w-5 text-amber-600" />}
                label="Maintenance Schemes"
                value={data.scheduleCount}
                sub="Scheduled tasks"
                accent="bg-amber-50"
              />
              <StatCard
                icon={<Building2 className="h-5 w-5 text-purple-600" />}
                label="Plants"
                value={data.plantCount}
                sub="Facilities"
                accent="bg-purple-50"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Work Orders by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.workOrderByStatus.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No work orders yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {data.workOrderByStatus.map((s) => (
                        <li key={s.status} className="flex items-center gap-3">
                          <Badge variant={statusVariant(s.status)}>
                            {s.status.replace(/_/g, " ")}
                          </Badge>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${
                                  totalWorkOrders
                                    ? (s.count / totalWorkOrders) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {s.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Breakdowns by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.breakdownByStatus.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No breakdowns yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {data.breakdownByStatus.map((s) => (
                        <li key={s.status} className="flex items-center gap-3">
                          <Badge variant={statusVariant(s.status)}>
                            {s.status.replace(/_/g, " ")}
                          </Badge>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-red-600"
                              style={{
                                width: `${
                                  totalBreakdowns
                                    ? (s.count / totalBreakdowns) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {s.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </ERPLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{sub}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}