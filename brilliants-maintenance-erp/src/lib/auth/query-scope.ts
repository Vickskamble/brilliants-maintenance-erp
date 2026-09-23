"use client";

import { useAuth } from "./context";

export interface QueryScope {
  organizationId: string | null;
  plantId: string | null;
}

interface IdBearing {
  id: string | null;
}

/**
 * Builds org/plant filter values from the active organization and plant.
 * Used by services/pages to scope row-level queries to the user's context.
 */
export function buildQueryScope(
  organization: IdBearing | null,
  plant: IdBearing | null
): QueryScope {
  return {
    organizationId: organization?.id ?? null,
    plantId: plant?.id ?? null,
  };
}

/** Returns eq() filters for org/plant scoping. Callers apply them with .eq(col, val). */
export function queryScopeFilters(scope: QueryScope): Record<string, string> {
  const filters: Record<string, string> = {};
  if (scope.organizationId) filters.organization_id = scope.organizationId;
  if (scope.plantId) filters.plant_id = scope.plantId;
  return filters;
}

export function useQueryScope(): QueryScope {
  const { organization, plant } = useAuth();
  return buildQueryScope(organization, plant);
}