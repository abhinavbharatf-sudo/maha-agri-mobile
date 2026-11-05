/**
 * MAHA-AGRI Candidate Portal — Dedicated Client API & Submission Layer
 *
 * Provides transactional submission via the rms_submit_application RPC,
 * along with post-submission WhatsApp notification and CRM synchronization.
 */

import { supabase } from '../../lib/supabase/client';
import { sendApplicationSubmittedTemplate } from '../../services/whatsappService';
import { createApplication, upsertCandidateProfile } from '../lib/api';
import { isDummyOtpMode } from '../lib/dummyOtp';
import { maskAadhaar } from './utils/verhoeff';
import type { MasterProfileFormData, JobSpecificFormData, PortalStep, FinalDeclarationData } from './types';
import type { RmsJobPosting } from '../lib/types';

export interface SubmitCandidateApplicationParams {
  job: RmsJobPosting;
  userId: string;
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
  declarationText: string;
  declarationData?: FinalDeclarationData;
}

export interface SubmissionResult {
  success: boolean;
  applicationId: string;
  applicationNumber: string;
  status: string;
  submittedAt: string | null;
  alreadySubmitted: boolean;
  whatsappSent?: boolean;
  crmSynced?: boolean;
  error?: string;
}

/**
 * Executes atomic application submission via the dedicated PostgreSQL RPC,
 * with resilient fallback to the verified createApplication workflow.
 */
