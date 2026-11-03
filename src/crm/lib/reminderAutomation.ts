/**
 * MAHA-AGRI Recruitment CRM — Candidate Journey Reminder Automation Service
 *
 * Implements automated WhatsApp reminders based on candidate journey stage progression:
 * - Cycle A (OTP Verified, App Not Started): Rem 1 at +2h, Rem 2 at +24h after Rem 1.
 * - Cycle B (App Started, Profile Incomplete): Rem 1 at +24h, Rem 2 at +24h after Rem 1.
 * - Cycle C (Profile Saved, App Not Submitted): Rem 1 at +24h, Rem 2 at +48h after Rem 1.
 *
 * Safeguards:
 * - Maximum 2 reminders per stage cycle.
 * - Global frequency control: at most 1 reminder per candidate mobile in any rolling 12h window.
 * - Stage cancellation: verifies latest journey stage before dispatch; cancels if advanced.
 * - Auto-creates a follow-up task in crm_followup_reminders when 2 reminders complete without progress.
 * - Complete audit trail in crm_whatsapp_logs and crm_activity_logs.
 */

import { supabase } from '../../lib/supabase/client';
import { sendTemplateMessage } from '../../services/whatapi';
import { scheduleFollowUp, logActivity } from './api';

export interface ReminderScheduleEvaluation {
  leadId: string;
  mobile: string;
  candidateName: string;
  stage: 'Cycle_A' | 'Cycle_B' | 'Cycle_C' | 'Completed' | 'None';
  stageName: string;
  jobPostingId?: string;
  jobTitle?: string;
  remindersSentCount: number;
  lastReminderSentAt?: string;
  nextReminderDueAt?: string;
  isDue: boolean;
  canSend: boolean;
  cooldownActive: boolean;
  reason?: string;
}

/**
 * Checks if the candidate is in a rolling 12-hour WhatsApp frequency cooldown across all jobs.
 */
export async function isCandidateInFrequencyCooldown(leadId: string): Promise<boolean> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('crm_whatsapp_logs')
      .select('id, created_at')
      .eq('lead_id', leadId)
      .eq('status', 'Sent')
      .gt('created_at', twelveHoursAgo)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[ReminderAutomation] Cooldown check warning:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('[ReminderAutomation] Cooldown check exception:', err);
    return false;
  }
}

/**
 * Counts how many reminders have already been sent for a specific stage cycle and lead.
 */
export async function getRemindersSentForStage(
  leadId: string,
  stageCycle: 'Cycle_A' | 'Cycle_B' | 'Cycle_C',
  jobPostingId?: string
): Promise<{ count: number; lastSentAt?: string }> {
  try {
    let query = supabase
      .from('crm_whatsapp_logs')
      .select('id, created_at, template_name, provider_response')
      .eq('lead_id', leadId)
      .eq('status', 'Sent');

    const templatePrefix =
      stageCycle === 'Cycle_A'
        ? 'crm_reminder_visitor'
        : stageCycle === 'Cycle_B'
        ? 'crm_reminder_profile_incomplete'
        : 'crm_reminder_app_incomplete';

    query = query.ilike('template_name', `${templatePrefix}%`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) {
      return { count: 0 };
    }

    // Filter by job if provided in provider_response or count stage messages
    const matched = data.filter(log => {
      if (!jobPostingId) return true;
      const resp = log.provider_response as any;
      return !resp?.job_posting_id || resp.job_posting_id === jobPostingId;
    });

    return {
      count: matched.length,
      lastSentAt: matched[0]?.created_at,
    };
  } catch (err) {
    console.warn('[ReminderAutomation] Error querying reminders sent:', err);
    return { count: 0 };
  }
}

/**
 * Evaluates whether a lead has an automated reminder due.
 */
