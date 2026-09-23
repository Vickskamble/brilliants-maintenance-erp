"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { SPARE_PART_CATEGORIES, SPARE_PART_UNITS } from "@/lib/constants";
import { sparePartSchema } from "@/lib/validation/spare-parts";
import { ChevronLeft, Save } from "lucide-react";

export default function NewSparePartPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    part_code: "",
    part_name: "",
    category: "",
    unit: "pcs",
    min_stock: 0,
    reorder_level: 0,
    initial_quantity: 0,
    location: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = sparePartSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fe[issue.path[0] as string] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("spare_parts").insert({
      part_code: form.part_code,
      part_name: form.part_name,
      category: form.category,
      unit: form.unit,
      min_stock: form.min_stock,
      reorder_level: form.reorder_level,
      stock_level: form.initial_quantity,
      location: form.location || null,
      description: form.description || null,
    });
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/spare-parts");
    router.refresh();
  }

  if (isSaving) return <LoadingPage />;

  return (
    <ERPLayout>
      <PageHeader
        title="Add Spare Part"
        description="Create a new spare part in the inventory"
        action={
          <Link href="/spare-parts">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Part Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="part_code">Part Code</Label>
                  <Input
                    id="part_code"
                    placeholder="e.g. BRG-6205"
                    value={form.part_code}
                    onChange={(e) => setForm({ ...form, part_code: e.target.value })}
                  />
                  {errors.part_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.part_code}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="part_name">Part Name</Label>
                  <Input
                    id="part_name"
                    placeholder="e.g. Deep Groove Ball Bearing"
                    value={form.part_name}
                    onChange={(e) => setForm({ ...form, part_name: e.target.value })}
                  />
                  {errors.part_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.part_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {SPARE_PART_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {SPARE_PART_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="min_stock">Minimum Stock</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min={0}
                    value={form.min_stock}
                    onChange={(e) =>
                      setForm({ ...form, min_stock: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min={0}
                    value={form.reorder_level}
                    onChange={(e) =>
                      setForm({ ...form, reorder_level: Number(e.target.value) })
                    }
                  />
                  {errors.reorder_level && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.reorder_level}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="initial_quantity">Initial Stock</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    min={0}
                    value={form.initial_quantity}
                    onChange={(e) =>
                      setForm({ ...form, initial_quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="location">Default Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Central Store A"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Additional Info
              </h3>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Optional notes about this spare part"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
              <Link href="/spare-parts">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Spare Part
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ERPLayout>
  );
}
