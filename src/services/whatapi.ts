/**
 * WhatAPI — Central WhatsApp Service (frontend layer)
 *
 * Every WhatsApp message in the entire application goes through this single service.
 * Never duplicate WhatsApp logic elsewhere.
 *
 * Architecture:
 *   Application (this service) → edge function (secure backend) → WhatAPI → WhatsApp
 *
 * This frontend module is a thin, typed client over the `/functions/v1/whatsapp`
 * edge function. All credentials (WHATAPI_BASE_URL, WHATAPI_API_KEY,
 * WHATAPI_CHANNEL_ID) live ONLY in edge-function secrets — never in the frontend.
 *
 * Provider independence: the edge function abstracts the provider behind a
 * WhatsAppProvider interface, so swapping to another provider (or adding SMS /
 * email) does not change any application code that calls this service.
 */

import env from '../lib/config/env';

const EDGE_URL = `${env.supabaseUrl}/functions/v1/whatsapp`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SendMessageResult {
  success: boolean;
  messageId?: string | null;
  logId?: string;
  status?: string;
  deduplicated?: boolean;
  error?: string;
}

export interface SendOtpResult {
  success: boolean;
  logId?: string;
  expiresIn?: number;
  deduplicated?: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  verified?: boolean;
  mobile?: string;
  message?: string;
  error?: string;
}

export interface SendTemplateOptions {
  /** Override the auto-generated idempotency key (e.g. for deterministic per-event keys). */
  idempotencyKey?: string;
  /** Template language code (default "en"). */
  language?: string;
}

export interface SendOtpOptions {
  /** WhatsApp template name (default "otp"). */
  template?: string;
  /** OTP digit count (default 4). */
  otpLength?: number;
  /** OTP expiry in minutes (default 5). */
  expiryMinutes?: number;
  /** Max wrong attempts before the OTP is locked (default 5). */
  maxAttempts?: number;
  /** Extra variables beyond the OTP (the OTP is always variable index 0). */
  variables?: string[];
  /** Override the auto-generated idempotency key. */
  idempotencyKey?: string;
  /** Template language code. */
  language?: string;
}

export interface SendOtpMessageOptions {
  /** WhatsApp template name (default "user_alert_9"). */
  template?: string;
  /** Organization name sent as body variable #1 (default "ABHINAV BHARAT FOUNDATION"). */
  orgName?: string;
  /** Template language code. */
  language?: string;
  /** Override the auto-generated idempotency key. */
  idempotencyKey?: string;
}

export interface SendOtpMessageResult {
  success: boolean;
  messageId?: string | null;
  logId?: string;
  mobile?: string;
  template?: string;
  deduplicated?: boolean;
  message?: string;
  error?: string;
  diagnostics?: WhatApiDiagnostics | null;
}

export interface WhatApiDiagnostics {
  requestUrl?: string;
  method?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  httpStatus?: number | null;
  httpStatusText?: string;
  responseContentType?: string | null;
  responseHeaders?: Record<string, string>;
  retryAfter?: string | null;
  responseBody?: string | null;
  isJsonResponse?: boolean;
  parsedError?: string;
  networkError?: string;
}

// ─── Internal fetch helper ─────────────────────────────────────────────────────

async function callEdgeFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON response payload
  }

  if (!res.ok) {
    const errorMsg = (data.error as string) || (data.message as string);
    if (res.status === 429) {
      throw new Error(errorMsg || 'Too many requests. Please try again later.');
    }
    if (errorMsg) {
      throw new Error(errorMsg);
    }
    throw new Error(`WhatsApp service unreachable (${res.status}). Please try again.`);
  }

  // The edge function returns HTTP 200 with { success: false, error } on handled errors.
  if (data.success === false) {
    throw new Error((data.error as string) ?? 'WhatsApp request failed.');
  }

  return data;
}

// ─── Rate-limit / dedup guard (client-side) ────────────────────────────────────

/** In-flight request tracker — prevents double-click / refresh duplicate sends. */
const inFlight = new Map<string, Promise<Record<string, unknown>>>();