export async function submitCandidateApplication({
  job,
  userId,
  masterProfile,
  jobSpecific,
  declarationText,
  declarationData,
}: SubmitCandidateApplicationParams): Promise<SubmissionResult> {
  const nowIso = new Date().toISOString();
  if (declarationData) {
    if (!declarationData.statutory_declaration_accepted || !declarationData.final_acknowledgement_accepted) {
      return {
        success: false,
        applicationId: '',
        applicationNumber: '',
        status: '',
        submittedAt: null,
        alreadySubmitted: false,
        error: 'Both Statutory Legal Undertaking & Declaration and Final Review Acknowledgement must be explicitly accepted before submission.',
      };
    }
  }

  const declarationPayload: FinalDeclarationData = declarationData || {
    statutory_declaration_accepted: true,
    statutory_declaration_text: declarationText,
    statutory_declaration_accepted_at: nowIso,
    statutory_declaration_version: (job as any)?.declaration_version || 'v1.0',

    final_acknowledgement_accepted: true,
    final_acknowledgement_text:
      'I have carefully reviewed all information in this application. I understand that after final submission, I cannot edit my application, and duplicate applications for the same position will not be accepted.',
    final_acknowledgement_accepted_at: nowIso,
    final_acknowledgement_version: 'v1.0',

    acknowledged: true,
    declaration_text: declarationText,
    acknowledged_at: nowIso,
  };

  const isFree = Number(job.application_fee_amount ?? 0) === 0;
  const targetStatus = isFree ? 'submitted' : 'payment_pending';

  const safeMasterProfile: MasterProfileFormData = {
    ...masterProfile,
    aadhaarNumber: masterProfile.aadhaarNumber ? maskAadhaar(masterProfile.aadhaarNumber) : undefined,
  };

  // Local Dummy Mode: Safe simulation for frontend test harness
  if (isDummyOtpMode() && (userId.startsWith('dummy-') || (masterProfile.mobile && userId.includes(masterProfile.mobile)))) {
    const dummyAppNum = `ABF-APP-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
    const dummyAppId = `dummy-app-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (typeof window !== 'undefined') {
      try {
        const submittedKey = `maha_candidate_app_${job.id}_${userId}`;
        sessionStorage.setItem(submittedKey, JSON.stringify({
          id: dummyAppId,
          application_number: dummyAppNum,
          candidate_id: userId,
          job_posting_id: job.id,
          status: targetStatus,
          created_at: nowIso,
          submitted_at: nowIso,
          application_data: {
            master_profile: safeMasterProfile,
            job_specific: jobSpecific,
          },
        }));
        sessionStorage.removeItem(`maha_candidate_draft_${job.id}_${userId}`);
        localStorage.removeItem(`maha_candidate_draft_${job.id}_${userId}`);
      } catch {}
    }

    return {
      success: true,
      applicationId: dummyAppId,
      applicationNumber: dummyAppNum,
      status: targetStatus,
      submittedAt: nowIso,
      alreadySubmitted: false,
    };
  }

  // 1. Primary Engine: Invoke atomic PostgreSQL RPC
  let rpcSuccess = false;
  let rpcResult: any = null;

  try {
    const { data, error } = await (supabase.rpc as any)('rms_submit_application', {
      p_job_posting_id: job.id,
      p_preferred_district: jobSpecific.preferredDistrict,
      p_preferred_taluka: jobSpecific.preferredTaluka || null,
      p_master_profile: safeMasterProfile,
      p_job_specific: jobSpecific,
      p_declaration: declarationPayload,
    });

    if (!error && data) {
      rpcSuccess = true;
      rpcResult = data;
    } else if (error) {
      // Business rule rejections from RPC must be surfaced directly
      if (error.code === 'P0004' || error.message?.includes('closed')) {
        return { success: false, applicationId: '', applicationNumber: '', status: '', submittedAt: null, alreadySubmitted: false, error: 'Applications are closed for this position.' };
      }
      if (error.code === '22023' || error.message?.includes('not eligible')) {
        return { success: false, applicationId: '', applicationNumber: '', status: '', submittedAt: null, alreadySubmitted: false, error: 'The selected district is not eligible for this position.' };
      }
      console.warn('[Portal API] rms_submit_application RPC not applied or returned code, falling back to standard API:', error.message);
    }
  } catch (rpcEx: any) {
    console.warn('[Portal API] RPC exception, falling back to standard API:', rpcEx?.message);
  }

  let finalAppId = '';
  let finalAppNumber = '';
  let finalStatus = targetStatus;
  let finalSubmittedAt: string | null = new Date().toISOString();
  let finalAlreadySubmitted = false;

  if (rpcSuccess && rpcResult) {
    finalAppId = rpcResult.application_id;
    finalAppNumber = rpcResult.application_number;
    finalStatus = rpcResult.status || targetStatus;
    finalSubmittedAt = rpcResult.submitted_at || finalSubmittedAt;
    finalAlreadySubmitted = !!rpcResult.already_submitted;
  } else {
    // 2. Resilient Fallback Engine: Standard Supabase table transactions
    const { data: profData } = await upsertCandidateProfile({
      user_id: userId,
      full_name: masterProfile.fullName,
      date_of_birth: masterProfile.dateOfBirth,
      gender: masterProfile.gender as any,
      mobile: masterProfile.mobile,
      emergency_mobile: masterProfile.alternateMobile || null,
      email: masterProfile.email || null,
      district: masterProfile.homeDistrict,
      taluka: masterProfile.homeTaluka,
      address_line1: masterProfile.addressLine1,
      pincode: masterProfile.pincode,
      profile_complete: true,
    });

    const candidateId = profData?.id || userId;

    const { data: appData, error: appErr } = await createApplication({
      candidate_id: candidateId,
      job_posting_id: job.id,
      preferred_district: jobSpecific.preferredDistrict,
      preferred_location: jobSpecific.preferredTaluka || undefined,
      preferred_taluka: jobSpecific.preferredTaluka || null,
      status: targetStatus,
      application_data: {
        preferred_taluka: jobSpecific.preferredTaluka || null,
        preferred_locations: jobSpecific.preferredDistricts || null,
        mobility_consent: jobSpecific.mobilityConsent || null,
        master_profile: masterProfile,
        job_specific: jobSpecific,
        declaration: declarationPayload,
        statutory_declaration: {
          accepted: declarationPayload.statutory_declaration_accepted,
          text: declarationPayload.statutory_declaration_text,
          version: declarationPayload.statutory_declaration_version,
          accepted_at: declarationPayload.statutory_declaration_accepted_at,
        },
        final_acknowledgement: {
          accepted: declarationPayload.final_acknowledgement_accepted,
          text: declarationPayload.final_acknowledgement_text,
          version: declarationPayload.final_acknowledgement_version,
          accepted_at: declarationPayload.final_acknowledgement_accepted_at,
        },
        submission_snapshot: {
          candidate: masterProfile,
          job_specific: jobSpecific,
          preferred_locations: jobSpecific.preferredDistricts || null,
          mobility_consent: jobSpecific.mobilityConsent || null,
          job: {
            id: job.id,
            title: job.title,
            slug: job.slug,
            application_fee_amount: Number(job.application_fee_amount ?? 0),
          },
          declaration: declarationPayload,
          statutory_declaration: {
            accepted: declarationPayload.statutory_declaration_accepted,
            text: declarationPayload.statutory_declaration_text,
            version: declarationPayload.statutory_declaration_version,
            accepted_at: declarationPayload.statutory_declaration_accepted_at,
          },
          final_acknowledgement: {
            accepted: declarationPayload.final_acknowledgement_accepted,
            text: declarationPayload.final_acknowledgement_text,
            version: declarationPayload.final_acknowledgement_version,
            accepted_at: declarationPayload.final_acknowledgement_accepted_at,
          },
        },
      },
    });

    if (appErr || !appData) {
      console.error('[Portal API] createApplication fallback error:', appErr);
      const errMsg = (appErr as any)?.message || 'Failed to submit application. Please try again.';
      return {
        success: false,
        applicationId: '',
        applicationNumber: '',
        status: '',
        submittedAt: null,
        alreadySubmitted: (appErr as any)?.code === '23505',
        error: errMsg,
      };
    }

    finalAppId = appData.id;
    finalAppNumber = appData.application_number;
    finalStatus = targetStatus;
    finalSubmittedAt = appData.submitted_at || finalSubmittedAt;
  }

  const response: SubmissionResult = {
    success: true,
    applicationId: finalAppId,
    applicationNumber: finalAppNumber,
    status: finalStatus,
    submittedAt: finalSubmittedAt,
    alreadySubmitted: finalAlreadySubmitted,
  };

  // 3. Post-Submission Integrations (Non-blocking)
  const mobile = masterProfile.mobile?.trim();

  // WhatsApp Notification Dispatch (free jobs upon registration)
  if (isFree && mobile && !finalAlreadySubmitted) {
    sendApplicationSubmittedTemplate(
      mobile,
      masterProfile.fullName || 'Candidate',
      job.title,
      finalAppNumber
    )
      .then(res => {
        response.whatsappSent = res.success;
      })
      .catch(err => {
        console.warn('[Portal API] WhatsApp dispatch deferred/failed:', err);
        response.whatsappSent = false;
      });
  }

  // CRM Lead Sync
  if (!finalAlreadySubmitted) {
    import('../../crm/lib/api')
      .then(({ submitApplicationWithOtp }) => {
        return submitApplicationWithOtp(
          userId,
          job.id,
          userId,
          {
            full_name: masterProfile.fullName,
            mobile: masterProfile.mobile,
            district: masterProfile.homeDistrict,
            taluka: masterProfile.homeTaluka,
            highest_qualification: jobSpecific.highestQualification,
            preferred_district: jobSpecific.preferredDistrict,
            preferred_taluka: jobSpecific.preferredTaluka,
            application_number: finalAppNumber,
          },
          finalAppNumber
        );
      })
      .then(() => {
        response.crmSynced = true;
      })
      .catch(crmErr => {
        console.warn('[Portal API] CRM sync deferred/failed:', crmErr);
        response.crmSynced = false;
      });
  }

  return response;
}

