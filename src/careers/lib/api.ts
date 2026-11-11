// ============================================================
// RMS API — typed wrappers for all Supabase calls
// ============================================================

import { supabase, candidateSupabase } from '../../lib/supabase/client';
import env from '../../lib/config/env';
import { sendInterviewConfirmedTemplate } from '../../services/whatsappService';
import { syncProfileToLead } from '../../crm/lib/api';
import { isDummyOtpMode } from './dummyOtp';
import { broadcastJobUpdate } from './jobEvents';
import type {
  RmsCandidateProfile,
  RmsCampaign,
  RmsJobPosting,
  RmsApplication,
  RmsApplicationWithDetails,
  RmsApplicationStatusLog,
  RmsApplicationWorkflowState,
  RmsInterviewSlot,
  RmsInterviewBooking,
  RmsCandidateDocument,
  RmsPayment,
  RmsPaymentReceipt,
  RmsTrainingBatch,
  RmsTrainingAllocation,
  RmsAppointmentLetter,
  RmsRecruitmentDrive,
  RmsVacancy,
  RmsWorkflowTemplate,
  RmsWorkflowStage,
  RmsNotificationTemplate,
  RmsApplicationNote,
  ApplicationStatus,
  RmsJobBadge,
  RmsRecruitmentStep,
  RmsJobFaq,
  RmsJobAnalytics,
  RmsJobStats,
  RmsInterviewer,
  RmsInterviewerSchedule,
  RmsInterviewerOverride,
  RmsRescheduleRequest,
  RmsInterviewEvaluation,
  RmsOrganizationSignature,
  RmsAppointmentTemplate,
  StaffUser,
  StaffDirectoryFilter,
  InterviewerAuditEntry,
} from './types';

// ===== Candidate Profile =====
export async function getCandidateProfile(userId: string) {
  if (!userId) return { data: null, error: null };

  // Local Dummy Mode: Safe simulation in developer session without invalid UUID queries
  if (userId.startsWith('dummy-')) {
    if (typeof window !== 'undefined') {
      try {
        const clean = userId.replace('dummy-candidate-', '').slice(-10);
        const raw = sessionStorage.getItem(`maha_dummy_profile_${clean}`) || localStorage.getItem(`maha_dummy_profile_${clean}`);
        if (raw) return { data: JSON.parse(raw) as RmsCandidateProfile, error: null };
      } catch {}
    }
    return { data: null, error: null };
  }

  const candidateSession = (await candidateSupabase.auth.getSession()).data.session;
  const client = candidateSession ? candidateSupabase : supabase;
  const { data, error } = await client
    .from('rms_candidate_profiles' as never)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data: data as RmsCandidateProfile | null, error };
}

export async function upsertCandidateProfile(profile: Partial<RmsCandidateProfile> & { user_id: string; mobile: string; full_name: string }) {
  const cleanMobile = profile.mobile.replace(/\D/g, '').slice(-10);
  const altMobile = (profile.alternate_mobile || profile.emergency_mobile || '').replace(/\D/g, '').slice(-10) || null;

  // Local Dummy Mode: Safe simulation in developer session without PostgreSQL 22P02 UUID syntax crash
  if (profile.user_id.startsWith('dummy-')) {
    // Strictly disallow dummy candidate writes in production builds
    if (!isDummyOtpMode()) {
      return {
        data: null,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. A verified candidate session is required to save your profile in production.',
        } as any,
      };
    }

    let existingDummy: Partial<RmsCandidateProfile> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(`maha_dummy_profile_${cleanMobile}`) || localStorage.getItem(`maha_dummy_profile_${cleanMobile}`);
        if (raw) existingDummy = JSON.parse(raw);
      } catch {}
    }

    const dummyProfile: RmsCandidateProfile = {
      id: profile.user_id,
      user_id: profile.user_id,
      candidate_id: profile.candidate_id || existingDummy.candidate_id || `ABF-CAND-${cleanMobile.slice(-6)}`,
      mobile: cleanMobile,
      full_name: profile.full_name,
      date_of_birth: profile.date_of_birth !== undefined ? profile.date_of_birth : (existingDummy.date_of_birth || null),
      gender: profile.gender !== undefined ? profile.gender : (existingDummy.gender || null),
      caste_category: profile.caste_category !== undefined ? profile.caste_category : (existingDummy.caste_category || null),
      alternate_mobile: altMobile !== null ? altMobile : (existingDummy.alternate_mobile || null),
      emergency_mobile: altMobile !== null ? altMobile : (existingDummy.emergency_mobile || null),
      district: profile.district !== undefined ? profile.district : (existingDummy.district || null),
      taluka: profile.taluka !== undefined ? profile.taluka : (existingDummy.taluka || null),
      address_line1: (profile as any).address_line1 !== undefined ? (profile as any).address_line1 : ((existingDummy as any).address_line1 || null),
      pincode: (profile as any).pincode !== undefined ? (profile as any).pincode : ((existingDummy as any).pincode || null),
      permanent_same_as_current: (profile as any).permanent_same_as_current !== undefined ? (profile as any).permanent_same_as_current : ((existingDummy as any).permanent_same_as_current ?? false),
      permanent_address_line1: (profile as any).permanent_address_line1 !== undefined ? (profile as any).permanent_address_line1 : ((existingDummy as any).permanent_address_line1 || null),
      permanent_district: (profile as any).permanent_district !== undefined ? (profile as any).permanent_district : ((existingDummy as any).permanent_district || null),
      permanent_taluka: (profile as any).permanent_taluka !== undefined ? (profile as any).permanent_taluka : ((existingDummy as any).permanent_taluka || null),
      permanent_pincode: (profile as any).permanent_pincode !== undefined ? (profile as any).permanent_pincode : ((existingDummy as any).permanent_pincode || null),
      state: profile.state || existingDummy.state || 'Maharashtra',
      email: profile.email !== undefined ? profile.email : (existingDummy.email || null),
      aadhaar_hash: (profile as any).aadhaar_hash !== undefined ? (profile as any).aadhaar_hash : ((existingDummy as any).aadhaar_hash || null),
      profile_complete: (profile as any).profile_complete !== undefined ? Boolean((profile as any).profile_complete) : Boolean((existingDummy as any).profile_complete ?? false),
      created_at: profile.created_at || existingDummy.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`maha_dummy_profile_${cleanMobile}`, JSON.stringify(dummyProfile));
        localStorage.setItem(`maha_dummy_profile_${cleanMobile}`, JSON.stringify(dummyProfile));
      } catch {}
    }

    return { data: dummyProfile, error: null };
  }

  const payload: Record<string, unknown> = { ...profile };

  // Harmonize alternate and emergency mobile fields
  if (altMobile) {
    payload.alternate_mobile = altMobile;
    payload.emergency_mobile = altMobile;
  }

  // Never force an empty string for candidate_id. If omitted or blank, omit the key entirely
  // so that PostgreSQL leaves existing candidate_id untouched on UPDATE and allows the
  // BEFORE INSERT trigger (trg_rms_candidate_id) to auto-generate ABF-CAND-XXXXXX on new profiles.
  if (!payload.candidate_id) {
    delete payload.candidate_id;
  }

  const candidateSession = (await candidateSupabase.auth.getSession()).data.session;
  const client = candidateSession ? candidateSupabase : supabase;

  let { data, error } = await client
    .from('rms_candidate_profiles' as never)
    .upsert(payload as never, { onConflict: 'user_id' })
    .select()
    .single();

  // Identify database schema mismatch errors (e.g. unmigrated columns: aadhaar_hash, permanent_*)
  const isSchemaMismatch = Boolean(
    error && (
      error.code === 'PGRST204' ||
      (error as any).code === '42703' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist') ||
      error.message?.includes('permanent_') ||
      error.message?.includes('aadhaar_hash')
    )
  );

  // If Supabase returned an error for a real authenticated user, NEVER swallow it or fake success with localStorage.
  // Return a clear, actionable error indicating whether a migration is pending or RLS rejected the write.
  if (error) {
    console.error('[upsertCandidateProfile] Supabase write failed:', error);
    let userFriendlyMessage = error.message;

    if (isSchemaMismatch) {
      userFriendlyMessage = 'Database schema update pending: one or more required profile columns (e.g. Aadhaar hash or permanent address) have not been applied to PostgreSQL. Please apply the pending database migration.';
    } else if (error.code === '42501') {
      userFriendlyMessage = 'Permission denied: Your authenticated session is not authorized to update this profile record (RLS check failed).';
    } else if (error.code === '23505') {
      userFriendlyMessage = error.message.includes('mobile')
        ? 'This mobile number is already associated with another profile.'
        : 'This profile contains duplicate values that conflict with an existing record.';
    }

    return {
      data: null,
      error: {
        code: error.code || 'UPSERT_FAILED',
        message: userFriendlyMessage,
        details: error.details,
        hint: error.hint,
      } as any,
    };
  }

  // Read-after-write verification for authenticated candidate:
  // Ensure the row was confirmed written to PostgreSQL and matches the caller's user_id.
  if (data) {
    const writtenUserId = (data as any).user_id;
    if (!writtenUserId || writtenUserId !== profile.user_id) {
      // Re-verify directly from PostgreSQL
      const { data: verifiedRow, error: verifyErr } = await client
        .from('rms_candidate_profiles' as never)
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (verifyErr || !verifiedRow) {
        console.error('[upsertCandidateProfile] Read-after-write verification failed:', verifyErr);
        return {
          data: null,
          error: {
            code: 'VERIFY_FAILED',
            message: 'Profile update could not be verified in the database. Please try again.',
            details: verifyErr,
          } as any,
        };
      }
      data = verifiedRow as any;
    }

    // Non-blocking sync to linked CRM lead record with explicit reporting
    syncProfileToLead(data as RmsCandidateProfile)
      .then(syncRes => {
        if (!syncRes.success) {
          console.warn('[upsertCandidateProfile] CRM Lead Sync reported warning/failure:', syncRes.error);
        } else {
          console.log('[upsertCandidateProfile] CRM Lead Sync succeeded for lead ID:', syncRes.leadId);
        }
      })
      .catch(syncErr => {
        console.error('[upsertCandidateProfile] CRM Lead Sync unexpected exception:', syncErr);
      });
  }

  return { data: data as RmsCandidateProfile | null, error: null };
}

// ===== Campaigns =====
export async function listPublicCampaigns() {
  const { data, error } = await supabase
    .from('rms_campaigns' as never)
    .select('*')
    .eq('status', 'active')
    .eq('is_public', true)
    .order('start_date', { ascending: false });
  return { data: (data ?? []) as RmsCampaign[], error };
}

export async function listAllCampaigns() {
  const { data, error } = await supabase
    .from('rms_campaigns' as never)
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as RmsCampaign[], error };
}

export async function getCampaign(id: string) {
  const { data, error } = await supabase
    .from('rms_campaigns' as never)
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as RmsCampaign | null, error };
}

export async function upsertCampaign(campaign: Partial<RmsCampaign>) {
  const { data, error } = await supabase
    .from('rms_campaigns' as never)
    .upsert(campaign)
    .select()
    .single();
  return { data: data as RmsCampaign | null, error };
}

