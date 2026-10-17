import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const ROLE_TEMPLATE_ORG = "11111111-1111-1111-1111-111111111111";
const ROLE_TEMPLATES = [
  "ADMIN",
  "MAINTENANCE_MANAGER",
  "MAINTENANCE_OFFICER",
  "TECHNICIAN",
  "VIEWER",
  "QA_OFFICER",
  "QA_MANAGER",
  "DOC_CONTROLLER",
];

interface CompanyPlantInput {
  code: string;
  name: string;
  timezone?: string;
}

interface AdminUserInput {
  name: string;
  email: string;
  password?: string;
}

interface CreateCompanyBody {
  legal_name: string;
  display_name?: string;
  code: string;
  industry?: string;
  timezone?: string;
  country?: string;
  plants: CompanyPlantInput[];
  adminUser: AdminUserInput;
}

export async function GET() {
  const auth = await authorize("organizations", "view");
  if (!auth.ok) return auth.response;
  if (!auth.ctx.isSystemAdmin) {
    return NextResponse.json(
      { error: "Only the platform super admin can manage companies" },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || supabaseUrl === "your_supabase_url") {
    return NextResponse.json(
      { error: "Companies management is not configured on this deployment" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, legal_name, display_name, code, industry, timezone, country, status, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plantsRes = await admin
    .from("plants")
    .select("id, organization_id, code, name, timezone, status")
    .in("organization_id", (orgs ?? []).map((o) => o.id));
  const byOrg = new Map<string, typeof plantsRes.data>();
  for (const plant of plantsRes.data ?? []) {
    const list = byOrg.get(plant.organization_id) ?? [];
    list.push(plant);
    byOrg.set(plant.organization_id, list);
  }

  return NextResponse.json({
    companies: (orgs ?? []).map((org) => ({
      ...org,
      plants: byOrg.get(org.id) ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await authorize("organizations", "create");
  if (!auth.ok) return auth.response;
  if (!auth.ctx.isSystemAdmin) {
    return NextResponse.json(
      { error: "Only the platform super admin can create companies" },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || supabaseUrl === "your_supabase_url") {
    return NextResponse.json(
      { error: "Companies management is not configured on this deployment" },
      { status: 500 }
    );
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = (await req.json()) as CreateCompanyBody;
  const legalName = (body.legal_name ?? "").trim();
  const code = (body.code ?? "").trim().toUpperCase();
  const displayName = (body.display_name ?? "").trim() || legalName;
  const timezone = body.timezone?.trim() || "Asia/Kolkata";
  const country = body.country?.trim() || "India";
  const plants = (body.plants ?? []).map((p) => ({
    ...p,
    code: p.code.trim().toUpperCase(),
    name: p.name.trim(),
    timezone: p.timezone?.trim() || timezone,
  }));
  const adminUser = body.adminUser;

  if (!legalName || !code) {
    return NextResponse.json(
      { error: "Company name and code are required" },
      { status: 400 }
    );
  }
  if (plants.length === 0) {
    return NextResponse.json(
      { error: "At least one plant is required" },
      { status: 400 }
    );
  }
  if (!adminUser || !adminUser.name?.trim() || !adminUser.email?.trim()) {
    return NextResponse.json(
      { error: "An administrator name and email are required" },
      { status: 400 }
    );
  }

  const { data: dupOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (dupOrg) {
    return NextResponse.json(
      { error: `A company with code ${code} already exists` },
      { status: 400 }
    );
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      legal_name: legalName,
      display_name: displayName,
      code,
      industry: body.industry?.trim() || null,
      timezone,
      country,
      status: "active",
    })
    .select()
    .single();
  if (orgError || !org) {
    return NextResponse.json(
      { error: `Could not create company: ${orgError?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }

  const insertedPlants = await admin
    .from("plants")
    .insert(
      plants.map((p) => ({
        organization_id: org.id,
        code: p.code,
        name: p.name,
        timezone: p.timezone,
        status: "active",
      }))
    )
    .select();
  if (insertedPlants.error) {
    return NextResponse.json(
      { error: `Company created but plants failed: ${insertedPlants.error.message}` },
      { status: 500 }
    );
  }
  const plantRows = insertedPlants.data ?? [];

  // -- clone roles from the canonical template org so the new company starts
  //    with the standard maintenance + quality roles and their permission grants.
  const rolesByCode = new Map<string, string>();
  for (const templateCode of ROLE_TEMPLATES) {
    const { data: templateRole } = await admin
      .from("roles")
      .select("id, name, description, system_role")
      .eq("organization_id", ROLE_TEMPLATE_ORG)
      .eq("code", templateCode)
      .maybeSingle();

    const { data: newRole, error: roleError } = await admin
      .from("roles")
      .insert({
        organization_id: org.id,
        code: templateCode,
        name: templateRole?.name ?? templateCode,
        description: templateRole?.description ?? null,
        system_role: templateRole?.system_role ?? templateCode === "ADMIN",
      })
      .select()
      .single();
    if (roleError || !newRole) {
      return NextResponse.json(
        { error: `Company created but role ${templateCode} failed: ${roleError?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }
    rolesByCode.set(templateCode, newRole.id);

    if (templateRole) {
      const { data: grants } = await admin
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", templateRole.id);
      if (grants && grants.length > 0) {
        const { error: grantError } = await admin.from("role_permissions").insert(
          grants.map((g) => ({ role_id: newRole.id, permission_id: g.permission_id }))
        );
        if (grantError) {
          return NextResponse.json(
            { error: `Company created but role grants failed: ${grantError.message}` },
            { status: 500 }
          );
        }
      }
    } else if (templateCode === "ADMIN") {
      // Template role missing: grant everything so the new admin is usable.
      const { data: allPerms } = await admin.from("permissions").select("id");
      if (allPerms && allPerms.length > 0) {
        const { error: grantError } = await admin.from("role_permissions").insert(
          allPerms.map((p) => ({ role_id: newRole.id, permission_id: p.id }))
        );
        if (grantError) {
          return NextResponse.json(
            { error: `Company created but role grants failed: ${grantError.message}` },
            { status: 500 }
          );
        }
      }
    }
  }

  // -- clone approval workflow definitions (and their steps) from the template
  //    org so maintenance / inventory / QMS approvals work for the new company.
  const primaryPlantId = plantRows[0]?.id ?? null;
  const { data: templateDefs } = await admin
    .from("workflow_definitions")
    .select("id, module, name, description, status, sla_hours")
    .eq("organization_id", ROLE_TEMPLATE_ORG);

  if (templateDefs && templateDefs.length > 0) {
    for (const def of templateDefs) {
      const { data: newDef, error: defError } = await admin
        .from("workflow_definitions")
        .insert({
          organization_id: org.id,
          plant_id: primaryPlantId,
          module: def.module,
          name: def.name,
          description: def.description,
          status: def.status,
          sla_hours: def.sla_hours,
        })
        .select()
        .single();
      if (defError || !newDef) {
        return NextResponse.json(
          { error: `Company created but workflow ${def.name} failed: ${defError?.message ?? "unknown error"}` },
          { status: 500 }
        );
      }

      const { data: steps } = await admin
        .from("workflow_steps")
        .select(
          "order_index, step_name, from_status, to_status, required_roles, require_approval, approval_role_code, require_reject_reason, condition, notify_role_codes, approval_mode, sla_hours"
        )
        .eq("workflow_definition_id", def.id);

      if (steps && steps.length > 0) {
        const { error: stepError } = await admin.from("workflow_steps").insert(
          steps.map((s) => ({
            workflow_definition_id: newDef.id,
            organization_id: org.id,
            plant_id: primaryPlantId,
            order_index: s.order_index,
            step_name: s.step_name,
            from_status: s.from_status,
            to_status: s.to_status,
            required_roles: s.required_roles,
            require_approval: s.require_approval,
            approval_role_code: s.approval_role_code,
            require_reject_reason: s.require_reject_reason,
            condition: s.condition,
            notify_role_codes: s.notify_role_codes,
            approval_mode: s.approval_mode,
            sla_hours: s.sla_hours,
          }))
        );
        if (stepError) {
          return NextResponse.json(
            { error: `Company created but workflow steps failed: ${stepError.message}` },
            { status: 500 }
          );
        }
      }
    }
  }

  // -- create the company administrator account.
  const email = adminUser.email.trim().toLowerCase();
  const name = adminUser.name.trim();
  let authUserId: string;
  let inviteSent = false;
  try {
    if (adminUser.password) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: adminUser.password,
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
      { error: "Could not create the administrator auth account. Try again." },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUserId,
    organization_id: org.id,
    plant_id: plantRows[0]?.id ?? null,
    employee_code: "EMP-0001",
    name,
    email,
    status: "active",
  });
  if (profileError) {
    return NextResponse.json(
      { error: `Admin account created but profile failed: ${profileError.message}` },
      { status: 500 }
    );
  }

  const adminRoleId = rolesByCode.get("ADMIN");
  if (adminRoleId) {
    const { error: userRoleError } = await admin.from("user_roles").insert({
      user_id: authUserId,
      role_id: adminRoleId,
      plant_id: plantRows[0]?.id ?? null,
    });
    if (userRoleError) {
      return NextResponse.json(
        { error: `Profile saved but admin role assignment failed: ${userRoleError.message}` },
        { status: 500 }
      );
    }
  }

  await admin.from("audit_logs").insert({
    organization_id: org.id,
    user_id: auth.ctx.user?.id ?? null,
    action: "create_company",
    entity_type: "organization",
    entity_id: org.id,
    entity_title: displayName,
    summary: `Created company ${displayName} (${code}) with ${plantRows.length} plant(s)`,
    metadata: {
      company_code: code,
      plants: plantRows.map((p) => p.code),
      admin_email: email,
      invite_sent: inviteSent,
    },
  });

  return NextResponse.json(
    { ok: true, companyId: org.id, plantIds: plantRows.map((p) => p.id), inviteSent },
    { status: 201 }
  );
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