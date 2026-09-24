"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  AlertTriangle,
  PackageX,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardX,
  ClipboardList,
  ShoppingCart,
  PackageCheck,
  Star,
} from "lucide-react";

interface SparePartStockItem {
  id: string;
  part_code: string;
  part_name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  reorder_level: number;
  location: string | null;
}

interface MovementItem {
  id: string;
  part_id: string;
  movement_type: string;
  quantity: number;
  reference_no: string | null;
  note: string | null;
  created_at: string;
  spare_parts: { part_code: string; part_name: string }[] | null;
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase_in: "Purchase In",
  return_in: "Return In",
  workorder_issue: "Work Order Issue",
  breakdown_use: "Breakdown Use",
  adjustment: "Adjustment",
  scrap_out: "Scrap Out",
  transfer: "Transfer",
};

export default function InventoryPage() {
  const supabase = createClient();

  const [parts, setParts] = useState<SparePartStockItem[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [partsRes, moveRes] = await Promise.all([
      supabase
        .from("spare_parts")
        .select(
          "id, part_code, part_name, category, unit, current_stock, min_stock, reorder_level, location"
        )
        .order("part_code"),
      supabase
        .from("stock_movements")
        .select(
          "id, part_id, movement_type, quantity, reference_no, note, created_at, spare_parts(part_code, part_name)"
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    if (partsRes.data)
      setParts(partsRes.data as unknown as SparePartStockItem[]);
    if (moveRes.data) setMovements(moveRes.data as unknown as MovementItem[]);
    setIsLoading(false);
  }

  const lowStock = parts.filter(
    (p) => p.current_stock <= p.reorder_level && p.current_stock > 0
  );
  const outOfStock = parts.filter((p) => p.current_stock <= 0);

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          description="Spare parts stock levels and recent stock movements."
          action={
            <Link href="/spare-parts">
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Manage Spare Parts
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <LoadingPage />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {parts.length}
                    </p>
                    <p className="text-sm text-gray-500">Total Parts</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {lowStock.length}
                    </p>
                    <p className="text-sm text-gray-500">Low Stock</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
                    <PackageX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {outOfStock.length}
                    </p>
                    <p className="text-sm text-gray-500">Out of Stock</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50">
                    <ArrowUpFromLine className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {movements.length}
                    </p>
                    <p className="text-sm text-gray-500">Recent Movements</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/inventory/requests">
                <Card className="transition hover:border-blue-300 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                      <ClipboardList className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Material Requests
                      </p>
                      <p className="text-xs text-gray-500">
                        Raise and approve requests
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/inventory/orders">
                <Card className="transition hover:border-blue-300 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
                      <ShoppingCart className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Purchase Orders
                      </p>
                      <p className="text-xs text-gray-500">
                        Order from vendors
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/inventory/grn">
                <Card className="transition hover:border-blue-300 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                      <PackageCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Goods Receipts
                      </p>
                      <p className="text-xs text-gray-500">
                        Receive stock into inventory
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/inventory/vendor-evaluation">
                <Card className="transition hover:border-blue-300 hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                      <Star className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Vendor Evaluation
                      </p>
                      <p className="text-xs text-gray-500">
                        Rate vendor performance
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alerts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {lowStock.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-500">
                      All parts are above reorder level.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {lowStock.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {p.part_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.part_code} · {p.location ?? "No location"}
                            </p>
                          </div>
                          <Badge variant="warning">
                            {p.current_stock} {p.unit} left
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Out of Stock</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {outOfStock.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-500">
                      No parts are currently out of stock.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {outOfStock.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between px-6 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {p.part_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.part_code} · {p.category}
                            </p>
                          </div>
                          <Badge variant="danger">0 {p.unit}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Movements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {movements.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardX />}
                    title="No movements yet"
                    description="Stock movements from purchases, issues and adjustments will appear here."
                  />
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {movements.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={
                              m.movement_type === "purchase_in" ||
                              m.movement_type === "return_in"
                                ? "rounded-lg bg-green-50 p-1.5"
                                : m.movement_type === "transfer"
                                  ? "rounded-lg bg-blue-50 p-1.5"
                                  : "rounded-lg bg-red-50 p-1.5"
                            }
                          >
                            {m.movement_type === "transfer" ? (
                              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                            ) : m.movement_type === "purchase_in" ||
                              m.movement_type === "return_in" ? (
                              <ArrowDownToLine className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {m.spare_parts?.[0]?.part_name ?? "Unknown part"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {m.spare_parts?.[0]?.part_code ?? "-"} ·{" "}
                              {MOVEMENT_LABELS[m.movement_type] ??
                                m.movement_type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={
                              m.quantity > 0
                                ? "text-sm font-semibold text-green-600"
                                : "text-sm font-semibold text-red-600"
                            }
                          >
                            {m.quantity > 0 ? "+" : ""}
                            {m.quantity}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(m.created_at).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ERPLayout>
  );
}