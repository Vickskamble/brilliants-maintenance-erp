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
import { SPARE_PART_CATEGORIES, SPARE_PART_UNITS } from "@/lib/constants";
import { sparePartSchema } from "@/lib/validation/spare-parts";
import { ChevronLeft, Save } from "lucide-react";

interface SparePartFormState {
  id: string;
  part_code: string;
  part_name: string;
  category: string | null;
  unit: string | null;
  min_stock: number | null;
  reorder_level: number | null;
  location: string | null;
  description: string | null;
}

export default function EditSparePartPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [sparePart, setSparePart] = useState<SparePartFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from("spare_parts")
      .select("*, plants(name)")
      .eq("id", id)
      .single();
    if (data) setSparePart(data as unknown as SparePartFormState);
    setIsLoading(false);
  }

  function update(field: keyof SparePartFormState, value: unknown) {
    setSparePart((prev) => (prev ? { ...prev, [field]: value as never } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sparePart) return;
    const parsed = sparePartSchema.safeParse({
      part_code: sparePart.part_code,
      part_name: sparePart.part_name,
      category: sparePart.category,
      unit: sparePart.unit,
      min_stock: sparePart.min_stock,
      reorder_level: sparePart.reorder_level,
      location: sparePart.location,
      description: sparePart.description,
    });
    if (!parsed.success) {
      window.alert(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("spare_parts")
      .update({
        part_code: sparePart.part_code,
        part_name: sparePart.part_name,
        category: sparePart.category,
        unit: sparePart.unit,
        min_stock: sparePart.min_stock,
        reorder_level: sparePart.reorder_level,
        location: sparePart.location || null,
        description: sparePart.description || null,
      })
      .eq("id", id);
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
          description="The spare part you are editing does not exist."
        />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Edit Spare Part"
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
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="part_code">Part Code</Label>
                <Input
                  id="part_code"
                  value={sparePart.part_code}
                  onChange={(e) => update("part_code", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="part_name">Part Name</Label>
                <Input
                  id="part_name"
                  value={sparePart.part_name}
                  onChange={(e) => update("part_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={sparePart.category ?? ""}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {SPARE_PART_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  id="unit"
                  value={sparePart.unit ?? ""}
                  onChange={(e) => update("unit", e.target.value)}
                >
                  {SPARE_PART_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="min_stock">Min Stock</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={sparePart.min_stock ?? ""}
                  onChange={(e) => update("min_stock", Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={sparePart.reorder_level ?? ""}
                  onChange={(e) => update("reorder_level", Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={sparePart.location ?? ""}
                  onChange={(e) => update("location", e.target.value || null)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={sparePart.description ?? ""}
                onChange={(e) => update("description", e.target.value || null)}
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
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ERPLayout>
  );
}