// ===== Job Postings =====
function hydrateJob(job: any): RmsJobPosting {
  if (!job) return job;
  return {
    ...job,
    vacancy_level: job.vacancy_level || job.vacancy_allocations?.vacancy_level || 'taluka',
    experience_details: job.experience_details || job.vacancy_allocations?.experience_details || '',
    jd_pdf_enabled: job.jd_pdf_enabled !== undefined && job.jd_pdf_enabled !== null
      ? job.jd_pdf_enabled
      : (job.vacancy_allocations?.jd_pdf_enabled !== undefined && job.vacancy_allocations?.jd_pdf_enabled !== null
          ? job.vacancy_allocations.jd_pdf_enabled
          : true),
    questionnaire: job.questionnaire || job.vacancy_allocations?.questionnaire || null,
    posting_level: job.posting_level || job.vacancy_allocations?.posting_level || (
      job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district'
        ? 'District-wise'
        : 'Taluka-wise'
    ),
    location_questions: job.location_questions || job.vacancy_allocations?.location_questions || null,
    multiple_locations_config: job.multiple_locations_config || job.vacancy_allocations?.multiple_locations_config || null,
  };
}

export function sanitizePublicJob(job: RmsJobPosting | null): RmsJobPosting | null {
  if (!job) return null;
  const sanitized = { ...job };
  // Confidential admin-only notes are strictly omitted from public views
  sanitized.internal_location = null;
  if (sanitized.vacancy_allocations?.cities) {
    sanitized.vacancy_allocations = {
      ...sanitized.vacancy_allocations,
      cities: sanitized.vacancy_allocations.cities.map(c => {
        const { internalNotes, ...safeCity } = c;
        return safeCity as any;
      }),
    };
  }
  return sanitized;
}

export async function listPublishedJobs() {
  // Run auto-status engine first so statuses reflect current time
  await supabase.rpc('rms_auto_update_job_statuses' as never, {} as never);
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    .setHeader('Pragma', 'no-cache')
    .in('status', ['published', 'coming_soon', 'applications_closed', 'filled'])
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('is_featured', { ascending: false })
    .order('is_urgent',   { ascending: false })
    .order('sort_order', { ascending: false })
    .order('created_at',  { ascending: false });
  return { data: ((data ?? []) as any[]).map(hydrateJob).map(sanitizePublicJob) as RmsJobPosting[], error };
}

export async function listAllJobs() {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('created_at', { ascending: false });
  return { data: ((data ?? []) as any[]).map(hydrateJob), error };
}

export async function listTrashedJobs() {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .eq('is_trashed', true)
    .order('trashed_at', { ascending: false });
  return { data: ((data ?? []) as any[]).map(hydrateJob), error };
}

export async function archiveJob(id: string): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator to archive jobs.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ is_trashed: true, trashed_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Action failed: Could not move job to trash. Please verify administrative write permissions.' };
  }
  broadcastJobUpdate({ id, is_trashed: true });
  return { error: null };
}

export async function restoreJob(id: string): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator to restore jobs.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ is_trashed: false, trashed_at: null } as never)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Action failed: Could not restore job. Please verify administrative write permissions.' };
  }
  broadcastJobUpdate({ id, is_trashed: false });
  return { error: null };
}

export async function duplicateJob(id: string): Promise<{ data: RmsJobPosting | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .eq('id', id)
    .single();
  if (error) return { data: null, error: error.message };
  const src = data as RmsJobPosting;
  // Copy every field except id, applications, status, created_at
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    vacancy_level,
    experience_details,
    jd_pdf_enabled,
    questionnaire,
    posting_level,
    location_questions,
    multiple_locations_config,
    ...rest
  } = src;
  const payload: any = {
    ...rest,
    title: `${src.title} (Copy)`,
    slug: `${src.slug}-copy-${Date.now().toString(36)}`,
    status: 'draft',
    is_trashed: false,
    trashed_at: null,
    is_featured: false,
    is_urgent: false,
    sort_order: 0,
    publish_date: null,
    closing_date: null,
    application_close_date: null,
  };
  delete payload.multiple_locations_config;
  delete payload.questionnaire;
  delete payload.posting_level;
  delete payload.location_questions;
  delete payload.vacancy_level;

  payload.vacancy_allocations = {
    ...(payload.vacancy_allocations ?? {}),
    ...(vacancy_level ? { vacancy_level } : {}),
    ...(experience_details ? { experience_details } : {}),
    ...(jd_pdf_enabled !== undefined ? { jd_pdf_enabled } : {}),
    ...(questionnaire !== undefined ? { questionnaire } : {}),
    ...(posting_level !== undefined ? { posting_level } : {}),
    ...(location_questions !== undefined ? { location_questions } : {}),
    ...(multiple_locations_config !== undefined ? { multiple_locations_config } : {}),
  };
  const { data: inserted, error: insErr } = await supabase
    .from('rms_job_postings' as never)
    .insert(payload as never)
    .select('*')
    .single();
  if (insErr) return { data: null, error: insErr.message };
  return { data: hydrateJob(inserted), error: null };
}

export async function setJobStatus(id: string, status: string): Promise<{ data: RmsJobPosting | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { data: null, error: 'Authentication required: You must be logged in as an authorized administrator to update job status.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ status } as never)
    .eq('id', id)
    .select('*');

  if (error) return { data: null, error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { data: null, error: 'Action failed: No job record was updated. You may not have administrative write permissions or your session has expired.' };
  }
  const updated = (data as RmsJobPosting[])[0];
  broadcastJobUpdate(updated);
  return { data: updated, error: null };
}

export async function toggleJobFeatured(id: string, featured: boolean): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ is_featured: featured } as never)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Action failed: No job record was updated. You may not have administrative write permissions.' };
  }
  broadcastJobUpdate({ id, is_featured: featured });
  return { error: null };
}

export async function toggleJobUrgent(id: string, urgent: boolean): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ is_urgent: urgent } as never)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Action failed: No job record was updated. You may not have administrative write permissions.' };
  }
  broadcastJobUpdate({ id, is_urgent: urgent });
  return { error: null };
}

export async function updateJobOrder(id: string, sortOrder: number): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator.' };
  }

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .update({ sort_order: sortOrder } as never)
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Action failed: Could not update job sort order. Please verify administrative write permissions.' };
  }
  broadcastJobUpdate({ id, sort_order: sortOrder });
  return { error: null };
}

export async function reorderJobs(orderedIds: string[]): Promise<{ error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: 'Authentication required: You must be logged in as an authorized administrator.' };
  }

  const updates = orderedIds.map((id, idx) =>
    supabase.from('rms_job_postings' as never).update({ sort_order: idx } as never).eq('id', id).select('id')
  );
  const results = await Promise.all(updates);
  const failed = results.find(r => r.error || !r.data || (r.data as unknown[]).length === 0);
  if (failed) {
    return { error: failed.error?.message || 'Action failed: Could not update order for all jobs. Please check write permissions.' };
  }
  return { error: null };
}

export async function bulkJobStatus(ids: string[], status: string) {
  const { error } = await supabase.rpc('rms_bulk_job_status' as never, { p_ids: ids, p_status: status } as never);
  return { error };
}

export async function bulkArchiveJobs(ids: string[]) {
  const { error } = await supabase.rpc('rms_bulk_archive_jobs' as never, { p_ids: ids } as never);
  return { error };
}

export async function bulkRestoreJobs(ids: string[]) {
  const { error } = await supabase.rpc('rms_bulk_restore_jobs' as never, { p_ids: ids } as never);
  return { error };
}

export async function getJobStats(jobId: string): Promise<{ data: RmsJobStats | null; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_job_stats' as never, { p_job_id: jobId } as never);
  if (error) return { data: null, error: error.message };
  if (!data || (data as unknown[]).length === 0)
    return { data: { total: 0, shortlisted: 0, interview_scheduled: 0, selected: 0, joined: 0, rejected: 0 }, error: null };
  return { data: (data as RmsJobStats[])[0], error: null };
}

export async function getJobAnalytics(jobId: string): Promise<{ data: RmsJobAnalytics | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_job_analytics' as never)
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data as RmsJobAnalytics | null, error: null };
}

export interface JobHealthData {
  views: number;
  applications: number;
  conversionRate: number;
  daysRemaining: number | null;
  daysSincePublished: number | null;
  isTrending: boolean;
  lowResponse: boolean;
  performanceScore: number;
  performanceLabel: string;
  avgAppsPerDay: number | null;
  todayViews: number | null;
  todayApplications: number | null;
  mostActiveDay: string | null;
  lastApplicantDate: string | null;
}

