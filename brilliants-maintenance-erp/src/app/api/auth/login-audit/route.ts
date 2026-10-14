import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { logAuditAction } from "@/services/platform";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, organization_id, plant_id")
    .eq("id", user.id)
    .maybeSingle();

  const forward = request.headers.get("x-forwarded-for");
  const ip = forward ? forward.split(",")[0].trim() : null;

  await logAuditAction(
    {
      organizationId: profile?.organization_id ?? null,
      plantId: profile?.plant_id ?? null,
    },
    {
      action: "sign_in",
      entityType: "user",
      entityId: user.id,
      entityTitle: profile?.name ?? null,
      summary: "User signed in",
      metadata: {
        sign_in: new Date().toISOString(),
        ip: ip,
        userAgent: request.headers.get("user-agent") ?? null,
      },
    },
    { id: user.id, name: profile?.name ?? null }
  );

  return NextResponse.json({ ok: true });
}