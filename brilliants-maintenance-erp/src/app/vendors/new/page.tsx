"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/ui/form-error";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save } from "lucide-react";

const VENDOR_TYPES = [
  { value: "parts", label: "Spare Parts Supplier" },
  { value: "service", label: "Service Provider" },
  { value: "contractor", label: "Contractor" },
  { value: "equipment", label: "Equipment Supplier" },
  { value: "consumables", label: "Consumables Supplier" },
  { value: "other", label: "Other" },
];

export default function NewVendorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [vendorCode, setVendorCode] = useState("");
  const [name, setName] = useState("");
  const [vendorType, setVendorType] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxIdentifier, setTaxIdentifier] = useState("");
  const [status, setStatus] = useState("active");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!vendorCode.trim()) next.vendorCode = "Vendor code is required";
    if (!name.trim()) next.name = "Vendor name is required";
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      vendor_code: vendorCode.trim(),
      name: name.trim(),
      vendor_type: vendorType || null,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      tax_identifier: taxIdentifier || null,
      status,
    };
    const { data, error } = await supabase.from("vendors").insert(payload).select().single();
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push(`/vendors/${data.id}`);
  }

  return (
    <ERPLayout>
      <PageHeader
        title="Add Vendor"
        description="Register a new supplier or service provider."
        action={
          <Link href="/vendors">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Vendors
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Vendor Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="vendor_code">Vendor Code</Label>
                <Input
                  id="vendor_code"
                  value={vendorCode}
                  onChange={(e) => setVendorCode(e.target.value)}
                  placeholder="e.g. VND-0001"
                />
                <FormError message={errors.vendorCode} />
              </div>
              <div>
                <Label htmlFor="vendor_type">Vendor Type</Label>
                <Select
                  id="vendor_type"
                  value={vendorType}
                  onChange={(e) => setVendorType(e.target.value)}
                >
                  <option value="">Select type...</option>
                  {VENDOR_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="name">Vendor Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company name"
                />
                <FormError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FormError message={errors.email} />
              </div>
              <div>
                <Label htmlFor="tax_identifier">Tax Identifier</Label>
                <Input
                  id="tax_identifier"
                  value={taxIdentifier}
                  onChange={(e) => setTaxIdentifier(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/vendors")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Add Vendor"}
          </Button>
        </div>
      </form>
    </ERPLayout>
  );
}