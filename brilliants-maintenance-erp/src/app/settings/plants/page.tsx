"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { Plant } from "@/types/database";
import { Plus, Search, Building2 } from "lucide-react";

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    timezone: "UTC",
    status: "active",
  });
  const supabase = createClient();
  const { organization } = useAuth();

  useEffect(() => {
    loadPlants();
  }, []);

  async function loadPlants() {
    const { data, error } = await supabase
      .from("plants")
      .select("*")
      .order("name");

    if (data) {
      setPlants(data);
    }
    setIsLoading(false);
  }

  function openDialog() {
    setForm({ name: "", code: "", address: "", timezone: "UTC", status: "active" });
    setFormError("");
    setIsDialogOpen(true);
  }

  async function handleAddPlant(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and code are required");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("plants").insert({
      organization_id: organization?.id ?? null,
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim() || null,
      timezone: form.timezone || null,
      status: form.status,
    });
    setIsSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setIsDialogOpen(false);
    await loadPlants();
  }

  const filteredPlants = plants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="Plants"
          description="Manage plant locations and assignments"
          action={
            <Button onClick={openDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Button>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search plants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : filteredPlants.length === 0 ? (
          <EmptyState
            title="No plants found"
            description="No plants match your search criteria."
            icon={<Building2 className="h-8 w-8 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlants.map((plant) => (
              <Card key={plant.id} className="hover:border-blue-200">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {plant.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Code: {plant.code}
                      </p>
                    </div>
                    <StatusBadge status={plant.status} />
                  </div>
                  {plant.address && (
                    <p className="mt-3 text-xs text-gray-500">
                      {plant.address}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Add Plant"
          description="Register a new plant location."
        >
          <form onSubmit={handleAddPlant} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <Label htmlFor="plant_name">Plant Name *</Label>
              <Input
                id="plant_name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Pune Plant"
              />
            </div>
            <div>
              <Label htmlFor="plant_code">Code *</Label>
              <Input
                id="plant_code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. PUN"
              />
            </div>
            <div>
              <Label htmlFor="plant_address">Address</Label>
              <Textarea
                id="plant_address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plant_timezone">Timezone</Label>
              <Input
                id="plant_timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="plant_status">Status</Label>
              <Select
                id="plant_status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Add Plant"}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
