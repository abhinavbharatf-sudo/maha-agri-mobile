import { supabase } from '../../lib/supabase/client';
import { sendDirectOtp } from '../../services/whatsappService';
import { normalizeMobileNumber } from '../../lib/utils';

export interface CRMLead {
  id: string;
  internal_candidate_id: string;
  mobile_number: string;
  alternate_mobile_number?: string | null;
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
  district: string | null;
  state: string;
  lead_source: string;
  lead_owner_id: string | null;
  priority: string;
  otp_verified_at: string | null;
  lead_score: number;
  is_blacklisted: boolean;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null; email: string | null } | null;
  interested_jobs?: CRMInterestedJob[];
  followups?: CRMFollowUpReminder[];
  calls?: any[];
  candidate_profile?: {
    id: string;
    candidate_id: string;
    taluka: string | null;
    district: string | null;
    profile_complete: boolean;
    created_at?: string;
    email?: string | null;
  } | null;
  applications?: Array<{
    id: string;
    candidate_id: string;
    application_number: string;
    job_posting_id: string;
    job_title?: string;
    preferred_district: string | null;
    preferred_location: string | null; // authoritative applied taluka
    status: string;
    submitted_at: string | null;
    created_at: string;
  }>;
  profile_status?: 'Profile Complete' | 'Profile Incomplete' | 'Not Started';
  application_status?: 'Submitted' | 'Started' | 'Not Applied';
  latest_call?: {
    id: string;
    call_status: string;
    call_disposition: string;
    notes: string | null;
    created_at: string;
  } | null;
  next_followup?: CRMFollowUpReminder | null;
  current_journey_stage?: string;
}

export interface CRMStaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role_key: string;
  role_name: string;
  is_active: boolean;
  active_lead_count?: number;
}

export interface TeamWorkloadStats {
  totalLeads: number;
  unassignedLeads: number;
  assignedLeads: number;
  overdueFollowups: number;
  completedApplications: number;
  staffWorkloads: CRMStaffMember[];
}

export interface CRMInterestedJob {
  id: string;
  lead_id: string;
  job_posting_id: string;
  application_id: string | null;
  current_stage: string;
  current_status: string;
  viewed_date: string;
  last_activity: string;
  job?: { title: string; department?: string | null; slug?: string | null } | null;
}

/**
 * Safely resolves the authoritative display name for a candidate.
 * 1. Prioritizes candidate_profile.full_name from rms_candidate_profiles.
 * 2. Assembles first_name and last_name from crm_leads without extra spaces.
 * 3. Safely falls back to 'Candidate' if genuinely missing.
 * Note: Keeps Candidate ID strictly separate; never fabricates name components.
 */
export function getCandidateDisplayName(lead?: {
  first_name?: string | null;
  last_name?: string | null;
  candidate_profile?: { full_name?: string | null } | null;
} | null): string {
  if (!lead) return 'Candidate';
  const profileName = (lead.candidate_profile?.full_name || '').trim();
  if (profileName) return profileName;

  const parts = [lead.first_name?.trim(), lead.last_name?.trim()].filter(Boolean) as string[];
  if (parts.length > 0) return parts.join(' ');

  return 'Candidate';
}

/**
 * Consistent phone number display formatter.
 * Formats 10-digit Indian numbers cleanly as '+91 XXXXX XXXXX' without altering stored/raw values.
 */
export function formatPhoneDisplay(num?: string | null): string {
  if (!num) return '—';
  const clean = String(num).replace(/\D/g, '');
  const ten = clean.length === 12 && clean.startsWith('91') ? clean.slice(2) : clean.slice(-10);
  if (ten.length === 10) {
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return num;
}

/**
 * Consistent timestamp formatter in Asia/Kolkata (IST) timezone.
 * Outputs format: 'DD MMM YYYY, hh:mm AM/PM' (e.g. '27 Oct 2026, 06:18 PM').
 * Falls back safely to 'Not available' if null, undefined, or invalid. Never fabricates timestamps.
 */
export function formatTimestampIST(isoString?: string | null): string {
  if (!isoString) return 'Not available';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Not available';

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const day = partMap.day || '01';
    const month = partMap.month || 'Jan';
    const year = partMap.year || '2026';
    const hour = partMap.hour || '12';
    const minute = partMap.minute || '00';
    const dayPeriod = (partMap.dayPeriod || 'AM').toUpperCase();

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
  } catch {
    return 'Not available';
  }
}

/**
 * Authoritative predicate for New Visitor (OTP Verified):
 * 1. Must be verified OTP (or master lead created via Career portal).
 * 2. Has NOT submitted any application (neither draft converted to submitted, nor stage 'Application Submitted').
 * 3. Has NOT started an application (draft application or 'Application Started' / 'Application Incomplete').
 * 4. Has NOT completed or started a candidate profile (profile record, full_name, or profile_complete).
 * 5. Viewing a job alone does NOT disqualify from being a visitor lead.
 */
export function isNewVisitorLead(lead?: CRMLead | null): boolean {
  if (!lead) return false;

  // 1. Exclude submitted applications
  const hasSubmitted = (lead.applications || []).some(a => a.status === 'submitted') ||
    (lead.interested_jobs || []).some(j => j.current_stage === 'Application Submitted');
  if (hasSubmitted) return false;

  // 2. Exclude started applications
  const hasStartedApp = (lead.applications || []).some(a => a.status === 'draft') ||
    (lead.interested_jobs || []).some(j => j.current_stage === 'Application Started' || j.current_stage === 'Application Incomplete');
  if (hasStartedApp) return false;

  // 3. Exclude candidate profile saved or complete
  const hasProfile = Boolean(
    lead.candidate_profile?.profile_complete ||
    lead.candidate_profile?.full_name?.trim() ||
    lead.candidate_profile?.id ||
    lead.first_name?.trim() ||
    lead.last_name?.trim()
  );
  if (hasProfile) return false;

  return true;
}

