import { supabase } from '../../lib/supabase/client';
import { sendDirectOtp } from '../../services/whatsappService';
import { normalizeMobileNumber } from '../../lib/utils';

export interface CRMLead {
  id: string;
  internal_candidate_id: string;
  mobile_number: string;
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

export async function fetchLeads() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select(`
      *,
      interested_jobs:crm_lead_interested_jobs(*),
      owner:profiles!lead_owner_id(full_name, email)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchLeadDetails(leadId: string) {
  const { data, error } = await supabase
    .from('crm_leads')
    .select(`
      *,
      interested_jobs:crm_lead_interested_jobs(
        *,
        job:rms_job_postings(title, slug)
      ),
      activity_logs:crm_activity_logs(
        *,
        actor:profiles!actor_id(full_name)
      ),
      calls:crm_call_history(
        *,
        telecaller:profiles!telecaller_id(full_name)
      ),
      comments:crm_lead_comments(
        *,
        user:profiles!user_id(full_name)
      )
    `)
    .eq('id', leadId)
    .single();

  if (error) throw error;
  return data;
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
  notes: string
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
    { notes, disposition }
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
  
  // 1. Check if lead exists
  const { data: existingLead, error: checkError } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('mobile_number', sanitizedMobile)
    .single();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  if (existingLead) {
    // Lead exists, log login activity
    await logActivity(existingLead.id, 'OTP Verified', 'Candidate logged in successfully', userId, 'Candidate');
    return existingLead;
  }

  // 2. Create new lead (internal_candidate_id auto-generated via SQL trigger)
  const { data: newLead, error: insertError } = await supabase
    .from('crm_leads')
    .insert({
      mobile_number: sanitizedMobile,
      otp_verified_at: new Date().toISOString(),
      lead_source: 'Career Portal'
    })
    .select()
    .single();

  if (insertError) throw insertError;

  await logActivity(newLead.id, 'Lead Created', 'New lead registered via Career Portal', userId, 'Candidate');
  return newLead;
}

// ------------------------------------------------------------------
// 6. Application & Auto Stage Update APIs
// ------------------------------------------------------------------

/**
 * Tracks when a candidate views a specific job detail page.
 */
export async function trackJobView(leadId: string, jobPostingId: string, userId: string) {
  // Upsert the interested job
  const { error } = await supabase
    .from('crm_lead_interested_jobs')
    .upsert({
      lead_id: leadId,
      job_posting_id: jobPostingId,
      current_stage: 'Job Details Viewed',
      last_activity: new Date().toISOString(),
      viewed_date: new Date().toISOString()
    }, {
      onConflict: 'lead_id, job_posting_id',
      ignoreDuplicates: true
    });
  
  if (error) throw error;

  await logActivity(
    leadId,
    'Job Viewed',
    'Candidate viewed job details',
    userId,
    'Candidate',
    { job_posting_id: jobPostingId }
  );
}

/**
 * Updates the candidate's stage for a specific job application.
 * Application ID is auto-generated by SQL trigger when stage progresses past "Job Details Viewed".
 */
export async function updateLeadStage(
  leadId: string,
  jobPostingId: string,
  newStage: string,
  actorId: string | null = null,
  actorType: 'Candidate' | 'Telecaller' | 'HR' | 'System' = 'System'
) {
  const { error } = await supabase
    .from('crm_lead_interested_jobs')
    .update({ 
      current_stage: newStage,
      last_activity: new Date().toISOString()
    })
    .match({ lead_id: leadId, job_posting_id: jobPostingId });
  
  if (error) throw error;

  await logActivity(
    leadId,
    'Stage Change',
    `Stage updated to ${newStage}`,
    actorId,
    actorType,
    { job_posting_id: jobPostingId, new_stage: newStage }
  );
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
 */
export async function submitApplicationWithOtp(
  leadId: string,
  jobPostingId: string,
  userId: string,
  formData: any
) {
  // Update stage to Application Started / Submitted
  await updateLeadStage(leadId, jobPostingId, 'Application Started', userId, 'Candidate');
  
  // Log submission data
  await logActivity(
    leadId,
    'Application Submitted',
    'Candidate successfully submitted application via OTP-2',
    userId,
    'Candidate',
    { form_data: formData, job_posting_id: jobPostingId }
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
