"use client";

import { useAuth } from "@/lib/auth/context";

export function useUser() {
  const { user, profile, isLoading } = useAuth();
  return { user, profile, isLoading };
}
