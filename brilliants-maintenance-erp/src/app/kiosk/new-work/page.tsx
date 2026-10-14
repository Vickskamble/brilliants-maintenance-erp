"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { searchEquipment } from "@/services/kiosk";
import { PRIORITY_LEVELS, WORK_ORDER_TYPES } from "@/lib/constants";
import {
  ClipboardPlus,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function KioskNewWorkPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, organization, plant } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("corrective");
  const [priority, setPriority] = useState("medium");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipmentResults, setEquipmentResults] = useState<
    Array<{ id: string; equipment_code: string; equipment_name: string }>
  >([]);
  const [selected, setSelected] = useState<{
    id: string;
    equipment_code: string;
    equipment_name: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  async function search() {
    const q = equipmentQuery.trim();
    if (!q) return;
    setIsSearching(true);
    const rows = await searchEquipment(q, {
      organizationId: organization?.id ?? null,
      plantId: plant?.id ?? null,
    });
    setIsSearching(false);
    setEquipmentResults(rows);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Work title is required");
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

    setIsSaving(true);
    const plantId = profile?.plant_id ?? plant?.id ?? null;
    const { data, error: insertError } = await supabase
      .from("work_orders")
      .insert({
        work_order_no: `WO-${datePart}-${rand}`,
        organization_id: organization?.id ?? profile?.organization_id ?? null,
        plant_id: plantId,
        equipment_id: selected?.id ?? null,
        type,
        priority,
        status: "submitted",
        title: trimmedTitle,
        description: description.trim() || null,
        created_by: user?.id ?? null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("id, work_order_no")
      .single();
    setIsSaving(false);

    if (insertError) {
      setMessage({ text: `Could not create work order: ${insertError.message}`, kind: "err" });
      return;
    }

    setMessage({
      text: `Work order ${data?.work_order_no ?? ""} created.`,
      kind: "ok",
    });
    const woId = data?.id;
    setTimeout(() => {
      if (selected?.id) {
        router.push(`/kiosk/equipment/${selected.id}`);
      } else if (woId) {
        router.push("/kiosk/my-work");
      } else {
        router.push("/kiosk");
      }
    }, 900);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ClipboardPlus className="h-4 w-4 text-blue-600" />
          New Work Order
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Report a fault or request work. It is submitted for approval automatically.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
            message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.kind === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-gray-600">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Motor bearing noise"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          />
          <label className="mt-4 block text-xs font-medium text-gray-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about the problem (optional)"
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-gray-600">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            {WORK_ORDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-xs font-medium text-gray-600">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            {PRIORITY_LEVELS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-gray-600">Equipment (optional)</label>
          {selected ? (
            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selected.equipment_code}
                </p>
                <p className="text-xs text-gray-500">{selected.equipment_name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setEquipmentResults([]);
                  setEquipmentQuery("");
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={equipmentQuery}
                  onChange={(e) => setEquipmentQuery(e.target.value)}
                  placeholder="Search by code or name"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => void search()}
                  disabled={isSearching}
                  className="flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-white transition active:bg-blue-700 disabled:opacity-50"
                  aria-label="Search equipment"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
              {equipmentResults.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-gray-100">
                  {equipmentResults.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setEquipmentResults([]);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                        i > 0 ? "border-t border-slate-100" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {r.equipment_code}
                        </p>
                        <p className="text-xs text-gray-500">{r.equipment_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="px-1 text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition active:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPlus className="h-4 w-4" />}
          {isSaving ? "Submitting..." : "Submit Work Order"}
        </button>
      </form>
    </div>
  );
}