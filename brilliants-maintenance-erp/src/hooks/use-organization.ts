"use client";

import { useAuth } from "@/lib/auth/context";

export function useOrganization() {
  const {
    organization,
    plant,
    plants,
    setSelectedPlant,
    isLoading,
  } = useAuth();

  return {
    organization,
    plant,
    plants,
    setSelectedPlant,
    isLoading,
  };
}
