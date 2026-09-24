"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ERPModal } from "@/components/erp/erp-modal";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  listVendorEvaluations,
  createVendorRating,
  getVendors,
} from "@/services/procurement";
import { Star, Plus, ClipboardList, Users } from "lucide-react";

interface VendorRow {
  id: string;
  name: string;
  code: string | null;
  reviews: number;
  avg_rating: number;
  level: string;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((r) => ({
  value: String(r),
  label: `${r} ${r === 1 ? "star" : "stars"}`,
}));

export default function VendorEvaluationPage() {
  const scope = useQueryScope();
  const { user } = useAuth();

  const [rows, setRows] = useState<VendorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    vendor_id: "",
    rating: "5",
    delivery_score: "5",
    quality_score: "5",
    price_score: "5",
    responsiveness_score: "5",
    comments: "",
  });

  async function load() {
    setIsLoading(true);
    const [evalRes, vendorRes] = await Promise.all([
      listVendorEvaluations(scope),
      getVendors(),
    ]);
    const evalsById = new Map(
      evalRes.data.map((e) => [e.vendor_id, e])
    );
    const merged: VendorRow[] = vendorRes.data.map((v) => {
      const entry = evalsById.get(v.id);
      return entry
        ? {
            id: v.id,
            name: v.name,
            code: v.code ?? entry.vendor_code,
            reviews: entry.reviews,
            avg_rating: entry.avg_rating,
            level: entry.level,
          }
        : { id: v.id, name: v.name, code: v.code, reviews: 0, avg_rating: 0, level: "No ratings" };
    });
    setRows(merged);
    setVendors(vendorRes.data);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal() {
    setForm({
      vendor_id: "",
      rating: "5",
      delivery_score: "5",
      quality_score: "5",
      price_score: "5",
      responsiveness_score: "5",
      comments: "",
    });
    setModalOpen(true);
  }

  async function doSave() {
    if (!form.vendor_id || !user) {
      window.alert("Select a vendor.");
      return;
    }
    setIsSaving(true);
    const res = await createVendorRating(
      scope,
      {
        vendor_id: form.vendor_id,
        rating: Number(form.rating),
        delivery_score: Number(form.delivery_score),
        quality_score: Number(form.quality_score),
        price_score: Number(form.price_score),
        responsiveness_score: Number(form.responsiveness_score),
        comments: form.comments || null,
      },
      user.id
    );
    setIsSaving(false);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setModalOpen(false);
    void load();
  }

  function renderStars(rating: number) {
    return (
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${
              s <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        ))}
        {rating > 0 && (
          <span className="ml-1 text-sm font-semibold tabular-nums text-gray-800">
            {rating.toFixed(1)}
          </span>
        )}
      </span>
    );
  }

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Vendor Evaluation"
            description="Rate vendor performance to guide future procurement decisions."
            backHref="/inventory"
            action={
              <div className="flex items-center gap-2">
                <Link href="/inventory">
                  <Button variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Inventory
                  </Button>
                </Link>
                <Button onClick={openModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rating
                </Button>
              </div>
            }
          />

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <LoadingPage />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={<Users />}
                  title="No vendors yet"
                  description="Add vendors via Master Data and rate them here."
                />
              ) : (
                <DataTable
                  idKey={(row) => row.id}
                  data={rows}
                  columns={[
                    {
                      key: "vendor",
                      header: "Vendor",
                      render: (row) => (
                        <div>
                          <p className="font-medium text-gray-900">{row.name}</p>
                          {row.code && (
                            <p className="text-xs text-gray-400">{row.code}</p>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "avg_rating",
                      header: "Average Rating",
                      render: (row) => renderStars(row.avg_rating),
                    },
                    {
                      key: "reviews",
                      header: "Reviews",
                      render: (row) => (
                        <span className="text-sm tabular-nums text-gray-600">
                          {row.reviews}
                        </span>
                      ),
                    },
                    {
                      key: "level",
                      header: "Level",
                      render: (row) => (
                        <span className="text-sm text-gray-600">{row.level}</span>
                      ),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <ERPModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Vendor Rating"
          description="Rate the vendor on this procurement engagement."
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void doSave()} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Rating"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="ve-vendor">Vendor</Label>
              <Select
                id="ve-vendor"
                value={form.vendor_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vendor_id: e.target.value }))
                }
                placeholder="Select vendor"
                options={vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name}${v.code ? ` (${v.code})` : ""}`,
                }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <Label>Overall</Label>
                <Select
                  value={form.rating}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rating: e.target.value }))
                  }
                  options={RATING_OPTIONS}
                />
              </div>
              <div>
                <Label>Delivery</Label>
                <Select
                  value={form.delivery_score}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, delivery_score: e.target.value }))
                  }
                  options={RATING_OPTIONS}
                />
              </div>
              <div>
                <Label>Quality</Label>
                <Select
                  value={form.quality_score}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quality_score: e.target.value }))
                  }
                  options={RATING_OPTIONS}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Select
                  value={form.price_score}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price_score: e.target.value }))
                  }
                  options={RATING_OPTIONS}
                />
              </div>
              <div>
                <Label>Response</Label>
                <Select
                  value={form.responsiveness_score}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      responsiveness_score: e.target.value,
                    }))
                  }
                  options={RATING_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ve-comments">Comments</Label>
              <Textarea
                id="ve-comments"
                rows={3}
                value={form.comments}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comments: e.target.value }))
                }
                placeholder="e.g. Delivered within 3 days, packaging was good"
              />
            </div>
          </div>
        </ERPModal>
      </PermissionGate>
    </ERPLayout>
  );
}