export async function getJobHealth(jobId: string): Promise<{ data: JobHealthData | null; error: string | null }> {
  try {
    // Fetch analytics
    const { data: analytics } = await getJobAnalytics(jobId);
    const views = analytics?.views ?? 0;
    const applications = analytics?.apps_completed ?? analytics?.apps_started ?? 0;
    const conversionRate = views > 0 ? Math.round((applications / views) * 100) : 0;

    // Fetch job posting for dates
    const { data: job } = await getJob(jobId);
    const now = new Date();
    const publishDate = job?.publish_date ? new Date(job.publish_date) : null;
    const closingDate = job?.closing_date ? new Date(job.closing_date) : null;
    const neverClose = job?.never_close_applications ?? false;

    // Days remaining
    let daysRemaining: number | null = null;
    if (closingDate && !neverClose) {
      const ms = closingDate.getTime() - now.getTime();
      daysRemaining = ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
    }

    // Days since published
    let daysSincePublished: number | null = null;
    if (publishDate && publishDate <= now) {
      daysSincePublished = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Trending: views exceed threshold (100+ views)
    const isTrending = views >= 100;

    // Low response: views high but applications significantly low
    const lowResponse = views >= 100 && applications > 0 && conversionRate < 2;

    // Performance score (0-100)
    let score = 0;
    if (views > 0) {
      // Conversion component (40 points max, cap at 20% conversion)
      const convScore = Math.min(conversionRate / 20, 1) * 40;
      // Views component (30 points max, cap at 500 views)
      const viewsScore = Math.min(views / 500, 1) * 30;
      // Applications component (20 points max, cap at 50 apps)
      const appsScore = Math.min(applications / 50, 1) * 20;
      // Recency/freshness component (10 points max, more recent = higher)
      const recencyScore = daysSincePublished != null
        ? Math.max(0, 10 - Math.min(daysSincePublished / 3, 10))
        : 10;
      score = Math.round(convScore + viewsScore + appsScore + recencyScore);
    }
    const performanceLabel =
      score >= 90 ? 'Excellent Response' :
      score >= 60 ? 'Good Response' :
      score >= 40 ? 'Needs Improvement' :
      score > 0   ? 'Critical Attention Required' : 'No Data Yet';

    // Avg apps per day
    let avgAppsPerDay: number | null = null;
    if (daysSincePublished != null && daysSincePublished > 0) {
      avgAppsPerDay = Math.round((applications / daysSincePublished) * 10) / 10;
    }

    // Fetch last applicant date (excluding trashed/archived)
    const { data: lastApp } = await supabase
      .from('rms_applications' as never)
      .select('created_at')
      .eq('job_posting_id', jobId)
      .or('is_trashed.is.null,is_trashed.eq.false')
      .or('is_archived.is.null,is_archived.eq.false')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastApplicantDate = (lastApp as { created_at?: string } | null)?.created_at ?? null;

    // Today's views and applications (approximate from analytics updated_at)
    // Most active day (day of week with most applications)
    let mostActiveDay: string | null = null;
    let todayApplications: number | null = null;
    if (applications > 0) {
      const { data: appByDay } = await supabase
        .from('rms_applications' as never)
        .select('created_at')
        .eq('job_posting_id', jobId)
        .or('is_trashed.is.null,is_trashed.eq.false')
        .or('is_archived.is.null,is_archived.eq.false');
      if (appByDay && (appByDay as unknown[]).length > 0) {
        const dayCount: Record<string, number> = {};
        const todayStr = now.toISOString().slice(0, 10);
        let todayCount = 0;
        for (const a of appByDay as { created_at: string }[]) {
          const d = new Date(a.created_at);
          const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
          dayCount[dayName] = (dayCount[dayName] ?? 0) + 1;
          if (a.created_at.slice(0, 10) === todayStr) todayCount++;
        }
        mostActiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        todayApplications = todayCount;
      }
    }

    // Today's views (from analytics, can't get per-day without more tables; show null if not available)
    const todayViews = null;

    return {
      data: {
        views, applications, conversionRate, daysRemaining, daysSincePublished,
        isTrending, lowResponse, performanceScore: score, performanceLabel,
        avgAppsPerDay, todayViews, todayApplications, mostActiveDay, lastApplicantDate,
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'Failed to load job health data' };
  }
}

export async function incrementJobViews(jobId: string) {
  const { error } = await supabase.rpc('rms_increment_job_views' as never, { p_job_id: jobId } as never);
  return { error };
}

export async function incrementApplyClicks(jobId: string) {
  const { error } = await supabase.rpc('rms_increment_apply_clicks' as never, { p_job_id: jobId } as never);
  return { error };
}

export async function getJobBySlug(slug: string) {
  await supabase.rpc('rms_auto_update_job_statuses' as never, {} as never);
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    .setHeader('Pragma', 'no-cache')
    .eq('slug', slug)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .maybeSingle();
  return { data: sanitizePublicJob(hydrateJob(data)), error };
}

export async function getJob(id: string) {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    .setHeader('Pragma', 'no-cache')
    .eq('id', id)
    .single();
  return { data: hydrateJob(data), error };
}

export async function upsertJob(job: Partial<RmsJobPosting>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return {
      data: null,
      error: {
        message: 'Authentication required: You must be logged in as an authorized administrator to save job postings.'
      } as any
    };
  }

  // Ensure vacancy_level, experience_details, jd_pdf_enabled, questionnaire, posting_level, location_questions, and multiple_locations_config
  // are stored inside vacancy_allocations JSONB and not sent as unmapped top-level columns if the remote column does not exist yet
  const { vacancy_level, experience_details, jd_pdf_enabled, questionnaire, posting_level, location_questions, multiple_locations_config, ...rest } = job;
  const payload: any = { ...rest };
  delete payload.multiple_locations_config;
  delete payload.questionnaire;
  delete payload.posting_level;
  delete payload.location_questions;
  delete payload.vacancy_level;
  payload.vacancy_allocations = {
    ...(payload.vacancy_allocations ?? {}),
    ...(vacancy_level ? { vacancy_level } : {}),
    ...(experience_details !== undefined ? { experience_details } : {}),
    ...(jd_pdf_enabled !== undefined ? { jd_pdf_enabled } : {}),
    ...(questionnaire !== undefined ? { questionnaire } : {}),
    ...(posting_level !== undefined ? { posting_level } : {}),
    ...(location_questions !== undefined ? { location_questions } : {}),
    ...(multiple_locations_config !== undefined ? { multiple_locations_config } : {}),
  };

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .upsert(payload)
    .select()
    .single();

  const hydrated = hydrateJob(data);
  if (!error && hydrated) {
    broadcastJobUpdate(hydrated);
  }
  return { data: hydrated, error };
}

export async function deleteJob(id: string) {
  const { error } = await supabase
    .from('rms_job_postings' as never)
    .delete()
    .eq('id', id);
  return { error };
}

// ===== Applications =====
export async function getMyApplications(candidateId: string) {
  const candidateSession = (await candidateSupabase.auth.getSession()).data.session;
  const client = candidateSession ? candidateSupabase : supabase;
  const { data, error } = await client
    .from('rms_applications' as never)
    .select(`
      *,
      job_posting:rms_job_postings(*),
      campaign:rms_campaigns(id, name, status)
    `)
    .eq('candidate_id', candidateId)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as RmsApplicationWithDetails[], error };
}

export async function getApplication(id: string) {
  const { data, error } = await supabase
    .from('rms_applications' as never)
    .select(`
      *,
      job_posting:rms_job_postings(*),
      campaign:rms_campaigns(id, name, status),
      candidate:rms_candidate_profiles(*)
    `)
    .eq('id', id)
    .single();
  return { data: data as RmsApplicationWithDetails | null, error };
}

