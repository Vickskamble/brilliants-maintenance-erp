import { createClient } from "@/lib/supabase/client";
import { queryScopeFilters } from "@/lib/auth/query-scope";
import type { QueryScope } from "@/lib/auth/query-scope";
import { format } from "date-fns";

export type ReportRange = "30" | "90" | "180" | "all";
export const REPORT_RANGE_OPTIONS: { value: ReportRange; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "all", label: "All time" },
];

export interface KpiSet {
  mtbfHours: number;
  mttrHours: number;
  downtimeHours: number;
  downtimeMinutes: number;
  pmCompliance: number;
  slaCompliance: number;
  procurementSpend: number;
  openWorkOrders: number;
  unresolvedBreakdowns: number;
}

export interface MonthBucket {
  label: string;
  value: number;
}

export interface ParetoItem {
  equipmentId: string;
  equipment: string;
  code: string;
  failures: number;
  downtimeHours: number;
  cumulative: number;
}

export interface PmTrendItem {
  label: string;
  total: number;
  completed: number;
  compliance: number;
}

export interface ReportsSnapshot {
  equipmentCount: number;
  workOrderCount: number;
  breakdownCount: number;
  sparePartCount: number;
  vendorCount: number;
  poCount: number;
  workOrderByStatus: { status: string; count: number }[];
  breakdownByStatus: { status: string; count: number }[];
  kpis: KpiSet;
  downtimeByMonth: MonthBucket[];
  costByMonth: MonthBucket[];
  pareto: ParetoItem[];
  pmTrend: PmTrendItem[];
}

interface SlaRuleRow {
  priority: string | null;
  duration_minutes: number;
  status: string;
  module: string;
}

interface BreakdownRow {
  id: string;
  equipment_id: string | null;
  reported_at: string;
  restored_at: string | null;
  downtime_minutes: number | null;
  status: string;
  severity: string | null;
}

interface WorkOrderRow {
  status: string;
  type: string;
  actual_end: string | null;
  created_at: string;
}

interface PurchaseOrderRow {
  status: string;
  total_amount: number;
  created_at: string;
}

function rangeStartDate(range: ReportRange): Date | null {
  if (range === "all") return null;
  const days = parseInt(range, 10);
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthLabel(value: Date): string {
  return format(value, "MMM yy");
}

function monthKey(value: string): string {
  return value.slice(0, 7);
}

function bucketMonths(
  rows: { ts: Date; value: number }[],
  keys: string[]
): MonthBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = monthKey(r.ts.toISOString());
    map.set(k, (map.get(k) ?? 0) + r.value);
  }
  return keys.map((k) => ({
    label: format(new Date(`${k}-01T00:00:00Z`), "MMM yy"),
    value: map.get(k) ?? 0,
  }));
}

