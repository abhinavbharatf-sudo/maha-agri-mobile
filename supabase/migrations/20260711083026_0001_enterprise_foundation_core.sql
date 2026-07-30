/*
# Enterprise Foundation — Core Schema (retry of 0001)

Fixes a typo in the previous attempt (CREATE POLICY IF EXISTS -> DROP POLICY IF EXISTS
for update_own_file_metadata). All statements are idempotent so re-running is safe.
See migration 0001 for the full schema description.
*/

-- ===== RBAC: roles =====
CREATE TABLE IF NOT EXISTS rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role_id uuid REFERENCES rbac_roles(id),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT 'system',
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE TABLE IF NOT EXISTS cms_content_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  schema_definition jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id uuid NOT NULL REFERENCES cms_content_types(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  body jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES auth.users(id),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_contents_slug ON cms_contents(slug);
CREATE INDEX IF NOT EXISTS idx_cms_contents_status ON cms_contents(status);
CREATE INDEX IF NOT EXISTS idx_cms_contents_type ON cms_contents(content_type_id);

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  entity_type text,
  entity_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_file_metadata_owner ON file_metadata(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_entity ON file_metadata(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  summary text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_actor ON activity_timeline(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_entity ON activity_timeline(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_created ON activity_timeline(created_at);

CREATE TABLE IF NOT EXISTS search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  body text,
  search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_index_tsv ON search_index USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_search_index_entity ON search_index(entity_type, entity_id);

-- ===== RLS =====
ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_rbac_roles_authenticated" ON rbac_roles;
CREATE POLICY "read_rbac_roles_authenticated" ON rbac_roles FOR SELECT
  TO authenticated USING (true);

ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_rbac_permissions_authenticated" ON rbac_permissions;
CREATE POLICY "read_rbac_permissions_authenticated" ON rbac_permissions FOR SELECT
  TO authenticated USING (true);

ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_rbac_role_permissions_authenticated" ON rbac_role_permissions;
CREATE POLICY "read_rbac_role_permissions_authenticated" ON rbac_role_permissions FOR SELECT
  TO authenticated USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_audit_log_authenticated" ON audit_log;
CREATE POLICY "read_audit_log_authenticated" ON audit_log FOR SELECT
  TO authenticated USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE cms_content_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_cms_content_types" ON cms_content_types;
CREATE POLICY "read_cms_content_types" ON cms_content_types FOR SELECT
  TO anon, authenticated USING (true);

ALTER TABLE cms_contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_published_cms_contents" ON cms_contents;
CREATE POLICY "read_published_cms_contents" ON cms_contents FOR SELECT
  TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "read_all_cms_contents_authenticated" ON cms_contents;
CREATE POLICY "read_all_cms_contents_authenticated" ON cms_contents FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_cms_contents_authenticated" ON cms_contents;
CREATE POLICY "insert_cms_contents_authenticated" ON cms_contents FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_cms_contents_authenticated" ON cms_contents;
CREATE POLICY "update_cms_contents_authenticated" ON cms_contents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_cms_contents_authenticated" ON cms_contents;
CREATE POLICY "delete_cms_contents_authenticated" ON cms_contents FOR DELETE
  TO authenticated USING (true);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_feature_flags" ON feature_flags;
CREATE POLICY "read_feature_flags" ON feature_flags FOR SELECT
  TO anon, authenticated USING (true);

ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_file_metadata" ON file_metadata;
CREATE POLICY "select_own_file_metadata" ON file_metadata FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_file_metadata" ON file_metadata;
CREATE POLICY "insert_own_file_metadata" ON file_metadata FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_file_metadata" ON file_metadata;
CREATE POLICY "update_own_file_metadata" ON file_metadata FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_file_metadata" ON file_metadata;
CREATE POLICY "delete_own_file_metadata" ON file_metadata FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_activity_timeline_authenticated" ON activity_timeline;
CREATE POLICY "read_activity_timeline_authenticated" ON activity_timeline FOR SELECT
  TO authenticated USING (true);

ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_search_index" ON search_index;
CREATE POLICY "read_search_index" ON search_index FOR SELECT
  TO anon, authenticated USING (true);

-- ===== Seed: roles =====
INSERT INTO rbac_roles (key, name, description, is_system) VALUES
  ('super_admin', 'Super Administrator', 'Full platform access including settings', true),
  ('admin', 'Administrator', 'Manage users, content, and most modules', true),
  ('editor', 'Editor', 'Create and publish CMS content', true),
  ('staff', 'Staff', 'Internal operations and read access', true),
  ('volunteer', 'Volunteer', 'Field operations and self-service', true),
  ('member', 'Member', 'Registered community member', true)
ON CONFLICT (key) DO NOTHING;

-- ===== Seed: permissions =====
INSERT INTO rbac_permissions (key, description) VALUES
  ('users:read', 'View user profiles and listings'),
  ('users:write', 'Create and update users'),
  ('users:delete', 'Delete or deactivate users'),
  ('cms:read', 'View CMS content'),
  ('cms:write', 'Create and edit CMS content'),
  ('cms:publish', 'Publish or archive CMS content'),
  ('files:read', 'View file metadata'),
  ('files:write', 'Upload and manage files'),
  ('audit:read', 'View audit log'),
  ('notifications:read', 'View own notifications'),
  ('notifications:write', 'Create notifications'),
  ('settings:read', 'View platform settings'),
  ('settings:write', 'Manage platform settings and feature flags')
ON CONFLICT (key) DO NOTHING;

-- ===== Seed: role -> permission mappings =====
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r CROSS JOIN rbac_permissions p
WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r CROSS JOIN rbac_permissions p
WHERE r.key = 'admin' AND p.key NOT IN ('settings:write', 'users:delete')
ON CONFLICT DO NOTHING;

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r CROSS JOIN rbac_permissions p
WHERE r.key = 'editor' AND p.key IN ('cms:read', 'cms:write', 'cms:publish', 'files:read', 'files:write', 'notifications:read')
ON CONFLICT DO NOTHING;

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r CROSS JOIN rbac_permissions p
WHERE r.key = 'staff' AND p.key IN ('cms:read', 'files:read', 'notifications:read')
ON CONFLICT DO NOTHING;

INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r CROSS JOIN rbac_permissions p
WHERE r.key IN ('volunteer', 'member') AND p.key IN ('notifications:read')
ON CONFLICT DO NOTHING;

-- ===== Seed: default feature flags =====
INSERT INTO feature_flags (key, name, description, is_enabled, rollout_percentage) VALUES
  ('enable_admin_portal', 'Admin Portal', 'Enable the admin dashboard interface', false, 0),
  ('enable_volunteer_portal', 'Volunteer Portal', 'Enable volunteer self-service portal', false, 0),
  ('enable_cms', 'CMS Module', 'Enable content management module', false, 0),
  ('enable_file_uploads', 'File Uploads', 'Enable file upload to storage', false, 0),
  ('enable_activity_feed', 'Activity Feed', 'Enable the global activity timeline', false, 0)
ON CONFLICT (key) DO NOTHING;

-- ===== Seed: default CMS content types =====
INSERT INTO cms_content_types (key, name, schema_definition) VALUES
  ('page', 'Page', '{"fields": [{"name": "hero", "type": "text"}, {"name": "sections", "type": "array"}]}'::jsonb),
  ('article', 'Article', '{"fields": [{"name": "excerpt", "type": "text"}, {"name": "body", "type": "richtext"}, {"name": "cover_image", "type": "image"}]}'::jsonb),
  ('announcement', 'Announcement', '{"fields": [{"name": "body", "type": "text"}, {"name": "priority", "type": "select"}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
