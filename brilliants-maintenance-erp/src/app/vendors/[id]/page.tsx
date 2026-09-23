"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MetadataRow } from "@/components/common/metadata-row";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Trash2 } from "lucide-react";

const STATUSES = [
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  {
    value: "inactive",
    label: "Inactive",
    color: "bg-gray-100 text-gray-800",
  },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-800" },
];

interface VendorDetail {
  id: string;
  vendor_code: string;
  name: string;
  vendor_type: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_identifier: string | null;
  status: string;
  created_at: string;
}

export default function VendorDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase.from("vendors").select("*").eq("id", id).single();
    if (data) setVendor(data as unknown as VendorDetail);
    setIsLoading(false);
  }

  async function updateStatus(status: string) {
    setIsSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({ status })
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  async function handleDelete() {
    if (!confirm("Delete this vendor? This cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    setIsDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/vendors");
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!vendor) {
    return (
      <ERPLayout>
        <EmptyState
          title="Vendor not found"
          description="The vendor you are looking for does not exist."
          action={
            <Link href="/vendors">
              <Button variant="outline">Back to Vendors</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const statusMeta = STATUSES.find((s) => s.value === vendor.status);

  return (
    <ERPLayout>
      <PageHeader
        title={vendor.name}
        description={`${vendor.vendor_code} · ${vendor.vendor_type?.replace(/_/g, " ") ?? "—"}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/vendors">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex items-center gap-3">
        <StatusBadge statusMeta={statusMeta} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Contact Information
            </h3>
            <div className="space-y-4">
              <MetadataRow label="Contact Person" value={vendor.contact_person} />
              <MetadataRow label="Phone" value={vendor.phone} />
              <MetadataRow label="Email" value={vendor.email} />
              <MetadataRow label="Address" value={vendor.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Business Details
            </h3>
            <div className="space-y-4">
              <MetadataRow label="Vendor Code" value={vendor.vendor_code} />
              <MetadataRow label="Vendor Type" value={vendor.vendor_type} />
              <MetadataRow
                label="Tax Identifier"
                value={vendor.tax_identifier}
              />
              <MetadataRow
                label="Created At"
                value={
                  vendor.created_at
                    ? new Date(vendor.created_at).toLocaleString("en-IN")
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Status</h3>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Vendor Status
            </label>
            <Select
              id="status"
              value={vendor.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={isSaving}
              options={STATUSES}
            />
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}