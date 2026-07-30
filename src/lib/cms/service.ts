/**
 * CMS service.
 *
 * CRUD over cms_contents + cms_content_types. Future modules (news, pages,
 * announcements) call these helpers instead of querying the tables directly.
 */

import { supabaseUntyped } from '../supabase/client';
import type {
  CmsContent,
  CmsContentType,
  CmsStatus,
} from '../types/database';

export async function fetchContentTypes(): Promise<CmsContentType[]> {
  const { data, error } = await supabaseUntyped
    .from('cms_content_types')
    .select('*')
    .order('name');
  if (error) return [];
  return (data ?? []) as CmsContentType[];
}

export async function fetchPublishedContent(typeKey?: string): Promise<CmsContent[]> {
  let query = supabaseUntyped
    .from('cms_contents')
    .select('*, content_type:cms_content_types(key, name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (typeKey) {
    const { data: typeRow } = await supabaseUntyped
      .from('cms_content_types')
      .select('id')
      .eq('key', typeKey)
      .maybeSingle();
    if (typeRow) query = query.eq('content_type_id', (typeRow as { id: string }).id);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as CmsContent[];
}

export async function fetchContentBySlug(slug: string): Promise<CmsContent | null> {
  const { data, error } = await supabaseUntyped
    .from('cms_contents')
    .select('*, content_type:cms_content_types(key, name)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as CmsContent;
}

export async function createContent(params: {
  contentTypeId: string;
  title: string;
  slug: string;
  body?: Record<string, unknown>;
  status?: CmsStatus;
  authorId?: string;
}): Promise<{ data: CmsContent | null; error: string | null }> {
  const { data, error } = await supabaseUntyped
    .from('cms_contents')
    .insert({
      content_type_id: params.contentTypeId,
      title: params.title,
      slug: params.slug,
      body: params.body ?? {},
      status: params.status ?? 'draft',
      author_id: params.authorId ?? null,
    })
    .select()
    .single();
  return { data: data as CmsContent | null, error: error?.message ?? null };
}

export async function updateContent(
  id: string,
  patch: Partial<CmsContent>
): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped.from('cms_contents').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function publishContent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped
    .from('cms_contents')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteContent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped.from('cms_contents').delete().eq('id', id);
  return { error: error?.message ?? null };
}
