"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import {
  LayoutDashboard,
  Cog,
  Wrench,
  ClipboardList,
  AlertTriangle,
  ClipboardCheck,
  Gauge,
  Package,
  Truck,
  CalendarX,
  BarChart3,
  Settings,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { countPendingApprovals, type ApproverContext } from "@/services/approvals";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/dashboard", module: "dashboard", action: "view" },
  { label: "Equipment", href: "/equipment", module: "equipment", action: "view" },
  { label: "Assets", href: "/assets", module: "equipment", action: "view" },
  { label: "Maintenance", href: "/maintenance", module: "maintenance", action: "view" },
  { label: "Work Orders", href: "/work-orders", module: "work_order", action: "view" },
  { label: "Breakdowns", href: "/breakdowns", module: "breakdown", action: "view" },
  { label: "Inspections", href: "/inspections", module: "inspection", action: "view" },
  { label: "Calibration", href: "/calibration", module: "calibration", action: "view" },
  { label: "Inventory", href: "/inventory", module: "inventory", action: "view" },
  { label: "Vendors", href: "/vendors", module: "vendor", action: "view" },
  { label: "Shutdown", href: "/shutdowns", module: "shutdown", action: "view" },
  { label: "Reports", href: "/reports", module: "reports", action: "view" },
  { label: "Approvals", href: "/approvals", module: "approval", action: "view" },
  { label: "Settings", href: "/settings", module: "settings", action: "view" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Equipment: Cog,
  Assets: GitBranch,
  Maintenance: Wrench,
  "Work Orders": ClipboardList,
  Breakdowns: AlertTriangle,
  Inspections: ClipboardCheck,
  Calibration: Gauge,
  Inventory: Package,
  Vendors: Truck,
  Shutdown: CalendarX,
  Reports: BarChart3,
  Approvals: CheckSquare,
  Settings: Settings,
};

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, profile, roles, permissions, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || !hasPermission("approval", "view")) return;
    const ctx: ApproverContext = {
      userId: user.id,
      userName: profile?.name ?? user.email ?? "User",
      roleCodes: roles.map((r) => r.code),
      hasPermission,
    };
    void countPendingApprovals(ctx).then(setPendingCount);
  }, [pathname, user?.id]);

  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    hasPermission(item.module, item.action)
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex transform flex-col border-r border-gray-200 bg-white transition-all duration-300 lg:static lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Brilliants ERP
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = ICON_MAP[item.label];
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                  {!collapsed && <span>{item.label}</span>}
                  {item.href === "/approvals" &&
                    pendingCount > 0 &&
                    !collapsed && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </aside>
    </>
  );
}