export interface SaveCandidateDraftParams {
  job: RmsJobPosting;
  candidateId: string;
  userId: string;
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
  currentStep: PortalStep;
}

export interface DraftSaveResult {
  success: boolean;
  savedAt: string | null;
  error?: string;
}

export interface CandidateDraftData {
  masterProfile?: Partial<MasterProfileFormData>;
  jobSpecific?: Partial<JobSpecificFormData>;
  lastActiveStep?: PortalStep;
  lastSavedAt?: string;
}

/**
 * Persists application draft state to rms_applications (or local dev session)
 * without premature submission.
 */
export async function saveCandidateDraft({
  job,
  candidateId,
  userId,
  masterProfile,
  jobSpecific,
  currentStep,
}: SaveCandidateDraftParams): Promise<DraftSaveResult> {
  const nowIso = new Date().toISOString();
  const safeMasterProfile: MasterProfileFormData = {
    ...masterProfile,
    aadhaarNumber: masterProfile.aadhaarNumber ? maskAadhaar(masterProfile.aadhaarNumber) : undefined,
  };

  // Local Dummy Mode: Safe simulation in developer browser session
  if (isDummyOtpMode() && (userId.startsWith('dummy-') || candidateId.startsWith('dummy-'))) {
    try {
      if (typeof window !== 'undefined') {
        const key = `maha_candidate_draft_${job.id}_${candidateId}`;
        const draftPayload = {
          master_profile: safeMasterProfile,
          job_specific: jobSpecific,
          last_active_step: currentStep,
          last_saved_at: nowIso,
        };
        sessionStorage.setItem(key, JSON.stringify(draftPayload));
        localStorage.setItem(key, JSON.stringify(draftPayload));
      }
      return { success: true, savedAt: nowIso };
    } catch (e: any) {
      return { success: false, savedAt: null, error: e?.message || 'Failed to save local draft' };
    }
  }

  try {
    let resolvedCandidateId = candidateId;

    // 1. Ensure master profile is persisted with a valid rms_candidate_profiles record
    const fallbackMobile = typeof window !== 'undefined' ? localStorage.getItem('maha_verified_mobile') : null;
    const targetMobile = masterProfile.mobile || fallbackMobile;
    if (masterProfile.fullName || targetMobile) {
      const { data: profData } = await upsertCandidateProfile({
        user_id: userId,
        full_name: masterProfile.fullName || 'Candidate',
        date_of_birth: masterProfile.dateOfBirth || null,
        gender: (masterProfile.gender as any) || null,
        mobile: targetMobile || '0000000000',
        emergency_mobile: masterProfile.alternateMobile || null,
        email: masterProfile.email || null,
        district: masterProfile.homeDistrict || null,
        taluka: masterProfile.homeTaluka || null,
        address_line1: masterProfile.addressLine1 || null,
        pincode: masterProfile.pincode || null,
      });
      if (profData?.id) {
        resolvedCandidateId = profData.id;
      }
    }

    // 2. Persist application draft in rms_applications
    const { error } = await createApplication({
      candidate_id: resolvedCandidateId,
      job_posting_id: job.id,
      preferred_district: jobSpecific.preferredDistrict || undefined,
      preferred_taluka: jobSpecific.preferredTaluka || null,
      status: 'draft',
      application_data: {
        master_profile: safeMasterProfile,
        job_specific: jobSpecific,
        last_active_step: currentStep,
        last_saved_at: nowIso,
      },
    });

    if (error && (error as any).code !== '23505') {
      return { success: false, savedAt: null, error: (error as any).message || 'Failed to save draft' };
    }

    // Cache locally as immediate recovery safeguard
    if (typeof window !== 'undefined') {
      try {
        const payloadStr = JSON.stringify({
          job_id: job.id,
          job_title: job.title,
          job_location: job.location || job.city_name || 'Maharashtra',
          master_profile: safeMasterProfile,
          job_specific: jobSpecific,
          last_active_step: currentStep,
          last_saved_at: nowIso,
          candidate_id: resolvedCandidateId,
        });
        sessionStorage.setItem(`maha_candidate_draft_${job.id}_${resolvedCandidateId}`, payloadStr);
        localStorage.setItem(`maha_candidate_draft_${job.id}_${resolvedCandidateId}`, payloadStr);
        if (userId !== resolvedCandidateId) {
          sessionStorage.setItem(`maha_candidate_draft_${job.id}_${userId}`, payloadStr);
          localStorage.setItem(`maha_candidate_draft_${job.id}_${userId}`, payloadStr);
        }
      } catch {}
    }

    return { success: true, savedAt: nowIso };
  } catch (err: any) {
    console.error('[Portal API] saveCandidateDraft error:', err);
    return { success: false, savedAt: null, error: err?.message || 'Network error saving draft' };
  }
}

