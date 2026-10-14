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
import Link from "next/link";
import { rel } from "@/lib/postgrest-rel";

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

interface PmTrendPoint {
  label: string;
  due: number;
  completed: number;
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
  const [pmTrend, setPmTrend] = useState<PmTrendPoint[]>([]);
  const [upcomingPm, setUpcomingPm] = useState<
    {
      id: string;
      schedule_no: string;
      next_run_at: string;
      equipment_code: string;
      equipment_name: string;
    }[]
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

    const orgId = organization?.id ?? null;

    const scopeEq = (q: any) => {
      let query = q;
      if (orgId) query = query.eq("organization_id", orgId);
      if (plantId) query = query.eq("plant_id", plantId);
      return query;
    };

    let eqIdQuery = supabase.from("equipment").select("id");
    if (orgId) eqIdQuery = eqIdQuery.eq("organization_id", orgId);
    if (plantId) eqIdQuery = eqIdQuery.eq("plant_id", plantId);
    const { data: eqIdRes } = await eqIdQuery;
    const pmIds = (eqIdRes ?? []).map((e) => (e as { id: string }).id);

    const pmNoop = Promise.resolve({ count: 0, data: null, error: null });
    const scopePm = (q: any) =>
      pmIds.length ? q.in("equipment_id", pmIds) : pmNoop;

