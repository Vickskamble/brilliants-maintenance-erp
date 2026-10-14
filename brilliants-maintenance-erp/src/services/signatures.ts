import { createClient } from "@/lib/supabase/client";

export type SignatureIntent = "approve" | "release" | "close";

export interface SignatureInput {
  organizationId: string | null;
  plantId: string | null;
  userId: string;
  userName: string;
  entityType: string;
  entityId: string;
  intent: SignatureIntent;
  meaning: string;
}

/**
 * Re-authenticates the signed-in user with their password (21 CFR Part 11
 * style electronic signature) and records an immutable signature row.
 * Returns an error string when the password is invalid or the insert fails.
 */
export async function verifyAndRecordSignature(
  input: SignatureInput,
  password: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (signInError) return { error: "Incorrect password" };

  const { error } = await supabase.from("electronic_signatures").insert({
    organization_id: input.organizationId ?? undefined,
    plant_id: input.plantId ?? null,
    user_id: input.userId,
    user_name: input.userName,
    entity_type: input.entityType,
    entity_id: input.entityId,
    intent: input.intent,
    meaning: input.meaning,
    signed_at: new Date().toISOString(),
  });

  return { error: error?.message ?? null };
}