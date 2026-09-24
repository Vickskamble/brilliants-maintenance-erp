"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
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
import { useEffect, useRef, useState } from "react";
import {
  AppNotificationRow,
  listAppNotifications,
  listUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
} from "@/services/notifications";
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

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (!user) return;
    await refreshNotifications();
    const [count, list] = await Promise.all([
      listUnreadNotificationCount(),
      listAppNotifications({ limit: 10 }),
    ]);
    setUnread(count);
    setItems(list.data);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    setLoading(true);
    if (!open) await refresh();
    setLoading(false);
    setOpen((v) => !v);
  }

  async function openItem(n: AppNotificationRow) {
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      void markNotificationRead(n.id);
      setItems((list) =>
        list.map((i) =>
          i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i
        )
      );
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    await markAllNotificationsRead();
    setUnread(0);
    setItems((list) =>
      list.map((i) => ({ ...i, read_at: new Date().toISOString() }))
    );
  }

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => void toggleOpen()}
        className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <button
              onClick={() => void markAll()}
              disabled={unread === 0}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                Loading...
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </p>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4" />;
                return (
                  <button
                    key={n.id}
                    onClick={() => void openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50",
                      !n.read_at && "bg-blue-50/40"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      {Icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {n.title}
                      </span>
                      {n.message && (
                        <span className="block truncate text-xs text-gray-500">
                          {n.message}
                        </span>
                      )}
                      <span className="block pt-0.5 text-[11px] text-gray-400">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
            className="w-full border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}