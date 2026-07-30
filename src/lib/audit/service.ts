/**
 * Audit log + activity timeline services.
 *
 * logAudit and logActivity write to their respective tables. Because RLS
 * blocks client writes to audit_log (tamper-proofing), these are designed to
 * be called from edge functions or server contexts with the service role.
 * The frontend reads both tables via the read helpers.
 */

import { supabase, supabaseUntyped } from '../supabase/client';
import type { AuditLogEntry, ActivityTimelineEntry } from '../types/database';

export interface AuditParams {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ActivityParams {
  actorId?: string | null;
  entityType: string;
  entityId?: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped.from('audit_log').insert({
    actor_id: params.actorId ?? null,
    action: params.action,
    entity_type: params.entityType ?? 'system',
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
    ip_address: params.ipAddress ?? null,
  });
  return { error: error?.message ?? null };
}

export async function logActivity(params: ActivityParams): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped.from('activity_timeline').insert({
    actor_id: params.actorId ?? null,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    summary: params.summary,
    metadata: params.metadata ?? {},
  });
  return { error: error?.message ?? null };
}

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AuditLogEntry[];
}

export async function fetchActivityTimeline(limit = 50): Promise<ActivityTimelineEntry[]> {
  const { data, error } = await supabase
    .from('activity_timeline')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ActivityTimelineEntry[];
}