export async function evaluateLeadReminders(leadId: string): Promise<ReminderScheduleEvaluation[]> {
  const evaluations: ReminderScheduleEvaluation[] = [];

  try {
    // 1. Fetch lead details, interested jobs, profile, and applications
    const { data: lead, error: leadErr } = await supabase
      .from('crm_leads')
      .select('*, interested_jobs:crm_lead_interested_jobs(*, job:rms_job_postings(title))')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) return [];

    const mobile = lead.mobile_number;
    const candidateName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Candidate';
    const otpVerifiedAt = lead.otp_verified_at || lead.created_at;

    // Check global 12h candidate frequency cooldown
    const globalCooldown = await isCandidateInFrequencyCooldown(leadId);

    const now = Date.now();
    const interestedJobs = lead.interested_jobs || [];

    // If candidate has no interested jobs or only visited/verified OTP without viewing/starting application:
    if (interestedJobs.length === 0) {
      // Cycle A: OTP Verified, Application Not Started
      const cycleInfo = await getRemindersSentForStage(leadId, 'Cycle_A');
      const remSent = cycleInfo.count;
      const baseTime = cycleInfo.lastSentAt
        ? new Date(cycleInfo.lastSentAt).getTime()
        : new Date(otpVerifiedAt).getTime();

      let isDue = false;
      let nextDueAt: string | undefined;

      if (remSent === 0) {
        // Rem 1: +2 hours after OTP verification
        const dueTime = baseTime + 2 * 60 * 60 * 1000;
        nextDueAt = new Date(dueTime).toISOString();
        if (now >= dueTime) isDue = true;
      } else if (remSent === 1) {
        // Rem 2: +24 hours after Rem 1
        const dueTime = baseTime + 24 * 60 * 60 * 1000;
        nextDueAt = new Date(dueTime).toISOString();
        if (now >= dueTime) isDue = true;
      }

      evaluations.push({
        leadId,
        mobile,
        candidateName,
        stage: 'Cycle_A',
        stageName: 'OTP Verified (App Not Started)',
        remindersSentCount: remSent,
        lastReminderSentAt: cycleInfo.lastSentAt,
        nextReminderDueAt: nextDueAt,
        isDue,
        canSend: isDue && !globalCooldown && remSent < 2,
        cooldownActive: globalCooldown,
        reason:
          remSent >= 2
            ? 'Cycle completed (Max 2 reminders sent). CRM follow-up task scheduled.'
            : globalCooldown
            ? 'Candidate frequency cooldown active (12h window).'
            : undefined,
      });

      return evaluations;
    }

    // Evaluate each interested job independently
    for (const job of interestedJobs) {
      const stage = job.current_stage;
      const jobPostingId = job.job_posting_id;
      const jobTitle = job.job?.title || 'Job Opening';

      // If application already submitted, skip/cancel reminders
      if (stage === 'Application Submitted') {
        evaluations.push({
          leadId,
          mobile,
          candidateName,
          stage: 'Completed',
          stageName: 'Application Submitted',
          jobPostingId,
          jobTitle,
          remindersSentCount: 0,
          isDue: false,
          canSend: false,
          cooldownActive: false,
          reason: 'Application already submitted.',
        });
        continue;
      }

      if (stage === 'Application Started' || stage === 'Profile Incomplete' || stage === 'Job Details Viewed') {
        // Cycle B: App Started, Profile Incomplete
        const cycleInfo = await getRemindersSentForStage(leadId, 'Cycle_B', jobPostingId);
        const remSent = cycleInfo.count;
        const stageStartTime = job.last_activity ? new Date(job.last_activity).getTime() : now;
        const baseTime = cycleInfo.lastSentAt ? new Date(cycleInfo.lastSentAt).getTime() : stageStartTime;

        let isDue = false;
        let nextDueAt: string | undefined;

        if (remSent === 0) {
          // Rem 1: +24h after Application Started
          const dueTime = baseTime + 24 * 60 * 60 * 1000;
          nextDueAt = new Date(dueTime).toISOString();
          if (now >= dueTime) isDue = true;
        } else if (remSent === 1) {
          // Rem 2: +24h after Rem 1
          const dueTime = baseTime + 24 * 60 * 60 * 1000;
          nextDueAt = new Date(dueTime).toISOString();
          if (now >= dueTime) isDue = true;
        }

        evaluations.push({
          leadId,
          mobile,
          candidateName,
          stage: 'Cycle_B',
          stageName: 'Application Started (Profile Incomplete)',
          jobPostingId,
          jobTitle,
          remindersSentCount: remSent,
          lastReminderSentAt: cycleInfo.lastSentAt,
          nextReminderDueAt: nextDueAt,
          isDue,
          canSend: isDue && !globalCooldown && remSent < 2,
          cooldownActive: globalCooldown,
          reason:
            remSent >= 2
              ? 'Max 2 reminders sent. CRM follow-up task scheduled.'
              : globalCooldown
              ? 'Candidate frequency cooldown active (12h window).'
              : undefined,
        });
      } else if (stage === 'Profile Saved' || stage === 'Profile Completed' || stage === 'Application Incomplete') {
        // Cycle C: Profile Saved, App Not Submitted
        const cycleInfo = await getRemindersSentForStage(leadId, 'Cycle_C', jobPostingId);
        const remSent = cycleInfo.count;
        const stageStartTime = job.last_activity ? new Date(job.last_activity).getTime() : now;
        const baseTime = cycleInfo.lastSentAt ? new Date(cycleInfo.lastSentAt).getTime() : stageStartTime;

        let isDue = false;
        let nextDueAt: string | undefined;

        if (remSent === 0) {
          // Rem 1: +24h after Profile Saved
          const dueTime = baseTime + 24 * 60 * 60 * 1000;
          nextDueAt = new Date(dueTime).toISOString();
          if (now >= dueTime) isDue = true;
        } else if (remSent === 1) {
          // Rem 2: +48h after Rem 1
          const dueTime = baseTime + 48 * 60 * 60 * 1000;
          nextDueAt = new Date(dueTime).toISOString();
          if (now >= dueTime) isDue = true;
        }

        evaluations.push({
          leadId,
          mobile,
          candidateName,
          stage: 'Cycle_C',
          stageName: 'Profile Saved (App Not Submitted)',
          jobPostingId,
          jobTitle,
          remindersSentCount: remSent,
          lastReminderSentAt: cycleInfo.lastSentAt,
          nextReminderDueAt: nextDueAt,
          isDue,
          canSend: isDue && !globalCooldown && remSent < 2,
          cooldownActive: globalCooldown,
          reason:
            remSent >= 2
              ? 'Max 2 reminders sent. CRM follow-up task scheduled.'
              : globalCooldown
              ? 'Candidate frequency cooldown active (12h window).'
              : undefined,
        });
      }
    }
  } catch (err) {
    console.error('[ReminderAutomation] Evaluation error:', err);
  }

  return evaluations;
}

