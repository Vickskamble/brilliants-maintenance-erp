import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { authorize, requireOrg } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

interface InviteBody {
  email: string;
  name: string;
  phone?: string;
  employee_code?: string;
  role_id: string;
  plant_id?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  const auth = await authorize("settings", "create");
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const org = requireOrg(ctx);
  if (!org.ok) return org.response;
  const organizationId = org.organizationId;

  const body = (await req.json()) as InviteBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const { role_id, plant_id, password } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }
  if (!role_id) {
    return NextResponse.json(
      { error: "Role is required" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || supabaseUrl === "your_supabase_url") {
    return NextResponse.json(
      { error: "User invitations are not configured on this deployment" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // -- validation: role must belong to the caller's organization --
  const { data: roleRow } = await admin
    .from("roles")
    .select("id, code, organization_id")
    .eq("id", role_id)
    .maybeSingle();

  if (!roleRow) {
    return NextResponse.json(
      { error: "Selected role does not exist" },
      { status: 400 }
    );
  }
  if (roleRow.organization_id !== organizationId) {
    return NextResponse.json(
      { error: "Selected role does not belong to your organization" },
      { status: 400 }
    );
  }

  // -- validation: plant must belong to the caller's organization --
  if (plant_id) {
    const { data: plantRow } = await admin
      .from("plants")
      .select("id, organization_id")
      .eq("id", plant_id)
      .maybeSingle();
    if (!plantRow || plantRow.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Selected plant does not belong to your organization" },
        { status: 400 }
      );
    }
  }

  // -- privilege guard: the caller may only assign roles whose permission
  //    set is fully contained within their own, so a non-admin can never
  //    escalate themselves or grant ADMIN.
  const { data: targetPerms } = await admin
    .from("role_permissions")
    .select("permissions(module, action)")
    .eq("role_id", role_id);

  const targetPermSet = (targetPerms ?? [])
    .map((rp) => rp.permissions)
    .filter(Boolean) as unknown as Array<{ module: string; action: string }>;

  const allowed = targetPermSet.every((p) =>
    ctx.hasPermission(p.module, p.action)
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Cannot assign a role with more privileges than your own" },
      { status: 403 }
    );
  }

  let authUserId: string;
  let inviteSent = false;
  try {
    if (password) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (error) {
        return NextResponse.json(
          { error: friendlyAuthError(error.message, email) },
          { status: 400 }
        );
      }
      authUserId = data.user!.id;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name },
      });
      if (error) {
        return NextResponse.json(
          { error: friendlyAuthError(error.message, email) },
          { status: 400 }
        );
      }
      authUserId = data.user!.id;
      inviteSent = true;
    }
  } catch {
    return NextResponse.json(
      { error: "Could not create the auth account. Try again." },
      { status: 500 }
    );
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: authUserId,
      organization_id: organizationId,
      plant_id: plant_id || null,
      employee_code: body.employee_code?.trim() || null,
      name,
      email,
      phone: body.phone?.trim() || null,
      status: "active",
    });
    if (profileError) {
      return NextResponse.json(
        { error: `Account created but profile failed: ${profileError.message}` },
        { status: 500 }
      );
    }
  }

  const { data: existingRole } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", authUserId)
    .eq("role_id", role_id)
    .maybeSingle();

  if (!existingRole) {
    const { error: userRoleError } = await admin.from("user_roles").insert({
      user_id: authUserId,
      role_id,
      plant_id: plant_id || null,
    });
    if (userRoleError) {
      return NextResponse.json(
        { error: `Profile saved but role assignment failed: ${userRoleError.message}` },
        { status: 500 }
      );
    }
  }

  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    plant_id: plant_id || null,
    user_id: ctx.user?.id ?? null,
    action: "create_user",
    entity_type: "user",
    entity_id: authUserId,
    entity_title: name,
    summary: `Created user account ${email} (${inviteSent ? "invite sent" : "password set"})`,
    metadata: {
      email,
      role_id,
      role_code: roleRow.code,
      plant_id: plant_id || null,
      invite_sent: inviteSent,
    },
  });

  return NextResponse.json({
    ok: true,
    userId: authUserId,
    inviteSent,
  });
}

function friendlyAuthError(message: string, email: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return `Email ${email} is already registered. Invite them or edit their existing account instead.`;
  }
  if (lower.includes("password")) {
    return `Invalid password: ${message}`;
  }
  return message;
}