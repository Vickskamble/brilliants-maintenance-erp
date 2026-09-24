"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { SPARE_PART_CATEGORIES, SPARE_PART_UNITS } from "@/lib/constants";
import { MetadataRow } from "@/components/common/metadata-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Edit, Package, Plus } from "lucide-react";

interface SparePartDetail {
  id: string;
  part_code: string;
  part_name: string;
  category: string;
  unit: string;
  min_stock: number;
  reorder_level: number;
  location: string | null;
  description: string | null;
  plants?: { name: string } | null;
  plant_stock?:
    | { id: string; plant: { name: string }; quantity: number }[]
    | null;
}

export default function SparePartDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [sparePart, setSparePart] = useState<SparePartDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from("spare_parts")
      .select(
        `id, part_code, part_name, category, unit, min_stock, reorder_level, location, description,
         plants(name),
         spare_part_stock(plant:plants(name), quantity)`
      )
      .eq("id", id)
      .single();
    if (data) setSparePart(data as unknown as SparePartDetail);
    setIsLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this spare part? This cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("spare_parts").delete().eq("id", id);
    setIsDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/spare-parts");
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
          description="The spare part you are looking for does not exist."
        />
      </ERPLayout>
    );
  }

  const categoryInfo = SPARE_PART_CATEGORIES.find(
    (c) => c.value === sparePart.category
  );
  const unitInfo = SPARE_PART_UNITS.find((u) => u.value === sparePart.unit);

  return (
    <ERPLayout>
      <PageHeader
        title={sparePart.part_name}
        backHref="/spare-parts"
        description={`${sparePart.part_code} · ${categoryInfo?.label ?? "Uncategorized"}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/spare-parts/${sparePart.id}/stock`}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Record Movement
              </Button>
            </Link>
            <Link href={`/spare-parts/${sparePart.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <MetadataRow label="Part Code" value={sparePart.part_code} />
              <MetadataRow label="Category" value={categoryInfo?.label} />
              <MetadataRow
                label="Unit"
                value={`${sparePart.unit} (${unitInfo?.label ?? ""})`}
              />
              <MetadataRow label="Min Stock" value={String(sparePart.min_stock)} />
              <MetadataRow
                label="Reorder Level"
                value={String(sparePart.reorder_level)}
              />
              <MetadataRow
                label="Default Location"
                value={sparePart.location ?? "—"}
              />
              <MetadataRow
                label="Default Plant"
                value={sparePart.plants?.name ?? "—"}
              />
            </div>
            {sparePart.description && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-900">Description</p>
                <p className="mt-1 text-sm text-gray-600">
                  {sparePart.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Stock by Plant
            </h3>
            {!sparePart.plant_stock?.length ? (
              <EmptyState
                title="No stock recorded"
                description="Record a stock movement to track this part across plants."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sparePart.plant_stock.map((ps) => (
                    <TableRow key={ps.id}>
                      <TableCell>{ps.plant?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {ps.quantity} {sparePart.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
