"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  getMyWorkOrders,
  updateWorkOrderStatusKiosk,
  type KioskWorkOrder,
} from "@/services/kiosk";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { PRIORITY_LEVELS, WORK_ORDER_TYPES } from "@/lib/constants";
import {
  RefreshCw,
  ClipboardList,
  Play,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export default function KioskMyWorkPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<KioskWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    if (!profile || !user) return;
    const plantId = profile.plant_id ?? null;
    const rows = await getMyWorkOrders(plantId);
    setItems(rows);
    setIsLoading(false);
  }, [profile, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = () => {
    setIsLoading(true);
    void load();
  };

  async function handleStatus(wo: KioskWorkOrder, status: string) {
    setBusyId(wo.id);
    setMessage(null);
    const { error } = await updateWorkOrderStatusKiosk(wo.id, status, user?.id);
    setBusyId(null);
    if (error) {
      setMessage({ text: `Could not update "${wo.title}": ${error}`, kind: "err" });
    } else {
      setMessage({
        text:
          status === "completed"
            ? `"${wo.work_order_no}" marked complete.`
            : `"${wo.work_order_no}" started.`,
        kind: "ok",
      });
      void load();
    }
  }

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
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Work Orders · {items.length}
          </p>
          <p className="text-xs text-gray-400">Submitted, approved and assigned WO of this plant</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">
            No open work orders in this plant
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((wo) => {
          const prio = PRIORITY_LEVELS.find((p) => p.value === wo.priority);
          const typeInfo = WORK_ORDER_TYPES.find((t) => t.value === wo.type);
          const isBusy = busyId === wo.id;
          const canStart = ["submitted", "approved", "assigned", "on_hold"].includes(
            wo.status
          );
          const canComplete = wo.status === "in_progress";
          const clickable = Boolean(wo.equipment_id);
          return (
            <div
              key={wo.id}
              className="rounded-2xl bg-white p-4 shadow-sm transition hover:bg-slate-50"
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() =>
                  wo.equipment_id && router.push(`/kiosk/equipment/${wo.equipment_id}`)
                }
                className={`block w-full text-left ${clickable ? "" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {wo.work_order_no}
                  </span>
                  <span className="flex items-center gap-1">
                    <StatusBadge status={wo.status} />
                    {clickable && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-gray-900">{wo.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="truncate">
                    {wo.equipment?.equipment_code ?? "General"}
                  </span>
                  {wo.plants?.name && <span>· {wo.plants.name}</span>}
                  {prio && <Badge className={prio.color}>{prio.label}</Badge>}
                  {typeInfo && <Badge className={typeInfo.color}>{typeInfo.label}</Badge>}
                  {wo.assigned_to && <span>→ {wo.assigned_to}</span>}
                </div>
              </button>

              {(canStart || canComplete) && (
                <div className="mt-3 flex gap-2">
                  {canStart && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleStatus(wo, "in_progress")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition active:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {isBusy ? "Working..." : "Start"}
                    </button>
                  )}
                  {canComplete && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleStatus(wo, "completed")}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition active:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isBusy ? "Working..." : "Complete"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}