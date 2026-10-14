import { createClient } from "@/lib/supabase/client";

export interface RoleBundleRow {
  id: string;
  organization_id: string | null;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RoleBundleWithRoles extends RoleBundleRow {
  roles: Array<{ id: string; code: string; name: string }>;
}

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

export async function listRoleBundles(): Promise<{ data: RoleBundleWithRoles[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("role_bundles")
    .select("*, role_bundle_items(role_id, roles(code, name))")
    .order("name");

  if (error) return { data: [], error: error.message };
  const rows = (data ?? []) as (RoleBundleRow & {
    role_bundle_items: Array<{ role_id: string; roles: { code: string; name: string } | null }>;
  })[];
  return {
    data: rows.map((b) => ({
      ...b,
      roles: (b.role_bundle_items ?? [])
        .filter((i) => i.roles)
        .map((i) => ({ id: i.role_id, code: i.roles!.code, name: i.roles!.name })),
    })),
    error: null,
  };
}

export async function listUserBundleAssignments(userId: string): Promise<{ data: string[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("role_bundle_assignments")
    .select("bundle_id")
    .eq("user_id", userId);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map((r) => (r as { bundle_id: string }).bundle_id), error: null };
}

export async function listAllBundleAssignments(): Promise<{ data: Record<string, string | null>; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("role_bundle_assignments")
    .select("user_id, bundle_id");
  if (error) return { data: {}, error: error.message };
  const map: Record<string, string | null> = {};
  for (const row of (data ?? []) as Array<{ user_id: string; bundle_id: string }>) {
    map[row.user_id] = row.bundle_id;
  }
  return { data: map, error: null };
}

export async function assignUserBundle(
  userId: string,
  bundleId: string | null
): Promise<{ error: string | null }> {
  try {
    const res = await fetch("/api/users/bundles/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bundleId }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) return { error: json.error ?? "Bundle assignment failed." };
    return { error: null };
  } catch {
    return { error: "Network error. Try again." };
  }
}