import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { authorize, requireOrg } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

interface AssignBody {
  userId: string;
  bundleId: string | null;
}

/**
 * Assigns (or clears with null) a composite role bundle to a user. The bundle's
 * role grants are materialized into user_roles so the existing permission
 * machinery keeps working unchanged. Assigning a bundle replaces any previous
 * bundle assignment for that user.
 */
export async function POST(req: NextRequest) {
  const auth = await authorize("settings", "create");
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const org = requireOrg(ctx);
  if (!org.ok) return org.response;
  const organizationId = org.organizationId;

  const body = (await req.json()) as AssignBody;
  const userId = (body.userId ?? "").trim();
  const bundleId = body.bundleId ? (body.bundleId as string).trim() : null;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || supabaseUrl === "your_supabase_url") {
    return NextResponse.json(
      { error: "Bundle assignment is not configured on this deployment" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: user } = await admin
    .from("profiles")
    .select("id, name, email, organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (!user) {
    return NextResponse.json({ error: "User does not exist" }, { status: 400 });
  }
  if (user.organization_id !== organizationId) {
    return NextResponse.json(
      { error: "User does not belong to your organization" },
      { status: 400 }
    );
  }

  const { data: previousAssignments } = await admin
    .from("role_bundle_assignments")
    .select("bundle_id")
    .eq("user_id", userId);

  const previousBundleIds = (previousAssignments ?? []).map(
    (a) => (a as { bundle_id: string }).bundle_id
  );

  if (bundleId) {
    const { data: bundle } = await admin
      .from("role_bundles")
      .select("id, code, name, organization_id, role_bundle_items(role_id)")
      .eq("id", bundleId)
      .maybeSingle();
    if (!bundle) {
      return NextResponse.json({ error: "Bundle does not exist" }, { status: 400 });
    }
    if (bundle.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Bundle does not belong to your organization" },
        { status: 400 }
      );
    }
    const roleIds = (bundle.role_bundle_items ?? []).map(
      (i) => (i as { role_id: string }).role_id
    );
    if (roleIds.length === 0) {
      return NextResponse.json(
        { error: "Bundle contains no roles" },
        { status: 400 }
      );
    }

    const { data: rolePerms } = await admin
      .from("role_permissions")
      .select("role_id, permissions(module, action)")
      .in("role_id", roleIds);
    const permSet = (rolePerms ?? [])
      .map((rp) => rp.permissions)
      .filter(Boolean) as unknown as Array<{ module: string; action: string }>;
    if (!permSet.every((p) => ctx.hasPermission(p.module, p.action))) {
      return NextResponse.json(
        { error: "Cannot assign a bundle with more privileges than your own" },
        { status: 403 }
      );
    }
  }

  // -- revoke grants materialized by any previous bundle assignment --
  if (previousBundleIds.length > 0) {
    const { data: previousRoles } = await admin
      .from("role_bundle_items")
      .select("role_id")
      .in("bundle_id", previousBundleIds);
    const previousRoleIds = (previousRoles ?? []).map(
      (i) => (i as { role_id: string }).role_id
    );
    if (previousRoleIds.length > 0) {
      await admin.from("user_roles").delete().eq("user_id", userId).in("role_id", previousRoleIds);
    }
    await admin.from("role_bundle_assignments").delete().eq("user_id", userId);
  }

  if (bundleId) {
    const { data: bundle } = await admin
      .from("role_bundles")
      .select("id, code, name, role_bundle_items(role_id, roles(id, code, name))")
      .eq("id", bundleId)
      .maybeSingle();

    const roleRows = ((bundle as any)?.role_bundle_items ?? [])
      .filter((i: any) => i.roles)
      .map((i: any) => ({ role_id: i.role_id, code: i.roles.code, name: i.roles.name }));

    await admin.from("user_roles").insert(
      roleRows.map((r: { role_id: string }) => ({ user_id: userId, role_id: r.role_id }))
    );
    await admin.from("role_bundle_assignments").insert({
      user_id: userId,
      bundle_id: bundleId,
      assigned_by: ctx.user?.id ?? null,
    });

    await admin.from("audit_logs").insert({
      organization_id: organizationId,
      plant_id: ctx.profile?.plant_id ?? null,
      user_id: ctx.user?.id ?? null,
      action: "assign_role_bundle",
      entity_type: "user",
      entity_id: userId,
      entity_title: user.name,
      summary: `Assigned bundle ${bundle?.name ?? bundleId} to ${user.email}`,
      metadata: { bundle_id: bundleId, roles: roleRows.map((r: { code: string }) => r.code) },
    });

    return NextResponse.json({ ok: true, bundleId, roles: roleRows });
  }

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    plant_id: ctx.profile?.plant_id ?? null,
    user_id: ctx.user?.id ?? null,
    action: "clear_role_bundle",
    entity_type: "user",
    entity_id: userId,
    entity_title: user.name,
    summary: `Cleared bundle assignment for ${user.email}`,
    metadata: { previous_bundle_ids: previousBundleIds },
  });

  return NextResponse.json({ ok: true, bundleId: null });
}