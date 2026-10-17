"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useQueryScope } from "@/lib/auth/query-scope";
import { useAuth } from "@/lib/auth/context";
import { STOCK_MOVEMENT_TYPES } from "@/lib/constants";
import { stockMovementSchema } from "@/lib/validation/spare-parts";
import { SparePart } from "@/types/database";
import { applyStockMovement } from "@/services/stock-movements";
import { submitForApproval, type ApproverContext } from "@/services/approvals";
import { ChevronLeft, Save } from "lucide-react";

type SparePartStock = SparePart & {
  current_stock?: number | null;
  plant_id?: string | null;
};

export default function StockMovementPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();
  const scope = useQueryScope();
  const { user, profile, roles, organization, plant, hasPermission } = useAuth();

  const [sparePart, setSparePart] = useState<SparePartStock | null>(null);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    movement_type: "purchase_in",
    plant_id: "",
    adjustment_direction: "add" as "add" | "remove",
    quantity: 1,
    reference_no: "",
    note: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const [spRes, plantRes] = await Promise.all([
      supabase.from("spare_parts").select("*").eq("id", id).single(),
      supabase.from("plants").select("id, name").order("name"),
    ]);
    if (spRes.data) setSparePart(spRes.data as unknown as SparePartStock);
    if (plantRes.data) setPlants(plantRes.data);
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sparePart) return;
    const parsed = stockMovementSchema.safeParse({
      ...form,
      part_id: id,
      unit: sparePart.unit ?? "pcs",
    });
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    if (!user) return;
    setIsSaving(true);

    const mtype = form.movement_type;
    const plantId = form.plant_id || sparePart.plant_id || null;
    const orgId = sparePart.organization_id ?? scope.organizationId ?? null;

    let direction = -1;
    if (mtype === "purchase_in" || mtype === "return_in") direction = 1;
    else if (mtype === "adjustment")
      direction = form.adjustment_direction === "remove" ? -1 : 1;
    const signedQuantity = direction * form.quantity;

    // Adjustments raised by users without approve rights go through the
    // approval engine; the movement is only applied once approved.
    if (mtype === "adjustment" && !hasPermission("inventory", "approve")) {
      const adjustmentNo = `ADJ-${Date.now().toString(36).toUpperCase()}`;
      const title = `${sparePart.part_code} ${
        form.adjustment_direction === "remove" ? "-" : "+"
      }${form.quantity}`;
      const { data: adjustment, error: insertError } = await supabase
        .from("stock_adjustments")
        .insert({
          organization_id: orgId,
          plant_id: plantId,
          adjustment_no: adjustmentNo,
          title,
          spare_part_id: id,
          movement_type: "adjustment",
          direction: form.adjustment_direction,
          quantity: form.quantity,
          reference_no: form.reference_no || null,
          note: form.note || null,
          status: "pending",
          requested_by: user.id,
        })
        .select("id")
        .single();
      if (insertError || !adjustment) {
        setIsSaving(false);
        window.alert(insertError?.message ?? "Failed to submit adjustment");
        return;
      }

      const ctx: ApproverContext = {
        userId: user.id,
        userName: profile?.name ?? user.email ?? "User",
        roleCodes: roles.map((r) => r.code),
        organizationId: organization?.id ?? null,
        plantId: plant?.id ?? null,
        hasPermission,
      };
      const res = await submitForApproval(scope, ctx, {
        entityType: "stock_adjustment",
        entityId: adjustment.id,
        toStatus: "pending",
        fromTitle: title,
      });
      setIsSaving(false);
      if (res.error) {
        window.alert(res.error);
        return;
      }
      window.alert("Stock adjustment submitted for manager approval.");
      router.push(`/spare-parts/${id}`);
      router.refresh();
      return;
    }

    const { error } = await applyStockMovement({
      sparePartId: id,
      organizationId: orgId,
      plantId,
      movementType: mtype,
      signedQuantity,
      referenceNo: form.reference_no || null,
      note: form.note || null,
      createdBy: user.id,
    });

    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/spare-parts/${id}`);
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!sparePart) {
    return (
      <ERPLayout>
        <EmptyState
          title="Spare part not found"
          description="The spare part you are updating stock for does not exist."
        />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Record Stock Movement"
        backHref={`/spare-parts/${sparePart.id}`}
        description={`${sparePart.part_code} · ${sparePart.part_name}`}
        action={
          <Link href={`/spare-parts/${sparePart.id}`}>
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="movement_type">Movement Type</Label>
              <Select
                id="movement_type"
                value={form.movement_type}
                onChange={(e) =>
                  setForm({ ...form, movement_type: e.target.value })
                }
              >
                {STOCK_MOVEMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            {form.movement_type === "adjustment" && (
              <div>
                <Label htmlFor="adjustment_direction">Adjustment Direction</Label>
                <Select
                  id="adjustment_direction"
                  value={form.adjustment_direction}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      adjustment_direction: e.target.value as "add" | "remove",
                    })
                  }
                >
                  <option value="add">Increase stock (+)</option>
                  <option value="remove">Reduce stock (−)</option>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="plant_id">Plant</Label>
              <Select
                id="plant_id"
                value={form.plant_id}
                onChange={(e) => setForm({ ...form, plant_id: e.target.value })}
              >
                <option value="">Select plant</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="reference_no">Reference / PO Number</Label>
              <Input
                id="reference_no"
                value={form.reference_no}
                onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
              <Link href={`/spare-parts/${sparePart.id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Movement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ERPLayout>
  );
}
