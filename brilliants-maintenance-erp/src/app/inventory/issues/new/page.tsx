"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import { createClient } from "@/lib/supabase/client";
import { MATERIAL_ISSUE_TO_TYPES } from "@/lib/constants";
import { materialIssueSchema } from "@/lib/validation/material-issues";
import { createMaterialIssue } from "@/services/material-issues";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";

interface PartOption {
  id: string;
  part_code: string;
  part_name: string;
  unit: string;
  current_stock: number | null;
}

interface LineItem {
  key: number;
  spare_part_id: string;
  quantity: string;
  remarks: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewMaterialIssuePage() {
  const router = useRouter();
  const supabase = createClient();
  const scope = useQueryScope();
  const { user, profile } = useAuth();

  const [parts, setParts] = useState<PartOption[]>([]);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [equipment, setEquipment] = useState<{ id: string; equipment_code: string; equipment_name: string }[]>([]);
  const [workOrders, setWorkOrders] = useState<{ id: string; work_order_no: string; title: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    issue_date: today(),
    plant_id: "",
    issued_to_type: "department",
    department_id: "",
    equipment_id: "",
    work_order_id: "",
    issued_to_name: "",
    purpose: "",
    remarks: "",
  });

  const [lines, setLines] = useState<LineItem[]>([
    { key: 1, spare_part_id: "", quantity: "1", remarks: "" },
  ]);

  useEffect(() => {
    setForm((f) => ({ ...f, plant_id: f.plant_id || scope.plantId || "" }));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.plantId]);