function dedupe(key: string, fn: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ─── 1. Universal Template Message Function ────────────────────────────────────

/**
 * Send a WhatsApp template message. This is the ONE generic function every
 * template uses — OTP, interview, appointment, payment, farmer, broadcast, etc.
 *
 * The number of variables is dynamic (0..unlimited). The template name is always
 * provided dynamically by the caller — nothing is hardcoded here.
 *
 * @example
 *   sendTemplateMessage('9876543210', 'interview_schedule', ['Rahul', '15 Jul', '10:00 AM']);
 *   sendTemplateMessage('9876543210', 'application_received', ['Priya', 'Field Officer']);
 *   sendTemplateMessage('9876543210', 'broadcast', []);
 */
export async function sendTemplateMessage(
  mobileNumber: string,
  templateName: string,
  variables: string[] = [],
  options?: SendTemplateOptions,
): Promise<SendMessageResult> {
  try {
    if (!mobileNumber?.trim()) return { success: false, error: 'Mobile number is required.' };
    if (!templateName?.trim()) return { success: false, error: 'Template name is required.' };

    const idKey = options?.idempotencyKey ?? `send:${mobileNumber}:${templateName}:${JSON.stringify(variables)}`;
    const data = await dedupe(idKey, () =>
      callEdgeFunction({
        action: 'sendTemplate',
        phone: mobileNumber,
        mobile: mobileNumber,
        template: templateName,
        variables,
        idempotencyKey: idKey,
        language: options?.language,
      }),
    );

    const webhookResp = (data.webhookResponse || data.api_response || {}) as Record<string, any>;
    const messageId = (data.messageId || webhookResp?.messageId || webhookResp?.id || null) as string | null;

    return {
      success: true,
      messageId,
      logId: (data.logId || webhookResp?.logId) as string | undefined,
      status: (data.status || webhookResp?.status || 'Sent') as string | undefined,
      deduplicated: data.deduplicated as boolean | undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send WhatsApp message.' };
  }
}

// ─── 2. OTP Service ────────────────────────────────────────────────────────────

/**
 * Send an OTP via WhatsApp template.
 *
 * Workflow: Enter Mobile → Generate Random OTP → Send WhatsApp Template →
 *           User Enters OTP → verifyOtp() → Continue Login
 *
 * OTP length, expiry, and max attempts are all configurable (with sensible defaults).
 * The OTP is never permanently stored — it auto-expires and is consumed on success.
 */
export async function sendOtp(
  mobileNumber: string,
  options?: SendOtpOptions,
): Promise<SendOtpResult> {
  try {
    if (!mobileNumber?.trim()) return { success: false, error: 'Mobile number is required.' };

    const idKey = options?.idempotencyKey ?? `otp:${mobileNumber}`;
    const data = await dedupe(idKey, () =>
      callEdgeFunction({
        action: 'sendOtp',
        mobile: mobileNumber,
        template: options?.template,
        variables: options?.variables,
        otpLength: options?.otpLength,
        expiryMinutes: options?.expiryMinutes,
        maxAttempts: options?.maxAttempts,
        idempotencyKey: idKey,
        language: options?.language,
      }),
    );

    return {
      success: true,
      logId: data.logId as string | undefined,
      expiresIn: data.expiresIn as number | undefined,
      deduplicated: data.deduplicated as boolean | undefined,
      message: data.message as string | undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send OTP.' };
  }
}

/**
 * Verify an OTP code entered by the user.
 * Returns { success: true, verified: true } on a valid, unexpired, unconsumed OTP.
 */
export async function verifyOtp(
  mobileNumber: string,
  code: string,
): Promise<VerifyOtpResult> {
  try {
    if (!mobileNumber?.trim()) return { success: false, error: 'Mobile number is required.' };
    if (!code?.trim()) return { success: false, error: 'Please enter the OTP code.' };

    const data = await callEdgeFunction({
      action: 'verifyOtp',
      mobile: mobileNumber,
      code,
    });

    return {
      success: true,
      verified: data.verified as boolean | undefined,
      mobile: data.mobile as string | undefined,
      message: data.message as string | undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to verify OTP.' };
  }
}

// ─── 2b. sendOTP(phone, otp) — pre-generated OTP via "user_alert_9" template ───

/**
 * Send a pre-generated OTP via the approved "user_alert_9" WhatsApp template.
 *
 * Body Variable #1 = "ABHINAV BHARAT FOUNDATION" (or custom orgName)
 * Body Variable #2 = the OTP code
 *
 * The phone number is automatically converted to Indian format (91xxxxxxxxxx).
 *
 * @example
 *   sendOTP('9876543210', '4829');
 *   sendOTP('9876543210', '4829', { orgName: 'Custom Org' });
 */
export async function sendOTP(
  phone: string,
  options?: SendOtpMessageOptions,
): Promise<SendOtpMessageResult> {
  try {
    if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };

    console.log('[DEBUG] whatapi.ts: sendOTP() called. Sending request to Edge Function...');
    const idKey = options?.idempotencyKey ?? `otpmsg:${phone}`;
    const data = await dedupe(idKey, () =>
      callEdgeFunction({
        action: 'generateOtp',
        phone: phone
      }),
    );
    console.log('[DEBUG] whatapi.ts: Edge Function response received:', data);

    return {
      success: true,
      messageId: data.messageId as string | null | undefined,
      logId: data.logId as string | undefined,
      mobile: data.mobile as string | undefined,
      template: data.template as string | undefined,
      deduplicated: data.deduplicated as boolean | undefined,
      message: data.message as string | undefined,
    };
  } catch (err) {
    const errData = err as Error & { diagnostics?: WhatApiDiagnostics };
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send OTP.',
      diagnostics: errData.diagnostics ?? null,
    };
  }
}

export async function verifyCustomOtp(
  phone: string,
  token: string,
): Promise<{ success: boolean; password?: string; error?: string; isNewUser?: boolean; leadId?: string | null; internalCandidateId?: string | null }> {
  try {
    if (!phone?.trim()) return { success: false, error: 'Phone number is required.' };
    if (!token?.trim()) return { success: false, error: 'OTP code is required.' };

    const data = await callEdgeFunction({
      action: 'verifyOtp',
      phone,
      token,
    });

    return {
      success: true,
      password: data.password as string | undefined,
      isNewUser: data.isNewUser as boolean | undefined,
      leadId: (data.leadId as string | null | undefined) ?? null,
      internalCandidateId: (data.internalCandidateId as string | null | undefined) ?? null,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to verify OTP.' };
  }
}

// ─── 3. Named template constants (not hardcoded logic — just convenience names) ─
/**
 * Central registry of known template names used across the application.
 * These are label constants only — the actual template must exist in the WhatAPI
 * account. New templates can be added here or passed directly to
 * sendTemplateMessage() without touching this file.
 */
export const WHATSAPP_TEMPLATES = {
  OTP: 'otp',
  USER_ALERT_9: 'user_alert_9',
  APPLICATION_SUBMITTED: 'application_received',
  APPLICATION_APPROVED: 'application_approved',
  APPLICATION_REJECTED: 'application_rejected',
  INTERVIEW_SCHEDULE: 'interview_schedule',
  DOCUMENT_VERIFICATION: 'document_verification',
  APPOINTMENT_LETTER: 'appointment_letter',
  JOINING_CONFIRMATION: 'joining_confirmation',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  FARMER_REGISTRATION: 'farmer_registration',
  SOIL_SAMPLE_RECEIVED: 'soil_sample_received',
  SOIL_REPORT_READY: 'soil_report_ready',
  DRONE_TRAINING: 'drone_training',
  VOLUNTEER_REGISTRATION: 'volunteer_registration',
  BROADCAST: 'broadcast',
} as const;

export type WhatsAppTemplateName = typeof WHATSAPP_TEMPLATES[keyof typeof WHATSAPP_TEMPLATES];