/**
 * Loads a saved draft for the given candidate and job.
 */
export async function loadCandidateDraft(
  candidateId: string,
  jobId: string
): Promise<{ draft: CandidateDraftData | null; error: string | null }> {
  // 1. Check local session cache first in dummy mode or fallback
  if (typeof window !== 'undefined') {
    try {
      const key = `maha_candidate_draft_${jobId}_${candidateId}`;
      const cached = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.last_active_step || parsed?.job_specific) {
          return {
            draft: {
              masterProfile: parsed.master_profile,
              jobSpecific: parsed.job_specific,
              lastActiveStep: parsed.last_active_step,
              lastSavedAt: parsed.last_saved_at,
            },
            error: null,
          };
        }
      }
    } catch {}
  }

  // 2. Query authoritative draft from rms_applications
  try {
    const { data: existingApp, error } = await supabase
      .from('rms_applications' as never)
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_posting_id', jobId)
      .eq('status', 'draft')
      .or('is_trashed.is.null,is_trashed.eq.false')
      .maybeSingle();

    if (error) {
      return { draft: null, error: error.message };
    }

    if (existingApp) {
      const appData = (existingApp as any).application_data || {};
      return {
        draft: {
          masterProfile: appData.master_profile,
          jobSpecific: appData.job_specific,
          lastActiveStep: appData.last_active_step || 'job_specific',
          lastSavedAt: appData.last_saved_at || (existingApp as any).updated_at,
        },
        error: null,
      };
    }

    return { draft: null, error: null };
  } catch (err: any) {
    return { draft: null, error: err?.message || 'Error loading draft' };
  }
}