function monthKeysBetween(fromIso: string | null): string[] {
  const keys: string[] = [];
  const end = new Date();
  const start = fromIso ? new Date(fromIso) : new Date(end.getTime() - 90 * 86400000);
  const cursor = new Date(start.getTime());
  cursor.setDate(1);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export async function loadReportsSnapshot(
  scope: QueryScope,
  range: ReportRange
): Promise<{ data: ReportsSnapshot | null; error: string | null }> {
  const supabase = createClient();
  const filters = queryScopeFilters(scope);
  const rangeStart = rangeStartDate(range);
  const rangeIso = rangeStart?.toISOString() ?? null;

  try {
    const scoped = (q: any) => {
      let query = q;
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }
      return query;
    };

    const [eq, ms, pl, sp, ven] = await Promise.all([
      scoped(supabase.from("equipment").select("id", { count: "exact", head: true })),
      scoped(supabase.from("maintenance_schedules").select("id", { count: "exact", head: true })),
      supabase.from("plants").select("id", { count: "exact", head: true }),
      scoped(supabase.from("spare_parts").select("id", { count: "exact", head: true })),
      scoped(supabase.from("vendors").select("id", { count: "exact", head: true })),
    ]);

    let woQuery: any = supabase.from("work_orders").select("status, type, actual_end, created_at");
    let bdQuery: any = supabase
      .from("breakdowns")
      .select("id, equipment_id, reported_at, restored_at, downtime_minutes, status, severity");
    let poQuery: any = supabase.from("purchase_orders").select("status, total_amount, created_at");
    woQuery = scoped(woQuery);
    bdQuery = scoped(bdQuery);
    poQuery = scoped(poQuery);
    if (rangeIso) {
      woQuery = woQuery.gte("created_at", rangeIso);
      bdQuery = bdQuery.gte("reported_at", rangeIso);
      poQuery = poQuery.gte("created_at", rangeIso);
    }

    const [woRes, bdRes, poRes] = await Promise.all([woQuery, bdQuery, poQuery]);
    if (woRes.error) throw woRes.error;
    if (bdRes.error) throw bdRes.error;
    if (poRes.error) throw poRes.error;

    const workOrders = (woRes.data ?? []) as WorkOrderRow[];
    const breakdowns = (bdRes.data ?? []) as BreakdownRow[];
    const purchaseOrders = (poRes.data ?? []) as PurchaseOrderRow[];

    let eqQuery: any = supabase
      .from("equipment")
      .select("id, equipment_code, equipment_name")
      .in("id", breakdowns.map((b) => b.equipment_id).filter(Boolean) as string[]);
    eqQuery = scoped(eqQuery);
    const eqRes = await eqQuery;
    const equipmentMap = new Map<string, string>();
    for (const e of eqRes.data ?? []) {
      equipmentMap.set(e.id, `${e.equipment_code} · ${e.equipment_name}`);
    }

    let slaQuery: any = supabase
      .from("sla_rules")
      .select("priority, duration_minutes, status, module");
    slaQuery = scoped(slaQuery.eq("module", "breakdown"));
    const slaRes = await slaQuery;
    const slaRules = ((slaRes.data ?? []) as SlaRuleRow[]).filter(
      (r) => r.status === "active"
    );

    // ---- KPIs ----
    const workOrderByStatus = aggregate(
      workOrders.map((w) => w.status)
    );
    const breakdownByStatus = aggregate(breakdowns.map((b) => b.status));

    const openWorkOrders = workOrders.filter(
      (w) => !["completed", "closed", "cancelled"].includes(w.status)
    ).length;
    const unresolvedBreakdowns = breakdowns.filter(
      (b) => ["reported", "diagnosing", "repairing"].includes(b.status)
    ).length;

    // MTTR: avg downtime of resolved breakdowns
    const resolved = breakdowns.filter((b) => b.downtime_minutes != null);
    const totalDowntimeMin = resolved.reduce((s, b) => s + (b.downtime_minutes ?? 0), 0);
    const mttrHours = resolved.length
      ? round1(totalDowntimeMin / resolved.length / 60)
      : 0;

    // MTBF: avg gap between consecutive failures per equipment
    const gaps: { dt: number }[] = [];
    const byEquip = new Map<string, Date[]>();
    for (const b of breakdowns) {
      if (!b.equipment_id) continue;
      const ts = new Date(b.reported_at);
      const arr = byEquip.get(b.equipment_id) ?? [];
      arr.push(ts);
      byEquip.set(b.equipment_id, arr);
    }
    for (const times of byEquip.values()) {
      times.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < times.length; i++) {
        gaps.push({ dt: (times[i].getTime() - times[i - 1].getTime()) / 3600000 });
      }
    }
    const mtbfHours = gaps.length
      ? round1(gaps.reduce((s, g) => s + g.dt, 0) / gaps.length)
      : 0;

    // SLA compliance
    let slaMet = 0;
    let slaTotal = 0;
    for (const b of breakdowns) {
      if (!b.downtime_minutes && !(b.restored_at && b.reported_at)) continue;
      const allowed =
        slaRules.find((r) => r.priority === b.severity || r.priority == null)
          ?.duration_minutes ?? 480;
      const actual =
        b.downtime_minutes ??
        Math.max(0, (new Date(b.restored_at!).getTime() - new Date(b.reported_at).getTime()) / 60000);
      slaTotal++;
      if (actual <= allowed) slaMet++;
    }

    // PM compliance
    const preventive = workOrders.filter((w) => w.type === "preventive");
    const pmCompleted = preventive.filter((w) =>
      ["completed", "closed"].includes(w.status)
    ).length;

    // Procurement spend
    const spend = purchaseOrders
      .filter((p) => p.status !== "draft" && p.status !== "cancelled")
      .reduce((s, p) => s + (Number(p.total_amount) || 0), 0);

    // ---- Series ----
    const monthKeys = monthKeysBetween(rangeIso);
    const downtimeRows = breakdowns
      .filter((b) => b.downtime_minutes != null)
      .map((b) => ({ ts: new Date(b.reported_at), value: b.downtime_minutes! }));
    const downtimeByMonth = bucketMonths(downtimeRows, monthKeys).map((m) => ({
      label: m.label,
      value: round1(m.value / 60),
    }));

    const costRows = purchaseOrders
      .filter((p) => p.status !== "draft" && p.status !== "cancelled")
      .map((p) => ({ ts: new Date(p.created_at), value: Number(p.total_amount) || 0 }));
    const costByMonth = bucketMonths(costRows, monthKeys).map((m) => ({
      label: m.label,
      value: round1(m.value),
    }));

    // Pareto by equipment
    const byEquipment = new Map<
      string,
      { failures: number; downtimeMinutes: number }
    >();
    for (const b of breakdowns) {
      if (!b.equipment_id) continue;
      const cur = byEquipment.get(b.equipment_id) ?? { failures: 0, downtimeMinutes: 0 };
      cur.failures += 1;
      cur.downtimeMinutes += b.downtime_minutes ?? 0;
      byEquipment.set(b.equipment_id, cur);
    }
    const paretoList = [...byEquipment.entries()]
      .map(([id, v]) => ({
        equipmentId: id,
        equipment: equipmentMap.get(id) ?? "Unknown",
        code: id.slice(0, 8),
        failures: v.failures,
        downtimeHours: round1(v.downtimeMinutes / 60),
        cumulative: 0,
      }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 10);
    const totalFailures = paretoList.reduce((s, p) => s + p.failures, 0);
    let running = 0;
    for (const p of paretoList) {
      running += p.failures;
      p.cumulative = totalFailures ? round1((running / totalFailures) * 100) : 0;
    }

    // PM trend by month
    const pmByMonth = new Map<string, { total: number; completed: number }>();
    for (const w of preventive) {
      const k = monthKey(new Date(w.created_at).toISOString());
      const cur = pmByMonth.get(k) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (["completed", "closed"].includes(w.status)) cur.completed += 1;
      pmByMonth.set(k, cur);
    }
    const pmTrend = monthKeys
      .map((k) => {
        const v = pmByMonth.get(k) ?? { total: 0, completed: 0 };
        return {
          label: format(new Date(`${k}-01T00:00:00Z`), "MMM yy"),
          total: v.total,
          completed: v.completed,
          compliance: v.total ? round1((v.completed / v.total) * 100) : 0,
        };
      })
      .filter((m) => m.total > 0);

    return {
      data: {
        equipmentCount: eq.count ?? 0,
        workOrderCount: workOrders.length,
        breakdownCount: breakdowns.length,
        sparePartCount: sp.count ?? 0,
        vendorCount: ven.count ?? 0,
        poCount: purchaseOrders.length,
        workOrderByStatus,
        breakdownByStatus,
        kpis: {
          mtbfHours,
          mttrHours,
          downtimeHours: round1(totalDowntimeMin / 60),
          downtimeMinutes: totalDowntimeMin,
          pmCompliance: pct(pmCompleted, preventive.length),
          slaCompliance: pct(slaMet, slaTotal),
          procurementSpend: round1(spend),
          openWorkOrders,
          unresolvedBreakdowns,
        },
        downtimeByMonth,
        costByMonth,
        pareto: paretoList,
        pmTrend,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message ?? String(err) };
  }
}

function aggregate(values: (string | null)[]): { status: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const v of values) {
    const key = v ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function formatCurrency(v: number): string {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}