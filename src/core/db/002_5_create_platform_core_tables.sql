-- =============================================================================
-- MAHA-AGRI PLATFORM CORE ENGINE DATABASE SCHEMA (MODULE 02.5)
-- Domain-Agnostic Platform Backbone: Entities, Workflows, Timelines, Activities,
-- Attachments, Comments, Assignments, Approvals, Statuses, Notifications, Audit,
-- Relationships, Tags, Numbering Sequences, Business Rules & Configs.
-- =============================================================================

-- 1. ENTITY REGISTRY MASTER
CREATE TABLE IF NOT EXISTS public.platform_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) UNIQUE NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    description TEXT,
    code_prefix VARCHAR(10) NOT NULL DEFAULT 'MA',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Platform Entities
INSERT INTO public.platform_entities (entity_code, entity_name, code_prefix, description) VALUES
('CANDIDATE', 'Candidate Registration Profile', 'MA-CAN', 'Recruitment and EDP candidates'),
('FARMER', 'Farmer Profile', 'MA-FAR', 'Agricultural producer profiles'),
('STAFF', 'HR Staff & Officers', 'MA-EMP', 'Platform operational staff'),
('MAHA_AGRIDOOT', 'MAHA-AGRIDOOT Field Staff', 'MA-AGT', 'Ground level operational field staff'),
('FIELD_VISIT', 'Field Inspection Visit', 'MA-FV', 'GPS-tagged field inspection record'),
('SURVEY', 'Field Data Survey', 'MA-SUR', 'Structured survey response'),
('PAYMENT', 'Financial Payment Receipt', 'MA-PAY', 'Subsidy or service payment receipt'),
('PROJECT', 'Operational Scheme Project', 'MA-PRJ', 'Enterprise project container'),
('SERVICE', 'Platform Service Catalog Item', 'MA-SRV', 'Independent operational service')
ON CONFLICT (entity_code) DO NOTHING;

-- 2. UNIVERSAL NUMBERING SEQUENCES
CREATE TABLE IF NOT EXISTS public.platform_numbering_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) UNIQUE NOT NULL REFERENCES public.platform_entities(entity_code),
    prefix VARCHAR(10) NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_length INTEGER NOT NULL DEFAULT 6,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Sequences
INSERT INTO public.platform_numbering_sequences (entity_code, prefix, current_value, padding_length) VALUES
('CANDIDATE', 'MA-CAN', 100, 6),
('FARMER', 'MA-FAR', 100, 6),
('STAFF', 'MA-EMP', 100, 6),
('MAHA_AGRIDOOT', 'MA-AGT', 100, 6),
('FIELD_VISIT', 'MA-FV', 100, 6),
('SURVEY', 'MA-SUR', 100, 6),
('PAYMENT', 'MA-PAY', 100, 6),
('PROJECT', 'MA-PRJ', 100, 6),
('SERVICE', 'MA-SRV', 100, 6)
ON CONFLICT (entity_code) DO NOTHING;

-- 3. WORKFLOW TEMPLATES & STEPS
CREATE TABLE IF NOT EXISTS public.platform_workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_code VARCHAR(50) UNIQUE NOT NULL,
    workflow_name VARCHAR(100) NOT NULL,
    entity_code VARCHAR(50) NOT NULL REFERENCES public.platform_entities(entity_code),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.platform_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.platform_workflow_templates(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_code VARCHAR(50) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    allowed_roles TEXT[] NOT NULL DEFAULT '{}',
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(template_id, step_code)
);

