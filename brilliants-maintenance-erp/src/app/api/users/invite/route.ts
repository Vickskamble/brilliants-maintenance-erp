import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(id, code, organization_id)")
    .eq("user_id", user.id);

  const rows = (roleRows ?? []) as unknown as Array<{
    roles: { id: string; code: string; organization_id: string | null } | null;
  }>;
  const adminRole = rows.find((r) => r.roles?.code === "ADMIN");
  if (!adminRole?.roles) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }
  const organizationId = adminRole.roles.organization_id ?? null;

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
      organization_id: organizationId ?? undefined,
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
    organization_id: organizationId ?? undefined,
    plant_id: plant_id || null,
    user_id: user.id,
    action: "create_user",
    entity_type: "user",
    entity_id: authUserId,
    entity_title: name,
    summary: `Created user account ${email} (${inviteSent ? "invite sent" : "password set"})`,
    metadata: {
      email,
      role_id,
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