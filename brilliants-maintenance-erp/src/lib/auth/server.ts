import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import type {
  Organization,
  Permission,
  Plant,
  Profile,
  Role,
} from "@/types/database";

export interface ServerUserContext {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  organization: Organization | null;
  organizationId: string | null;
  roles: Role[];
  permissions: Permission[];
  isSystemAdmin: boolean;
  hasPermission: (module: string, action: string) => boolean;
}

export type AuthorizeResult =
  | { ok: true; ctx: ServerUserContext }
  | { ok: false; response: NextResponse };

/**
 * Server-side user context: the auth session plus the org-scoped
 * profile, organizations, roles and effective permissions. Central
 * load path for API routes and server components so permission
 * enforcement never relies on the client.
 */
export async function getServerUserContext(): Promise<ServerUserContext> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const base: ServerUserContext = {
    user: user ? { id: user.id, email: user.email || "" } : null,
    profile: null,
    organization: null,
    organizationId: null,
    roles: [],
    permissions: [],
    isSystemAdmin: false,
    hasPermission: () => false,
  };

  if (!user) {
    return base;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return base;
  }
  base.profile = profile as Profile;
  base.organizationId = (profile as Profile).organization_id;

  if (base.organizationId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", base.organizationId)
      .single();
    base.organization = (org as Organization | null) ?? null;
  }

  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("*, roles(*)")
    .eq("user_id", user.id);

  const rawRoles = (userRolesData ?? []) as unknown as Array<{
    plant_id: string | null;
    roles: Role | null;
  }>;

  const rolesList = rawRoles
    .map((r) => r.roles)
    .filter(Boolean) as unknown as Role[];

  // A user only inherits roles that belong to their own organization. Global
  // (organization_id = null) roles such as SYSTEM_ADMIN are only inherited by
  // users without an organization (the platform host). Roles tied to another
  // organization never leak into this user's permission set.
  base.roles = rolesList.filter(
    (r) =>
      r.organization_id === base.organizationId ||
      (base.organizationId === null && r.organization_id === null)
  );
  base.isSystemAdmin =
    base.organizationId === null &&
    base.roles.some((r) => r.code === "SYSTEM_ADMIN");

  const roleIds = base.roles.map((r) => r.id);
  if (roleIds.length > 0) {
    const { data: rolePermsData } = await supabase
      .from("role_permissions")
      .select("*, permissions(*)")
      .in("role_id", roleIds);
    const permsList = (rolePermsData ?? [])
      .map((rp) => rp.permissions)
      .filter(Boolean) as unknown as Permission[];
    const uniquePerms = permsList.filter(
      (p, i, self) =>
        self.findIndex(
          (q) => q.module === p.module && q.action === p.action
        ) === i
    );
    base.permissions = uniquePerms;
  }

  base.hasPermission = (module: string, action: string) =>
    hasPermission(base.permissions, module, action);

  return base;
}

/**
 * Authorizes a request against {module, action}. Returns the user context
 * on success or an already-built NextResponse (401/403) when the session
 * or permission is missing. Use in API route handlers.
 */
export async function authorize(
  module: string,
  action: string
): Promise<AuthorizeResult> {
  const ctx = await getServerUserContext();
  if (!ctx.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }
  if (!ctx.hasPermission(module, action)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx };
}

/**
 * Guards an org-bound action: the acting user must belong to an
 * organization (system admins without an org must supply one explicitly).
 */
export function requireOrg(
  ctx: ServerUserContext
): { ok: true; organizationId: string } | { ok: false; response: NextResponse } {
  if (!ctx.organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No organization associated with your account" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, organizationId: ctx.organizationId };
}