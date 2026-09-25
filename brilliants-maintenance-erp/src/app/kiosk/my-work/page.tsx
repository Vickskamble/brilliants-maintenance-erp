"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getMyWorkOrders, type KioskWorkOrder } from "@/services/kiosk";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PRIORITY_LEVELS, WORK_ORDER_TYPES } from "@/lib/constants";
import { RefreshCw, ClipboardList } from "lucide-react";

export default function KioskMyWorkPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<KioskWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!profile || !user) return;
    const rows = await getMyWorkOrders(profile.name, user.email);
    setItems(rows);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, [profile, user]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => {
    setIsLoading(true);
    void load();
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Assigned to me · {items.length}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">
            No active work orders assigned to you
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((wo) => {
          const prio = PRIORITY_LEVELS.find((p) => p.value === wo.priority);
          const typeInfo = WORK_ORDER_TYPES.find((t) => t.value === wo.type);
          return (
            <button
              key={wo.id}
              type="button"
              onClick={() =>
                wo.equipment_id
                  ? router.push(`/kiosk/equipment/${wo.equipment_id}`)
                  : undefined
              }
              className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-blue-600">
                  {wo.work_order_no}
                </span>
                <StatusBadge status={wo.status} />
              </div>
              <p className="mt-1.5 text-sm font-semibold text-gray-900">
                {wo.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="truncate">
                  {wo.equipment?.equipment_code ?? "General"}
                </span>
                {prio && (
                  <Badge className={prio.color}>{prio.label}</Badge>
                )}
                {typeInfo && (
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}