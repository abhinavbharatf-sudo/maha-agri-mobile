/**
 * MAHA-AGRI Platform — WhatsApp Unified Service
 * Production-Safe WhatsApp API Dispatcher
 *
 * Prevents silent mock fallbacks in production.
 * Throws explicit configuration errors when WhatsApp API credentials are missing.
 */

import { supabase } from '../lib/supabase/client';
import env from '../lib/config/env';

export interface DirectOtpResult {
  success: boolean;
  error?: string;
  configError?: boolean;
  skipped?: boolean;
  cooldownActive?: boolean;
  concurrentRequest?: boolean;
  lastSentAt?: string;
  sent?: boolean;
}

/**
 * Normalizes an Indian mobile number to the format expected by the backend
 */
function getWhatsAppFormattedPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  else if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
  return cleaned;
}

/**
 * Checks if WhatsApp credentials and environment configuration are valid
 */
function validateWhatsAppCredentials(): { valid: boolean; error?: string } {
  const isProd = import.meta.env.PROD || env.isProduction;
  const supabaseUrl = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;

  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !anonKey || anonKey.includes('placeholder')) {
    const errorMsg = 'WhatsApp API Error: Supabase URL or Anon Key is missing in environment variables.';
    console.error(`[WhatsApp Service CONFIGURATION ERROR] ${errorMsg}`);
    return { valid: false, error: errorMsg };
  }

  // Production check
  if (isProd && (!import.meta.env.VITE_WHATSAPP_API_TOKEN && !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
    const errorMsg = 'Production Error: VITE_WHATSAPP_API_TOKEN is missing. Production mode cannot fall back to mock mode.';
    console.error(`[WhatsApp Service PRODUCTION CRITICAL] ${errorMsg}`);
    return { valid: false, error: errorMsg };
  }

  return { valid: true };
}

/**
 * Universal internal helper to call the Supabase Edge Function with Strict Error Guard
 */
async function callEdgeFunction(phone: string, templateName: string, variables: string[] = []): Promise<DirectOtpResult> {
  // Strict Credential Guard for BUG 2 Fix
  const credCheck = validateWhatsAppCredentials();
  if (!credCheck.valid) {
    return {
      success: false,
      configError: true,
      error: credCheck.error || 'WhatsApp API configuration error.'
    };
  }

  try {
    const payload = {
      action: 'sendTemplate',
      phone,
      template: templateName,
      variables
    };

    console.log(`[WhatsApp Service] Invoking live API for template '${templateName}' to ${phone}`);
    
    // Invoke edge function securely
    const { data, error } = await supabase.functions.invoke('whatsapp', {
      body: payload
    });

    if (error) {
      console.error('[WhatsApp Service API ERROR]:', error.message);
      return {
        success: false,
        error: `WhatsApp API Error: ${error.message}`
      };
    }

    if (!data?.success) {
      console.error('[WhatsApp Service DISPATCH FAILED]:', data?.error);
      return {
        success: false,
        error: data?.error || 'WhatsApp message dispatch failed on backend API.'
      };
    }

    console.log('[WhatsApp Service REAL DISPATCH SUCCESS]:', data);
    return {
      success: true,
      skipped: data?.skipped,
      cooldownActive: data?.cooldownActive,
      concurrentRequest: data?.concurrentRequest,
      lastSentAt: data?.lastSentAt,
      sent: data?.sent,
    };
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    console.error('[WhatsApp Service NETWORK ERROR]:', errorDetail);
    return {
      success: false,
      error: `WhatsApp Gateway Unreachable: ${errorDetail}`
    };
  }
}

/**
 * Checks server-side (Supabase) if the 24-hour cooldown is currently active
 * for the given phone number for the Welcome message.
 */
export async function isWelcomeMessageInCooldown(phone: string): Promise<boolean> {
  if (!phone?.trim()) return false;
  const recipient = getWhatsAppFormattedPhone(phone);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from('whatsapp_message_logs' as never)
      .select('id, sent_at')
      .eq('mobile_number', recipient)
      .in('template_name', ['welcome', 'welcome_recruitment', 'welcome_to_recruitment_portal'])
      .eq('status', 'sent')
      .gt('sent_at', twentyFourHoursAgo)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[isWelcomeMessageInCooldown] Check error, falling back to server dispatch:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.warn('[isWelcomeMessageInCooldown] Exception checking cooldown:', err);
    return false;
  }
}

/**
 * Send a WhatsApp OTP message (Trigger 3: Continue to Application / OTP #2)
 */
export async function sendDirectOtp(phone: string, otp: string): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };
  if (!otp?.trim()) return { success: false, error: 'OTP code is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'otp', [otp.trim()]);
}

/**
 * Send the "welcome" template (Trigger 2: After successful OTP #1 verification)
 */
export async function sendWelcomeTemplate(phone: string): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'welcome', []);
}

/**
 * Send the application submitted confirmation template
 */
export async function sendApplicationSubmittedTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  applicationNumber: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'application_received', [candidateName, jobTitle, applicationNumber]);
}

/**
 * Send the interview confirmed confirmation template
 */
export async function sendInterviewConfirmedTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  date: string,
  time: string,
  venueOrLink: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'interview_schedule', [candidateName, jobTitle, date, time, venueOrLink]);
}

/**
 * Send automated interview reminder (1-day, 3-hour, or 10-minute in Asia/Kolkata timezone)
 */
export async function sendInterviewReminderTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  date: string,
  time: string,
  reminderType: '1-day' | '3-hour' | '10-minute',
  meetLink: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, `interview_reminder_${reminderType.replace('-', '_')}`, [
    candidateName,
    jobTitle,
    date,
    time,
    meetLink || 'Google Meet link provided in portal'
  ]);
}

/**
 * Send reschedule confirmation template
 */
export async function sendRescheduleConfirmedTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  newDate: string,
  newTime: string,
  meetLink: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'interview_rescheduled', [
    candidateName,
    jobTitle,
    newDate,
    newTime,
    meetLink || 'Google Meet link provided in portal'
  ]);
}

/**
 * Send provisional appointment letter issued notification with 3-day deadline notice
 */
export async function sendProvisionalLetterIssuedTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  signingDeadlineFormatted: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'provisional_appointment_issued', [
    candidateName,
    jobTitle,
    signingDeadlineFormatted
  ]);
}

/**
 * Send onboarding fee payment window open notification with 7-day countdown notice
 */
export async function sendOnboardingPaymentWindowTemplate(
  phone: string,
  candidateName: string,
  jobTitle: string,
  amount: string,
  paymentDeadlineFormatted: string,
): Promise<DirectOtpResult> {
  if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

  const recipient = getWhatsAppFormattedPhone(phone);
  return callEdgeFunction(recipient, 'onboarding_payment_window', [
    candidateName,
    jobTitle,
    amount,
    paymentDeadlineFormatted
  ]);
}