export async function createApplication(payload: {
  candidate_id: string;
  job_posting_id: string;
  campaign_id?: string;
  drive_id?: string;
  preferred_district?: string;
  preferred_location?: string;
  preferred_taluka?: string | null;
  application_data?: Record<string, unknown>;
  status?: ApplicationStatus;
}) {
  // 1. Verify job is actively accepting applications at API boundary
  const { data: job, error: jobErr } = await supabase
    .from('rms_job_postings' as never)
    .select('id, status, is_trashed, closing_date, application_close_date, never_close_applications, location_districts, vacancy_allocations')
    .eq('id', payload.job_posting_id)
    .single();

  if (jobErr || !job) {
    return { data: null, error: { message: 'Position not found', code: 'JOB_NOT_FOUND' } as never };
  }

  const jobRecord = job as {
    status: string;
    is_trashed?: boolean;
    closing_date?: string | null;
    application_close_date?: string | null;
    never_close_applications?: boolean | null;
    location_districts?: string[] | null;
    vacancy_allocations?: any;
  };

  if (jobRecord.is_trashed || jobRecord.status !== 'published') {
    return {
      data: null,
      error: {
        message: `Applications are closed for this position (status: ${jobRecord.status}).`,
        code: 'APPLICATIONS_CLOSED',
      } as never,
    };
  }

  // 1b. Authoritative Deadline Validation
  if (!jobRecord.never_close_applications) {
    const now = new Date();
    if (jobRecord.closing_date && now > new Date(jobRecord.closing_date)) {
      return {
        data: null,
        error: {
          message: `Applications closed for this position on ${new Date(jobRecord.closing_date).toLocaleDateString('en-IN')}.`,
          code: 'APPLICATIONS_CLOSED',
        } as never,
      };
    }
    if (jobRecord.application_close_date && now > new Date(jobRecord.application_close_date)) {
      return {
        data: null,
        error: {
          message: `Applications closed for this position on ${new Date(jobRecord.application_close_date).toLocaleDateString('en-IN')}.`,
          code: 'APPLICATIONS_CLOSED',
        } as never,
      };
    }
  }

  // 1c. Location Quota Validation: District
  if (
    payload.preferred_district &&
    Array.isArray(jobRecord.location_districts) &&
    jobRecord.location_districts.length > 0
  ) {
    if (!jobRecord.location_districts.includes(payload.preferred_district)) {
      return {
        data: null,
        error: {
          message: `The selected district (${payload.preferred_district}) is not eligible for this position.`,
          code: 'INVALID_DISTRICT',
        } as never,
      };
    }
  }

  // 1d. Location Quota Validation: Taluka
  const isDistrictLevel = jobRecord.vacancy_allocations?.vacancy_level === 'district';
  if (!isDistrictLevel && payload.preferred_district && payload.preferred_taluka) {
    const distAlloc = jobRecord.vacancy_allocations?.district_allocations?.[payload.preferred_district];
    if (distAlloc && distAlloc.taluka_allocations) {
      const talukaAlloc = distAlloc.taluka_allocations;
      if (Object.keys(talukaAlloc).length > 0) {
        const item = talukaAlloc[payload.preferred_taluka];
        if (!item || item.included === false) {
          return {
            data: null,
            error: {
              message: `The selected taluka (${payload.preferred_taluka}) has no allocated vacancies in ${payload.preferred_district} district.`,
              code: 'INVALID_TALUKA',
            } as never,
          };
        }
      }
    }
  }

  // 2. Perform insert or safe draft promotion with sanitized columns
  const applicationData = {
    ...(payload.application_data || {}),
    ...(payload.preferred_taluka ? { preferred_taluka: payload.preferred_taluka } : {}),
  };

  // Check for existing application to safely handle retries and drafts
  const { data: existingApp } = await supabase
    .from('rms_applications' as never)
    .select('id, application_number, status, is_trashed')
    .eq('candidate_id', payload.candidate_id)
    .eq('job_posting_id', payload.job_posting_id)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .maybeSingle();

  if (existingApp && (existingApp as any).status !== 'draft') {
    return {
      data: existingApp as RmsApplication,
      error: { message: 'You have already applied for this position.', code: '23505' } as never,
    };
  }

  const targetStatus = payload.status || 'draft';
  const nowIso = new Date().toISOString();

  if (existingApp && (existingApp as any).status === 'draft') {
    // Safely update existing draft in place without hitting unique constraint
    const { data: updatedDraft, error: updateErr } = await supabase
      .from('rms_applications' as never)
      .update({
        application_data: applicationData,
        preferred_district: payload.preferred_district ?? null,
        preferred_location: payload.preferred_location || payload.preferred_taluka || null,
        status: targetStatus,
        last_status_change_at: nowIso,
        ...(targetStatus !== 'draft' ? { submitted_at: nowIso } : {}),
        updated_at: nowIso,
      } as never)
      .eq('id', (existingApp as any).id)
      .select()
      .single();

    if (updateErr) {
      console.error('[createApplication] Draft update error:', updateErr);
    }
    return { data: updatedDraft as RmsApplication | null, error: updateErr };
  }

  const insertRow: Record<string, unknown> = {
    candidate_id: payload.candidate_id,
    job_posting_id: payload.job_posting_id,
    application_number: '',
    status: targetStatus,
    application_data: applicationData,
    last_status_change_at: nowIso,
    ...(targetStatus !== 'draft' ? { submitted_at: nowIso } : {}),
  };

  if (payload.campaign_id) insertRow.campaign_id = payload.campaign_id;
  if (payload.drive_id) insertRow.drive_id = payload.drive_id;
  if (payload.preferred_district) insertRow.preferred_district = payload.preferred_district;
  if (payload.preferred_location || payload.preferred_taluka) {
    insertRow.preferred_location = payload.preferred_location || payload.preferred_taluka;
  }

  const { data, error } = await supabase
    .from('rms_applications' as never)
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    // Handle concurrent insertion race: if duplicate key (23505) occurs, retrieve existing application
    if ((error as { code?: string })?.code === '23505') {
      const { data: racedApp } = await supabase
        .from('rms_applications' as never)
        .select()
        .eq('candidate_id', payload.candidate_id)
        .eq('job_posting_id', payload.job_posting_id)
        .or('is_trashed.is.null,is_trashed.eq.false')
        .maybeSingle();

      if (racedApp) {
        return { data: racedApp as RmsApplication, error: null };
      }
    }
    console.error('[createApplication] Insert error:', error);
  }

  return { data: data as RmsApplication | null, error };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  notes?: string,
) {
  const { data, error } = await supabase
    .from('rms_applications' as never)
    .update({ status, last_status_change_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('rms_application_status_log' as never)
      .insert({ 
        application_id: id, 
        to_status: status, 
        notes: notes ?? null,
        changed_by: user?.id ?? null
      });

    // CRM Integration: Sync HR stage updates to CRM Lead
    try {
      const { data: cand } = await supabase
        .from('rms_candidate_profiles' as never)
        .select('mobile')
        .eq('id', (data as RmsApplication).candidate_id)
        .single();
        
      if (cand && (cand as any).mobile) {
        const mobile = ((cand as any).mobile as string).replace('+91', '');
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('mobile_number', mobile)
          .single();
          
        if (lead && lead.id) {
          const { updateLeadStage, logActivity } = await import('../../crm/lib/api');
          const crmStageMap: Record<string, string> = {
            'documents_pending': 'Documents Required',
            'documents_verified': 'Documents Verified',
            'interview_slot_pending': 'Interview Scheduled',
            'interview_scheduled': 'Interview Scheduled',
            'interview_completed': 'Interview Completed',
            'under_review': 'Under Review',
            'selected': 'Selected',
            'wait_list': 'Waitlisted',
            'rejected': 'Rejected',
            'appointment_issued': 'Appointment Issued',
            'completed': 'Joined'
          };
          const stage = crmStageMap[status] || 'Application Started';
          await updateLeadStage(lead.id, (data as RmsApplication).job_posting_id, stage, null, 'HR');
          await logActivity(lead.id, 'Stage Change', `HR updated status to ${status}`, null, 'HR', { rms_status: status, notes });
        }
      }
    } catch (e) {
      console.error('CRM Sync Error during status update:', e);
    }
  }
  return { data: data as RmsApplication | null, error };
}

export async function listAllApplications(filters?: { status?: ApplicationStatus; job_posting_id?: string; campaign_id?: string }) {
  let query = supabase
    .from('rms_applications' as never)
    .select(`
      *,
      job_posting:rms_job_postings(id, title, slug),
      candidate:rms_candidate_profiles(id, candidate_id, full_name, mobile, district)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) query = (query as ReturnType<typeof query.eq>).eq('status', filters.status);
  if (filters?.job_posting_id) query = (query as ReturnType<typeof query.eq>).eq('job_posting_id', filters.job_posting_id);
  if (filters?.campaign_id) query = (query as ReturnType<typeof query.eq>).eq('campaign_id', filters.campaign_id);

  const { data, error } = await query;
  return { data: (data ?? []) as RmsApplicationWithDetails[], error };
}

export async function getApplicationStatusLog(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_application_status_log' as never)
    .select('*')
    .eq('application_id', applicationId)
    .order('changed_at', { ascending: false });
  return { data: (data ?? []) as RmsApplicationStatusLog[], error };
}

// ===== Workflow =====
export async function getWorkflowState(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_application_workflow_state' as never)
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  return { data: data as RmsApplicationWorkflowState | null, error };
}

export async function listWorkflowTemplates() {
  const { data, error } = await supabase
    .from('rms_workflow_templates' as never)
    .select(`*, stages:rms_workflow_stages(*)`)
    .order('created_at');
  return { data: (data ?? []) as (RmsWorkflowTemplate & { stages: RmsWorkflowStage[] })[], error };
}

// ===== Interview Slots =====
export async function listAvailableSlots(jobPostingId: string) {
  const { data, error } = await supabase
    .from('rms_interview_slots' as never)
    .select('*')
    .eq('job_posting_id', jobPostingId)
    .eq('status', 'open')
    .gte('slot_date', new Date().toISOString().split('T')[0])
    .order('slot_date')
    .order('slot_time');
  return { data: (data ?? []) as RmsInterviewSlot[], error };
}

export async function getMyInterviewBooking(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_interview_bookings' as never)
    .select(`*, slot:rms_interview_slots(*)`)
    .eq('application_id', applicationId)
    .maybeSingle();
  return { data: data as (RmsInterviewBooking & { slot?: RmsInterviewSlot }) | null, error };
}

export async function listTodayInterviews() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('rms_interview_slots' as never)
    .select(`
      *,
      bookings:rms_interview_bookings(
        *,
        application:rms_applications(
          *,
          candidate:rms_candidate_profiles(id, candidate_id, full_name, mobile)
        )
      )
    `)
    .eq('slot_date', today)
    .order('slot_time');
  return { data: (data ?? []) as (RmsInterviewSlot & { bookings: RmsInterviewBooking[] })[], error };
}

// ===== Documents =====
export async function getMyDocuments(candidateId: string) {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .select(`*, application:rms_applications(id, application_number, job_posting:rms_job_postings(title))`)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as RmsCandidateDocument[], error };
}

export async function getPendingDocumentVerifications() {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .select(`
      *,
      candidate:rms_candidate_profiles(id, candidate_id, full_name, mobile),
      application:rms_applications(id, application_number, job_posting:rms_job_postings(title))
    `)
    .eq('status', 'uploaded')
    .order('updated_at');
  return { data: (data ?? []) as RmsCandidateDocument[], error };
}

// ===== Payments =====
export async function getApplicationPayments(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_payments' as never)
    .select(`*, receipt:rms_payment_receipts(*)`)
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as (RmsPayment & { receipt?: RmsPaymentReceipt })[], error };
}

export async function initiateApplicationPayment(
  applicationId: string,
  amount: number,
  gateway: 'razorpay' | 'cashfree' | 'manual' = 'razorpay',
  feeLabel: string = 'Application Processing Fee',
) {
  // Check if an existing pending or success payment already exists for this application
  const { data: existing } = await supabase
    .from('rms_payments' as never)
    .select('id, status, amount, created_at')
    .eq('application_id', applicationId)
    .in('status', ['pending', 'initiated', 'success'])
    .maybeSingle();

  if (existing) {
    return { data: existing as RmsPayment, error: null };
  }

  const { data, error } = await supabase
    .from('rms_payments' as never)
    .insert({
      application_id: applicationId,
      payment_type: 'application_fee',
      amount,
      currency: 'INR',
      fee_label: feeLabel,
      gateway,
      status: 'pending',
    } as never)
    .select()
    .single();

  if (error) {
    console.error('[initiateApplicationPayment] Insert error:', error);
    return { data: null, error: error.message };
  }
  return { data: data as RmsPayment, error: null };
}

export async function getTodayPayments() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('rms_payments' as never)
    .select(`
      *,
      application:rms_applications(
        id, application_number,
        candidate:rms_candidate_profiles(full_name, mobile),
        job_posting:rms_job_postings(title)
      ),
      receipt:rms_payment_receipts(receipt_number)
    `)
    .eq('status', 'success')
    .gte('completed_at', today)
    .lt('completed_at', today + 'T23:59:59')
    .order('completed_at', { ascending: false });
  return { data: (data ?? []) as RmsPayment[], error };
}

// ===== Training =====
export async function getMyTraining(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_training_allocations' as never)
    .select(`*, batch:rms_training_batches(*)`)
    .eq('application_id', applicationId)
    .maybeSingle();
  return { data: data as (RmsTrainingAllocation & { batch?: RmsTrainingBatch }) | null, error };
}

// ===== Appointment Letters =====
export async function getMyAppointmentLetter(applicationId: string) {
  const { data, error } = await supabase
    .from('rms_appointment_letters' as never)
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  return { data: data as RmsAppointmentLetter | null, error };
}

export async function getTodayJoining() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('rms_appointment_letters' as never)
    .select(`
      *,
      application:rms_applications(
        id, application_number, status,
        candidate:rms_candidate_profiles(id, candidate_id, full_name, mobile, district),
        job_posting:rms_job_postings(title)
      )
    `)
    .eq('joining_date', today)
    .order('issued_at');
  return { data: (data ?? []) as RmsAppointmentLetter[], error };
}

// ===== Drives =====
export async function listPublicDrives() {
  const { data, error } = await supabase
    .from('rms_recruitment_drives' as never)
    .select('*')
    .eq('is_public', true)
    .in('status', ['planned', 'confirmed', 'in_progress'])
    .order('date');
  return { data: (data ?? []) as RmsRecruitmentDrive[], error };
}

export async function listDrivesByCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from('rms_recruitment_drives' as never)
    .select('*')
    .eq('campaign_id', campaignId)
    .order('date');
  return { data: (data ?? []) as RmsRecruitmentDrive[], error };
}

// ===== Vacancies =====
export async function getVacanciesByCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from('rms_vacancies' as never)
    .select(`*, job_posting:rms_job_postings(id, title)`)
    .eq('campaign_id', campaignId)
    .order('geographic_name');
  return { data: (data ?? []) as RmsVacancy[], error };
}

// ===== Notification Templates =====
export async function listNotificationTemplates() {
  const { data, error } = await supabase
    .from('rms_notification_templates' as never)
    .select('*')
    .order('event_key')
    .order('channel');
  return { data: (data ?? []) as RmsNotificationTemplate[], error };
}

export async function upsertNotificationTemplate(template: Partial<RmsNotificationTemplate> & { event_key: string; channel: string; body: string }) {
  const { data, error } = await supabase
    .from('rms_notification_templates' as never)
    .upsert(template, { onConflict: 'event_key,channel' })
    .select()
    .single();
  return { data: data as RmsNotificationTemplate | null, error };
}

// ===== Dashboard summary helpers =====
export async function getCandidateDashboardSummary(candidateId: string, userId: string) {
  const [
    applicationsRes,
    documentsRes,
    paymentsRes,
  ] = await Promise.all([
    supabase
      .from('rms_applications' as never)
      .select(`*, job_posting:rms_job_postings(id, title, slug), interview_booking:rms_interview_bookings(*, slot:rms_interview_slots(*))`)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false }),
    supabase
      .from('rms_candidate_documents' as never)
      .select('*')
      .eq('candidate_id', candidateId)
      .in('status', ['pending', 'correction_required']),
    supabase
      .from('rms_payments' as never)
      .select('*, application:rms_applications(job_posting:rms_job_postings(title))')
      .in('status', ['pending', 'failed'])
      .in('application_id',
        // sub-select candidate's application IDs — handled via filter below
        ['']),
  ]);

  return {
    applications: (applicationsRes.data ?? []) as RmsApplicationWithDetails[],
    pendingDocuments: (documentsRes.data ?? []) as RmsCandidateDocument[],
  };
}

// ============================================================
// HR Recruitment Dashboard helpers
// ============================================================

export async function getApplicationStatusCounts(): Promise<Record<ApplicationStatus, number>> {
  const { data } = await supabase
    .from('rms_applications' as never)
    .select('status');
  return ((data ?? []) as { status: ApplicationStatus }[]).reduce<Record<ApplicationStatus, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {} as Record<ApplicationStatus, number>);
}

// ============================================================
// HR Candidate Profile — full application details
// ============================================================

export async function getApplicationForHR(id: string) {
  const [appRes, docsRes, paymentsRes, statusLogRes, notesRes] = await Promise.all([
    supabase
      .from('rms_applications' as never)
      .select(`*,
        job_posting:rms_job_postings(*),
        campaign:rms_campaigns(id, name, status),
        candidate:rms_candidate_profiles(*),
        interview_booking:rms_interview_bookings(*, slot:rms_interview_slots(*))
      `)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('rms_candidate_documents' as never)
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('rms_payments' as never)
      .select('*, receipt:rms_payment_receipts(*)')
      .eq('application_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('rms_application_status_log' as never)
      .select('*')
      .eq('application_id', id)
      .order('changed_at', { ascending: false }),
    supabase
      .from('rms_application_notes' as never)
      .select('*')
      .eq('application_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const appData = appRes.data as any;
  if (appData) {
    if (Array.isArray(appData.candidate)) {
      appData.candidate = appData.candidate[0] || null;
    }
    if (!appData.candidate && appData.candidate_id) {
      const { data: directCand } = await supabase
        .from('rms_candidate_profiles' as never)
        .select('*')
        .eq('id', appData.candidate_id)
        .maybeSingle();
      if (directCand) {
        appData.candidate = directCand;
      }
    }
  }

  return {
    application: appData as (RmsApplicationWithDetails & {
      interview_booking?: RmsInterviewBooking & { slot?: RmsInterviewSlot };
      campaign?: Pick<RmsCampaign, 'id' | 'name' | 'status'>;
    }) | null,
    documents: (docsRes.data ?? []) as RmsCandidateDocument[],
    payments: (paymentsRes.data ?? []) as (RmsPayment & { receipt?: RmsPaymentReceipt })[],
    statusLog: (statusLogRes.data ?? []) as RmsApplicationStatusLog[],
    notes: (notesRes.data ?? []) as RmsApplicationNote[],
  };
}

// ============================================================
// HR Interview Slots
// ============================================================

export async function listInterviewSlotsForHR(filters?: { job_posting_id?: string; drive_id?: string }) {
  let q = supabase
    .from('rms_interview_slots' as never)
    .select(`*, job_posting:rms_job_postings(id, title), bookings:rms_interview_bookings(id, attendance_status, google_meet_link, reschedule_count, no_show_reattempt_approved, application:rms_applications(id, candidate:rms_candidate_profiles(full_name, mobile), job_posting:rms_job_postings(title)))`)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });
  if (filters?.job_posting_id) q = q.eq('job_posting_id', filters.job_posting_id);
  if (filters?.drive_id) q = q.eq('drive_id', filters.drive_id);
  const { data, error } = await q;
  return { data: (data ?? []) as any[], error };
}

export async function createInterviewSlot(slot: Partial<RmsInterviewSlot> & { slot_date: string; slot_time: string }) {
  const { data, error } = await supabase
    .from('rms_interview_slots' as never)
    .insert([slot])
    .select()
    .single();
  return { data: data as RmsInterviewSlot | null, error };
}

export async function updateInterviewSlot(id: string, updates: Partial<RmsInterviewSlot & { interviewer_name?: string }>) {
  const { data, error } = await supabase
    .from('rms_interview_slots' as never)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data: data as RmsInterviewSlot | null, error };
}

export async function bookApplicationToSlot(applicationId: string, slotId: string) {
  // 1. Atomic Concurrency-Safe Booking via PostgreSQL RPC with row-level locking
  const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)('rms_book_interview_slot', {
    p_application_id: applicationId,
    p_slot_id: slotId,
  });

  if (rpcErr) {
    console.error('[bookApplicationToSlot] RPC execution failed:', rpcErr);
    return {
      data: null,
      error: {
        message: rpcErr.message || 'Unable to complete interview slot booking. Please try again.',
        code: rpcErr.code || 'BOOKING_RPC_FAILED',
      } as any,
    };
  }

  if (!rpcRes || rpcRes.success === false) {
    return {
      data: null,
      error: {
        message: rpcRes?.message || 'Interview slot booking was unsuccessful.',
        code: rpcRes?.code || 'SLOT_FULL',
      } as any,
    };
  }

  const bookingData = {
    ...rpcRes.booking,
    slot: rpcRes.slot,
  };

  // 2. Dispatch Interview Confirmation WhatsApp Template (non-blocking)
  try {
    const { data: appData } = await supabase
      .from('rms_applications' as never)
      .select(`
        job_posting:rms_job_postings(title),
        candidate:rms_candidate_profiles(full_name, mobile)
      `)
      .eq('id', applicationId)
      .single();

    const app = appData as any;
    const candidateMobile = app?.candidate?.mobile;
    const candidateName = app?.candidate?.full_name || 'Candidate';
    const jobTitle = app?.job_posting?.title || 'Job';
    const slot = rpcRes.slot;
    const slotDate = slot?.slot_date || '';
    const slotTime = slot?.slot_time?.slice(0, 5) || '';
    const venueOrLink = slot?.location_or_link || (slot?.mode === 'online' ? 'Online Video Call' : 'Designated Centre');

    if (candidateMobile) {
      await sendInterviewConfirmedTemplate(
        candidateMobile,
        candidateName,
        jobTitle,
        slotDate,
        slotTime,
        venueOrLink,
      );
    }
  } catch (notifErr) {
    console.error('[bookApplicationToSlot] Failed to dispatch interview confirmation WhatsApp:', notifErr);
  }

  return { data: bookingData as RmsInterviewBooking, error: null };
}

export async function updateInterviewAttendance(bookingId: string, status: 'booked' | 'present' | 'absent' | 'rescheduled') {
  const { data, error } = await supabase
    .from('rms_interview_bookings' as never)
    .update({ attendance_status: status })
    .eq('id', bookingId)
    .select()
    .single();
    
  if (data && (data as any).application_id) {
    await syncCRMActivity((data as any).application_id, 'Interview Attendance', `Interview attendance marked as ${status}`);
  }
  return { data: data as RmsInterviewBooking | null, error };
}

// ============================================================
// HR Document Actions
// ============================================================

export async function listDocumentsForVerification() {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .select(`*, candidate:rms_candidate_profiles(id, full_name, mobile, candidate_id), application:rms_applications(id, application_number, status, job_posting:rms_job_postings(id, title))`)
    .in('status', ['uploaded', 'pending'])
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as (RmsCandidateDocument & { candidate?: Pick<RmsCandidateProfile, 'id' | 'full_name' | 'mobile' | 'candidate_id'>; application?: RmsApplicationWithDetails })[], error };
}

async function syncCRMActivity(applicationId: string, activityType: string, description: string, actorId: string | null = null, notes?: string) {
  try {
    const { data: app } = await supabase.from('rms_applications' as never).select('candidate_id').eq('id', applicationId).single();
    if (!app) return;
    const { data: cand } = await supabase.from('rms_candidate_profiles' as never).select('mobile').eq('id', (app as any).candidate_id).single();
    if (cand && (cand as any).mobile) {
      const mobile = ((cand as any).mobile as string).replace('+91', '');
      const { data: lead } = await supabase.from('crm_leads').select('id').eq('mobile_number', mobile).single();
      if (lead && lead.id) {
        const { logActivity } = await import('../../crm/lib/api');
        await logActivity(lead.id, activityType, description, actorId, 'HR', { rms_application_id: applicationId, notes });
      }
    }
  } catch (e) {
    console.error('CRM Sync Error (Activity)', e);
  }
}

export async function verifyDocument(docId: string, verifiedBy: string) {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .update({ status: 'verified', verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', docId)
    .select()
    .single();
    
  if (data && (data as any).application_id) {
    await syncCRMActivity((data as any).application_id, 'Document Verified', `Document ${((data as any).document_label || (data as any).document_type)} verified`, verifiedBy);
  }
  return { data: data as RmsCandidateDocument | null, error };
}

export async function rejectDocument(docId: string, reason: string, verifiedBy: string) {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .update({ status: 'rejected', rejection_reason: reason, verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', docId)
    .select()
    .single();
    
  if (data && (data as any).application_id) {
    await syncCRMActivity((data as any).application_id, 'Document Rejected', `Document ${((data as any).document_label || (data as any).document_type)} rejected`, verifiedBy, reason);
  }
  return { data: data as RmsCandidateDocument | null, error };
}

export async function requestDocumentCorrection(docId: string, reason: string) {
  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .update({ status: 'correction_required', rejection_reason: reason })
    .eq('id', docId)
    .select()
    .single();
    
  if (data && (data as any).application_id) {
    await syncCRMActivity((data as any).application_id, 'Document Correction Required', `Correction required for ${((data as any).document_label || (data as any).document_type)}`, null, reason);
  }
  return { data: data as RmsCandidateDocument | null, error };
}

// ============================================================
// HR Application Notes
// ============================================================

export async function addApplicationNote(applicationId: string, content: string, createdBy: string | null) {
  const { data, error } = await supabase
    .from('rms_application_notes' as never)
    .insert([{ application_id: applicationId, content, created_by: createdBy }])
    .select()
    .single();
    
  if (data) {
    await syncCRMActivity(applicationId, 'HR Note Added', 'HR added a note to the application', createdBy, content);
  }
  return { data: data as RmsApplicationNote | null, error };
}

// ============================================================
// HR Application list with extended filters
// ============================================================

export async function listApplicationsForHR(filters?: {
  district?: string;
  taluka?: string;
  job_posting_id?: string;
  status?: ApplicationStatus | '';
  search?: string;
  view?: 'active' | 'archived' | 'trash';
}) {
  const view = filters?.view || 'active';
  const { data, error } = await supabase
    .from('rms_applications' as never)
    .select(`*,
      job_posting:rms_job_postings(id, title, slug),
      candidate:rms_candidate_profiles(id, full_name, mobile, candidate_id, district, taluka)
    `)
    .order('created_at', { ascending: false });

  if (error) return { data: [] as RmsApplicationWithDetails[], error };

  let results = (data ?? []).map((app: any) => {
    let candidate = app.candidate;
    if (Array.isArray(candidate)) {
      candidate = candidate[0] || null;
    }
    return {
      ...app,
      candidate,
    };
  }) as RmsApplicationWithDetails[];

  // Fallback: If any candidates failed to join via PostgREST embedding, fetch by IDs directly
  const missingCandIds = results
    .filter(a => !a.candidate && a.candidate_id)
    .map(a => a.candidate_id);

  if (missingCandIds.length > 0) {
    try {
      const { data: directCands } = await supabase
        .from('rms_candidate_profiles' as never)
        .select('id, full_name, mobile, candidate_id, district, taluka')
        .in('id', missingCandIds);

      if (directCands && (directCands as any[]).length > 0) {
        const candMap = new Map((directCands as any[]).map(c => [c.id, c]));
        results = results.map(a => {
          if (!a.candidate && a.candidate_id && candMap.has(a.candidate_id)) {
            return { ...a, candidate: candMap.get(a.candidate_id) };
          }
          return a;
        });
      }
    } catch (e) {
      console.warn('[listApplicationsForHR] Fallback candidate fetch error:', e);
    }
  }

  // View filtering: active vs archived vs trash
  if (view === 'active') {
    results = results.filter(a => !a.is_archived && !a.is_trashed);
  } else if (view === 'archived') {
    results = results.filter(a => !!a.is_archived && !a.is_trashed);
  } else if (view === 'trash') {
    results = results.filter(a => !!a.is_trashed);
  }

  if (filters?.status) results = results.filter(a => a.status === filters.status);
  if (filters?.district) {
    results = results.filter(a => {
      const c = a.candidate as { district?: string } | undefined;
      return (c?.district ?? a.preferred_district ?? '') === filters.district;
    });
  }
  if (filters?.taluka) {
    results = results.filter(a => {
      const c = a.candidate as { taluka?: string } | undefined;
      return (c?.taluka ?? '').toLowerCase().includes(filters.taluka!.toLowerCase());
    });
  }
  if (filters?.job_posting_id) {
    results = results.filter(a => a.job_posting_id === filters.job_posting_id);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(a => {
      const c = a.candidate as { full_name?: string; mobile?: string; candidate_id?: string } | undefined;
      return (
        a.application_number.toLowerCase().includes(s) ||
        (c?.full_name ?? '').toLowerCase().includes(s) ||
        (c?.mobile ?? '').includes(s) ||
        (a.job_posting?.title ?? '').toLowerCase().includes(s)
      );
    });
  }
  return { data: results, error: null };
}

// ============================================================
// Application Archive, Restore & Delete Operations
// ============================================================

export async function archiveApplication(id: string, notes?: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app, error: appErr } = await supabase
    .from('rms_applications' as never)
    .select('id, status, application_number')
    .eq('id', id)
    .single();

  if (appErr || !app) {
    return { error: appErr?.message || 'Application not found' };
  }

  const { error } = await supabase
    .from('rms_applications' as never)
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: user?.id || null,
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase
    .from('rms_application_status_log' as never)
    .insert([{
      application_id: id,
      from_status: (app as any).status,
      to_status: (app as any).status,
      changed_by: user?.id || null,
      notes: notes || 'Application archived by Admin',
    }] as never);

  return { error: null };
}

export async function restoreApplication(id: string, notes?: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app, error: appErr } = await supabase
    .from('rms_applications' as never)
    .select('id, status, application_number')
    .eq('id', id)
    .single();

  if (appErr || !app) {
    return { error: appErr?.message || 'Application not found' };
  }

  const { error } = await supabase
    .from('rms_applications' as never)
    .update({
      is_archived: false,
      archived_at: null,
      archived_by: null,
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase
    .from('rms_application_status_log' as never)
    .insert([{
      application_id: id,
      from_status: (app as any).status,
      to_status: (app as any).status,
      changed_by: user?.id || null,
      notes: notes || 'Application restored from archive to active queue',
    }] as never);

  return { error: null };
}

export async function trashApplication(id: string, notes?: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app, error: appErr } = await supabase
    .from('rms_applications' as never)
    .select('id, status, application_number')
    .eq('id', id)
    .single();

  if (appErr || !app) {
    return { error: appErr?.message || 'Application not found' };
  }

  const { error } = await supabase
    .from('rms_applications' as never)
    .update({
      is_trashed: true,
      trashed_at: new Date().toISOString(),
      trashed_by: user?.id || null,
      is_archived: false,
      archived_at: null,
      archived_by: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase
    .from('rms_application_status_log' as never)
    .insert([{
      application_id: id,
      from_status: (app as any).status,
      to_status: (app as any).status,
      changed_by: user?.id || null,
      notes: notes || 'Application moved to trash',
    }] as never);

  return { error: null };
}

export async function restoreTrashApplication(id: string, notes?: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app, error: appErr } = await supabase
    .from('rms_applications' as never)
    .select('id, status, application_number, candidate_id, job_posting_id')
    .eq('id', id)
    .single();

  if (appErr || !app) {
    return { error: appErr?.message || 'Application not found' };
  }

  // Guard: Verify candidate does not already have an active application for this job posting
  const { data: activeApp } = await supabase
    .from('rms_applications' as never)
    .select('id, application_number')
    .eq('candidate_id', (app as any).candidate_id)
    .eq('job_posting_id', (app as any).job_posting_id)
    .neq('id', id)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .limit(1)
    .maybeSingle();

  if (activeApp) {
    return { error: `Cannot restore: candidate already has an active application (${(activeApp as any).application_number}) for this job.` };
  }

  const { error } = await supabase
    .from('rms_applications' as never)
    .update({
      is_trashed: false,
      trashed_at: null,
      trashed_by: null,
      is_archived: false,
      archived_at: null,
      archived_by: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase
    .from('rms_application_status_log' as never)
    .insert([{
      application_id: id,
      from_status: (app as any).status,
      to_status: (app as any).status,
      changed_by: user?.id || null,
      notes: notes || 'Application restored from trash to active queue',
    }] as never);

  return { error: null };
}

export async function permanentlyDeleteApplication(id: string): Promise<{ success: boolean; error: string | null }> {
  // Call the database function which verifies Super Admin authorization, checks payment retention, logs audit, and deletes
  const { data, error } = await supabase.rpc('rms_permanently_delete_application' as never, {
    p_application_id: id,
  } as never);

  if (error) {
    return { success: false, error: error.message };
  }

  const res = data as { success?: boolean; error?: string };
  if (res && res.success === false) {
    return { success: false, error: res.error || 'Failed to permanently delete application.' };
  }

  return { success: true, error: null };
}

export async function permanentlyDeleteCandidate(
  candidateId?: string | null,
  mobile?: string | null,
  confirmation?: string
): Promise<{ success: boolean; error: string | null; message?: string }> {
  if (!confirmation || confirmation !== 'PERMANENTLY DELETE') {
    return {
      success: false,
      error: 'Confirmation mismatch: You must enter "PERMANENTLY DELETE" to confirm this destructive operation.',
    };
  }

  // 1. Step 1: Discover candidate storage files in 'candidate-docs' bucket
  let storagePaths: string[] = [];
  try {
    const { data: infoData, error: infoErr } = await supabase.rpc(
      'rms_get_candidate_storage_info' as never,
      {
        p_candidate_id: candidateId || null,
        p_mobile: mobile || null,
      } as never
    );

    if (infoErr) {
      return { success: false, error: `Pre-deletion storage check failed: ${infoErr.message}` };
    }

    const info = infoData as {
      success?: boolean;
      error?: string;
      storage_paths?: string[];
      user_id?: string;
    };

    if (info && info.success === false) {
      return { success: false, error: info.error || 'Failed to resolve candidate details.' };
    }

    storagePaths = info?.storage_paths || [];
  } catch (err) {
    return {
      success: false,
      error: `Failed to inspect candidate storage: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 2. Step 2: Delete candidate storage objects via official Supabase Storage API
  // Using batches of 50 to safely handle nested paths and multiple documents.
  let filesDeleted = 0;
  if (storagePaths.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < storagePaths.length; i += BATCH_SIZE) {
      const batch = storagePaths.slice(i, i + BATCH_SIZE);
      const { data: removedObjects, error: removeErr } = await supabase.storage
        .from('candidate-docs')
        .remove(batch);

      if (removeErr) {
        return {
          success: false,
          error: `Storage API cleanup failed: ${removeErr.message}. Database records were NOT modified. You may safely retry.`,
        };
      }
      filesDeleted += removedObjects?.length || batch.length;
    }
  }

  // 3. Step 3: Call master deletion RPC to purge database records, CRM leads, OTPs, and auth.users
  const { data, error } = await supabase.rpc('rms_permanently_delete_candidate' as never, {
    p_candidate_id: candidateId || null,
    p_mobile: mobile || null,
    p_confirmation: confirmation,
    p_storage_files_deleted: filesDeleted,
    p_force_ignore_storage: false,
  } as never);

  if (error) {
    return {
      success: false,
      error: `Database purge failed: ${error.message}. Storage files were cleaned. You may safely retry the purge.`,
    };
  }

  const res = data as { success?: boolean; error?: string; message?: string };
  if (res && res.success === false) {
    return { success: false, error: res.error || 'Failed to permanently delete candidate.' };
  }

  return { success: true, error: null, message: res?.message };
}

// ============================================================
// Candidate Portal — extra helpers
// ============================================================

export async function checkDuplicateAadhaar(aadhaar: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('rms_candidate_profiles' as never)
    .select('id')
    .eq('aadhar_number', aadhaar)
    .neq('user_id', userId)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function getMyPayments(candidateId: string) {
  // Get all active application IDs for this candidate first
  const { data: apps } = await supabase
    .from('rms_applications' as never)
    .select('id')
    .eq('candidate_id', candidateId)
    .or('is_trashed.is.null,is_trashed.eq.false');
  const appIds = (apps ?? []).map((a: { id: string }) => a.id);
  if (appIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('rms_payments' as never)
    .select(`*, receipt:rms_payment_receipts(*), application:rms_applications(id, application_number, job_posting:rms_job_postings(title))`)
    .in('application_id', appIds)
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as (RmsPayment & { receipt?: RmsPaymentReceipt; application?: RmsApplicationWithDetails })[], error };
}

export async function getMyInterviewBookings(candidateId: string) {
  const { data: apps } = await supabase
    .from('rms_applications' as never)
    .select('id')
    .eq('candidate_id', candidateId);
  const appIds = (apps ?? []).map((a: { id: string }) => a.id);
  if (appIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('rms_interview_bookings' as never)
    .select(`*, slot:rms_interview_slots(*, job_posting:rms_job_postings(id, title)), application:rms_applications(id, application_number, job_posting:rms_job_postings(title))`)
    .in('application_id', appIds)
    .order('booked_at', { ascending: false });
  return { data: (data ?? []) as (RmsInterviewBooking & { slot?: RmsInterviewSlot & { job_posting?: Pick<RmsJobPosting, 'id' | 'title'> }; application?: RmsApplicationWithDetails })[], error };
}

export async function getMyAllAppointmentLetters(candidateId: string) {
  const { data: apps } = await supabase
    .from('rms_applications' as never)
    .select('id')
    .eq('candidate_id', candidateId);
  const appIds = (apps ?? []).map((a: { id: string }) => a.id);
  if (appIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('rms_appointment_letters' as never)
    .select(`*, application:rms_applications(id, application_number, job_posting:rms_job_postings(title))`)
    .in('application_id', appIds)
    .order('issued_at', { ascending: false });
  return { data: (data ?? []) as (RmsAppointmentLetter & { application?: RmsApplicationWithDetails })[], error };
}

export async function uploadCandidateDocument(
  userId: string,
  candidateId: string,
  applicationId: string,
  file: File,
  documentType: string,
  documentLabel: string
) {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${applicationId}/${documentType}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('candidate-docs')
    .upload(path, file, { upsert: true });

  if (uploadErr) return { data: null, error: uploadErr };

  const { data: { publicUrl } } = supabase.storage.from('candidate-docs').getPublicUrl(path);

  const { data, error } = await supabase
    .from('rms_candidate_documents' as never)
    .upsert([{
      candidate_id: candidateId,
      application_id: applicationId,
      document_type: documentType,
      document_label: documentLabel,
      file_name: file.name,
      storage_path: publicUrl,
      status: 'uploaded',
    }], { onConflict: 'candidate_id,application_id,document_type' })
    .select()
    .single();

  return { data: data as RmsCandidateDocument | null, error };
}

// ===== Dynamic Job Badges =====
export async function listJobBadges(jobId: string) {
  const { data, error } = await supabase
    .from('rms_job_badges' as never)
    .select('*')
    .eq('job_id', jobId)
    .order('order', { ascending: true });
  return { data: (data ?? []) as RmsJobBadge[], error };
}

export async function upsertJobBadge(badge: Partial<RmsJobBadge> & { job_id: string; title: string }) {
  const { data, error } = await supabase
    .from('rms_job_badges' as never)
    .upsert(badge, { onConflict: 'id' })
    .select()
    .single();
  return { data: data as RmsJobBadge | null, error };
}

export async function deleteJobBadge(id: string) {
  return supabase.from('rms_job_badges' as never).delete().eq('id', id);
}

// ===== Custom Recruitment Steps =====
export async function listRecruitmentSteps(jobId: string) {
  const { data, error } = await supabase
    .from('rms_recruitment_steps' as never)
    .select('*')
    .eq('job_id', jobId)
    .order('order', { ascending: true });
  return { data: (data ?? []) as RmsRecruitmentStep[], error };
}

export async function upsertRecruitmentStep(step: Partial<RmsRecruitmentStep> & { job_id: string; label: string }) {
  const { data, error } = await supabase
    .from('rms_recruitment_steps' as never)
    .upsert(step, { onConflict: 'id' })
    .select()
    .single();
  return { data: data as RmsRecruitmentStep | null, error };
}

export async function deleteRecruitmentStep(id: string) {
  return supabase.from('rms_recruitment_steps' as never).delete().eq('id', id);
}

// ===== Custom Job FAQs =====
export async function listJobFaqs(jobId: string) {
  const { data, error } = await supabase
    .from('rms_job_faqs' as never)
    .select('*')
    .eq('job_id', jobId)
    .order('order', { ascending: true });
  return { data: (data ?? []) as RmsJobFaq[], error };
}

export async function upsertJobFaq(faq: Partial<RmsJobFaq> & { job_id: string; question: string; answer: string }) {
  const { data, error } = await supabase
    .from('rms_job_faqs' as never)
    .upsert(faq, { onConflict: 'id' })
    .select()
    .single();
  return { data: data as RmsJobFaq | null, error };
}

export async function deleteJobFaq(id: string) {
  return supabase.from('rms_job_faqs' as never).delete().eq('id', id);
}

// ============================================================
// Phase 5 Integrations (Resume, CRM Timeline, Audit Logging)
// ============================================================

export async function getExistingApplication(candidateId: string, jobId: string) {
  if (!candidateId || !jobId) {
    return { data: null, error: null };
  }

  // Local Dummy Mode: check simulated candidate application in storage
  if (candidateId.startsWith('dummy-')) {
    if (typeof window !== 'undefined') {
      try {
        const submittedKey = `maha_candidate_app_${jobId}_${candidateId}`;
        const raw = sessionStorage.getItem(submittedKey) || localStorage.getItem(submittedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { data: parsed as RmsApplication, error: null };
        }
      } catch {}
    }
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('rms_applications' as never)
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('job_posting_id', jobId)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error && error.code !== 'PGRST116') throw error;
  return { data: data as RmsApplication | null, error: null };
}

export async function fetchCandidateCRMTimeline(candidateId: string) {
  // Query CRM activity logs (read-only)
  const { data, error } = await supabase
    .from('crm_activity_logs' as never)
    .select(`
      *,
      actor:crm_users(full_name)
    `)
    .eq('lead_id', candidateId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return { data, error };
}

// ============================================================
// Interview Management, Selection & Initial Onboarding API
// ============================================================

// ── 0. Staff Directory & Management API ───────────────────────

export function getStaffEnvironmentInfo() {
  const isLive = env.isLiveDatabase;
  return {
    projectRef: env.projectRef,
    isStaging: env.isStagingDatabase,
    isStagingLive: isLive,
    isProduction: env.isProductionDatabase,
    label: env.isProductionDatabase
      ? 'PRODUCTION – LIVE DATABASE'
      : env.isStagingDatabase
      ? 'STAGING – LIVE DATABASE'
      : 'PREVIEW – IN-MEMORY / NON-PERSISTENT',
    writesAllowed: isLive,
  };
}

// In-Memory Fallback Store for Preview / Prototype Environments (e.g. MDM Preview without Staging config)
const DEFAULT_FALLBACK_STAFF: StaffUser[] = [
  {
    id: 'preview-staff-01',
    email: 'ramesh.patil@maha-agri.gov.in',
    full_name: 'Ramesh Patil (Preview)',
    designation: 'Admin',
    department: 'Administration',
    role_key: 'super_admin',
    role_name: 'Super Admin',
    is_active: true,
    created_at: '2026-01-15T09:00:00Z',
    is_interviewer: true,
    interviewer_id: 'preview-intv-01',
    interviewer_is_active: true,
    interviewer_meet_link: 'https://meet.google.com/ramesh-admin-panel',
    authorized_at: '2026-02-01T10:00:00Z',
    authorized_by: 'preview-staff-01',
    authorized_by_name: 'System Admin',
  },
  {
    id: 'preview-staff-02',
    email: 'aarav.patil@maha-agri.gov.in',
    full_name: 'Aarav Patil (Preview)',
    designation: 'HR',
    department: 'Human Resources',
    role_key: 'admin',
    role_name: 'Admin',
    is_active: true,
    created_at: '2026-01-20T10:00:00Z',
    is_interviewer: true,
    interviewer_id: 'preview-intv-02',
    interviewer_is_active: true,
    interviewer_meet_link: 'https://meet.google.com/aarav-hr-lead',
    authorized_at: '2026-02-05T11:00:00Z',
    authorized_by: 'preview-staff-01',
    authorized_by_name: 'Ramesh Patil',
  },
  {
    id: 'preview-staff-03',
    email: 'sneha.deshmukh@maha-agri.gov.in',
    full_name: 'Sneha Deshmukh (Preview)',
    designation: 'CSM',
    department: 'Customer Support',
    role_key: 'staff',
    role_name: 'Staff',
    is_active: true,
    created_at: '2026-02-01T08:30:00Z',
    is_interviewer: true,
    interviewer_id: 'preview-intv-03',
    interviewer_is_active: true,
    interviewer_meet_link: 'https://meet.google.com/sneha-csm-panel',
    authorized_at: '2026-02-10T14:00:00Z',
    authorized_by: 'preview-staff-01',
    authorized_by_name: 'Ramesh Patil',
  },
  {
    id: 'preview-staff-04',
    email: 'vikram.shinde@maha-agri.gov.in',
    full_name: 'Vikram Shinde (Preview)',
    designation: 'Telecaller',
    department: 'Agriculture Operations',
    role_key: 'staff',
    role_name: 'Staff',
    is_active: true,
    created_at: '2026-02-15T09:15:00Z',
    is_interviewer: false,
    interviewer_id: null,
    interviewer_is_active: false,
    interviewer_meet_link: null,
    authorized_at: null,
    authorized_by: null,
    authorized_by_name: null,
  },
  {
    id: 'preview-staff-05',
    email: 'pooja.kulkarni@maha-agri.gov.in',
    full_name: 'Pooja Kulkarni (Preview)',
    designation: 'Independent Interviewer',
    department: 'Recruitment Operations',
    role_key: 'staff',
    role_name: 'Staff',
    is_active: true,
    created_at: '2026-03-01T11:00:00Z',
    is_interviewer: true,
    interviewer_id: 'preview-intv-05',
    interviewer_is_active: true,
    interviewer_meet_link: 'https://meet.google.com/pooja-independent-expert',
    authorized_at: '2026-03-05T12:00:00Z',
    authorized_by: 'preview-staff-02',
    authorized_by_name: 'Aarav Patil',
  },
  {
    id: 'preview-staff-06',
    email: 'sunil.gaikwad@maha-agri.gov.in',
    full_name: 'Sunil Gaikwad (Preview)',
    designation: 'Other Staff',
    department: 'Field Operations',
    role_key: 'staff',
    role_name: 'Staff',
    is_active: false,
    created_at: '2026-03-10T15:30:00Z',
    is_interviewer: false,
    interviewer_id: null,
    interviewer_is_active: false,
    interviewer_meet_link: null,
    authorized_at: null,
    authorized_by: null,
    authorized_by_name: null,
  },
];

function getFallbackStaffDirectory(filter: StaffDirectoryFilter = {}): StaffUser[] {
  let list = [...DEFAULT_FALLBACK_STAFF];

  if (filter.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    list = list.filter(s =>
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q)
    );
  }

  if (filter.department && filter.department !== 'all') {
    list = list.filter(s => s.department === filter.department);
  }

  if (filter.designation && filter.designation !== 'all') {
    list = list.filter(s => s.designation === filter.designation);
  }

  if (filter.is_active !== undefined) {
    list = list.filter(s => s.is_active === filter.is_active);
  } else if (filter.status === 'active') {
    list = list.filter(s => s.is_active === true);
  } else if (filter.status === 'inactive') {
    list = list.filter(s => s.is_active === false);
  }

  if (filter.offset) {
    list = list.slice(filter.offset);
  }
  if (filter.limit) {
    list = list.slice(0, filter.limit);
  }

  return list;
}

export async function listStaffDirectory(
  filter: StaffDirectoryFilter = {}
): Promise<{ data: StaffUser[]; error: string | null }> {
  // If not connected to verified Staging or Production project, use preview repository with non-persistent status
  if (!env.isLiveDatabase) {
    return { data: getFallbackStaffDirectory(filter), error: null };
  }

  try {
    const isActiveBool = filter.is_active !== undefined
      ? filter.is_active
      : filter.status === 'active'
      ? true
      : filter.status === 'inactive'
      ? false
      : null;

    const { data, error } = await supabase.rpc('rms_list_staff_directory', {
      p_search: filter.search?.trim() || null,
      p_department: filter.department && filter.department !== 'all' ? filter.department : null,
      p_designation: filter.designation && filter.designation !== 'all' ? filter.designation : null,
      p_status: filter.status || (isActiveBool === true ? 'active' : isActiveBool === false ? 'inactive' : 'all'),
      p_role_id: filter.role_id || null,
      p_is_active: isActiveBool,
      p_limit: filter.limit || null,
      p_offset: filter.offset || 0,
    });

    if (error) {
      return {
        data: [],
        error: `RPC error: ${error.message}. Please verify database connection.`
      };
    }

    return { data: (data ?? []) as StaffUser[], error: null };
  } catch (err: any) {
    return {
      data: [],
      error: `Network failure connecting to Staging: ${err.message || 'Unknown error'}`
    };
  }
}

export const getStaffDirectory = listStaffDirectory;

/**
 * Safely extracts human-readable and secure error messages from Supabase FunctionsError context.
 * Parses the actual JSON body returned by the Edge Function instead of generic non-2xx status code.
 */
async function extractEdgeFunctionError(edgeError: any): Promise<string> {
  if (!edgeError) return 'Unknown Edge Function error';
  let message = edgeError.message || 'Edge Function returned an error';

  if (edgeError.context && typeof edgeError.context.clone === 'function') {
    try {
      const errBody = await edgeError.context.clone().json();
      if (errBody && typeof errBody.error === 'string') {
        return errBody.error;
      }
    } catch {}
  } else if (edgeError.context && typeof edgeError.context.json === 'function') {
    try {
      const errBody = await edgeError.context.json();
      if (errBody && typeof errBody.error === 'string') {
        return errBody.error;
      }
    } catch {}
  }

  return message;
}

export async function createOrInviteStaff(params: {
  email: string;
  full_name: string;
  designation: string;
  department: string;
  role_key?: string;
  temporary_password?: string;
  phone?: string;
  assigned_district?: string;
  assigned_taluka?: string;
  assigned_location?: string;
}): Promise<{ data: { success: boolean; user_id?: string; employee_code?: string; message?: string; temporary_password?: string; activation_method?: string } | null; error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      data: null,
      error: 'Write operations are strictly disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment to create staff users.'
    };
  }

  // Pre-flight session check: ensure caller has an active Supabase Auth session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return {
      data: null,
      error: 'Authentication required: You must be signed into an active Administrator or HR Lead session in Supabase Auth to perform staff provisioning.',
    };
  }

  // Mandatory Server-Side Provisioning via Supabase Admin Auth API Edge Function
  // Direct internal auth table manipulation fallbacks are strictly disabled for security compliance.
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-provision-staff', {
      body: {
        action: 'create_staff',
        email: params.email,
        full_name: params.full_name,
        designation: params.designation || 'Other Staff',
        department: params.department || 'General Operations',
        role_key: params.role_key || 'staff',
        temporary_password: params.temporary_password,
        phone: params.phone,
        assigned_district: params.assigned_district,
        assigned_taluka: params.assigned_taluka,
        assigned_location: params.assigned_location,
      },
    });

    if (edgeError) {
      const errorMsg = await extractEdgeFunctionError(edgeError);
      return { data: null, error: `Edge Function error: ${errorMsg}` };
    }
    if (!edgeData?.success) {
      return { data: null, error: edgeData?.error || 'Staff provisioning failed via Edge Function' };
    }

    return { data: edgeData, error: null };
  } catch (err: any) {
    return { data: null, error: `Edge Function unavailable: ${err.message || 'Write operations failed securely without database fallback.'}` };
  }
}

