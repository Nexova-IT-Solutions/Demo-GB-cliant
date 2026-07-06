import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function extractStoragePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteFileByPublicUrl(publicUrl: string, bucket = "giftbox"): Promise<void> {
  if (!supabase) {
    console.warn("[Supabase] Client not initialized. Skipping file deletion.");
    return;
  }
  const existingPath = extractStoragePathFromPublicUrl(publicUrl, bucket);
  if (!existingPath) return;

  const { error } = await supabase.storage.from(bucket).remove([existingPath]);
  if (error) {
    console.warn("Supabase remove warning:", error.message);
  }
}

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The File object or a string URL (if string, returns as is).
 * @param path The path/prefix within the 'public' bucket.
 */
export async function uploadFile(
  file: File | string,
  path: string,
  options?: { replacePublicUrl?: string; bucket?: string }
): Promise<string> {
  if (typeof file === "string") return file;
  if (!supabase) {
    console.error("[Supabase] Attempted file upload, but Supabase is not configured.");
    throw new Error("Supabase is not configured. File upload is unavailable.");
  }
  
  const bucket = options?.bucket || "giftbox"; // Using a single bucket 'giftbox' to keep things simple
  if (options?.replacePublicUrl) {
    await deleteFileByPublicUrl(options.replacePublicUrl, bucket);
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    console.error("Supabase Storage Error:", error);
    // If the error is 'Bucket not found', we'll provide a clearer message
    if (error.message.includes('Bucket not found')) {
      throw new Error(`The Supabase bucket "${bucket}" was not found. Please create it in your Dashboard.`);
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
}
