"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { SPARE_PART_CATEGORIES } from "@/lib/constants";
import {
  Package,
  Plus,
  Search,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SparePartRow {
  id: string;
  part_code: string;
  part_name: string;
  category: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  min_stock: number;
  plant_id: string;
  plants: { name: string };
}

export default function SparePartsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const { plant } = useAuth();

  const [rows, setRows] = useState<SparePartRow[]>([]);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [plantId, setPlantId] = useState(() => plant?.id ?? "all");
  const [category, setCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [search, plantId, category, lowStockOnly, outOfStockOnly]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("spare_parts")
      .select(
        `id, part_code, part_name, category, unit, current_stock, reorder_level, min_stock, plant_id,
         plants(name)`,
        { count: "exact" }
      );

    if (plantId !== "all") query = query.eq("plant_id", plantId);
    if (category !== "all") query = query.eq("category", category);
    if (lowStockOnly) query = query.lt("current_stock", "reorder_level");
    if (outOfStockOnly) query = query.eq("current_stock", 0);

    if (search) {
      query = query.or(
        `part_code.ilike.%${search}%,part_name.ilike.%${search}%`
      );
    }

    query = query.range(from, to).order("part_name");

    const { data, count } = await query;
    if (Array.isArray(data)) setRows(data as unknown as SparePartRow[]);
    if (typeof count === "number") setTotal(count);
    setIsLoading(false);
  }

  async function loadPlants() {
    const { data } = await supabase.from("plants").select("id, name").order("name");
    if (Array.isArray(data)) setPlants(data);
  }

  useEffect(() => {
    void load();
  }, [page, plantId, category, lowStockOnly, outOfStockOnly, search]);

  useEffect(() => {
    void loadPlants();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ERPLayout>
      <PageHeader
        title="Spare Parts & Inventory"
        description="Manage spare parts, stock levels and inventory across all plants"
        action={
          <Link href="/spare-parts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Spare Part
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by part code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                options={[
                  { value: "all", label: "All Plants" },
                  ...plants.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <div>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: "all", label: "All Categories" },
                  ...SPARE_PART_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={lowStockOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => setLowStockOnly((v) => !v)}
        >
          <TriangleAlert className="mr-1.5 h-4 w-4" />
          Low Stock
        </Button>
        <Button
          variant={outOfStockOnly ? "primary" : "outline"}
          size="sm"
          onClick={() => setOutOfStockOnly((v) => !v)}
        >
          <Package className="mr-1.5 h-4 w-4" />
          Out of Stock
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <LoadingPage />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="No spare parts found"
            description="Add your first spare part to start tracking inventory."
            action={
              <Link href="/spare-parts/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Spare Part
                </Button>
              </Link>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Plant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const low = r.current_stock <= r.reorder_level;
                    const out = r.current_stock === 0;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/spare-parts/${r.id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {r.part_code}
                        </TableCell>
                        <TableCell className="font-medium">{r.part_name}</TableCell>
                        <TableCell>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
                            {r.category.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              out
                                ? "font-semibold text-red-600"
                                : low
                                  ? "font-semibold text-orange-600"
                                  : "text-gray-900"
                            }
                          >
                            {r.current_stock} {r.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {r.reorder_level}
                        </TableCell>
                        <TableCell className="text-gray-500">{r.min_stock}</TableCell>
                        <TableCell className="text-gray-600">
                          {r.plants?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </ERPLayout>
  );
}