/**
 * Dispatches an automated reminder for a lead and logs it to crm_whatsapp_logs.
 * Also automatically creates a follow-up task when Reminder #2 is dispatched.
 */
export async function dispatchAutomatedReminder(
  evaluation: ReminderScheduleEvaluation,
  staffUserId: string
): Promise<{ success: boolean; error?: string; messageId?: string | null }> {
  if (!evaluation.canSend) {
    return {
      success: false,
      error: evaluation.reason || 'Reminder is not currently eligible for dispatch.',
    };
  }

  const { leadId, mobile, candidateName, stage, jobTitle, jobPostingId, remindersSentCount } = evaluation;

  // Determine template and template number
  const reminderIndex = remindersSentCount + 1; // 1 or 2
  const templateName =
    stage === 'Cycle_A'
      ? `crm_reminder_visitor_${reminderIndex}`
      : stage === 'Cycle_B'
      ? `crm_reminder_profile_incomplete_${reminderIndex}`
      : `crm_reminder_app_incomplete_${reminderIndex}`;

  const variables = [
    candidateName || 'Candidate',
    jobTitle || 'recruitment position',
  ];

  try {
    // 1. Dispatch via centralized WhatsApp service
    const dispatchResult = await sendTemplateMessage(mobile, templateName, variables, {
      idempotencyKey: `rem:${leadId}:${stage}:${reminderIndex}:${Date.now()}`,
    });

    const isSuccess = dispatchResult.success;
    const status = isSuccess ? 'Sent' : 'Failed';
    const nowIso = new Date().toISOString();

    // 2. Audit log into crm_whatsapp_logs
    await supabase.from('crm_whatsapp_logs').insert({
      lead_id: leadId,
      template_name: templateName,
      template_version: 'v1.0',
      status,
      delivery_timestamp: isSuccess ? nowIso : null,
      error_message: dispatchResult.error || null,
      provider_response: {
        message_id: dispatchResult.messageId,
        log_id: dispatchResult.logId,
        stage,
        reminder_index: reminderIndex,
        job_posting_id: jobPostingId,
        job_title: jobTitle,
      },
      created_at: nowIso,
    });

    // 3. Activity log
    await logActivity(
      leadId,
      'WhatsApp Sent',
      `Automated ${stage} Reminder #${reminderIndex} sent (${templateName})`,
      staffUserId,
      'System',
      {
        stage,
        reminder_index: reminderIndex,
        template_name: templateName,
        job_posting_id: jobPostingId,
        delivery_status: status,
      }
    );

    // 4. Auto-create follow-up task if this was Reminder #2 (max reminders reached without progress)
    if (reminderIndex >= 2) {
      try {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await scheduleFollowUp(
          leadId,
          tomorrow,
          'Call',
          `Automated reminders complete (${stage}). Candidate requires personal telecaller outreach.`,
          null,
          staffUserId
        );
      } catch (fErr) {
        console.warn('[dispatchAutomatedReminder] Follow-up task creation warning:', fErr);
      }
    }

    return {
      success: isSuccess,
      messageId: dispatchResult.messageId,
      error: dispatchResult.error,
    };
  } catch (err: any) {
    console.error('[dispatchAutomatedReminder] Unexpected error:', err);
    return { success: false, error: err?.message || 'Failed to dispatch automated reminder.' };
  }
}
