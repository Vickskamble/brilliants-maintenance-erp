"use client";

import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PermissionGate } from "@/components/auth/permission-gate";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import {
  FileText,
  AlertTriangle,
  ClipboardCheck,
  GitPullRequest,
  CheckSquare,
} from "lucide-react";

interface QualityModule {
  title: string;
  description: string;
  href: string;
  module: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const qualityModules: QualityModule[] = [
  {
    title: "Documents",
    description: "SOPs, policies and controlled documents with version control",
    href: "/quality/documents",
    module: "documents",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Deviations",
    description: "Non-conformances, incidents and deviations with investigation",
    href: "/quality/deviations",
    module: "deviation",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "CAPA",
    description: "Corrective and preventive actions with effectiveness checks",
    href: "/quality/capas",
    module: "capa",
    icon: ClipboardCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Change Control",
    description: "CCB review, risk assessment and change verification",
    href: "/quality/change-control",
    module: "change_control",
    icon: GitPullRequest,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function QualityLandingPage() {
  const { hasPermission } = useAuth();

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Quality"
          description="Quality management system workspace"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {qualityModules
            .filter((m) => hasPermission(m.module, "view"))
            .map((module) => (
              <PermissionGate key={module.href} module={module.module} action="view">
                <Link href={module.href}>
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
              </PermissionGate>
            ))}
        </div>

        {hasPermission("approval", "view") && (
          <Link href="/approvals" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <CheckSquare className="h-4 w-4" />
            Pending approvals
          </Link>
        )}
      </div>
    </ERPLayout>
  );
}