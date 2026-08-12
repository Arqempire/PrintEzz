import { getSupabaseAdmin, isSupabaseConfigured } from './supabase/server';
import { supabaseClient } from './supabase/client';

const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'print-files';

/**
 * Generate a presigned/signed upload URL for direct mobile browser upload to Supabase Storage
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const sanitizeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${sanitizeName}`;

  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();

      // Create signed upload URL in Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(fileKey);

      if (!error && data) {
        // Generate signed download / public URL
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileKey);

        return {
          uploadUrl: data.signedUrl,
          fileKey,
          publicUrl: publicUrlData.publicUrl,
        };
      } else {
        console.warn('[Supabase Storage] createSignedUploadUrl error, falling back to mock:', error);
      }
    } catch (err) {
      console.warn('[Supabase Storage] Upload presign error:', err);
    }
  }

  // Fallback Dev / Mock Upload URL
  return {
    uploadUrl: `/api/upload/mock-upload?key=${encodeURIComponent(fileKey)}`,
    fileKey,
    publicUrl: `/api/upload/mock-download?key=${encodeURIComponent(fileKey)}`,
  };
}

/**
 * Generate a signed URL for downloading/viewing a print file from Supabase Storage
 */
export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(fileKey, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[Supabase Storage] Signed URL download error:', err);
    }
  }

  return `/api/upload/mock-download?key=${encodeURIComponent(fileKey)}`;
}

/**
 * Delete object from Supabase Storage (used by retention cleanup function)
 */
export async function deleteFromStorage(fileKey: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.log(`[Storage Mock] Deleted object: ${fileKey}`);
    return true;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileKey]);

    if (error) {
      console.error(`[Supabase Storage] Error deleting ${fileKey}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase Storage] Exception deleting ${fileKey}:`, err);
    return false;
  }
}