export async function generateStaffActivationPassword(params: {
  user_id: string;
  temporary_password?: string;
}): Promise<{ data: { success: boolean; user_id?: string; email?: string; full_name?: string; temporary_password?: string; activation_method?: string; message?: string } | null; error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      data: null,
      error: 'Write operations are strictly disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment.'
    };
  }

  // Pre-flight session check: ensure caller has an active Supabase Auth session
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return {
      data: null,
      error: 'Authentication required: You must be signed into an active Administrator or HR Lead session in Supabase Auth to generate activation credentials.',
    };
  }

  // Mandatory Server-Side Password Reset via Supabase Admin Auth API Edge Function
  // Direct internal auth table manipulation fallbacks are strictly disabled for security compliance.
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-provision-staff', {
      body: {
        action: 'generate_activation_password',
        user_id: params.user_id,
        temporary_password: params.temporary_password,
      },
    });

    if (edgeError) {
      const errorMsg = await extractEdgeFunctionError(edgeError);
      return { data: null, error: `Edge Function error: ${errorMsg}` };
    }
    if (!edgeData?.success) {
      return { data: null, error: edgeData?.error || 'Failed to generate activation credentials via Edge Function' };
    }

    return { data: edgeData, error: null };
  } catch (err: any) {
    return { data: null, error: `Edge Function unavailable: ${err.message || 'Credential generation failed securely without database fallback.'}` };
  }
}

