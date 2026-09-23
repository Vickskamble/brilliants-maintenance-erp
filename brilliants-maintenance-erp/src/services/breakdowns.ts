import { createClient } from "@/lib/supabase/server";

export type BreakdownRow = {
  id: string;
  breakdown_no: string | null;
  equipment_id: string | null;
  reported_at: string | null;
  description: string | null;
  root_cause: string | null;
  resolution: string | null;
  downtime_minutes: number | null;
  status: string | null;
  severity: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getBreakdownList(): Promise<{
  data: BreakdownRow[] | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breakdowns")
    .select("*")
    .order("reported_at", { ascending: false });
  return { data: (data as unknown as BreakdownRow[]) ?? null, error };
}

export async function getBreakdown(id: string): Promise<{
  data: BreakdownRow | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breakdowns")
    .select("*")
    .eq("id", id)
    .single();
  return { data: (data as unknown as BreakdownRow) ?? null, error };
}

export async function createBreakdown(
  payload: Partial<BreakdownRow>
): Promise<{ data: BreakdownRow | null; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breakdowns")
    .insert(payload)
    .select()
    .single();
  return { data: (data as unknown as BreakdownRow) ?? null, error };
}

export async function updateBreakdown(
  id: string,
  payload: Partial<BreakdownRow>
): Promise<{ data: BreakdownRow | null; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breakdowns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as BreakdownRow) ?? null, error };
}

export async function deleteBreakdown(id: string): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("breakdowns").delete().eq("id", id);
  return { data, error };
}

export async function resolveBreakdown(
  id: string,
  payload: { resolution: string; status: string; resolved_at: string; downtime_minutes: number }
): Promise<{ data: BreakdownRow | null; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("breakdowns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as BreakdownRow) ?? null, error };
}
