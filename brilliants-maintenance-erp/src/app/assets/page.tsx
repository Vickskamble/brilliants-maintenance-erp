"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ErpAssetTree, type ErpTreeNode } from "@/components/erp/erp-asset-tree";
import { createClient } from "@/lib/supabase/client";
import { GitBranch } from "lucide-react";

interface PlantRow {
  id: string;
  name: string;
}

interface DepartmentRow {
  id: string;
  name: string;
  plant_id: string | null;
}

interface EquipmentRow {
  id: string;
  equipment_code: string;
  equipment_name: string;
  plant_id: string | null;
  department_id: string | null;
}

interface ComponentRow {
  id: string;
  equipment_id: string;
  component_name: string;
  component_type: string | null;
}

export default function AssetsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [roots, setRoots] = useState<ErpTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadTree();
  }, []);

  async function loadTree() {
    setIsLoading(true);
    const [plantsRes, departmentsRes, equipmentRes, componentsRes] =
      await Promise.all([
        supabase.from("plants").select("id, name").order("name"),
        supabase.from("departments").select("id, name, plant_id").order("name"),
        supabase
          .from("equipment")
          .select("id, equipment_code, equipment_name, plant_id, department_id")
          .order("equipment_code"),
        supabase
          .from("equipment_components")
          .select("id, equipment_id, component_name, component_type")
          .order("component_name")
          .limit(2000),
      ]);

    const plants = (plantsRes.data as unknown as PlantRow[]) ?? [];
    const departments = (departmentsRes.data as unknown as DepartmentRow[]) ?? [];
    const equipmentRows = (equipmentRes.data as unknown as EquipmentRow[]) ?? [];
    const componentRows = (componentsRes.data as unknown as ComponentRow[]) ?? [];

    const componentsByEquipment = new Map<string, ErpTreeNode[]>();
    for (const component of componentRows) {
      const list = componentsByEquipment.get(component.equipment_id) ?? [];
      list.push({
        id: component.id,
        label: component.component_name,
        kind: "component",
        description: component.component_type
          ? component.component_type.replace(/_/g, " ")
          : undefined,
      });
      componentsByEquipment.set(component.equipment_id, list);
    }

    const equipmentByDepartment = new Map<string, ErpTreeNode[]>();
    const equipmentByPlantUnassigned = new Map<string, ErpTreeNode[]>();
    for (const equipment of equipmentRows) {
      const node: ErpTreeNode = {
        id: equipment.id,
        label: `${equipment.equipment_code} — ${equipment.equipment_name}`,
        kind: "equipment",
        count: componentsByEquipment.get(equipment.id)?.length ?? 0,
        children: componentsByEquipment.get(equipment.id) ?? [],
        onClick: () => router.push(`/equipment/${equipment.id}`),
      };
      if (equipment.department_id) {
        const list = equipmentByDepartment.get(equipment.department_id) ?? [];
        list.push(node);
        equipmentByDepartment.set(equipment.department_id, list);
      } else if (equipment.plant_id) {
        const list =
          equipmentByPlantUnassigned.get(equipment.plant_id) ?? [];
        list.push(node);
        equipmentByPlantUnassigned.set(equipment.plant_id, list);
      }
    }

    const departmentById = new Map(
      departments.map((department) => [department.id, department])
    );

    const tree: ErpTreeNode[] = plants.map((plant) => {
      const departmentNodes = departments
        .filter((department) => department.plant_id === plant.id)
        .map((department) => {
          const children = equipmentByDepartment.get(department.id) ?? [];
          return {
            id: `dept-${department.id}`,
            label: department.name,
            kind: "department" as const,
            count: children.length,
            children,
          };
        });
      const unassigned = equipmentByPlantUnassigned.get(plant.id) ?? [];
      return {
        id: `plant-${plant.id}`,
        label: plant.name,
        kind: "plant" as const,
        count:
          departmentNodes.reduce((sum, d) => sum + (d.count ?? 0), 0) +
          unassigned.length,
        children: [
          ...departmentNodes,
          ...(unassigned.length
            ? [
                {
                  id: `plant-${plant.id}-unassigned`,
                  label: "Unassigned Equipment",
                  kind: "area" as const,
                  count: unassigned.length,
                  children: unassigned,
                },
              ]
            : []),
        ],
      };
    });

    setRoots(tree);
    setIsLoading(false);
  }

  return (
    <ERPLayout>
      <PermissionGate module="equipment" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Asset Hierarchy"
            description="Plant → department → equipment → components tree."
            action={
              <Link href="/equipment">
                <Button variant="outline">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Equipment List
                </Button>
              </Link>
            }
          />

          {isLoading ? (
            <Card>
              <div className="p-6">
                <LoadingPage />
              </div>
            </Card>
          ) : roots.length === 0 ? (
            <Card>
              <div className="p-6">
                <EmptyState
                  title="No assets"
                  description="Add plants and equipment to build the hierarchy."
                />
              </div>
            </Card>
          ) : (
            <ErpAssetTree roots={roots} />
          )}
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}