export async function updateStaffProfile(params: {
  user_id: string;
  full_name: string;
  designation: string;
  department: string;
  role_key?: string;
  phone?: string;
  assigned_state?: string;
  assigned_district?: string;
  assigned_taluka?: string;
  assigned_location?: string;
}): Promise<{ error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      error: 'Profile modifications are disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment to save changes.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('rms_update_staff_profile', {
      p_user_id: params.user_id,
      p_full_name: params.full_name,
      p_designation: params.designation,
      p_department: params.department,
      p_role_key: params.role_key || null,
      p_assigned_state: params.assigned_state || 'Maharashtra',
      p_assigned_district: params.assigned_district || null,
      p_assigned_taluka: params.assigned_taluka || null,
      p_assigned_location: params.assigned_location || null,
      p_phone: params.phone || null,
    });

    if (error) return { error: error.message };
    if (!data?.success) return { error: data?.error || 'Update failed' };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to update profile' };
  }
}

export async function toggleStaffStatus(
  userId: string,
  isActive: boolean,
  reason?: string
): Promise<{ error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      error: 'Staff activation/deactivation is disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment to toggle status.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('rms_toggle_staff_status', {
      p_user_id: userId,
      p_is_active: isActive,
      p_reason: reason || null,
    });

    if (error) return { error: error.message };
    if (!data?.success) return { error: data?.error || 'Status toggle failed' };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle staff status' };
  }
}

