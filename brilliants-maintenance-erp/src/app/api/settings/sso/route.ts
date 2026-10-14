import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * SSO scaffold: reports whether Supabase-managed SAML/SSO is available on
 * this deployment (Enterprise add-on + custom auth domain required) and lists
 * any configured identity providers. Creating providers is intentionally left
 * to the Supabase dashboard / admin API so no SAML metadata ever touches this
 * codebase.
 */
export async function GET() {
  const auth = await authorize("settings", "view");
  if (!auth.ok) return auth.response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const instanceEnabled = process.env.SSO_ENABLED === "true";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      enabled: false,
      reason: "Supabase is not configured on this deployment.",
      providers: [],
    });
  }

  if (!instanceEnabled) {
    return NextResponse.json({
      enabled: false,
      reason:
        "SSO requires SSO_ENABLED=true in the deployment environment. The feature is behind the Supabase Enterprise add-on plan.",
      providers: [],
    });
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/sso/providers`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!res.ok) {
      return NextResponse.json({
        enabled: true,
        providers: [],
        fetchError: `Provider list unavailable (${res.status}). Configure providers from the Supabase dashboard (Authentication > SSO).`,
      });
    }
    const body = (await res.json()) as { items?: Array<{ id: string; type: string; saml?: { attribute_mapping?: { name?: { keys?: string[] } } } }> };
    return NextResponse.json({
      enabled: true,
      providers: (body.items ?? []).map((p) => ({
        id: p.id,
        type: p.type,
        name: p.saml?.attribute_mapping?.name?.keys?.join(", ") ?? "Unnamed",
      })),
    });
  } catch {
    return NextResponse.json({
      enabled: true,
      providers: [],
      fetchError: "Could not reach the Supabase Auth admin API.",
    });
  }
}