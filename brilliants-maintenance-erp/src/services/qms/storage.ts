import { createClient } from "@/lib/supabase/client";

const BUCKET = "qms-docs";

/** Uploads a QMS document to private storage. Returns the storage path. */
export async function uploadQmsDocument(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ path?: string; error: string | null }> {
  const supabase = createClient();
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  const name = (fileName ?? file.name).replace(/\s+/g, "-");
  const path = `${safeFolder}/${Date.now()}-${name}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path: data?.path, error: null };
}

/** Creates a short-lived signed URL for preview/download of a stored file. */
export async function createSignedQmsUrl(path: string, expiresInSeconds = 900): Promise<{ url?: string; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return { error: error.message };
  return { url: data?.signedUrl, error: null };
}

/** Removes a stored file (used when a document revision is deleted). */
export async function removeQmsDocument(path: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return error?.message ?? null;
}