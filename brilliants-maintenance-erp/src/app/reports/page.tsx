"use client";

import { useCallback, useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  loadReportsSnapshot,
  REPORT_RANGE_OPTIONS,
  formatCurrency,
  ReportRange,
  ReportsSnapshot,
} from "@/services/reports";
import { exportRowsToCsv } from "@/components/erp/table/erp-table-export";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Printer,
  Download,
  Gauge,
  Timer,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line,
} from "recharts";

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

function statusVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "info" {
  if (["completed", "restored", "active", "approved", "pass"].includes(status))
    return "success";
  if (["reported", "overdue", "fail"].includes(status)) return "danger";
  if (["in_progress", "assigned", "repairing"].includes(status))
    return "warning";
  if (["planned", "scheduled"].includes(status)) return "info";
  return "default";
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 12,
};

export default function ReportsPage() {
  const scope = useQueryScope();
  const [range, setRange] = useState<ReportRange>("90");
  const [data, setData] = useState<ReportsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await loadReportsSnapshot(scope, range);
    setData(res.data);
    setLoadError(res.error);
    setIsLoading(false);
  }, [scope, range]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [];
    rows.push(["KPI", "Value"]);
    rows.push(["Equipment", data.equipmentCount]);
    rows.push(["Work orders", data.workOrderCount]);
    rows.push(["Breakdowns", data.breakdownCount]);
    rows.push(["Open work orders", data.kpis.openWorkOrders]);
    rows.push(["Unresolved breakdowns", data.kpis.unresolvedBreakdowns]);
    rows.push(["MTBF (hours)", data.kpis.mtbfHours]);
    rows.push(["MTTR (hours)", data.kpis.mttrHours]);
    rows.push(["Total downtime (hours)", data.kpis.downtimeHours]);
    rows.push(["PM compliance (%)", data.kpis.pmCompliance]);
    rows.push(["SLA compliance (%)", data.kpis.slaCompliance]);
    rows.push(["Procurement spend", data.kpis.procurementSpend]);
    rows.push([]);
    rows.push(["Work orders by status", "Count"]);
    for (const s of data.workOrderByStatus) rows.push([s.status, s.count]);
    rows.push([]);
    rows.push(["Breakdowns by status", "Count"]);
    for (const s of data.breakdownByStatus) rows.push([s.status, s.count]);
    rows.push([]);
    rows.push(["Downtime by month", "Hours"]);
    for (const m of data.downtimeByMonth) rows.push([m.label, m.value]);
    rows.push([]);
    rows.push(["Procurement spend by month", "Amount"]);
    for (const m of data.costByMonth) rows.push([m.label, m.value]);
    rows.push([]);
    rows.push(["Failure Pareto", "Failures", "Downtime (h)", "Cumulative %"]);
    for (const p of data.pareto)
      rows.push([p.equipment, p.failures, p.downtimeHours, p.cumulative]);
    rows.push([]);
    rows.push(["PM compliance trend", "Total", "Completed", "Compliance %"]);
    for (const m of data.pmTrend)
      rows.push([m.label, m.total, m.completed, m.compliance]);
    exportRowsToCsv("erp-reports", [], rows);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          description="MTBF, MTTR, downtime, PM and SLA compliance, procurement spend and failure Pareto."
          className="no-print"
          action={
            <div className="no-print flex items-center gap-2">
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value as ReportRange)}
                className="w-44"
              >
                {REPORT_RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Button variant="outline" onClick={() => void exportCsv()}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print / PDF
              </Button>
            </div>
          }
        />

        <div className="print-only hidden">
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generated {new Date().toLocaleString()} ·{" "}
            {REPORT_RANGE_OPTIONS.find((o) => o.value === range)?.label}
          </p>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {isLoading || !data ? (
          <LoadingPage />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                icon={<Timer className="h-5 w-5 text-blue-600" />}
                label="MTTR"
                value={`${data.kpis.mttrHours} h`}
                sub="Avg repair time"
                accent="bg-blue-50"
              />
              <KpiCard
                icon={<Activity className="h-5 w-5 text-indigo-600" />}
                label="MTBF"
                value={`${data.kpis.mtbfHours} h`}
                sub="Avg between failures"
                accent="bg-indigo-50"
              />
              <KpiCard
                icon={<Gauge className="h-5 w-5 text-red-600" />}
                label="Downtime"
                value={`${data.kpis.downtimeHours} h`}
                sub={`${data.kpis.downtimeMinutes} min total`}
                accent="bg-red-50"
              />
              <KpiCard
                icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
                label="PM Compliance"
                value={`${data.kpis.pmCompliance}%`}
                sub="Preventive WOs closed"
                accent="bg-emerald-50"
              />
              <KpiCard
                icon={<ClipboardList className="h-5 w-5 text-amber-600" />}
                label="SLA Compliance"
                value={`${data.kpis.slaCompliance}%`}
                sub="Breakdowns within SLA"
                accent="bg-amber-50"
              />
              <KpiCard
                icon={<Banknote className="h-5 w-5 text-purple-600" />}
                label="Procurement"
                value={formatCurrency(data.kpis.procurementSpend)}
                sub={`${data.poCount} POs in range`}
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
                    <div className="flex flex-col items-center gap-2 sm:flex-row">
                      <div className="h-64 w-full sm:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.workOrderByStatus}
                              dataKey="count"
                              nameKey="status"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {data.workOrderByStatus.map((s, i) => (
                                <Cell
                                  key={s.status}
                                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="w-full space-y-1.5 sm:w-1/2">
                        {data.workOrderByStatus.map((s) => (
                          <li
                            key={s.status}
                            className="flex items-center justify-between text-sm"
                          >
                            <Badge variant={statusVariant(s.status)}>
                              {s.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="font-medium text-gray-700">
                              {s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                    <div className="flex flex-col items-center gap-2 sm:flex-row">
                      <div className="h-64 w-full sm:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.breakdownByStatus}
                              dataKey="count"
                              nameKey="status"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {data.breakdownByStatus.map((s, i) => (
                                <Cell
                                  key={s.status}
                                  fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="w-full space-y-1.5 sm:w-1/2">
                        {data.breakdownByStatus.map((s) => (
                          <li
                            key={s.status}
                            className="flex items-center justify-between text-sm"
                          >
                            <Badge variant={statusVariant(s.status)}>
                              {s.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="font-medium text-gray-700">
                              {s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Downtime by Month (hours)</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.downtimeByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Procurement Spend by Month</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.costByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: any) => [
                          formatCurrency(Number(v)),
                          "Spend",
                        ]}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Failure Pareto (top equipment)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {data.pareto.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No breakdown data to rank.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.pareto}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="equipment"
                          fontSize={10}
                          interval={0}
                          tickFormatter={(v: string) =>
                            v.split(" · ")[1] ?? v
                          }
                        />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          fontSize={12}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="failures"
                          name="Failures"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumulative"
                          name="Cumulative %"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PM Compliance Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {data.pmTrend.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No preventive work orders in range.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.pmTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          fontSize={12}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="total"
                          name="Total PM WOs"
                          fill="#93c5fd"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="completed"
                          name="Completed"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="compliance"
                          name="Compliance %"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
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

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}
          >
            {icon}
          </div>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{sub}</p>
      </CardContent>
    </Card>
  );
}