  async function load() {
    setIsLoading(true);
    const [partsRes, plantRes, deptRes, eqRes, woRes] = await Promise.all([
      supabase
        .from("spare_parts")
        .select("id, part_code, part_name, unit, current_stock")
        .order("part_code"),
      supabase.from("plants").select("id, name").order("name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase
        .from("equipment")
        .select("id, equipment_code, equipment_name")
        .order("equipment_name"),
      supabase
        .from("work_orders")
        .select("id, work_order_no, title")
        .order("work_order_no", { ascending: false })
        .limit(200),
    ]);

    setParts((partsRes.data ?? []) as PartOption[]);
    setPlants((plantRes.data ?? []) as { id: string; name: string }[]);
    setDepartments((deptRes.data ?? []) as { id: string; name: string }[]);
    setEquipment(
      (eqRes.data ?? []) as { id: string; equipment_code: string; equipment_name: string }[]
    );
    setWorkOrders(
      (woRes.data ?? []) as { id: string; work_order_no: string; title: string }[]
    );
    setIsLoading(false);
  }

  function nextKey() {
    return lines.reduce((max, line) => Math.max(max, line.key), 0) + 1;
  }

  function updateLine(key: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function availableFor(partId: string): number {
    return Number(parts.find((p) => p.id === partId)?.current_stock ?? 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!user) {
      setError("You must be signed in to issue material.");
      return;
    }

    const payload = {
      ...form,
      department_id: form.issued_to_type === "department" ? form.department_id : null,
      equipment_id: form.issued_to_type === "equipment" ? form.equipment_id : null,
      work_order_id: form.issued_to_type === "work_order" ? form.work_order_id : null,
      issued_to_name:
        form.issued_to_type === "employee" || form.issued_to_type === "other"
          ? form.issued_to_name
          : null,
      items: lines
        .filter((line) => line.spare_part_id)
        .map((line) => {
          const part = parts.find((p) => p.id === line.spare_part_id);
          return {
            spare_part_id: line.spare_part_id,
            quantity: Number(line.quantity),
            unit: part?.unit,
            remarks: line.remarks || null,
          };
        }),
    };

    const parsed = materialIssueSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete the form.");
      return;
    }

    // Friendly per-line stock check (the service re-checks atomically).
    const requested = new Map<string, number>();
    for (const item of parsed.data.items) {
      requested.set(
        item.spare_part_id,
        (requested.get(item.spare_part_id) ?? 0) + item.quantity
      );
    }
    for (const [partId, qty] of requested) {
      const part = parts.find((p) => p.id === partId);
      if (part && qty > Number(part.current_stock ?? 0)) {
        setError(
          `Insufficient stock for ${part.part_code} — ${part.part_name}: requested ${qty}, available ${part.current_stock ?? 0} ${part.unit}.`
        );
        return;
      }
    }

    setIsSaving(true);
    const res = await createMaterialIssue(
      scope,
      {
        issue_date: parsed.data.issue_date,
        plant_id: parsed.data.plant_id,
        issued_to_type: parsed.data.issued_to_type,
        department_id: parsed.data.department_id ?? null,
        equipment_id: parsed.data.equipment_id ?? null,
        work_order_id: parsed.data.work_order_id ?? null,
        issued_to_name: parsed.data.issued_to_name ?? null,
        purpose: parsed.data.purpose ?? null,
        remarks: parsed.data.remarks ?? null,
        items: parsed.data.items.map((item) => ({
          spare_part_id: item.spare_part_id,
          quantity: item.quantity,
          remarks: item.remarks ?? null,
        })),
      },
      { id: user.id, name: profile?.name ?? user.email ?? null }
    );
    setIsSaving(false);

    if (res.error || !res.data) {
      setError(res.error ?? "Failed to create material issue");
      return;
    }
    router.push(`/inventory/issues/${res.data.id}`);
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="create">
        <div className="space-y-6">
          <PageHeader
            title="New Material Issue"
            description="Hand over stock from the store and record who received it."
            backHref="/inventory/issues"
            action={
              <Link href="/inventory/issues">
                <Button variant="outline">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
            }
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Issue Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-6 pt-0 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="issue_date">Issue Date *</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="plant_id">Plant *</Label>
                  <Select
                    id="plant_id"
                    value={form.plant_id}
                    onChange={(e) => setForm({ ...form, plant_id: e.target.value })}
                    placeholder="Select plant"
                    options={plants.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </div>
                <div>
                  <Label htmlFor="issued_to_type">Issued To *</Label>
                  <Select
                    id="issued_to_type"
                    value={form.issued_to_type}
                    onChange={(e) =>
                      setForm({ ...form, issued_to_type: e.target.value })
                    }
                    options={MATERIAL_ISSUE_TO_TYPES.map((t) => ({
                      value: t.value,
                      label: t.label,
                    }))}
                  />
                </div>

                {form.issued_to_type === "department" && (
                  <div>
                    <Label htmlFor="department_id">Department *</Label>
                    <Select
                      id="department_id"
                      value={form.department_id}
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                      placeholder="Select department"
                      options={departments.map((d) => ({ value: d.id, label: d.name }))}
                    />
                  </div>
                )}

                {form.issued_to_type === "equipment" && (
                  <div>
                    <Label htmlFor="equipment_id">Equipment *</Label>
                    <Select
                      id="equipment_id"
                      value={form.equipment_id}
                      onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
                      placeholder="Select equipment"
                      options={equipment.map((eq) => ({
                        value: eq.id,
                        label: `${eq.equipment_code} — ${eq.equipment_name}`,
                      }))}
                    />
                  </div>
                )}

                {form.issued_to_type === "work_order" && (
                  <div>
                    <Label htmlFor="work_order_id">Work Order *</Label>
                    <Select
                      id="work_order_id"
                      value={form.work_order_id}
                      onChange={(e) => setForm({ ...form, work_order_id: e.target.value })}
                      placeholder="Select work order"
                      options={workOrders.map((wo) => ({
                        value: wo.id,
                        label: `${wo.work_order_no} — ${wo.title}`,
                      }))}
                    />
                  </div>
                )}

                {(form.issued_to_type === "employee" || form.issued_to_type === "other") && (
                  <div>
                    <Label htmlFor="issued_to_name">Received By *</Label>
                    <Input
                      id="issued_to_name"
                      value={form.issued_to_name}
                      onChange={(e) => setForm({ ...form, issued_to_name: e.target.value })}
                      placeholder="Name of the person receiving material"
                    />
                  </div>
                )}

                <div className="md:col-span-2 lg:col-span-2">
                  <Label htmlFor="purpose">Purpose / Usage</Label>
                  <Input
                    id="purpose"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    placeholder="e.g. DG set refuelling, pump overhaul, daily cleaning"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    rows={2}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    placeholder="Optional notes for the issue slip"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Items to Issue</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLines((prev) => [
                        ...prev,
                        { key: nextKey(), spare_part_id: "", quantity: "1", remarks: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-6 pt-0">
                {lines.map((line) => {
                  const part = parts.find((p) => p.id === line.spare_part_id);
                  return (
                    <div key={line.key} className="rounded-lg border border-gray-200 p-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div className="md:col-span-6">
                          <Label>Item</Label>
                          <Select
                            value={line.spare_part_id}
                            onChange={(e) => updateLine(line.key, { spare_part_id: e.target.value })}
                            placeholder="Select spare part / consumable"
                            options={parts.map((p) => ({
                              value: p.id,
                              label: `${p.part_code} — ${p.part_name} (stock: ${p.current_stock ?? 0} ${p.unit})`,
                            }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          />
                          {part && (
                            <p className="mt-1 text-xs text-gray-500">
                              Available: {availableFor(part.id)} {part.unit}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-3">
                          <Label>Line Remarks</Label>
                          <Input
                            value={line.remarks}
                            onChange={(e) => updateLine(line.key, { remarks: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex items-end md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-600"
                            disabled={lines.length === 1}
                            onClick={() =>
                              setLines((prev) => prev.filter((l) => l.key !== line.key))
                            }
                            title="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/inventory/issues">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Issuing..." : "Issue Material"}
              </Button>
            </div>
          </form>
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}
