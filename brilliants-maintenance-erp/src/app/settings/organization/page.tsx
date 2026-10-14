"use client";

import { useEffect, useRef, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import {
  Save,
  Upload,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";

const CURRENCIES = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "QAR", label: "QAR - Qatari Riyal" },
  { value: "KWD", label: "KWD - Kuwaiti Dinar" },
  { value: "OMR", label: "OMR - Omani Rial" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
];

interface OrgForm {
  legal_name: string;
  display_name: string;
  code: string;
  industry: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timezone: string;
  currency: string;
  tax_id: string;
  status: string;
  logo_url: string;
}

const EMPTY_FORM: OrgForm = {
  legal_name: "",
  display_name: "",
  code: "",
  industry: "",
  website: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  timezone: "UTC",
  currency: "INR",
  tax_id: "",
  status: "active",
  logo_url: "",
};

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export default function CompanyProfilePage() {
  const { organization, refreshProfile } = useAuth();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organization) return;
    setForm({
      legal_name: organization.legal_name ?? "",
      display_name: organization.display_name ?? "",
      code: organization.code ?? "",
      industry: organization.industry ?? "",
      website: organization.website ?? "",
      contact_email: organization.contact_email ?? "",
      contact_phone: organization.contact_phone ?? "",
      address: organization.address ?? "",
      city: organization.city ?? "",
      state: organization.state ?? "",
      country: organization.country ?? "",
      pincode: organization.pincode ?? "",
      timezone: organization.timezone ?? "UTC",
      currency: organization.currency || "INR",
      tax_id: organization.tax_id ?? "",
      status: organization.status ?? "active",
      logo_url: organization.logo_url ?? "",
    });
    setIsLoading(false);
  }, [organization]);

  function logoPathFromUrl(url: string): string | null {
    try {
      const marker = "/org-logos/";
      const idx = url.indexOf(marker);
      return idx >= 0 ? url.slice(idx + marker.length) : null;
    } catch {
      return null;
    }
  }

  async function handleLogoUpload(file: File) {
    if (!organization) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, SVG or WEBP images are allowed.");
      return;
    }
    if (file.size > 1048576) {
      setError("Logo must be smaller than 1 MB.");
      return;
    }
    setUploading(true);
    setMessage("");
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${organization.id}/logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("org-logos")
      .getPublicUrl(path);
    const newUrl = urlData.publicUrl;
    if (form.logo_url) {
      const oldPath = logoPathFromUrl(form.logo_url);
      if (oldPath && oldPath !== path) {
        await supabase.storage.from("org-logos").remove([oldPath]);
      }
    }
    setForm((prev) => ({ ...prev, logo_url: newUrl }));
    setUploading(false);
  }

  async function handleRemoveLogo() {
    if (!form.logo_url) return;
    const oldPath = logoPathFromUrl(form.logo_url);
    if (oldPath) {
      await supabase.storage.from("org-logos").remove([oldPath]);
    }
    setForm((prev) => ({ ...prev, logo_url: "" }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;
    if (!form.legal_name.trim() || !form.display_name.trim()) {
      setError("Legal name and display name are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    const { error: saveError } = await supabase
      .from("organizations")
      .update({
        legal_name: form.legal_name.trim(),
        display_name: form.display_name.trim(),
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        pincode: form.pincode.trim() || null,
        timezone: form.timezone.trim() || "UTC",
        currency: form.currency || "INR",
        tax_id: form.tax_id.trim() || null,
        logo_url: form.logo_url || null,
        status: form.status,
      })
      .eq("id", organization.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setMessage("Company profile updated successfully.");
    await refreshProfile();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Company Profile"
          description="Company details, branding and business settings"
          backHref="/settings"
        />

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Company logo"
                      className="h-24 w-24 rounded-xl border border-gray-200 object-contain bg-white p-1"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
                      <Building2 className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Company logo
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, SVG or WEBP. Max 1 MB. Shown in the header
                      and documents.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploading ? "Uploading..." : "Upload logo"}
                    </Button>
                    {form.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveLogo}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company details */}
          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="org_legal_name">Legal name *</Label>
                <Input
                  id="org_legal_name"
                  value={form.legal_name}
                  onChange={(e) =>
                    setForm({ ...form, legal_name: e.target.value })
                  }
                  placeholder="e.g. Brilliants Engineering Pvt Ltd"
                />
              </div>
              <div>
                <Label htmlFor="org_display_name">Display name *</Label>
                <Input
                  id="org_display_name"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder="e.g. Brilliants"
                />
              </div>
              <div>
                <Label htmlFor="org_code">Company code</Label>
                <Input
                  id="org_code"
                  value={form.code}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="org_industry">Industry</Label>
                <Input
                  id="org_industry"
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                  placeholder="e.g. Manufacturing, FMCG"
                />
              </div>
              <div>
                <Label htmlFor="org_website">Website</Label>
                <Input
                  id="org_website"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  placeholder="e.g. https://www.brilliants.in"
                />
              </div>
              <div>
                <Label htmlFor="org_email">Contact email</Label>
                <Input
                  id="org_email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                  placeholder="e.g. info@brilliants.in"
                />
              </div>
              <div>
                <Label htmlFor="org_phone">Contact phone</Label>
                <Input
                  id="org_phone"
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm({ ...form, contact_phone: e.target.value })
                  }
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
              <div>
                <Label htmlFor="org_tax">GSTIN / VAT / Tax ID</Label>
                <Input
                  id="org_tax"
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                />
              </div>
              <div>
                <Label htmlFor="org_status">Status</Label>
                <Select
                  id="org_status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="org_address">Registered address</Label>
                <Textarea
                  id="org_address"
                  rows={2}
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Street, area, building"
                />
              </div>
              <div>
                <Label htmlFor="org_city">City</Label>
                <Input
                  id="org_city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="org_state">State</Label>
                <Input
                  id="org_state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="org_country">Country</Label>
                <Input
                  id="org_country"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  placeholder="e.g. India"
                />
              </div>
              <div>
                <Label htmlFor="org_pincode">PIN code</Label>
                <Input
                  id="org_pincode"
                  value={form.pincode}
                  onChange={(e) =>
                    setForm({ ...form, pincode: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Business settings */}
          <Card>
            <CardHeader>
              <CardTitle>Business settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="org_timezone">Timezone</Label>
                <Input
                  id="org_timezone"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                  placeholder="e.g. Asia/Kolkata"
                />
              </div>
              <div>
                <Label htmlFor="org_currency">Currency</Label>
                <Select
                  id="org_currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save company profile"}
            </Button>
          </div>
        </form>
      </div>
    </ERPLayout>
  );
}