CREATE TABLE IF NOT EXISTS public.platform_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.platform_workflow_templates(id),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    current_step_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    started_by UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TIMELINE EVENTS LEDGER
CREATE TABLE IF NOT EXISTS public.platform_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    actor_id UUID,
    actor_name VARCHAR(100),
    actor_role VARCHAR(50),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ACTIVITY LOGS (STATE TRANSITIONS)
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    actor_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ATTACHMENT ENGINE (MULTI-FORMAT GEO-TAGGED FILES)
CREATE TABLE IF NOT EXISTS public.platform_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    attachment_type VARCHAR(50) NOT NULL, -- IMAGE, AUDIO, VIDEO, PDF, DOCUMENT, OTHER
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    geo_lat NUMERIC(10, 7),
    geo_lng NUMERIC(10, 7),
    uploaded_by UUID,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 7. THREADED COMMENTS & INTERNAL NOTES
CREATE TABLE IF NOT EXISTS public.platform_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    parent_id UUID REFERENCES public.platform_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    mentions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 8. ENTITY ASSIGNMENT & DELEGATION ENGINE
CREATE TABLE IF NOT EXISTS public.platform_entity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    assigned_to_user_id UUID,
    assigned_to_role VARCHAR(50),
    district_id UUID,
    taluka_id UUID,
    assigned_by UUID NOT NULL,
    assignment_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TRANSFERRED, ESCALATED, COMPLETED
    assignment_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. MULTI-STAGE APPROVAL WORKFLOWS
CREATE TABLE IF NOT EXISTS public.platform_approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    current_stage_order INTEGER NOT NULL DEFAULT 1,
    stage_name VARCHAR(100) NOT NULL,
    assigned_role VARCHAR(50) NOT NULL,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, SENT_BACK, FORWARDED, ESCALATED
    decision_by UUID,
    decision_notes TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. RELATIONSHIP GRAPH (ENTITY-TO-ENTITY LINKAGES)
CREATE TABLE IF NOT EXISTS public.platform_entity_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_code VARCHAR(50) NOT NULL,
    from_entity_id UUID NOT NULL,
    to_entity_code VARCHAR(50) NOT NULL,
    to_entity_id UUID NOT NULL,
    relation_type VARCHAR(50) NOT NULL, -- BECAME, HAS, CREATED_BY, BELONGS_TO, DEPENDS_ON
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(from_entity_code, from_entity_id, to_entity_code, to_entity_id, relation_type)
);

-- 11. TAG ENGINE
CREATE TABLE IF NOT EXISTS public.platform_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    color_code VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.platform_entity_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES public.platform_tags(id) ON DELETE CASCADE,
    tagged_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(entity_code, entity_id, tag_id)
);

-- Seed Default Tags
INSERT INTO public.platform_tags (tag_name, color_code) VALUES
('High Priority', '#ef4444'),
('Urgent', '#f97316'),
('VIP', '#a855f7'),
('Organic', '#10b981'),
('Drone', '#06b6d4'),
('Pending Review', '#f59e0b')
ON CONFLICT (tag_name) DO NOTHING;

-- 12. PLATFORM CONFIGURATIONS & BUSINESS RULES
CREATE TABLE IF NOT EXISTS public.platform_configs (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Platform Configurations
INSERT INTO public.platform_configs (config_key, config_value, description) VALUES
('SECURITY_OTP_CONFIG', '{"otpLength": 6, "otpExpirySeconds": 300, "maxAttempts": 3}'::jsonb, 'OTP authentication settings'),
('GPS_ACCURACY_METERS', '{"maxRadiusMeters": 50, "requireGps": true}'::jsonb, 'Field visit GPS accuracy radius'),
('FEATURE_FLAGS', '{"enableDroneSpraying": true, "enableEdpRegistration": true, "enableSoilTesting": true}'::jsonb, 'Global feature toggle flags')
ON CONFLICT (config_key) DO NOTHING;

-- INDEXING FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_timeline_entity ON public.platform_timeline_events(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.platform_activity_logs(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.platform_attachments(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.platform_comments(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_assignments_entity ON public.platform_entity_assignments(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON public.platform_approval_workflows(entity_code, entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_from ON public.platform_entity_relations(from_entity_code, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relations_to ON public.platform_entity_relations(to_entity_code, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_tags_entity ON public.platform_entity_tags(entity_code, entity_id);
