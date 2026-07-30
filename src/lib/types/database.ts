/**
 * Generated-compatible database types.
 *
 * These mirror the schema created in migration 0001. They are intentionally
 * hand-maintained so the foundation compiles without a codegen step, but they
 * can be replaced by `supabase gen types` output later without breaking callers.
 */

export type RoleKey =
  | 'ROOT_SUPER_ADMIN'
  | 'STATE_ADMIN'
  | 'DISTRICT_COORDINATOR'
  | 'TALUKA_COORDINATOR'
  | 'MAHA_AGRIDOOT'
  | 'EDP_AGRI_ENTREPRENEUR'
  | 'DRONE_ENTREPRENEUR'
  | 'FARMER'
  | 'super_admin'
  | 'admin'
  | 'hr_manager'
  | 'hr_executive'
  | 'crm_manager'
  | 'team_leader'
  | 'telecaller'
  | 'editor'
  | 'staff'
  | 'volunteer'
  | 'member';

export type CmsStatus = 'draft' | 'review' | 'published' | 'archived';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface RbacRole {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface RbacPermission {
  id: string;
  key: string;
  description: string | null;
  created_at: string;
}

export interface RbacRolePermission {
  role_id: string;
  permission_id: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role_id: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRole extends Profile {
  role?: RbacRole | null;
}

export interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CmsContentType {
  id: string;
  key: string;
  name: string;
  schema_definition: Record<string, unknown>;
  created_at: string;
}

export interface CmsContent {
  id: string;
  content_type_id: string;
  title: string;
  slug: string;
  body: Record<string, unknown>;
  status: CmsStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface FileMetadata {
  id: string;
  owner_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface ActivityTimelineEntry {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SearchIndexEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  body: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      rbac_roles: { Row: RbacRole; Insert: Partial<RbacRole>; Update: Partial<RbacRole> };
      rbac_permissions: { Row: RbacPermission; Insert: Partial<RbacPermission>; Update: Partial<RbacPermission> };
      rbac_role_permissions: { Row: RbacRolePermission; Insert: RbacRolePermission; Update: Partial<RbacRolePermission> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      audit_log: { Row: AuditLogEntry; Insert: Partial<AuditLogEntry>; Update: Partial<AuditLogEntry> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      cms_content_types: { Row: CmsContentType; Insert: Partial<CmsContentType>; Update: Partial<CmsContentType> };
      cms_contents: { Row: CmsContent; Insert: Partial<CmsContent>; Update: Partial<CmsContent> };
      feature_flags: { Row: FeatureFlag; Insert: Partial<FeatureFlag>; Update: Partial<FeatureFlag> };
      file_metadata: { Row: FileMetadata; Insert: Partial<FileMetadata>; Update: Partial<FileMetadata> };
      activity_timeline: { Row: ActivityTimelineEntry; Insert: Partial<ActivityTimelineEntry>; Update: Partial<ActivityTimelineEntry> };
      search_index: { Row: SearchIndexEntry; Insert: Partial<SearchIndexEntry>; Update: Partial<SearchIndexEntry> };
    };
    Views: Record<string, never>;
    Functions: {
      search_entities: {
        Args: { q: string; result_limit?: number };
        Returns: SearchResultRow[];
      };
    };
  };
}

interface SearchResultRow {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  body: string | null;
  rank: number;
}
