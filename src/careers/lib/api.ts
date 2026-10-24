// ============================================================
// RMS API — typed wrappers for all Supabase calls
// ============================================================

import { supabase } from '../../lib/supabase/client';
import { sendInterviewConfirmedTemplate } from '../../services/whatsappService';
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
} from './types';

// ===== Candidate Profile =====
export async function getCandidateProfile(userId: string) {
  const { data, error } = await supabase
    .from('rms_candidate_profiles' as never)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data: data as RmsCandidateProfile | null, error };
}

export async function upsertCandidateProfile(profile: Partial<RmsCandidateProfile> & { user_id: string; mobile: string; full_name: string }) {
  const { data, error } = await supabase
    .from('rms_candidate_profiles' as never)
    .upsert({ ...profile, candidate_id: (profile as RmsCandidateProfile).candidate_id || '' }, { onConflict: 'user_id' })
    .select()
    .single();
  return { data: data as RmsCandidateProfile | null, error };
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
export async function listPublishedJobs() {
  // Run auto-status engine first so statuses reflect current time
  await supabase.rpc('rms_auto_update_job_statuses' as never, {} as never);
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .in('status', ['published', 'coming_soon', 'applications_closed', 'filled'])
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('is_featured', { ascending: false })
    .order('is_urgent',   { ascending: false })
    .order('sort_order', { ascending: false })
    .order('created_at',  { ascending: false });
  return { data: (data ?? []) as RmsJobPosting[], error };
}

export async function listAllJobs() {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .or('is_trashed.is.null,is_trashed.eq.false')
    .order('created_at', { ascending: false });
  return { data: (data ?? []) as RmsJobPosting[], error };
}

export async function listTrashedJobs() {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .eq('is_trashed', true)
    .order('trashed_at', { ascending: false });
  return { data: (data ?? []) as RmsJobPosting[], error };
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
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = src;
  const payload = {
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
  const { data: inserted, error: insErr } = await supabase
    .from('rms_job_postings' as never)
    .insert(payload as never)
    .select('*')
    .single();
  if (insErr) return { data: null, error: insErr.message };
  return { data: inserted as RmsJobPosting, error: null };
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
  return { data: (data as RmsJobPosting[])[0], error: null };
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
    .eq('slug', slug)
    .or('is_trashed.is.null,is_trashed.eq.false')
    .maybeSingle();
  return { data: data as RmsJobPosting | null, error };
}

export async function getJob(id: string) {
  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as RmsJobPosting | null, error };
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

  const { data, error } = await supabase
    .from('rms_job_postings' as never)
    .upsert(job)
    .select()
    .single();
  return { data: data as RmsJobPosting | null, error };
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
  const { data, error } = await supabase
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
}) {
  // 1. Verify job is actively accepting applications at API boundary
  const { data: job, error: jobErr } = await supabase
    .from('rms_job_postings' as never)
    .select('id, status, is_trashed')
    .eq('id', payload.job_posting_id)
    .single();

  if (jobErr || !job) {
    return { data: null, error: { message: 'Position not found', code: 'JOB_NOT_FOUND' } as never };
  }

  const jobRecord = job as { status: string; is_trashed?: boolean };
  if (jobRecord.is_trashed || jobRecord.status !== 'published') {
    return {
      data: null,
      error: {
        message: `Applications are closed for this position (status: ${jobRecord.status}).`,
        code: 'APPLICATIONS_CLOSED',
      } as never,
    };
  }

  // 2. Perform insert with sanitized columns matching rms_applications schema
  const applicationData = {
    ...(payload.application_data || {}),
    ...(payload.preferred_taluka ? { preferred_taluka: payload.preferred_taluka } : {}),
  };

  const insertRow: Record<string, unknown> = {
    candidate_id: payload.candidate_id,
    job_posting_id: payload.job_posting_id,
    application_number: '',
    status: 'draft',
    application_data: applicationData,
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
    .select(`*, job_posting:rms_job_postings(id, title), bookings:rms_interview_bookings(id, attendance_status, application:rms_applications(candidate:rms_candidate_profiles(full_name, mobile)))`)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true });
  if (filters?.job_posting_id) q = q.eq('job_posting_id', filters.job_posting_id);
  if (filters?.drive_id) q = q.eq('drive_id', filters.drive_id);
  const { data, error } = await q;
  return { data: (data ?? []) as (RmsInterviewSlot & { job_posting?: Pick<RmsJobPosting, 'id' | 'title'>; bookings?: Array<{ id: string; attendance_status: string; application?: { candidate?: { full_name: string; mobile: string } } }> })[], error };
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
  // 1. Validate payment boundary: paid jobs must be payment_successful before booking
  const { data: appData, error: appErr } = await supabase
    .from('rms_applications' as never)
    .select(`
      id, status,
      job_posting:rms_job_postings(id, title, application_fee_amount),
      candidate:rms_candidate_profiles(full_name, mobile)
    `)
    .eq('id', applicationId)
    .single();

  if (appErr || !appData) {
    return { data: null, error: { message: 'Application not found.', code: 'APP_NOT_FOUND' } as any };
  }

  const app = appData as any;
  const fee = Number(app.job_posting?.application_fee_amount ?? 0);
  if (fee > 0 && app.status !== 'payment_successful') {
    return {
      data: null,
      error: {
        message: 'This position requires payment of the application fee before booking an interview slot.',
        code: 'PAYMENT_REQUIRED',
      } as any,
    };
  }

  // 2. Perform booking
  const { data, error } = await supabase
    .from('rms_interview_bookings' as never)
    .upsert([{ application_id: applicationId, slot_id: slotId, attendance_status: 'booked' }], { onConflict: 'application_id' })
    .select(`*, slot:rms_interview_slots(*)`)
    .single();

  if (error) {
    return { data: null, error };
  }

  // 3. Update application status to interview_scheduled
  await updateApplicationStatus(applicationId, 'interview_scheduled');

  // 4. Update slot capacity / status if capacity reached
  try {
    const { count } = await supabase
      .from('rms_interview_bookings' as never)
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', slotId);

    const slotCapacity = (data as any)?.slot?.capacity ?? 1;
    if (count != null && count >= slotCapacity) {
      await supabase
        .from('rms_interview_slots' as never)
        .update({ status: 'full' } as any)
        .eq('id', slotId);
    }
  } catch (capErr) {
    console.error('[bookApplicationToSlot] Slot capacity check error:', capErr);
  }

  // 5. Dispatch Interview Confirmation WhatsApp Template
  try {
    const candidateMobile = app.candidate?.mobile;
    const candidateName = app.candidate?.full_name || 'Candidate';
    const jobTitle = app.job_posting?.title || 'Job';
    const slot = (data as any)?.slot;
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

  return { data: data as RmsInterviewBooking | null, error: null };
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

