/**
 * File storage service.
 *
 * Wraps Supabase Storage uploads + the file_metadata table. call uploadFile()
 * to push a file to a bucket and record its metadata in one step. Future
 * modules call this instead of touching Storage or file_metadata directly.
 */

import { supabase, supabaseUntyped } from '../supabase/client';
import type { FileMetadata } from '../types/database';

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  entityType?: string;
  entityId?: string;
}

export interface UploadResult {
  metadata: FileMetadata | null;
  publicUrl: string | null;
  error: string | null;
}

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, entityType, entityId } = opts;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) return { metadata: null, publicUrl: null, error: upErr.message };

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl ?? null;

  const { data: meta, error: metaErr } = await supabaseUntyped
    .from('file_metadata')
    .insert({
      storage_bucket: bucket,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    })
    .select()
    .single();

  if (metaErr) return { metadata: null, publicUrl, error: metaErr.message };

  return { metadata: meta as FileMetadata, publicUrl, error: null };
}

export async function deleteFile(metadataId: string, bucket: string, path: string): Promise<{ error: string | null }> {
  const { error: storageErr } = await supabase.storage.from(bucket).remove([path]);
  if (storageErr) return { error: storageErr.message };

  const { error: dbErr } = await supabaseUntyped.from('file_metadata').delete().eq('id', metadataId);
  return { error: dbErr?.message ?? null };
}

export function getFilePublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}
