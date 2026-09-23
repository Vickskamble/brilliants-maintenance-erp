"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { Plant } from "@/types/database";
import { Plus, Search, Building2 } from "lucide-react";

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

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
            <Button>
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
      </div>
    </ERPLayout>
  );
}
