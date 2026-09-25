"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getDuePm, type KioskPm } from "@/services/kiosk";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlarmClock } from "lucide-react";

export default function KioskPmDuePage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<KioskPm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    if (!profile || !user) return;
    const rows = await getDuePm(profile.name, user.email);
    setItems(rows);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, [profile, user]);

  useEffect(() => {
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          PM due in next 7 days · {items.length}
        </p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void load();
          }}
          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlarmClock className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">
            No preventive maintenance due right now
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((pm) => (
          <button
            key={pm.id}
            type="button"
onClick={() =>
              pm.equipment_id
                ? router.push(`/kiosk/equipment/${pm.equipment_id}`)
                : undefined
            }
            className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {pm.task_type ?? "Preventive Maintenance"}
              </span>
              <Badge variant="warning">Due</Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-blue-600">
              {pm.schedule_no ?? pm.id.slice(0, 8)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="truncate">
                {pm.equipment?.equipment_code ?? "General"}
              </span>
              <span>·</span>
              <span>{pm.plants?.name ?? "-"}</span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-amber-600">
              Due{" "}
              {new Date(pm.next_run_at ?? Date.now()).toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short", year: "numeric" }
              )}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}