"use client";

import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Database, Timer, Users, Shield, Building2, Key, Workflow, Activity } from "lucide-react";

const settingsModules = [
  {
    title: "Users",
    description: "Manage user accounts and profiles",
    href: "/settings/users",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Roles",
    description: "Manage roles and permission assignments",
    href: "/settings/roles",
    icon: Shield,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Plants",
    description: "Manage plant locations and assignments",
    href: "/settings/plants",
    icon: Building2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Permissions",
    description: "View all system permissions",
    href: "/settings/permissions",
    icon: Key,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Master Data",
    description: "Departments, sections, areas, locations, categories",
    href: "/settings/master-data",
    icon: Database,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    title: "Workflows",
    description: "Status-transition flows and approvals per module",
    href: "/settings/workflows",
    icon: Workflow,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "SLA Rules",
    description: "Response and resolution targets per module",
    href: "/settings/sla",
    icon: Timer,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    title: "Audit Logs",
    description: "Central activity trail across modules",
    href: "/settings/audit-logs",
    icon: Activity,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
];

export default function SettingsPage() {
  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Manage system configuration"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {settingsModules.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="transition-colors hover:border-blue-200 hover:bg-blue-50/50">
                <CardContent>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${module.bg}`}
                  >
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-gray-900">
                    {module.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {module.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ERPLayout>
  );
}
