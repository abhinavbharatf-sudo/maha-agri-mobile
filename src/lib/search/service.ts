/**
 * Search service.
 *
 * Uses Postgres full-text search via the search_tsv column. search() runs a
 * plainto_tsquery against the GIN index and returns ranked results.
 * indexEntity / removeEntity keep the index in sync when modules create or
 * delete searchable records.
 */

import { supabaseUntyped } from '../supabase/client';
import type { SearchIndexEntry } from '../types/database';

export interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  body: string | null;
  rank: number;
}

export async function search(query: string, limit = 20): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabaseUntyped.rpc('search_entities', {
    q: trimmed,
    result_limit: limit,
  });

  if (error) {
    console.error('[search] query error', error);
    return [];
  }
  return (data ?? []) as SearchResult[];
}

export async function indexEntity(params: {
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped.from('search_index').upsert(
    {
      entity_type: params.entityType,
      entity_id: params.entityId,
      title: params.title,
      body: params.body ?? null,
    },
    { onConflict: 'entity_type,entity_id' }
  );
  return { error: error?.message ?? null };
}

export async function removeEntityFromIndex(
  entityType: string,
  entityId: string
): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped
    .from('search_index')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  return { error: error?.message ?? null };
}

export type { SearchIndexEntry };