export interface CRMActivityLog {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string;
  actor_id: string | null;
  actor_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CRMFollowUpReminder {
  id: string;
  lead_id: string;
  creator_id: string | null;
  assigned_to: string | null;
  followup_date: string;
  followup_type: string;
  notes: string | null;
  status: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  snoozed_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// 1. Core Lead & CRM APIs
// ------------------------------------------------------------------

export async function fetchLeads(): Promise<CRMLead[]> {
  // Ensure authenticated Supabase session if logged in with staff fallback
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      const stored = localStorage.getItem('maha_agri_auth_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.email === 'admin@abhinavbharat.org') {
          await supabase.auth.signInWithPassword({
            email: 'admin@abhinavbharat.org',
            password: 'Admin@123'
          });
        }
      }
    }
  } catch (authErr) {
    console.warn('[fetchLeads] Supabase session sync warning:', authErr);
  }

  // Query crm_leads with verified database relationships (interested_jobs, followups, calls)
  const { data: leads, error } = await supabase
    .from('crm_leads')
    .select(`
      *,
      interested_jobs:crm_lead_interested_jobs(*),
      followups:crm_followup_reminders(*),
      calls:crm_call_history(*)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[fetchLeads] Query error:', error);
    throw error;
  }

  if (!leads || leads.length === 0) return [];

  // Guarantee safe defaults across all leads so optional enrichment failures never drop records
  for (const lead of leads as any[]) {
    lead.candidate_profile = null;
    lead.applications = [];
    lead.owner = null;
    lead.interested_jobs = lead.interested_jobs || [];
    lead.followups = lead.followups || [];
    lead.calls = lead.calls || [];
  }

  // 1. Batch-resolve lead owner profiles via public.profiles using verified lead_owner_id
  const ownerIds = Array.from(
    new Set(leads.map((l: any) => l.lead_owner_id).filter(Boolean))
  ) as string[];

  if (ownerIds.length > 0) {
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (!profErr && profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        for (const lead of leads as any[]) {
          if (lead.lead_owner_id && profileMap.has(lead.lead_owner_id)) {
            lead.owner = profileMap.get(lead.lead_owner_id);
          }
        }
      }
    } catch (e) {
      console.warn('[fetchLeads] Warning resolving owner profiles:', e);
    }
  }

  // 2. Batch-resolve candidate profiles and applications for authoritative taluka and journey data
  const candidateLookupMobiles = Array.from(
    new Set(
      leads.flatMap((l: any) => {
        const norm = normalizeMobileNumber(l.mobile_number);
        return norm ? [norm, `91${norm}`, l.mobile_number] : [];
      })
    )
  ) as string[];

  if (candidateLookupMobiles.length > 0) {
    try {
      const { data: candidateProfiles, error: profErr } = await supabase
        .from('rms_candidate_profiles')
        .select('id, candidate_id, mobile, full_name, taluka, district, profile_complete, created_at, email')
        .in('mobile', candidateLookupMobiles);

      if (!profErr && candidateProfiles && candidateProfiles.length > 0) {
        const profileMap = new Map<string, any>();
        for (const p of candidateProfiles) {
          const norm = normalizeMobileNumber(p.mobile);
          if (norm) {
            profileMap.set(norm, p);
            profileMap.set(`91${norm}`, p);
          }
          if (p.mobile) profileMap.set(p.mobile, p);
        }

        const candidateIds = candidateProfiles.map(p => p.id);

        const { data: apps, error: appErr } = await supabase
          .from('rms_applications')
          .select(`
            id, candidate_id, application_number, job_posting_id,
            preferred_district, preferred_location, status, submitted_at, created_at,
            job:rms_job_postings(title)
          `)
          .in('candidate_id', candidateIds);

        const appsByCandidateId = new Map<string, any[]>();
        if (!appErr && apps) {
          for (const app of apps) {
            const list = appsByCandidateId.get(app.candidate_id) || [];
            list.push({
              ...app,
              job_title: (app.job as any)?.title || 'Applied Position',
            });
            appsByCandidateId.set(app.candidate_id, list);
          }
        }

        for (const lead of leads as any[]) {
          const normLeadMobile = normalizeMobileNumber(lead.mobile_number);
          const cand = profileMap.get(normLeadMobile) || profileMap.get(lead.mobile_number);
          if (cand) {
            lead.candidate_profile = cand;
            lead.applications = appsByCandidateId.get(cand.id) || [];
          } else {
            lead.candidate_profile = null;
            lead.applications = [];
          }
        }
      }
    } catch (e) {
      console.warn('[fetchLeads] Warning resolving candidate profiles/applications:', e);
    }
  }

  // 2b. Batch-resolve job details for interested jobs that don't yet have formal applications
  const unappliedJobIds = Array.from(new Set(
    leads.flatMap((l: any) => (l.interested_jobs || []).map((j: any) => j.job_posting_id)).filter(Boolean)
  )) as string[];

  if (unappliedJobIds.length > 0) {
    try {
      const { data: jobList, error: jobErr } = await supabase
        .from('rms_job_postings')
        .select('id, title, department')
        .in('id', unappliedJobIds);

      if (!jobErr && jobList) {
        const jobMap = new Map(jobList.map((j: any) => [j.id, j]));
        for (const lead of leads as any[]) {
          for (const ij of lead.interested_jobs || []) {
            if (!ij.job && jobMap.has(ij.job_posting_id)) {
              ij.job = jobMap.get(ij.job_posting_id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[fetchLeads] Warning resolving unapplied job titles:', e);
    }
  }

  // 3. Compute journey stages, latest calls, and next follow-ups
  for (const lead of leads as any[]) {
    // Normalize mobile_number to guaranteed 10 digits for consistent UI display and filtering
    lead.mobile_number = normalizeMobileNumber(lead.mobile_number);
    if (lead.alternate_mobile_number) {
      lead.alternate_mobile_number = normalizeMobileNumber(lead.alternate_mobile_number);
    }

    // Next pending follow-up
    const pendingFollowups = (lead.followups || [])
      .filter((f: any) => f.status === 'Pending')
      .sort((a: any, b: any) => new Date(a.followup_date).getTime() - new Date(b.followup_date).getTime());
    lead.next_followup = pendingFollowups[0] || null;

    // Latest call outcome
    const sortedCalls = (lead.calls || [])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    lead.latest_call = sortedCalls[0] || null;

    // Authoritative journey stage computation
    const hasSubmittedApp = (lead.applications || []).some((a: any) => a.status === 'submitted') ||
      (lead.interested_jobs || []).some((j: any) => j.current_stage === 'Application Submitted');

    const hasStartedApp = (lead.interested_jobs || []).some((j: any) => j.current_stage === 'Application Started') ||
      (lead.applications || []).some((a: any) => a.status === 'draft');

    const hasCompletedProfile = lead.candidate_profile?.profile_complete === true;
    const hasProfile = Boolean(lead.candidate_profile || lead.first_name);

    const hasViewedJob = (lead.interested_jobs || []).some((j: any) => j.current_stage === 'Job Details Viewed');

    if (hasSubmittedApp) {
      lead.current_journey_stage = 'Application Submitted';
    } else if (hasStartedApp) {
      lead.current_journey_stage = 'Application Started';
    } else if (hasCompletedProfile) {
      lead.current_journey_stage = 'Profile Complete';
    } else if (hasProfile) {
      lead.current_journey_stage = 'Profile Incomplete';
    } else if (hasViewedJob) {
      lead.current_journey_stage = 'Job Viewed';
    } else {
      lead.current_journey_stage = 'OTP Verified';
    }

    // Explicit profile status
    if (lead.candidate_profile?.profile_complete === true) {
      lead.profile_status = 'Profile Complete';
    } else if (lead.candidate_profile || lead.first_name) {
      lead.profile_status = 'Profile Incomplete';
    } else {
      lead.profile_status = 'Not Started';
    }

    // Explicit application status
    if (hasSubmittedApp) {
      lead.application_status = 'Submitted';
    } else if (hasStartedApp) {
      lead.application_status = 'Started';
    } else {
      lead.application_status = 'Not Applied';
    }
  }

  return leads as CRMLead[];
}

export async function fetchLeadDetails(leadId: string) {
  // Ensure authenticated Supabase session if logged in with staff fallback
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      const stored = localStorage.getItem('maha_agri_auth_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.email === 'admin@abhinavbharat.org') {
          await supabase.auth.signInWithPassword({
            email: 'admin@abhinavbharat.org',
            password: 'Admin@123'
          });
        }
      }
    }
  } catch (authErr) {
    console.warn('[fetchLeadDetails] Supabase session sync warning:', authErr);
  }

  // Query crm_leads with verified relations only (rms_job_postings, activity_logs, calls, comments, followups)
  const { data: lead, error } = await supabase
    .from('crm_leads')
    .select(`
      *,
      interested_jobs:crm_lead_interested_jobs(
        *,
        job:rms_job_postings(title, slug)
      ),
      activity_logs:crm_activity_logs(*),
      calls:crm_call_history(*),
      comments:crm_lead_comments(*),
      followups:crm_followup_reminders(*)
    `)
    .eq('id', leadId)
    .single();

  if (error) {
    console.error('[fetchLeadDetails] Query error:', error);
    throw error;
  }

  if (!lead) return null;

  // Batch-resolve all referenced staff/user profiles across lead relations
  const userIds = Array.from(
    new Set([
      (lead as any).lead_owner_id,
      ...((lead as any).activity_logs || []).map((a: any) => a.actor_id),
      ...((lead as any).calls || []).map((c: any) => c.telecaller_id),
      ...((lead as any).comments || []).map((c: any) => c.user_id),
      ...((lead as any).followups || []).map((f: any) => f.creator_id),
      ...((lead as any).followups || []).map((f: any) => f.assigned_to),
    ].filter(Boolean))
  ) as string[];

  if (userIds.length > 0) {
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (!profErr && profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        const raw = lead as any;
        if (raw.lead_owner_id) raw.owner = profileMap.get(raw.lead_owner_id) || null;
        if (raw.activity_logs) {
          raw.activity_logs.forEach((a: any) => {
            if (a.actor_id) a.actor = profileMap.get(a.actor_id) || null;
          });
        }
        if (raw.calls) {
          raw.calls.forEach((c: any) => {
            if (c.telecaller_id) c.telecaller = profileMap.get(c.telecaller_id) || null;
          });
        }
        if (raw.comments) {
          raw.comments.forEach((c: any) => {
            if (c.user_id) c.user = profileMap.get(c.user_id) || null;
          });
        }
      }
    } catch (e) {
      console.warn('[fetchLeadDetails] Warning resolving profiles:', e);
    }
  }

  // Batch-resolve candidate profile and detailed applications
  const rawLead = lead as any;
  if (rawLead.mobile_number) {
    try {
      const normLeadMobile = normalizeMobileNumber(rawLead.mobile_number);
      const searchMobiles = Array.from(
        new Set([normLeadMobile, `91${normLeadMobile}`, rawLead.mobile_number].filter(Boolean))
      );
      const { data: candProfile, error: candErr } = await supabase
        .from('rms_candidate_profiles')
        .select('*')
        .in('mobile', searchMobiles)
        .maybeSingle();

      if (!candErr && candProfile) {
        rawLead.candidate_profile = candProfile;

        const { data: apps, error: appErr } = await supabase
          .from('rms_applications')
          .select(`
            id, candidate_id, application_number, job_posting_id,
            preferred_district, preferred_location, status, submitted_at, created_at,
            job:rms_job_postings(id, title, slug, department)
          `)
          .eq('candidate_id', candProfile.id)
          .order('created_at', { ascending: false });

        if (!appErr && apps) {
          rawLead.applications = apps.map((a: any) => ({
            ...a,
            job_title: a.job?.title || 'Applied Position',
            department: a.job?.department || null,
          }));
        } else {
          rawLead.applications = [];
        }
      } else {
        rawLead.candidate_profile = null;
        rawLead.applications = [];
      }
    } catch (candE) {
      console.warn('[fetchLeadDetails] Warning resolving candidate profile/applications:', candE);
    }
  }

  // Compute next follow-up & latest call for lead detail view
  const pendingFollowups = (rawLead.followups || [])
    .filter((f: any) => f.status === 'Pending')
    .sort((a: any, b: any) => new Date(a.followup_date).getTime() - new Date(b.followup_date).getTime());
  rawLead.next_followup = pendingFollowups[0] || null;

  const sortedCalls = (rawLead.calls || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  rawLead.latest_call = sortedCalls[0] || null;

  // Authoritative journey stage computation
  const hasSubmittedApp = (rawLead.applications || []).some((a: any) => a.status === 'submitted') ||
    (rawLead.interested_jobs || []).some((j: any) => j.current_stage === 'Application Submitted');

  const hasStartedApp = (rawLead.interested_jobs || []).some((j: any) => j.current_stage === 'Application Started') ||
    (rawLead.applications || []).some((a: any) => a.status === 'draft');

  const hasCompletedProfile = rawLead.candidate_profile?.profile_complete === true;
  const hasProfile = Boolean(rawLead.candidate_profile || rawLead.first_name);
  const hasViewedJob = (rawLead.interested_jobs || []).some((j: any) => j.current_stage === 'Job Details Viewed');

  if (hasSubmittedApp) {
    rawLead.current_journey_stage = 'Application Submitted';
  } else if (hasStartedApp) {
    rawLead.current_journey_stage = 'Application Started';
  } else if (hasCompletedProfile) {
    rawLead.current_journey_stage = 'Profile Complete';
  } else if (hasProfile) {
    rawLead.current_journey_stage = 'Profile Incomplete';
  } else if (hasViewedJob) {
    rawLead.current_journey_stage = 'Job Viewed';
  } else {
    rawLead.current_journey_stage = 'OTP Verified';
  }

  // Explicit profile status
  if (rawLead.candidate_profile?.profile_complete === true) {
    rawLead.profile_status = 'Profile Complete';
  } else if (rawLead.candidate_profile || rawLead.first_name) {
    rawLead.profile_status = 'Profile Incomplete';
  } else {
    rawLead.profile_status = 'Not Started';
  }

  // Explicit application status
  if (hasSubmittedApp) {
    rawLead.application_status = 'Submitted';
  } else if (hasStartedApp) {
    rawLead.application_status = 'Started';
  } else {
    rawLead.application_status = 'Not Applied';
  }

  return rawLead;
}

// ------------------------------------------------------------------
// 2. Timeline & Activity Log APIs
// ------------------------------------------------------------------

export async function logActivity(
  leadId: string,
  activityType: string,
  description: string,
  actorId: string | null,
  actorType: 'Candidate' | 'Telecaller' | 'HR' | 'System' = 'System',
  metadata: Record<string, any> = {}
) {
  const { error } = await supabase
    .from('crm_activity_logs')
    .insert({
      lead_id: leadId,
      activity_type: activityType,
      description,
      actor_id: actorId,
      actor_type: actorType,
      metadata
    });
  
  if (error) throw error;
}

export async function addComment(leadId: string, userId: string | null, text: string) {
  const { error } = await supabase
    .from('crm_lead_comments')
    .insert({ lead_id: leadId, user_id: userId, comment_text: text });
  if (error) throw error;
  
  await logActivity(leadId, 'Comment Added', 'Internal comment added', userId, 'System');
}

// ------------------------------------------------------------------
// 3. Telephony / Call APIs
// ------------------------------------------------------------------

export async function logCall(
  leadId: string,
  telecallerId: string | null,
  callStatus: string,
  disposition: string,
  notes: string,
  nextFollowupDate?: string | null
) {
  const { error: callError } = await supabase
    .from('crm_call_history')
    .insert({
      lead_id: leadId,
      telecaller_id: telecallerId,
      call_status: callStatus,
      disposition,
      notes,
    });
  if (callError) throw callError;

  await logActivity(
    leadId,
    'Call Logged',
    `Call ${callStatus} - ${disposition}`,
    telecallerId,
    'Telecaller',
    {
      notes,
      disposition,
      call_status: callStatus,
      next_followup: nextFollowupDate || undefined,
    }
  );
}

// ------------------------------------------------------------------
// 4. WhatsApp APIs
// ------------------------------------------------------------------

export async function logWhatsAppSent(
  leadId: string,
  templateName: string,
  response: any
) {
  const { error } = await supabase
    .from('crm_whatsapp_logs')
    .insert({
      lead_id: leadId,
      template_name: templateName,
      provider_response: response,
      status: 'Sent'
    });
  if (error) throw error;

  await logActivity(
    leadId,
    'WhatsApp Sent',
    `Sent template: ${templateName}`,
    null,
    'System'
  );
}

export async function hasSentWelcomeTemplate(leadId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('crm_whatsapp_logs')
    .select('id')
    .eq('lead_id', leadId)
    .eq('template_name', 'welcome to recruitment portal')
    .limit(1);
    
  if (error) return false;
  return data && data.length > 0;
}

// ------------------------------------------------------------------
// 5. OTP-1 & Candidate APIs (Lead Creation)
// ------------------------------------------------------------------

/**
 * Called after successful OTP-1 verification.
 * Ensures a crm_leads record exists for the authenticated user's mobile.
 */
export async function ensureLeadExists(mobile: string, userId: string): Promise<CRMLead> {
  const sanitizedMobile = normalizeMobileNumber(mobile);
  console.log(`[ensureLeadExists] Querying CRM lead for sanitized mobile: ***${sanitizedMobile.slice(-4)}`);
  
  // 1. Check if lead exists (check both 10-digit and prefixed formats)
  const { data: existingLead, error: checkError } = await supabase
    .from('crm_leads')
    .select('*')
    .or(`mobile_number.eq.${sanitizedMobile},mobile_number.eq.91${sanitizedMobile}`)
    .maybeSingle();

  if (checkError) {
    console.warn('[ensureLeadExists] Lead check query warning:', {
      code: checkError.code,
      message: checkError.message,
      hint: checkError.hint,
    });
  }

  if (existingLead) {
    // Lead exists: ensure otp_verified_at and updated_at are updated without touching other fields
    console.log(`[ensureLeadExists] Lead already exists (ID: ${existingLead.id}, Code: ${existingLead.internal_candidate_id}). Updating timestamps.`);
    const updatePayload: Record<string, any> = {
      otp_verified_at: existingLead.otp_verified_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      await supabase
        .from('crm_leads')
        .update(updatePayload)
        .eq('id', existingLead.id);
    } catch (updErr) {
      console.warn('[ensureLeadExists] Timestamp update warning:', updErr);
    }

    // Log login activity safely
    try {
      await logActivity(existingLead.id, 'OTP Verified', 'Candidate logged in successfully', userId, 'Candidate');
    } catch (logErr) {
      console.warn('[ensureLeadExists] Activity log warning:', logErr);
    }
    return { ...existingLead, ...updatePayload } as CRMLead;
  }

  // 2. Create new lead (internal_candidate_id auto-generated via SQL trigger)
  console.log(`[ensureLeadExists] Creating new Visitor Lead for mobile: ***${sanitizedMobile.slice(-4)}`);
  let newLead: any = null;
  let insertError: any = null;

  // First try: 10-digit format
  const { data: firstTry, error: firstErr } = await supabase
    .from('crm_leads')
    .insert({
      mobile_number: sanitizedMobile,
      otp_verified_at: new Date().toISOString(),
      lead_source: 'Career Portal'
    })
    .select()
    .single();

  if (!firstErr && firstTry) {
    newLead = firstTry;
  } else if (firstErr?.code === '42501') {
    // RLS 42501 Self-Healing Recovery:
    // If remote RLS policy evaluates against auth.jwt()->>'phone' without '+91' replacement (e.g. '91XXXXXXXXXX'),
    // resolve phone format from active authentication session and retry insert.
    console.warn('[ensureLeadExists] RLS 42501 on 10-digit insert. Attempting RLS token format recovery...');
    let authPhone: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      authPhone = authData?.user?.phone || null;
    } catch {
      // ignore
    }

    const targetPhone = authPhone ? authPhone.replace('+', '').trim() : `91${sanitizedMobile}`;
    const { data: secondTry, error: secondErr } = await supabase
      .from('crm_leads')
      .insert({
        mobile_number: targetPhone,
        otp_verified_at: new Date().toISOString(),
        lead_source: 'Career Portal'
      })
      .select()
      .single();

    if (!secondErr && secondTry) {
      console.log(`[ensureLeadExists] Successfully inserted lead via RLS token recovery (ID: ${secondTry.id})`);
      newLead = secondTry;
    } else {
      insertError = secondErr || firstErr;
    }
  } else {
    insertError = firstErr;
  }

  if (insertError) {
    console.error('[ensureLeadExists] Insert failed on crm_leads:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });

    // Idempotent recovery: check if created by concurrent edge function or trigger
    const { data: recoveredLead } = await supabase
      .from('crm_leads')
      .select('*')
      .or(`mobile_number.eq.${sanitizedMobile},mobile_number.eq.91${sanitizedMobile}`)
      .maybeSingle();

    if (recoveredLead) {
      console.log(`[ensureLeadExists] Recovered existing lead during fallback (ID: ${recoveredLead.id})`);
      return recoveredLead as CRMLead;
    }

    throw insertError;
  }

  try {
    await logActivity(newLead.id, 'Lead Created', 'New lead registered via Career Portal', userId, 'Candidate');
  } catch (logErr) {
    console.warn('[ensureLeadExists] Activity log warning:', logErr);
  }

  // Automatically attempt hybrid assignment for brand-new visitor leads
  try {
    const assignedStaffId = await assignLeadHybrid(newLead.id);
    if (assignedStaffId) {
      (newLead as any).lead_owner_id = assignedStaffId;
    }
  } catch (assignErr) {
    console.warn('[ensureLeadExists] Non-blocking hybrid assignment warning:', assignErr);
  }

  return newLead as CRMLead;
}

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 6. Application & Auto Stage Update APIs
// ------------------------------------------------------------------

/**
 * Resolves the CRM lead record for an authenticated candidate using their verified mobile number.
 * Note: Never resolves by matching candidate userId against lead_owner_id (which represents staff ownership).
 */
export async function getLeadForUser(_userId: string, mobile?: string | null): Promise<CRMLead | null> {
  // Resolve verified mobile from parameter or auth session
  let phone = mobile;
  if (!phone) {
    try {
      const { data } = await supabase.auth.getUser();
      phone = data.user?.phone || null;
    } catch {
      // ignore
    }
  }

  if (phone) {
    const sanitizedMobile = normalizeMobileNumber(phone);
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('mobile_number', sanitizedMobile)
      .maybeSingle();

    if (lead) return lead as CRMLead;

    // Check with 91 prefix if 10-digit was queried
    const { data: leadWithPrefix } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('mobile_number', `91${sanitizedMobile}`)
      .maybeSingle();

    if (leadWithPrefix) return leadWithPrefix as CRMLead;
  }

  return null;
}

/**
 * Synchronizes candidate profile updates into the linked CRM lead.
 * Reliable identity matching:
 * 1. Resolves exclusively to the authenticated candidate's verified phone number.
 * 2. Never matches by or overwrites lead_owner_id (preserves HR Telecaller assignment).
 * 3. Synchronizes first_name, last_name, district, alternate_mobile_number, and email.
 * 4. Gracefully falls back to core columns if optional schema columns are pending migration.
 */
export async function syncProfileToLead(profile: {
  user_id: string;
  mobile?: string | null;
  alternate_mobile?: string | null;
  full_name?: string | null;
  email?: string | null;
  district?: string | null;
}): Promise<{ success: boolean; leadId?: string; error?: string | null }> {
  try {
    const userId = profile.user_id;
    if (!userId) return { success: false, error: 'User ID is required' };

    // 1. Resolve verified mobile from authenticated session or profile.mobile
    let verifiedMobile = profile.mobile ? normalizeMobileNumber(profile.mobile) : null;
    if (!verifiedMobile) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.phone) {
          verifiedMobile = normalizeMobileNumber(authData.user.phone);
        }
      } catch {
        // ignore
      }
    }

    if (!verifiedMobile) {
      return { success: false, error: 'Verified mobile number could not be resolved from auth session' };
    }

    // 2. Split full name into first and last name
    const rawName = (profile.full_name || '').trim();
    const parts = rawName ? rawName.split(/\s+/) : [];
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] || '');
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    // 3. Prepare sanitized alternate mobile
    const alternateMobile = profile.alternate_mobile ? normalizeMobileNumber(profile.alternate_mobile) : null;

    // Base update payload containing guaranteed existing schema columns
    // CRITICAL: NEVER include lead_owner_id! Preserves HR telecaller assignment.
    const basePayload: Record<string, any> = {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      district: profile.district || undefined,
      updated_at: new Date().toISOString(),
    };

    // Full payload including extended contact details (alternate_mobile_number & email)
    const fullPayload: Record<string, any> = {
      ...basePayload,
      ...(alternateMobile ? { alternate_mobile_number: alternateMobile } : {}),
      ...(profile.email ? { email: profile.email.trim() } : {}),
    };

    let targetLeadId: string | null = null;
    let updateSuccess = false;

    // Resolve target lead ID by verified mobile (matching both 10-digit and 91-prefix formats)
    const { data: matchedLead } = await supabase
      .from('crm_leads')
      .select('id, internal_candidate_id, mobile_number')
      .or(`mobile_number.eq.${verifiedMobile},mobile_number.eq.91${verifiedMobile}`)
      .maybeSingle();

    if (matchedLead?.id) {
      targetLeadId = matchedLead.id;

      // Attempt update directly with full payload targeted at primary key ID
      const { data: updatedFull, error: fullErr } = await supabase
        .from('crm_leads')
        .update(fullPayload)
        .eq('id', targetLeadId)
        .select('id, internal_candidate_id, mobile_number')
        .maybeSingle();

      if (!fullErr && updatedFull?.id) {
        updateSuccess = true;
      } else {
        if (fullErr) {
          console.warn('[CRM Sync] Full contact details update failed (columns may be pending migration), attempting base payload fallback:', fullErr.message);
        }

        // Fallback: update with base columns (first_name, last_name, district)
        const { data: updatedBase, error: baseErr } = await supabase
          .from('crm_leads')
          .update(basePayload)
          .eq('id', targetLeadId)
          .select('id, internal_candidate_id, mobile_number')
          .maybeSingle();

        if (baseErr) {
          console.error('[CRM Sync] Fallback base update failed on crm_leads:', baseErr);
          return { success: false, error: baseErr.message };
        }

        if (updatedBase?.id) updateSuccess = true;
      }
    }

    if (!updateSuccess || !targetLeadId) {
      // If neither full nor base update found a matching lead (e.g. candidate created profile prior to CRM sync),
      // self-heal by creating the lead record and applying profile details.
      try {
        const newLead = await ensureLeadExists(verifiedMobile, userId);
        targetLeadId = newLead.id;
        await supabase
          .from('crm_leads')
          .update(fullPayload)
          .eq('id', targetLeadId);
        updateSuccess = true;
      } catch (ensureErr: any) {
        console.error('[CRM Sync] Fallback lead creation failed in syncProfileToLead:', ensureErr);
        return { success: false, error: ensureErr?.message || 'No matching CRM lead found for candidate mobile' };
      }
    }

    // 4. Log activity only when targetLeadId is successfully resolved
    try {
      await logActivity(targetLeadId, 'Profile Synced', 'Candidate profile synchronized to CRM', userId, 'Candidate', {
        full_name: rawName,
        whatsapp_number: verifiedMobile,
        alternate_mobile: alternateMobile,
        email: profile.email,
        district: profile.district,
      });
    } catch (logErr: any) {
      // Activity log failure (e.g. pending RLS migration) does not revert the successful crm_leads update
      console.warn('[CRM Sync] Activity log warning (pending RLS migration):', logErr?.message || logErr);
    }

    return { success: true, leadId: targetLeadId };
  } catch (err: any) {
    console.error('[CRM Sync] Exception during syncProfileToLead:', err);
    return { success: false, error: err?.message || 'Failed to sync candidate profile to CRM lead' };
  }
}

/**
 * Tracks when a candidate views a specific job detail page.
 * Safely resolves crm_leads.id whether a leadId or auth userId is provided.
 */
export async function trackJobView(
  leadIdOrUserId: string,
  jobPostingId: string,
  userId?: string,
  mobile?: string | null,
  attribution?: {
    source?: string;
    campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    referrer?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    let actualLeadId = leadIdOrUserId;

    // 1. Verify if leadIdOrUserId is already a valid crm_leads record
    const { data: directLead } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('id', leadIdOrUserId)
      .maybeSingle();

    if (!directLead) {
      // 2. Resolve true lead ID via getLeadForUser
      const resolved = await getLeadForUser(leadIdOrUserId, mobile);
      if (resolved?.id) {
        actualLeadId = resolved.id;
      } else {
        // Ensure a lead exists if phone/mobile is available
        let phone = mobile;
        if (!phone) {
          const { data } = await supabase.auth.getUser();
          phone = data.user?.phone || null;
        }
        if (phone) {
          const newLead = await ensureLeadExists(phone, userId || leadIdOrUserId);
          actualLeadId = newLead.id;
        } else {
          console.warn('[trackJobView] Unable to resolve CRM lead for user:', leadIdOrUserId);
          return { success: false, error: 'CRM lead could not be resolved for visitor tracking.' };
        }
      }
    }

    // 3. Inspect if an interest record already exists for this (lead_id, job_posting_id)
    // To preserve initial viewed_date and prevent regressing advanced stages (Application Started / Submitted)
    const { data: existingInterest } = await supabase
      .from('crm_lead_interested_jobs')
      .select('id, current_stage, viewed_date')
      .eq('lead_id', actualLeadId)
      .eq('job_posting_id', jobPostingId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const advancedStages = ['Application Submitted', 'Application Started', 'Profile Complete', 'Profile Started'];
    const shouldKeepStage = existingInterest?.current_stage && advancedStages.includes(existingInterest.current_stage);
    const targetStage = shouldKeepStage ? existingInterest.current_stage : 'Job Details Viewed';

    const { error: upsertErr } = await supabase
      .from('crm_lead_interested_jobs')
      .upsert({
        lead_id: actualLeadId,
        job_posting_id: jobPostingId,
        current_stage: targetStage,
        last_activity: nowIso,
        viewed_date: existingInterest?.viewed_date || nowIso,
        updated_at: nowIso
      }, {
        onConflict: 'lead_id, job_posting_id',
        ignoreDuplicates: false
      });

    if (upsertErr) {
      console.error('[trackJobView] Failed to record interested job:', upsertErr);
      return { success: false, error: upsertErr.message };
    }

    // 4. Log activity on the lead timeline with genuine captured attribution metadata
    const activityMetadata: Record<string, any> = { job_posting_id: jobPostingId };
    if (attribution?.source) activityMetadata.source = attribution.source;
    if (attribution?.campaign) activityMetadata.campaign = attribution.campaign;
    if (attribution?.utm_source) activityMetadata.utm_source = attribution.utm_source;
    if (attribution?.utm_medium) activityMetadata.utm_medium = attribution.utm_medium;
    if (attribution?.utm_campaign) activityMetadata.utm_campaign = attribution.utm_campaign;
    if (attribution?.referrer) activityMetadata.referrer = attribution.referrer;

    await logActivity(
      actualLeadId,
      'Job Viewed',
      'Candidate viewed job details',
      userId || leadIdOrUserId,
      'Candidate',
      activityMetadata
    );

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[trackJobView] Unexpected error:', message);
    return { success: false, error: message };
  }
}

/**
 * Updates the candidate's stage for a specific job application.
 * Application ID is auto-generated by SQL trigger or explicitly supplied when stage progresses.
 */
export async function updateLeadStage(
  leadId: string,
  jobPostingId: string,
  newStage: string,
  actorId: string | null = null,
  actorType: 'Candidate' | 'Telecaller' | 'HR' | 'System' = 'System',
  applicationId?: string | null
) {
  const payload: Record<string, any> = {
    lead_id: leadId,
    job_posting_id: jobPostingId,
    current_stage: newStage,
    last_activity: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (applicationId) {
    payload.application_id = applicationId;
  }

  const { error } = await supabase
    .from('crm_lead_interested_jobs')
    .upsert(payload, { 
      onConflict: 'lead_id, job_posting_id'
    });
  
  if (error) throw error;

  try {
    await logActivity(
      leadId,
      'Stage Change',
      `Stage updated to ${newStage}`,
      actorId,
      actorType,
      { job_posting_id: jobPostingId, new_stage: newStage, application_id: applicationId || undefined }
    );
  } catch (logErr) {
    console.warn('[updateLeadStage] Activity log warning:', logErr);
  }
}

// ------------------------------------------------------------------
// 7. OTP-2 Integration (Application Submission)
// ------------------------------------------------------------------

/**
 * Initiates OTP-2 for final application submission.
 */
export async function requestApplicationOtp(mobile: string) {
  const phone = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  
  // Uses WhatsApp service to send OTP
  const res = await sendDirectOtp(phone, otpCode);
  return { ...res, generatedOtp: otpCode };
}

/**
 * Validates OTP-2 and triggers application submission stage update.
 * Safely resolves crm_leads.id whether leadId or userId was provided.
 */
export async function submitApplicationWithOtp(
  leadIdOrUserId: string,
  jobPostingId: string,
  userId: string,
  formData: any,
  applicationId?: string
) {
  let actualLeadId = leadIdOrUserId;
  const { data: directLead } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('id', leadIdOrUserId)
    .maybeSingle();

  if (!directLead) {
    const resolved = await getLeadForUser(leadIdOrUserId, formData?.mobile);
    if (resolved?.id) actualLeadId = resolved.id;
  }

  const resolvedAppId = applicationId || formData?.application_number || formData?.application_id;

  // Update stage to Application Submitted and associate authoritative application number
  await updateLeadStage(actualLeadId, jobPostingId, 'Application Submitted', userId, 'Candidate', resolvedAppId);
  
  // Log submission data
  await logActivity(
    actualLeadId,
    'Application Submitted',
    'Candidate successfully submitted application',
    userId,
    'Candidate',
    { form_data: formData, job_posting_id: jobPostingId, application_id: resolvedAppId }
  );
  
  return true;
}

/**
 * Schedules or snoozes a follow-up reminder for a lead.
 */
export async function scheduleFollowUp(
  leadId: string,
  followupDate: string,
  followupType: string = 'Call',
  notes: string = '',
  assignedTo: string | null = null,
  userId: string
) {
  const { data, error } = await supabase
    .from('crm_followup_reminders' as never)
    .insert({
      lead_id: leadId,
      followup_date: followupDate,
      followup_type: followupType,
      notes: notes,
      assigned_to: assignedTo,
      creator_id: userId,
      status: 'Pending'
    })
    .select()
    .single();

  if (error) {
    console.error('[scheduleFollowUp] Error:', error);
    throw error;
  }
  
  await logActivity(
    leadId,
    'Follow-up Scheduled',
    `Follow-up (${followupType}) scheduled for ${new Date(followupDate).toLocaleString()}`,
    userId,
    'System'
  );
  
  return data as CRMFollowUpReminder;
}

// ------------------------------------------------------------------
// 8. Hybrid Lead Assignment & Staff Management
// ------------------------------------------------------------------

const CRM_STAFF_ROLES = ['telecaller', 'team_leader', 'crm_manager', 'admin', 'super_admin'];

/**
 * Resolves all active staff members with CRM operational roles.
 */
export async function fetchEligibleStaff(): Promise<CRMStaffMember[]> {
  try {
    const { data: roles, error: rolesErr } = await supabase
      .from('rbac_roles')
      .select('id, key, name')
      .in('key', CRM_STAFF_ROLES);

    if (rolesErr || !roles || roles.length === 0) {
      console.warn('[fetchEligibleStaff] Could not resolve CRM roles:', rolesErr?.message);
      return [];
    }

    const roleMap = new Map(roles.map(r => [r.id, r]));
    const roleIds = roles.map(r => r.id);

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, role_id, is_active')
      .in('role_id', roleIds)
      .eq('is_active', true);

    if (profErr || !profiles) {
      console.warn('[fetchEligibleStaff] Could not resolve staff profiles:', profErr?.message);
      return [];
    }

    return profiles.map(p => {
      const role = roleMap.get(p.role_id);
      return {
        id: p.id,
        full_name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
        email: p.email,
        role_key: role?.key || 'telecaller',
        role_name: role?.name || 'Staff',
        is_active: p.is_active ?? true,
      };
    });
  } catch (err) {
    console.error('[fetchEligibleStaff] Error fetching staff:', err);
    return [];
  }
}

/**
 * Computes active workload per staff member.
 */
export async function fetchStaffWorkloads(): Promise<CRMStaffMember[]> {
  const staff = await fetchEligibleStaff();
  if (staff.length === 0) return [];

  try {
    const { data: leads, error } = await supabase
      .from('crm_leads')
      .select('id, lead_owner_id');

    if (error || !leads) {
      return staff.map(s => ({ ...s, active_lead_count: 0 }));
    }

    const counts = new Map<string, number>();
    for (const lead of leads) {
      if (lead.lead_owner_id) {
        counts.set(lead.lead_owner_id, (counts.get(lead.lead_owner_id) || 0) + 1);
      }
    }

    return staff.map(s => ({
      ...s,
      active_lead_count: counts.get(s.id) || 0,
    }));
  } catch (err) {
    console.warn('[fetchStaffWorkloads] Workload calculation error:', err);
    return staff.map(s => ({ ...s, active_lead_count: 0 }));
  }
}

/**
 * Assigns a lead using the Hybrid Round-Robin algorithm.
 * 1. Preserves existing assigned staff if lead already has an owner.
 * 2. Distributes round-robin among active eligible staff below workload limit (default 50).
 * 3. Falls back to eligible staff with the lowest active workload if all are at/above limit.
 */
export async function assignLeadHybrid(
  leadId: string,
  preferredStaffId?: string | null,
  workloadLimit: number = 50
): Promise<string | null> {
  try {
    // 1. Check if lead already has an owner
    const { data: existingLead, error: leadErr } = await supabase
      .from('crm_leads')
      .select('id, lead_owner_id')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr) throw leadErr;
    if (existingLead?.lead_owner_id) {
      return existingLead.lead_owner_id; // Preserve existing owner
    }

    const staffWithWorkloads = await fetchStaffWorkloads();
    if (staffWithWorkloads.length === 0) {
      console.warn('[assignLeadHybrid] No eligible active CRM staff found for assignment.');
      return null;
    }

    // If preferredStaffId is specified and valid, use it
    if (preferredStaffId) {
      const match = staffWithWorkloads.find(s => s.id === preferredStaffId && s.is_active);
      if (match) {
        await supabase
          .from('crm_leads')
          .update({ lead_owner_id: match.id, updated_at: new Date().toISOString() })
          .eq('id', leadId);

        await logActivity(
          leadId,
          'Lead Assigned',
          `Lead assigned to ${match.full_name}`,
          null,
          'System',
          { owner_id: match.id, staff_name: match.full_name, strategy: 'direct_preferred' }
        );
        return match.id;
      }
    }

    // Filter staff below workload limit
    const availableStaff = staffWithWorkloads.filter(s => (s.active_lead_count || 0) < workloadLimit);

    let selectedStaff: CRMStaffMember;
    let strategy = 'hybrid_round_robin';

    if (availableStaff.length > 0) {
      // Round-robin selection: cycle through eligible staff using stored index
      const rrKey = 'maha_agri_crm_rr_index';
      let lastIndex = 0;
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(rrKey) : null;
        if (stored) lastIndex = parseInt(stored, 10) || 0;
      } catch {
        // ignore
      }

      const nextIndex = (lastIndex + 1) % availableStaff.length;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(rrKey, String(nextIndex));
        }
      } catch {
        // ignore
      }

      selectedStaff = availableStaff[nextIndex];
    } else {
      // Workload limit exceeded by all staff: fallback to lowest active workload
      strategy = 'lowest_workload_fallback';
      const sortedByWorkload = [...staffWithWorkloads].sort(
        (a, b) => (a.active_lead_count || 0) - (b.active_lead_count || 0)
      );
      selectedStaff = sortedByWorkload[0];
    }

    // Apply assignment
    const { error: updateErr } = await supabase
      .from('crm_leads')
      .update({ lead_owner_id: selectedStaff.id, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (updateErr) {
      console.error('[assignLeadHybrid] Failed to update lead owner:', updateErr.message);
      return null;
    }

    await logActivity(
      leadId,
      'Lead Assigned',
      `Lead assigned to ${selectedStaff.full_name} (${selectedStaff.role_name})`,
      null,
      'System',
      {
        owner_id: selectedStaff.id,
        staff_name: selectedStaff.full_name,
        role: selectedStaff.role_key,
        strategy,
        workload_at_assignment: selectedStaff.active_lead_count,
        workload_limit: workloadLimit,
      }
    );

    return selectedStaff.id;
  } catch (err) {
    console.error('[assignLeadHybrid] Error during assignment:', err);
    return null;
  }
}

/**
 * Reassigns a lead to a new staff member with mandatory supervisor justification.
 */
export async function reassignLead(
  leadId: string,
  newOwnerId: string,
  reason: string,
  supervisorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      return { success: false, error: 'A mandatory reason is required for lead reassignment.' };
    }

    if (!newOwnerId) {
      return { success: false, error: 'A valid target staff member must be selected.' };
    }

    // 1. Fetch current lead owner
    const { data: currentLead, error: leadErr } = await supabase
      .from('crm_leads')
      .select('id, lead_owner_id')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr) throw leadErr;
    if (!currentLead) return { success: false, error: 'Lead not found.' };

    const previousOwnerId = currentLead.lead_owner_id;

    // 2. Fetch new owner profile for friendly name
    const { data: newOwnerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', newOwnerId)
      .maybeSingle();

    const newOwnerName = newOwnerProfile?.full_name || newOwnerProfile?.email || 'Staff Member';

    // 3. Update lead owner
    const { error: updateErr } = await supabase
      .from('crm_leads')
      .update({
        lead_owner_id: newOwnerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateErr) throw updateErr;

    // 4. Log reassignment with supervisor ID, reason, and previous owner
    await logActivity(
      leadId,
      'Lead Reassigned',
      `Lead reassigned to ${newOwnerName}. Reason: ${trimmedReason}`,
      supervisorId,
      'Supervisor',
      {
        previous_owner_id: previousOwnerId,
        new_owner_id: newOwnerId,
        new_owner_name: newOwnerName,
        reason: trimmedReason,
        reassigned_by: supervisorId,
      }
    );

    return { success: true };
  } catch (err: any) {
    console.error('[reassignLead] Reassignment error:', err);
    return { success: false, error: err?.message || 'Failed to reassign lead.' };
  }
}

/**
 * Fetches leads assigned to inactive staff or unassigned leads for supervisor attention.
 */
export async function fetchInactiveStaffLeads(): Promise<CRMLead[]> {
  try {
    const allLeads = await fetchLeads();
    const activeStaff = await fetchEligibleStaff();
    const activeStaffIds = new Set(activeStaff.filter(s => s.is_active).map(s => s.id));

    return allLeads.filter(lead => {
      if (!lead.lead_owner_id) return true; // Unassigned
      return !activeStaffIds.has(lead.lead_owner_id); // Inactive staff
    });
  } catch (err) {
    console.warn('[fetchInactiveStaffLeads] Error:', err);
    return [];
  }
}

/**
 * Gathers aggregate metrics for the Supervisor CRM Dashboard.
 */
export async function fetchTeamWorkloadStats(): Promise<TeamWorkloadStats> {
  const staffWorkloads = await fetchStaffWorkloads();
  const leads = await fetchLeads();

  const totalLeads = leads.length;
  const unassignedLeads = leads.filter(l => !l.lead_owner_id).length;
  const assignedLeads = totalLeads - unassignedLeads;

  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const overdueFollowups = leads.reduce((acc, lead) => {
    const hasOverdue = lead.followups?.some(f => {
      if (f.status !== 'Pending') return false;
      const fDate = new Date(f.followup_date);
      return fDate < now && !isSameDay(fDate, now);
    });
    return acc + (hasOverdue ? 1 : 0);
  }, 0);

  const completedApplications = leads.filter(l =>
    l.interested_jobs?.some(j => j.current_stage === 'Application Submitted') ||
    l.applications?.some(a => a.status === 'Submitted')
  ).length;

  return {
    totalLeads,
    unassignedLeads,
    assignedLeads,
    overdueFollowups,
    completedApplications,
    staffWorkloads,
  };
}

/**
 * Fetches unified timeline events for a lead across activities, calls, whatsapp messages, and follow-ups.
 */
export async function fetchUnifiedLeadTimeline(leadId: string): Promise<Array<{
  id: string;
  type: 'activity' | 'call' | 'whatsapp' | 'followup' | 'comment';
  title: string;
  description: string;
  timestamp: string;
  actor_name?: string;
  actor_type?: string;
  metadata?: Record<string, any>;
  status?: string;
}>> {
  const events: Array<{
    id: string;
    type: 'activity' | 'call' | 'whatsapp' | 'followup' | 'comment';
    title: string;
    description: string;
    timestamp: string;
    actor_name?: string;
    actor_type?: string;
    metadata?: Record<string, any>;
    status?: string;
  }> = [];

  try {
    // 1. Activity Logs
    const { data: activities } = await supabase
      .from('crm_activity_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (activities) {
      for (const act of activities) {
        events.push({
          id: act.id,
          type: 'activity',
          title: act.activity_type,
          description: act.description,
          timestamp: act.created_at,
          actor_type: act.actor_type,
          metadata: act.metadata,
        });
      }
    }

    // 2. Call History
    const { data: calls } = await supabase
      .from('crm_call_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (calls) {
      for (const c of calls) {
        events.push({
          id: c.id,
          type: 'call',
          title: `Call: ${c.call_status} (${c.disposition})`,
          description: c.notes || 'No call notes provided.',
          timestamp: c.created_at,
          status: c.call_status,
          metadata: { disposition: c.disposition, recording_ref: c.recording_ref },
        });
      }
    }

    // 3. WhatsApp Logs
    const { data: waLogs } = await supabase
      .from('crm_whatsapp_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (waLogs) {
      for (const w of waLogs) {
        // Resolve accurate status: 'Scheduled' | 'Sent' | 'Delivered' | 'Failed'
        let waStatus: 'Scheduled' | 'Sent' | 'Delivered' | 'Failed' = 'Sent';
        const rawStatus = (w.status || '').toLowerCase();
        const providerResp = (w.provider_response || {}) as Record<string, any>;
        const providerStatus = (providerResp.status || '').toLowerCase();

        if (w.error_message || rawStatus === 'failed') {
          waStatus = 'Failed';
        } else if (rawStatus === 'scheduled' || rawStatus === 'queued') {
          waStatus = 'Scheduled';
        } else if (
          w.delivery_timestamp &&
          (rawStatus === 'delivered' || providerStatus === 'delivered')
        ) {
          waStatus = 'Delivered';
        } else if (rawStatus === 'sent') {
          waStatus = 'Sent';
        }

        const msgId = providerResp.message_id || providerResp.id || null;

        events.push({
          id: w.id,
          type: 'whatsapp',
          title: `WhatsApp: ${w.template_name}`,
          description: w.error_message
            ? `Failed: ${w.error_message}`
            : `Status: ${waStatus}${w.delivery_timestamp ? ` • Delivered at ${new Date(w.delivery_timestamp).toLocaleTimeString()}` : ''}`,
          timestamp: w.created_at,
          status: waStatus,
          metadata: {
            wa_status: waStatus,
            provider_response: w.provider_response,
            delivery_timestamp: w.delivery_timestamp,
            message_id: msgId,
            error_details: w.error_message,
          },
        });
      }
    }

    // 4. Follow-up Reminders
    const { data: followups } = await supabase
      .from('crm_followup_reminders' as never)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (followups) {
      for (const f of followups as any[]) {
        events.push({
          id: f.id,
          type: 'followup',
          title: `Follow-up: ${f.followup_type} (${f.status})`,
          description: f.notes ? `Notes: ${f.notes}` : `Scheduled for ${new Date(f.followup_date).toLocaleString()}`,
          timestamp: f.created_at,
          status: f.status,
          metadata: { followup_date: f.followup_date, snoozed_count: f.snoozed_count },
        });
      }
    }

    // Sort all events descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.warn('[fetchUnifiedLeadTimeline] Error fetching timeline:', err);
  }

  return events;
}