    let spLowStockQuery = supabase
      .from("spare_parts")
      .select("id, current_stock, reorder_level")
      .gt("current_stock", 0)
      .not("reorder_level", "is", null)
      .gt("reorder_level", 0);
    if (plantId) spLowStockQuery = spLowStockQuery.eq("plant_id", plantId);

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
      bdTrendRes,
      pmSchedRes,
      pmRunRes,
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
          .not("status", "in", "(completed,verified,closed,cancelled)")
          .is("deleted_at", null)
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
          .from("breakdowns")
          .select("reported_at")
          .gte("reported_at", startOfMonth(now, 5).toISOString())
      ),
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select("next_run_at")
          .eq("is_active", true)
      ),
      pmIds.length
        ? supabase
            .from("maintenance_run_logs")
            .select("completed_at")
            .in("equipment_id", pmIds)
        : pmNoop,
      scopePm(
        supabase
          .from("maintenance_schedules")
          .select(
            "id, schedule_no, next_run_at, equipment:equipment_id(equipment_code, equipment_name)"
          )
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

    setPmTrend(
      buildPmTrend(
        (pmSchedRes.data ?? []) as unknown as {
          next_run_at: string | null;
        }[],
        (pmRunRes.data ?? []) as unknown as { completed_at: string | null }[],
        now
      )
    );

    if (upcomingRes.data) {
      setUpcomingPm(
        (upcomingRes.data as unknown as {
          id: string;
          schedule_no: string | null;
          next_run_at: string | null;
          equipment?: { equipment_code: string | null; equipment_name: string | null } | { equipment_code: string | null; equipment_name: string | null }[];
        }[]).map((s) => {
          const eq = rel(s.equipment);
          return {
            id: s.id,
            schedule_no: s.schedule_no ?? "Schedule",
            next_run_at: s.next_run_at ?? "",
            equipment_code: eq?.equipment_code ?? "",
            equipment_name: eq?.equipment_name ?? "",
          };
        })
      );
    }

    const { data: lowStockRows } = await spLowStockQuery;
    const lowStockCount = (lowStockRows ?? []).filter(
      (r) =>
        (r.current_stock ?? 0) <= (r.reorder_level ?? 0)
    ).length;

    setMetrics({
      totalEquipment: eqRes.count ?? 0,
      criticalEquipment: critRes.count ?? 0,
      pmDueToday: dueTodayRes.count ?? 0,
      pmOverdue: overdueRes.count ?? 0,
      openWorkOrders: openWoRes.count ?? 0,
      breakdownsThisMonth: bdMonthRes.count ?? 0,
      pmCompliance: compliance,
      calibrationDue: calDueRes.count ?? 0,
      lowStockItems: lowStockCount,
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
      href: "/equipment",
    },
    {
      title: "Critical Equipment",
      value: String(metrics.criticalEquipment),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/equipment?criticality=critical",
    },
    {
      title: "PM Due Today",
      value: String(metrics.pmDueToday),
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/maintenance?due=today",
    },
    {
      title: "PM Overdue",
      value: String(metrics.pmOverdue),
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/maintenance?due=overdue",
    },
    {
      title: "Open Work Orders",
      value: String(metrics.openWorkOrders),
      icon: Wrench,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/work-orders?status=open",
    },
    {
      title: "Breakdowns (Month)",
      value: String(metrics.breakdownsThisMonth),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/breakdowns",
    },
    {
      title: "PM Compliance",
      value: `${metrics.pmCompliance}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/maintenance",
    },
    {
      title: "Calibration Due",
      value: String(metrics.calibrationDue),
      icon: ClipboardCheck,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      href: "/maintenance?due=upcoming",
    },
    {
      title: "Low Stock Items",
      value: String(metrics.lowStockItems),
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/inventory",
    },
    {
      title: "MTBF (hours)",
      value: String(metrics.mtbfHours),
      icon: TrendingUp,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/breakdowns",
    },
  ];

  const pmMax = Math.max(1, ...pmTrend.map((t) => t.due));

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
            <Link
              key={card.title}
              href={card.href}
              className="block transition hover:opacity-90"
            >
              <Card>
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
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>PM Due & Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              {pmTrend.every((t) => t.due === 0 && t.completed === 0) ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                  No PM activity yet in the last 6 months.
                </div>
              ) : (
                <div>
                  <div className="flex h-48 items-end gap-3">
                    {pmTrend.map((t) => {
                      const dueH = Math.max(
                        2,
                        Math.round((t.due / pmMax) * 120)
                      );
                      const compH =
                        t.due > 0
                          ? Math.round(
                              (Math.min(t.completed, t.due) / t.due) * dueH
                            )
                          : 0;
                      const pct =
                        t.due > 0
                          ? Math.round(
                              (Math.min(t.completed, t.due) / t.due) * 100
                            )
                          : t.completed > 0
                          ? 100
                          : 0;
                      return (
                        <div
                          key={t.label}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <span
                            className="text-xs font-medium text-gray-700"
                            title="completed / due"
                          >
                            {t.due > 0
                              ? `${Math.min(t.completed, t.due)}/${t.due}`
                              : t.completed > 0
                              ? `${t.completed}/—`
                              : "—"}
                          </span>
                          <div
                            className="relative w-full max-w-10 overflow-hidden rounded-t-md bg-gray-200"
                            style={{ height: `${dueH}px` }}
                          >
                            {compH > 0 && (
                              <div
                                className="absolute inset-x-0 bottom-0 bg-green-500"
                                style={{ height: `${compH}px` }}
                              />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {t.label} · {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-5 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
                      Completed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />
                      Due (not completed)
                    </span>
                  </div>
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
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-1.5">
                          <CalendarClock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {s.equipment_name || s.equipment_code || "—"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {s.schedule_no}
                            {s.equipment_code
                              ? ` · ${s.equipment_code}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 text-sm text-gray-600">
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

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function buildPmTrend(
  schedules: { next_run_at: string | null }[],
  runs: { completed_at: string | null }[],
  now: Date
): PmTrendPoint[] {
  const points: PmTrendPoint[] = [];
  const index = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = startOfMonth(now, i);
    points.push({ label: MONTH_LABELS[d.getMonth()], due: 0, completed: 0 });
    index.set(`${d.getFullYear()}-${d.getMonth()}`, points.length - 1);
  }
  for (const s of schedules) {
    if (!s.next_run_at) continue;
    const ts = new Date(s.next_run_at);
    if (isNaN(ts.getTime())) continue;
    const idx = index.get(`${ts.getFullYear()}-${ts.getMonth()}`);
    if (idx === undefined) continue;
    const mb = monthDiff(ts, now);
    if (mb >= 0 && mb < 6) points[idx].due += 1;
  }
  for (const r of runs) {
    if (!r.completed_at) continue;
    const ts = new Date(r.completed_at);
    if (isNaN(ts.getTime())) continue;
    const idx = index.get(`${ts.getFullYear()}-${ts.getMonth()}`);
    if (idx === undefined) continue;
    points[idx].completed += 1;
  }
  return points;
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