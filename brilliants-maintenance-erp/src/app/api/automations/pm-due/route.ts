import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const TOKEN = process.env.AUTOMATION_TOKEN ?? "";
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "465");
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM =
  process.env.SMTP_FROM ?? "Brilliants ERP <sells.brilliants.in@gmail.com>";
const LOOKAHEAD_HOURS = 48;

interface DueRow {
  id: string;
  schedule_no: string | null;
  next_run_at: string | null;
  notes: string | null;
  organization_id: string | null;
  plant_id: string | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

function buildHtml(
  orgName: string,
  rows: DueRow[]
): string {
  const rowsHtml = rows
    .map((r) => {
      const when = r.next_run_at
        ? new Date(r.next_run_at).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const equipment = r.equipment
        ? `${r.equipment.equipment_code} — ${r.equipment.equipment_name}`
        : "No equipment";
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#1F2937;">${equipment}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#1F2937;">${r.schedule_no ?? "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:#1F2937;"><strong>${when}</strong></td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#2563EB;padding:20px 24px;">
          <span style="font-size:20px;">&#128680;</span>
          <span style="color:#fff;font-size:18px;font-weight:700;margin-left:8px;">Preventive Maintenance Due</span>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">Hi,</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            <strong>${orgName}</strong> me <strong>${rows.length}</strong> maintenance schedule${
            rows.length > 1 ? "s are" : " is"
          } due within the next 48 hours. Please complete them on time.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;">
            <thead>
              <tr style="background:#F9FAFB;">
                <th align="left" style="padding:10px 12px;font-size:12px;color:#6B7280;text-transform:uppercase;">Equipment</th>
                <th align="left" style="padding:10px 12px;font-size:12px;color:#6B7280;text-transform:uppercase;">Schedule</th>
                <th align="left" style="padding:10px 12px;font-size:12px;color:#6B7280;text-transform:uppercase;">Next Run</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr><td align="center">
              <a href="https://erp.brilliants.in/maintenance"
                 style="display:inline-block;background:#3B82F6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Open Maintenance
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 24px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;">Brilliants ERP &mdash; Maintenance Management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const headerSecret =
    req.headers.get("x-automation-secret") ??
    req.headers.get("authorization") ??
    "";
  const secret = headerSecret.startsWith("Bearer ")
    ? headerSecret.slice(7)
    : headerSecret;
  if (!TOKEN || secret !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!SMTP_USER || !SMTP_PASS) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 500 });
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const upper = new Date(now.getTime() + LOOKAHEAD_HOURS * 3600000);

  const { data, error } = await admin
    .from("maintenance_schedules")
    .select(
      `id, schedule_no, next_run_at, notes, organization_id, plant_id, equipment(equipment_code, equipment_name)`
    )
    .eq("is_active", true)
    .gte("next_run_at", now.toISOString())
    .lte("next_run_at", upper.toISOString())
    .order("next_run_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as DueRow[];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, due: 0, emailsSent: 0 });
  }

  // group by org + plant so users only get their plant's PMs
  const groups = new Map<string, { orgId: string | null; plantId: string | null; rows: DueRow[] }>();
  for (const r of rows) {
    const key = `${r.organization_id ?? "null"}|${r.plant_id ?? ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        orgId: r.organization_id,
        plantId: r.plant_id,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(r);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  let emailsSent = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const g of groups.values()) {
    let orgName = "your organization";
    if (g.orgId) {
      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", g.orgId)
        .maybeSingle();
      if (org) orgName = org.name as string;
    }

    let query = admin
      .from("profiles")
      .select("id, name, email")
      .eq("status", "active");
    if (g.orgId) query = query.eq("organization_id", g.orgId);
    if (g.plantId) {
      query = query.or(`plant_id.eq.${g.plantId},plant_id.is.null`);
    }
    const { data: profiles } = await query;
    const recipients = (profiles ?? [])
      .filter((p) => typeof p.email === "string" && p.email.length > 0)
      .map((p) => p.email as string);

    if (recipients.length === 0) continue;

    const html = buildHtml(orgName, g.rows);
    for (const email of recipients) {
      try {
        await transporter.sendMail({
          from: SMTP_FROM,
          to: [email],
          subject: `[Brilliants ERP] ${g.rows.length} maintenance schedule${
            g.rows.length > 1 ? "s" : ""
          } due soon`,
          html,
        });
        emailsSent++;
      } catch (e) {
        failures.push({ email, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return NextResponse.json({
    success: true,
    due: rows.length,
    emailsSent,
    failed: failures,
  });
}