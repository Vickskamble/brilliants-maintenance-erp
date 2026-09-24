"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import {
  APP_NOTIFICATION_TYPES,
  AppNotificationRow,
  NOTIFICATION_TYPE_LABELS,
  listAppNotifications,
  listNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  updateNotificationPreference,
} from "@/services/notifications";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Gauge,
  PackageX,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pm_due: <Wrench className="h-4 w-4" />,
  pm_overdue: <Wrench className="h-4 w-4" />,
  calibration_due: <Gauge className="h-4 w-4" />,
  wo_assigned: <ClipboardList className="h-4 w-4" />,
  breakdown_sla: <AlertTriangle className="h-4 w-4" />,
  low_stock: <PackageX className="h-4 w-4" />,
  approval_required: <ShieldCheck className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  pm_due: "info",
  pm_overdue: "warning",
  calibration_due: "info",
  wo_assigned: "default",
  breakdown_sla: "danger",
  low_stock: "warning",
  approval_required: "success",
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<AppNotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    await refreshNotifications();
    const [list, prefsRes] = await Promise.all([
      listAppNotifications({ limit: 200 }),
      listNotificationPreferences(),
    ]);
    setItems(list.data);
    setLoadError(list.error);
    const map: Record<string, boolean> = {};
    for (const p of prefsRes.data) map[p.type] = p.in_app;
    setPrefs(map);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (unreadOnly && n.read_at) return false;
      return true;
    });
  }, [items, typeFilter, unreadOnly]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items]
  );

  async function openItem(n: AppNotificationRow) {
    if (!n.read_at) {
      void markNotificationRead(n.id);
      setItems((list) =>
        list.map((i) =>
          i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i
        )
      );
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setItems((list) => list.map((i) => ({ ...i, read_at: now })));
  }

  async function togglePref(type: string, inApp: boolean) {
    if (!user) return;
    setSaving(true);
    await updateNotificationPreference(user.id, type, { in_app: inApp });
    setPrefs((m) => ({ ...m, [type]: inApp }));
    setSaving(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="All in-app alerts from maintenance, inventory and approvals."
          backHref="/dashboard"
          action={
            <Button onClick={() => void markAll()} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          }
        />

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-56"
          >
            <option value="all">All types</option>
            {APP_NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(unreadOnly && "bg-blue-50 text-blue-700")}
          >
            {unreadOnly ? "Unread only" : "All"}
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            {isLoading && items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-gray-400">
                  Loading notifications...
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-sm text-gray-400">
                  <Bell className="mb-2 h-8 w-8" />
                  No notifications match your filters
                </CardContent>
              </Card>
            ) : (
              filtered.map((n) => {
                const Icon =
                  TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4" />;
                return (
                  <button
                    key={n.id}
                    onClick={() => void openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30",
                      !n.read_at && "border-blue-200 bg-blue-50/40"
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      {Icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {n.title}
                        </span>
                        <Badge variant={TYPE_COLORS[n.type] ?? "default"}>
                          {NOTIFICATION_TYPE_LABELS[n.type as keyof typeof NOTIFICATION_TYPE_LABELS] ??
                            n.type}
                        </Badge>
                      </span>
                      {n.message && (
                        <span className="mt-0.5 block text-sm text-gray-600">
                          {n.message}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-gray-400">
                        {formatRelativeTime(n.created_at)}
                        {n.link && " · Click to open"}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  In-app preferences
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Choose which alert types appear in the bell. Email delivery
                  arrives in a later phase.
                </p>
                <div className="mt-4 space-y-2">
                  {APP_NOTIFICATION_TYPES.map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {NOTIFICATION_TYPE_LABELS[t]}
                      </span>
                      <Checkbox
                        checked={prefs[t] ?? true}
                        onCheckedChange={(checked) =>
                          void togglePref(t, checked === true)
                        }
                        disabled={saving}
                      />
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ERPLayout>
  );
}