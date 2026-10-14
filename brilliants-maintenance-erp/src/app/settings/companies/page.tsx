"use client";

import { useCallback, useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ERPModal } from "@/components/erp/erp-modal";
import { Building2, Plus, Search, Users } from "lucide-react";

interface CompanyPlant {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface Company {
  id: string;
  legal_name: string;
  display_name: string;
  code: string;
  industry: string | null;
  timezone: string;
  country: string;
  status: string;
  created_at: string;
  plants: CompanyPlant[];
}

const emptyForm = {
  legal_name: "",
  display_name: "",
  code: "",
  industry: "",
  timezone: "Asia/Kolkata",
  country: "India",
  plantsText: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/companies", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load companies");
      setCompanies(json.companies ?? []);
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Could not load companies" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setIsSaving(true);
    setMessage(null);
    const plants = form.plantsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [code, ...rest] = line.split("|");
        return { code: (code ?? "").trim(), name: rest.join("|").trim() };
      });
    try {
      const res = await fetch("/api/settings/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legal_name: form.legal_name,
          display_name: form.display_name,
          code: form.code,
          industry: form.industry,
          timezone: form.timezone,
          country: form.country,
          plants,
          adminUser: {
            name: form.adminName,
            email: form.adminEmail,
            password: form.adminPassword || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create company");
      setMessage({ kind: "ok", text: "Company created. " + (json.inviteSent ? "Invite sent to the administrator." : "Login details set.") });
      setIsOpen(false);
      setForm(emptyForm);
      void load();
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Could not create company" });
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = companies.filter(
    (c) =>
      c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Companies"
          description="Platform tenants: each company has isolated data, plants, roles and users."
          action={
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Company
            </Button>
          }
        />

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.kind === "ok"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <LoadingPage />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching companies" : "No companies yet"}
            description={
              search ? "Try a different search." : "Create your first client company to get started."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((company) => (
              <Card key={company.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{company.display_name}</p>
                        <p className="text-xs text-gray-500">{company.code}</p>
                      </div>
                    </div>
                    <StatusBadge status={company.status} />
                  </div>
                  {company.industry && (
                    <p className="mt-3 text-sm text-gray-600">{company.industry}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {company.country} · {company.timezone}
                  </p>
                  {company.plants.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="mb-2 flex items-center text-xs font-medium text-gray-500">
                        <Users className="mr-1 h-3.5 w-3.5" /> Plants ({company.plants.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {company.plants.map((plant) => (
                          <span
                            key={plant.id}
                            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                          >
                            {plant.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ERPModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Onboard a New Company"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Legal name *
                </label>
                <Input
                  value={form.legal_name}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  placeholder="Acme Engineering Pvt. Ltd."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Acme"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Company code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ACM"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Industry</label>
                <Input
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Manufacturing"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Timezone</label>
                <Input
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  placeholder="Asia/Kolkata"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Plants *{" "}
                <span className="font-normal text-gray-400">(one per line, format CODE | Name)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                rows={3}
                value={form.plantsText}
                onChange={(e) => setForm({ ...form, plantsText: e.target.value })}
                placeholder={"PUN | Pune Plant\nMUM | Mumbai Plant"}
              />
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">First administrator</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                  <Input
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    placeholder="Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="rahul@acme.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password{" "}
                    <span className="font-normal text-gray-400">(blank = send invite)</span>
                  </label>
                  <Input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    placeholder="Set a password or leave blank"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Company"}
              </Button>
            </div>
          </div>
        </ERPModal>
      </div>
    </ERPLayout>
  );
}