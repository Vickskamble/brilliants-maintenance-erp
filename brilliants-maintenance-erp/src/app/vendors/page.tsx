"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Plus, Search, Truck } from "lucide-react";

interface VendorRow {
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
}

export default function VendorsListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<VendorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [page, debouncedSearch, status]);

  async function load() {
    setIsLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("vendors")
      .select(
        "id, vendor_code, name, vendor_type, contact_person, phone, email, address, tax_identifier, status",
        { count: "exact" }
      )
      .order("vendor_code");

    if (status) query = query.eq("status", status);
    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,vendor_code.ilike.%${debouncedSearch}%,contact_person.ilike.%${debouncedSearch}%`
      );
    }

    const { data, count } = await query.range(from, to);
    if (data) setItems(data as unknown as VendorRow[]);
    setTotal(count ?? 0);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Vendors"
          description="Manage suppliers and service providers."
          action={
            <Link href="/vendors/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </Link>
          }
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
                className="md:w-56"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </div>

            {isLoading ? (
              <LoadingPage />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Truck />}
                title="No vendors found"
                description="Add your first vendor to start tracking suppliers."
                action={
                  <Link href="/vendors/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Vendor
                    </Button>
                  </Link>
                }
              />
            ) : (
              <DataTable
                columns={[
                  {
                    key: "vendor_code",
                    header: "Vendor Code",
                    className: "w-36",
                    render: (row) => (
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {row.vendor_code}
                      </span>
                    ),
                  },
                  {
                    key: "name",
                    header: "Name",
                    render: (row) => (
                      <span className="text-sm font-medium text-gray-900">
                        {row.name}
                      </span>
                    ),
                  },
                  {
                    key: "vendor_type",
                    header: "Type",
                    render: (row) => (
                      <span className="text-sm capitalize text-gray-600">
                        {row.vendor_type?.replace(/_/g, " ") ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "contact_person",
                    header: "Contact",
                    render: (row) => (
                      <div className="text-sm text-gray-700">
                        <p>{row.contact_person ?? "-"}</p>
                        <p className="text-xs text-gray-500">{row.phone ?? ""}</p>
                      </div>
                    ),
                  },
                  {
                    key: "email",
                    header: "Email",
                    render: (row) => (
                      <span className="text-sm text-gray-600">
                        {row.email ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                data={items}
                idKey={(row) => row.id}
                onRowClick={(row) => router.push(`/vendors/${row.id}`)}
              />
            )}

            {!isLoading && items.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}