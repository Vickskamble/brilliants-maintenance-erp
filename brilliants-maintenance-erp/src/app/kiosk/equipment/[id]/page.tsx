"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  getEquipmentHub,
  performPm,
  updateWorkOrderStatusKiosk,
  type EquipmentHubRow,
} from "@/services/kiosk";
import { StatusBadge } from "@/components/ui/badge";
import { PRIORITY_LEVELS, WORK_ORDER_TYPES } from "@/lib/constants";
import {
  ArrowLeft,
  RefreshCw,
  Play,
  CheckCircle2,
  ClipboardCheck,
  Wrench,
  Package,
} from "lucide-react";

export default function KioskEquipmentHubPage() {
  const params = useParams<{ id: string }>();
  const equipmentId = params.id;
  const router = useRouter();
  const { user, organization, plant } = useAuth();

  const [hub, setHub] = useState<EquipmentHubRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    const row = await getEquipmentHub(equipmentId);
    setHub(row);
    setIsLoading(false);
  }, [equipmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleStatus(workOrder: { id: string; title: string }, status: string) {
    setBusyId(workOrder.id);
    setMessage(null);
    const { error } = await updateWorkOrderStatusKiosk(
      workOrder.id,
      status,
      user?.id
    );
    setBusyId(null);
    if (error) {
      setMessage({ text: `Could not update "${workOrder.title}": ${error}`, kind: "err" });
    } else {
      setMessage({
        text: `"${workOrder.title}" ${status === "completed" ? "marked complete" : "started"}.`,
        kind: "ok",
      });
      await load();
    }
  }

  async function handlePmComplete(pm: { id: string; task_type: string | null }) {
    const notes =
      window.prompt(`Notes for ${pm.task_type ?? "PM"} (optional)`, "") ?? null;
    setBusyId(pm.id);
    setMessage(null);
    const { error } = await performPm(
      pm.id,
      notes?.trim() || null,
      { organizationId: organization?.id ?? null, plantId: plant?.id ?? null },
      { id: user?.id, name: undefined }
    );
    setBusyId(null);
    if (error) {
      setMessage({ text: `Could not complete PM: ${error}`, kind: "err" });
    } else {
      setMessage({
        text: `PM completed. Next run scheduled automatically.`,
        kind: "ok",
      });
      await load();
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <Package className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-gray-700">
          Equipment not found
        </p>
        <button
          type="button"
          onClick={() => router.push("/kiosk")}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to scan
        </button>
      </div>
    );
  }

  const activeOrders = hub.work_orders;
  const duePms = hub.maintenance_schedules;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {hub.equipment_name}
            </h1>
            <p className="mt-0.5 font-mono text-sm text-blue-600">
              {hub.equipment_code}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500">{hub.plants?.name ?? "-"}</p>
              {hub.status && <StatusBadge status={hub.status} />}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void load();
            }}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-gray-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        {hub.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hub.photo_url}
            alt={hub.equipment_name}
            className="mt-3 h-24 w-full rounded-xl object-cover"
          />
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            message.kind === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Wrench className="h-4 w-4 text-blue-600" />
          Active Work Orders · {activeOrders.length}
        </div>
        {activeOrders.length === 0 && (
          <p className="mt-2 rounded-xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
            No active work orders for this equipment
          </p>
        )}
        <div className="mt-3 space-y-3">
          {activeOrders.map((wo) => {
            const prio = PRIORITY_LEVELS.find((p) => p.value === wo.priority);
            const typeInfo = WORK_ORDER_TYPES.find((t) => t.value === wo.type);
            const isBusy = busyId === wo.id;
            const canStart = wo.status === "assigned" || wo.status === "on_hold";
            const canComplete = wo.status === "in_progress";
            return (
              <div key={wo.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {wo.work_order_no}
                  </span>
                  <StatusBadge status={wo.status} />
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {wo.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {prio && <span className={prio.color}>{prio.label}</span>}
                  {typeInfo && (
                    <span className={typeInfo.color}>{typeInfo.label}</span>
                  )}
                  {wo.assigned_to && <span>→ {wo.assigned_to}</span>}
                </div>
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
                  {!canStart && !canComplete && (
                    <p className="w-full text-center text-xs text-slate-400">
                      Waiting for approval/assignment before you can start.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ClipboardCheck className="h-4 w-4 text-amber-600" />
          Due Maintenance · {duePms.length}
        </div>
        {duePms.length === 0 && (
          <p className="mt-2 rounded-xl bg-white p-4 text-center text-sm text-slate-400 shadow-sm">
            No preventive maintenance due for this equipment
          </p>
        )}
        <div className="mt-3 space-y-3">
          {duePms.map((pm) => {
            const isBusy = busyId === pm.id;
            return (
              <div key={pm.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {pm.task_type ?? "Preventive Maintenance"}
                  </p>
                  <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    Due
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-blue-600">
                  {pm.schedule_no ?? pm.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Due{" "}
                  {new Date(pm.next_run_at ?? Date.now()).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                  {pm.assigned_to ? ` · ${pm.assigned_to}` : ""}
                </p>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handlePmComplete(pm)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition active:bg-amber-600 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isBusy ? "Working..." : "Complete PM"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}