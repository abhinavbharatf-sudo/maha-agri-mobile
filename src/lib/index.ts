/**
 * Barrel export for the enterprise foundation lib.
 *
 * Import from '@/lib' (or relative '../lib') to access the platform services.
 */

export { default as env } from './config/env';
export type { EnvConfig, AppEnv } from './config/env';
export { supabase, supabaseUntyped } from './supabase/client';
export type { Database } from './types/database';
export * from './types/database';

export { AuthProvider, useAuth } from './auth/AuthContext';
export { RequireAuth, RequirePermission, RequireRole } from './auth/guards';
export {
  hasPermission,
  hasAnyPermission,
  hasRole,
  hasRoleAtLeast,
  roleRank,
  ROLE_HIERARCHY,
  type PermissionKey,
} from './auth/rbac';

export { useQuery, useMutation } from './api/hooks';
export { uploadFile, deleteFile, getFilePublicUrl } from './storage/upload';
export {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from './notifications/service';
export {
  logAudit,
  logActivity,
  fetchAuditLog,
  fetchActivityTimeline,
} from './audit/service';
export { search, indexEntity, removeEntityFromIndex, type SearchResult } from './search/service';
export { FeatureFlagProvider, useFeatureFlags, useFeatureFlag } from './flags/FlagProvider';
export {
  fetchContentTypes,
  fetchPublishedContent,
  fetchContentBySlug,
  createContent,
  updateContent,
  publishContent,
  deleteContent,
} from './cms/service';
export {
  useFormState,
  FormField,
  TextInput,
  TextArea,
  required,
  email as emailValidator,
  minLength,
  maxLength,
  type Validator,
  type Schema,
  type FormState,
} from './forms/engine';
