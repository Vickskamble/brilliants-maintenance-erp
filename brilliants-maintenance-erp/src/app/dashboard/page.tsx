"use client";

import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/context";
import {
  Cog,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
} from "lucide-react";

const kpiCards = [
  {
    title: "Total Equipment",
    value: "--",
    icon: Cog,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Critical Equipment",
    value: "--",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    title: "PM Due Today",
    value: "--",
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    title: "PM Overdue",
    value: "--",
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Open Work Orders",
    value: "--",
    icon: Wrench,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Breakdowns (Month)",
    value: "--",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    title: "PM Compliance",
    value: "--%",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Calibration Due",
    value: "--",
    icon: ClipboardCheck,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    title: "Low Stock Items",
    value: "--",
    icon: Package,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "MTBF (hours)",
    value: "--",
    icon: TrendingUp,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

export default function DashboardPage() {
  const { organization } = useAuth();

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
              <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                Chart will be displayed here when data is available.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PM Compliance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                Chart will be displayed here when data is available.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}
