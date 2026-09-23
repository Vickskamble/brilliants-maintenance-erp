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
import { STOCK_MOVEMENT_TYPES } from "@/lib/constants";
import { stockMovementSchema } from "@/lib/validation/spare-parts";
import { SparePart } from "@/types/database";
import { ChevronLeft, Save } from "lucide-react";

type SparePartStock = SparePart & { current_stock?: number | null };

export default function StockMovementPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [sparePart, setSparePart] = useState<SparePartStock | null>(null);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    movement_type: "purchase_in",
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
    const parsed = stockMovementSchema.safeParse({ ...form, part_id: id });
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    setIsSaving(true);

    const isIn =
      form.movement_type === "purchase_in" ||
      form.movement_type === "return_in" ||
      form.movement_type === "adjustment" ||
      form.movement_type.includes("in");
    const direction = isIn ? 1 : -1;

    if (sparePart) {
      await supabase
        .from("spare_parts")
        .update({
          current_stock: Math.max(0, (sparePart.current_stock ?? 0) + direction * form.quantity),
        })
        .eq("id", id);
    }

    const { error } = await supabase.from("stock_movements").insert({
      part_id: id,
      movement_type: form.movement_type,
      quantity: form.quantity,
      reference_no: form.reference_no || null,
      note: form.note || null,
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
