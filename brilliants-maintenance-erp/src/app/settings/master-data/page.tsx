import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  Building2,
  ChevronRight,
  FolderTree,
  Layers,
  MapPin,
  Map,
  Wallet,
} from "lucide-react";

const ENTITIES = [
  {
    name: "Departments",
    description: "Organizational units such as Mechanical, Electrical, Production.",
    href: "/settings/master-data/departments",
    icon: Building2,
  },
  {
    name: "Sections",
    description: "Sub-units within a department (Boiler House, Switchgear Yard).",
    href: "/settings/master-data/sections",
    icon: Layers,
  },
  {
    name: "Areas",
    description: "Zones inside a section for locating assets.",
    href: "/settings/master-data/areas",
    icon: Map,
  },
  {
    name: "Locations",
    description: "Physical bays/positions where equipment sits.",
    href: "/settings/master-data/locations",
    icon: MapPin,
  },
  {
    name: "Cost Centers",
    description: "Budget categories for maintenance spend.",
    href: "/settings/master-data/cost-centers",
    icon: Wallet,
  },
  {
    name: "Asset Categories",
    description: "Equipment classification (Pumps, Compressors, HVAC).",
    href: "/settings/master-data/asset-categories",
    icon: FolderTree,
  },
  {
    name: "Criticality",
    description: "Asset importance profiles with scores and levels.",
    href: "/settings/master-data/criticality",
    icon: Activity,
  },
];

export default function MasterDataPage() {
  return (
    <ERPLayout>
      <PermissionGate module="settings" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Master Data"
            description="Manage the shared reference data used across maintenance modules."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENTITIES.map((entity) => {
              const Icon = entity.icon;
              return (
                <Link key={entity.href} href={entity.href}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex h-full items-start justify-between gap-3 p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2.5">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entity.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{entity.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}