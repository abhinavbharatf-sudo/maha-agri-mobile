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
    return { success: true };
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
