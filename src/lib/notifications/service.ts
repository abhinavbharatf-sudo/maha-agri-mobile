/**
 * Notification service.
 *
 * createNotification inserts a notification for a user (server-side modules
 * call this; the frontend uses useNotifications for reading/marking-read).
 */

import { supabaseUntyped } from '../supabase/client';
import type { Notification, NotificationType } from '../types/database';

export async function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
  type?: NotificationType;
  link?: string;
}): Promise<{ data: Notification | null; error: string | null }> {
  const { data, error } = await supabaseUntyped
    .from('notifications')
    .insert({
      user_id: params.userId,
      title: params.title,
      body: params.body ?? null,
      type: params.type ?? 'info',
      link: params.link ?? null,
    })
    .select()
    .single();
  return { data: data as Notification, error: error?.message ?? null };
}

export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabaseUntyped
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return { error: error?.message ?? null };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabaseUntyped
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}
