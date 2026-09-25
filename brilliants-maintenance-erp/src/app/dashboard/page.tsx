"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingPage } from "@/components/common/loading";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  Cog,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  CalendarClock,
} from "lucide-react";

interface DashboardMetrics {
  totalEquipment: number;
  criticalEquipment: number;
  pmDueToday: number;
  pmOverdue: number;
  openWorkOrders: number;
  breakdownsThisMonth: number;
  pmCompliance: number;
  calibrationDue: number;
  lowStockItems: number;
  mtbfHours: number;
}

interface MonthPoint {
  label: string;
  count: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function DashboardPage() {
  const { organization, plant } = useAuth();
  const supabase = createClient();
  const plantId = plant?.id ?? null;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trend, setTrend] = useState<MonthPoint[]>([]);
  const [upcomingPm, setUpcomingPm] = useState<
    { id: string; schedule_no: string; next_run_at: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId]);

  async function load() {
    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = addDays(todayStart, 1);
    const thirtyDaysOut = addDays(now, 30);
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0
    ).toISOString();

    let plantEqIds: string[] = [];
    let plantEqFilter: ((q: any) => any) | null = null;
    if (plantId) {
      const { data: eqIds } = await supabase
        .from("equipment")
        .select("id")
        .eq("plant_id", plantId);
      plantEqIds = (eqIds ?? []).map((e) => (e as { id: string }).id);
      plantEqFilter = (q: any) => q.eq("plant_id", plantId);
    }

    const scopeEq = (q: any) => (plantEqFilter ? plantEqFilter(q) : q);
    const scopePm = (q: any) =>
      plantId ? q.in("equipment_id", plantEqIds) : q;

    const [
      eqRes,
      critRes,
      dueTodayRes,
      overdueRes,
      openWoRes,
      bdMonthRes,
      activeSchedRes,
      overdueActiveRes,
      calDueRes,
      lowStockRes,
      bdTrendRes,
      upcomingRes,
    ] = await Promise.all([
      scopeEq(
        supabase.from("equipment").select("id", { count: "exact", head: true })
      ),
      scopeEq(
        supabase
          .from("equipment")
          .select("criticality_profiles!inner(level)", {
            count: "exact",
            head: true,
          })
          .eq("criticality_profiles.level", "critical")
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("next_run_at", todayStart.toISOString())
          .lt("next_run_at", todayEnd.toISOString())
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .lt("next_run_at", now.toISOString())
      ),
      scopeEq(
        supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(completed,closed,cancelled)")
      ),
      scopeEq(
        supabase
          .from("breakdowns")
          .select("id", { count: "exact", head: true })
          .gte("reported_at", monthStart)
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("next_run_at", now.toISOString())
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .eq("task_type", "calibration")
          .lte("next_run_at", thirtyDaysOut.toISOString())
      ),
      scopeEq(
        supabase
          .from("spare_parts")
          .select("id", { count: "exact", head: true })
          .gt("current_stock", 0)
          .lte("current_stock", "reorder_level")
      ),
      scopeEq(
        supabase
          .from("breakdowns")
          .select("reported_at")
          .gte("reported_at", startOfMonth(now, 5).toISOString())
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("id, schedule_no, next_run_at")
          .eq("is_active", true)
          .gte("next_run_at", now.toISOString())
          .order("next_run_at", { ascending: true })
          .limit(5)
      ),
    ]);

    const activeTotal = activeSchedRes.count ?? 0;
    const onTrack = overdueActiveRes.count ?? 0;
    const compliance =
      activeTotal > 0 ? Math.round((onTrack / activeTotal) * 100) : 0;

    const trendMap = buildTrend(
      (bdTrendRes.data ?? []) as unknown as { reported_at: string | null }[],
      now
    );
    setTrend(trendMap);

    if (upcomingRes.data) {
      setUpcomingPm(
        (upcomingRes.data as unknown as {
          id: string;
          schedule_no: string | null;
          next_run_at: string | null;
        }[]).map((s) => ({
          id: s.id,
          schedule_no: s.schedule_no ?? "Schedule",
          next_run_at: s.next_run_at ?? "",
        }))
      );
    }

    setMetrics({
      totalEquipment: eqRes.count ?? 0,
      criticalEquipment: critRes.count ?? 0,
      pmDueToday: dueTodayRes.count ?? 0,
      pmOverdue: overdueRes.count ?? 0,
      openWorkOrders: openWoRes.count ?? 0,
      breakdownsThisMonth: bdMonthRes.count ?? 0,
      pmCompliance: compliance,
      calibrationDue: calDueRes.count ?? 0,
      lowStockItems: lowStockRes.count ?? 0,
      mtbfHours: computeMtbf(bdTrendRes.data ?? [], now),
    });
    setIsLoading(false);
  }

  if (isLoading || !metrics) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  const kpiCards = [
    {
      title: "Total Equipment",
      value: String(metrics.totalEquipment),
      icon: Cog,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Critical Equipment",
      value: String(metrics.criticalEquipment),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "PM Due Today",
      value: String(metrics.pmDueToday),
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "PM Overdue",
      value: String(metrics.pmOverdue),
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Open Work Orders",
      value: String(metrics.openWorkOrders),
      icon: Wrench,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Breakdowns (Month)",
      value: String(metrics.breakdownsThisMonth),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "PM Compliance",
      value: `${metrics.pmCompliance}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Calibration Due",
      value: String(metrics.calibrationDue),
      icon: ClipboardCheck,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      title: "Low Stock Items",
      value: String(metrics.lowStockItems),
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "MTBF (hours)",
      value: String(metrics.mtbfHours),
      icon: TrendingUp,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={`${
            organization?.display_name || "Organization"
          } — Maintenance Overview`}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <Card key={card.title}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {card.title}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}
                  >
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trend.length === 0 ||
              trend.every((t) => t.count === 0) ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                  No breakdown data available yet.
                </div>
              ) : (
                <div className="flex h-48 items-end gap-3">
                  {trend.map((t) => (
                    <div
                      key={t.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-xs font-medium text-gray-700">
                        {t.count}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-red-500"
                        style={{
                          height: `${Math.max(
                            2,
                            Math.round((t.count / maxTrend) * 120)
                          )}px`,
                        }}
                        title={`${t.label}: ${t.count} breakdowns`}
                      />
                      <span className="text-xs text-gray-500">{t.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingPm.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                  No upcoming PM schedules.
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcomingPm.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-1.5">
                          <CalendarClock className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {s.schedule_no}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {s.next_run_at
                          ? new Date(s.next_run_at).toLocaleDateString("en-IN")
                          : "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(ref: Date, monthsBack: number): Date {
  return new Date(ref.getFullYear(), ref.getMonth() - monthsBack, 1);
}

function buildTrend(
  rows: { reported_at: string | null }[],
  now: Date
): MonthPoint[] {
  const months: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = startOfMonth(now, i);
    months.push({ label: MONTH_LABELS[d.getMonth()], count: 0 });
  }
  for (const row of rows) {
    if (!row.reported_at) continue;
    const ts = new Date(row.reported_at).getTime();
    if (isNaN(ts)) continue;
    const monthsBack = monthDiff(new Date(ts), now);
    if (monthsBack >= 0 && monthsBack < 6) {
      months[5 - monthsBack].count += 1;
    }
  }
  return months;
}

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function computeMtbf(
  rows: { reported_at: string | null }[],
  now: Date
): number {
  const timestamps = rows
    .map((r) => (r.reported_at ? new Date(r.reported_at).getTime() : NaN))
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  const breakdownCount = timestamps.length;
  if (breakdownCount === 0) return 0;
  const spanHours =
    timestamps.length > 1
      ? (timestamps[timestamps.length - 1] - timestamps[0]) / 3600000
      : 30 * 24;
  return Math.round(Math.max(1, spanHours / breakdownCount));
}