// ── 1. Interviewer Pool Management ───────────────────────────
export async function listInterviewers(): Promise<{ data: RmsInterviewer[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('rms_interviewers')
      .select(`
        *,
        user_profile:profiles!rms_interviewers_user_id_fkey(id, full_name, email, designation, department, is_active),
        authorizer:profiles!rms_interviewers_authorized_by_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      authorized_by_name: row.authorizer?.full_name || null,
    }));
    return { data: mapped as RmsInterviewer[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch interviewers' };
  }
}

export async function authorizeInterviewer(
  userId: string,
  defaultMeetLink?: string
): Promise<{ data: { success: boolean; interviewer_id?: string; message?: string } | null; error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      data: null,
      error: 'Interviewer authorization is disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment to authorize interviewers.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('rms_authorize_interviewer', {
      p_user_id: userId,
      p_default_meet_link: defaultMeetLink || null,
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Authorization failed' };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to authorize interviewer' };
  }
}

export async function toggleInterviewerStatus(
  interviewerId: string,
  isActive: boolean,
  reason?: string
): Promise<{ error: string | null }> {
  if (!env.isLiveDatabase) {
    return {
      error: 'Interviewer status toggle is disabled in PREVIEW mode. Connect Localhost to an authorized MAHA-AGRI environment to update interviewer pool.'
    };
  }

  try {
    const { data, error } = await supabase.rpc('rms_toggle_interviewer_status', {
      p_interviewer_id: interviewerId,
      p_is_active: isActive,
      p_reason: reason || null,
    });

    if (error) return { error: error.message };
    if (!data?.success) return { error: data?.error || 'Interviewer status toggle failed' };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle interviewer status' };
  }
}

export async function getInterviewerAuditHistory(
  interviewerId: string
): Promise<{ data: InterviewerAuditEntry[]; error: string | null }> {
  if (!env.isLiveDatabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc('rms_get_interviewer_audit_history', {
      p_interviewer_id: interviewerId,
    });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as InterviewerAuditEntry[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch audit history' };
  }
}

export async function updateInterviewer(id: string, updates: Partial<RmsInterviewer>): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rms_interviewers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return { error: error ? error.message : null };
}

export async function deleteInterviewer(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rms_interviewers')
    .delete()
    .eq('id', id);

  return { error: error ? error.message : null };
}

// ── 2. Schedules & Overrides ────────────────────────────────
export async function getInterviewerSchedules(interviewerId: string): Promise<{ data: RmsInterviewerSchedule[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_interviewer_schedules')
    .select('*')
    .eq('interviewer_id', interviewerId)
    .order('day_of_week', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RmsInterviewerSchedule[], error: null };
}

export async function upsertInterviewerSchedule(schedule: {
  interviewer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  daily_capacity: number;
  is_active?: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rms_interviewer_schedules')
    .upsert({
      ...schedule,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'interviewer_id,day_of_week' });

  return { error: error ? error.message : null };
}

export async function getInterviewerOverrides(interviewerId: string): Promise<{ data: RmsInterviewerOverride[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_interviewer_overrides')
    .select('*')
    .eq('interviewer_id', interviewerId)
    .order('override_date', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RmsInterviewerOverride[], error: null };
}

export async function createInterviewerOverride(override: {
  interviewer_id: string;
  override_date: string;
  is_leave: boolean;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  custom_capacity?: number | null;
  reason?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rms_interviewer_overrides')
    .upsert(override, { onConflict: 'interviewer_id,override_date' });

  return { error: error ? error.message : null };
}

export async function deleteInterviewerOverride(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('rms_interviewer_overrides')
    .delete()
    .eq('id', id);

  return { error: error ? error.message : null };
}

// ── 3. Reschedule Requests ──────────────────────────────────
export async function submitRescheduleRequest(applicationId: string, requestedSlotId: string, reason: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_submit_reschedule_request', {
    p_application_id: applicationId,
    p_requested_slot_id: requestedSlotId,
    p_reason: reason,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function listRescheduleRequests(status?: string): Promise<{ data: RmsRescheduleRequest[]; error: string | null }> {
  let query = supabase
    .from('rms_reschedule_requests')
    .select(`
      *,
      application:rms_applications(
        id, application_number, status,
        candidate:rms_candidate_profiles(id, full_name, mobile),
        job_posting:rms_job_postings(id, title)
      ),
      current_booking:rms_interview_bookings(id, slot_id, booked_at, attendance_status),
      requested_slot:rms_interview_slots(id, slot_date, slot_time, mode, location_or_link)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as unknown as RmsRescheduleRequest[], error: null };
}

export async function reviewRescheduleRequest(requestId: string, action: 'approved' | 'rejected', adminRemarks: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_review_reschedule_request', {
    p_request_id: requestId,
    p_action: action,
    p_admin_remarks: adminRemarks,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

// ── 4. No-Show Management ───────────────────────────────────
export async function recordNoShow(bookingId: string, notes?: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_record_no_show', {
    p_booking_id: bookingId,
    p_notes: notes || '',
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function approveNoShowReattempt(bookingId: string, adminRemarks: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_approve_no_show_reattempt', {
    p_booking_id: bookingId,
    p_admin_remarks: adminRemarks,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

// ── 5. Standardized 100-Mark Evaluation ─────────────────────
export async function submitInterviewEvaluation(payload: {
  applicationId: string;
  scoreCommunication: number;
  scoreSubjectKnowledge: number;
  scoreExperience: number;
  scorePracticalKnowledge: number;
  scoreOverallRating: number;
  criterionComments: Record<string, string>;
  overallObservations: string;
  recommendation: 'selected' | 'wait_list' | 'rejected' | 'hold';
}): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_submit_interview_evaluation', {
    p_application_id: payload.applicationId,
    p_score_communication: payload.scoreCommunication,
    p_score_subject_knowledge: payload.scoreSubjectKnowledge,
    p_score_experience: payload.scoreExperience,
    p_score_practical_knowledge: payload.scorePracticalKnowledge,
    p_score_overall_rating: payload.scoreOverallRating,
    p_criterion_comments: payload.criterionComments,
    p_overall_observations: payload.overallObservations,
    p_recommendation: payload.recommendation,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function getApplicationEvaluations(applicationId: string): Promise<{ data: RmsInterviewEvaluation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_interview_evaluations')
    .select(`
      *,
      evaluator:profiles!rms_interview_evaluations_evaluator_id_fkey(full_name)
    `)
    .eq('application_id', applicationId)
    .order('round_number', { ascending: true });

  if (error) return { data: [], error: error.message };
  const mapped = (data ?? []).map((e: any) => ({
    ...e,
    evaluator_name: e.evaluator?.full_name || 'Staff Evaluator',
  }));
  return { data: mapped, error: null };
}

// ── 6. Final Selection Decision ─────────────────────────────
export async function recordFinalSelection(
  applicationId: string,
  decision: 'selected' | 'rejected' | 'on_hold',
  remarks: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_record_final_selection', {
    p_application_id: applicationId,
    p_decision: decision,
    p_remarks: remarks,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

// ── 7. Organization Signatures & Templates ──────────────────
export async function listOrganizationSignatures(): Promise<{ data: RmsOrganizationSignature[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_organization_signatures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RmsOrganizationSignature[], error: null };
}

export async function upsertOrganizationSignature(sig: {
  id?: string;
  signatory_name: string;
  designation: string;
  signature_image_url: string;
  is_active?: boolean;
}): Promise<{ data: RmsOrganizationSignature | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_organization_signatures')
    .upsert({
      ...sig,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as RmsOrganizationSignature, error: null };
}

export async function listAppointmentTemplates(): Promise<{ data: RmsAppointmentTemplate[]; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_appointment_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RmsAppointmentTemplate[], error: null };
}

export async function upsertAppointmentTemplate(tmpl: {
  id?: string;
  job_posting_id?: string | null;
  designation: string;
  common_terms: string[];
  position_terms: string[];
  is_active?: boolean;
}): Promise<{ data: RmsAppointmentTemplate | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_appointment_templates')
    .upsert({
      ...tmpl,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as RmsAppointmentTemplate, error: null };
}

// ── 8. Provisional & Final Appointment Letters ──────────────
export async function generateProvisionalAppointmentLetter(
  applicationId: string,
  joiningDate: string,
  joiningVenue: string,
  templateId?: string,
  orgSigId?: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_generate_provisional_appointment_letter', {
    p_application_id: applicationId,
    p_joining_date: joiningDate,
    p_joining_venue: joiningVenue,
    p_template_id: templateId || null,
    p_org_sig_id: orgSigId || null,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function signProvisionalAppointmentLetter(
  letterId: string,
  legalName: string,
  signatureData: string,
  otpCode: string
): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_sign_provisional_appointment_letter', {
    p_letter_id: letterId,
    p_legal_name: legalName,
    p_signature_data: signatureData,
    p_otp_code: otpCode,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function issueFinalAppointmentLetter(applicationId: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_issue_final_appointment_letter', {
    p_application_id: applicationId,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

export async function getAppointmentLetterWithDetails(applicationId: string): Promise<{ data: RmsAppointmentLetter | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rms_appointment_letters')
    .select(`
      *,
      org_signature:rms_organization_signatures(*)
    `)
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') return { data: null, error: error.message };
  return { data: (data as unknown as RmsAppointmentLetter) ?? null, error: null };
}

// ── 9. Google Meet Link Management (Correction 4) ───────────
export async function updateBookingMeetLink(bookingId: string, meetLink: string): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_update_booking_meet_link', {
    p_booking_id: bookingId,
    p_meet_link: meetLink,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}

// ── 10. WhatsApp Scheduled Notification Batch Processor (Correction 3) ──
export async function processNotificationBatch(batchSize: number = 20): Promise<{ data: any; error: string | null }> {
  const { data, error } = await supabase.rpc('rms_process_notification_batch', {
    p_batch_size: batchSize,
  });

  if (error) return { data: null, error: error.message };
  if (data && data.success === false) return { data: null, error: data.error };
  return { data, error: null };
}


