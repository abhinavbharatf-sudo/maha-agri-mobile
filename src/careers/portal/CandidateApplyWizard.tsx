import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2, ArrowLeft, ArrowRight, AlertCircle,
  CheckCircle, Loader2, Lock,
  Building2, ExternalLink, User, LogOut, ChevronDown, LayoutDashboard, FileText,
  MapPin, X, UserCheck
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getJob, getJobBySlug, getExistingApplication } from '../lib/api';
import { isDummyOtpMode } from '../lib/dummyOtp';
import OTPLoginModal from '../components/OTPLoginModal';
import type { RmsJobPosting, RmsApplication } from '../lib/types';
import {
  PORTAL_STEPS,
  INITIAL_WIZARD_STATE,
  INITIAL_JOB_SPECIFIC,
  type PortalStep,
  type MasterProfileFormData,
  type JobSpecificFormData,
  type PortalWizardState,
  type JobQuestionnaire,
  type FinalDeclarationData,
} from './types';
import Step1CreateProfile from './steps/Step1CreateProfile';
import Step2MasterProfile from './steps/Step2MasterProfile';
import Step2JobSpecific from './steps/Step2JobSpecific';
import Step4Questionnaire from './steps/Step4Questionnaire';
import Step3ReviewSubmit from './steps/Step3ReviewSubmit';
import Step4Confirmation from './steps/Step4Confirmation';
import JobDetailsModal from './JobDetailsModal';
import { submitCandidateApplication, saveCandidateDraft, loadCandidateDraft } from './api';

interface CandidateApplyWizardProps {
  jobId?: string;
}

export default function CandidateApplyWizard({ jobId: propJobId }: CandidateApplyWizardProps) {
  const { jobId: routeJobId } = useParams<{ jobId: string }>();
  const activeJobId = propJobId || routeJobId;
  const navigate = useNavigate();

  const { user, profile, loading: authLoading, profileLoading, verifiedMobile, signOut, setVerifiedMobile, refreshProfile } = useCandidateAuth();

  const [job, setJob] = useState<RmsJobPosting | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [existingApp, setExistingApp] = useState<RmsApplication | null>(null);
  const [state, setState] = useState<PortalWizardState>(INITIAL_WIZARD_STATE);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);

  // Direct return to Review & Submit after editing from Step 4
  const [returnToReview, setReturnToReview] = useState(false);
  const [targetSection, setTargetSection] = useState<string | null>(null);

  // Draft persistence tracking states
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const [resumedFromDraft, setResumedFromDraft] = useState(false);

  // Authenticated user resolution (enforces phone identity matching; rejects stale Supabase user sessions)
  const effectiveUser = useMemo(() => {
    const cleanVerified = (verifiedMobile || '').replace(/\D/g, '').slice(-10);
    const userCleanPhone = (user?.phone || '').replace(/\D/g, '').slice(-10);

    // If cleanVerified is set and Supabase user matches it, accept user
    if (user && cleanVerified && userCleanPhone === cleanVerified) {
      return user;
    }

    // In local dummy OTP test mode, fallback to phone-bound identity only if DEV mode is active
    if (isDummyOtpMode() && cleanVerified) {
      return {
        id: `dummy-candidate-${cleanVerified}`,
        phone: '+91' + cleanVerified,
        user_metadata: { mobile: cleanVerified },
      } as any;
    }

    // If no separate verified mobile, but Supabase user exists with valid phone, accept user
    if (user && !cleanVerified && userCleanPhone) {
      return user;
    }

    return null;
  }, [user, verifiedMobile]);

  // Unique candidate isolation key (anchored to resolved profile ID only if profile matches verified phone)
  const activeCandidateKey = useMemo(() => {
    if (!effectiveUser) return null;
    const cleanVerified = (verifiedMobile || effectiveUser.phone || '').replace(/\D/g, '').slice(-10);
    const profileCleanMobile = (profile?.mobile || '').replace(/\D/g, '').slice(-10);

    // Only bind to profile.id if profile belongs to the verified phone identity
    if (profile?.id && (!cleanVerified || profileCleanMobile === cleanVerified)) {
      return profile.id;
    }
    return effectiveUser.id;
  }, [effectiveUser, profile?.id, profile?.mobile, verifiedMobile]);

  const isCandidateProfileMatching = useMemo(() => {
    const clean = (verifiedMobile || effectiveUser?.phone || '').replace(/\D/g, '').slice(-10);
    return Boolean(profile && clean && (profile.mobile || '').replace(/\D/g, '').slice(-10) === clean);
  }, [profile, verifiedMobile, effectiveUser?.phone]);

  const lastCandidateKeyRef = useRef<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    lastCandidateKeyRef.current = null;
    setState(INITIAL_WIZARD_STATE);
    setExistingApp(null);
    setResumedFromDraft(false);
    setDraftSavedAt(null);
    setDraftSaveStatus('idle');
    setDraftSaveError(null);
    setShowAccountDropdown(false);
    navigate('/careers');
  };

  // ── Load Job Details (Supports both UUID and slug) ─────────────────────────
  useEffect(() => {
    if (!activeJobId) {
      setJobLoading(false);
      return;
    }
    setJobLoading(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeJobId);
    const fetcher = isUuid ? getJob(activeJobId) : getJobBySlug(activeJobId);

    fetcher
      .then(res => setJob(res.data))
      .catch(() => setJob(null))
      .finally(() => setJobLoading(false));
  }, [activeJobId]);

  // ── Identity Synchronization & Candidate Application Isolation ────────────
  useEffect(() => {
    let isCurrent = true;
    const keyChanged = activeCandidateKey !== lastCandidateKeyRef.current;
    if (keyChanged) {
      lastCandidateKeyRef.current = activeCandidateKey;

      // 1. Instantly reset all previous candidate in-memory flags and state
      setExistingApp(null);
      setResumedFromDraft(false);
      setDraftSavedAt(null);
      setDraftSaveStatus('idle');
      setDraftSaveError(null);

      // If candidate is logged out, restore pristine empty wizard state
      if (!activeCandidateKey) {
        setState(INITIAL_WIZARD_STATE);
        return () => {
          isCurrent = false;
        };
      }

      // 2. Build isolated clean state for the authenticated candidate
      const cleanMobile = (
        verifiedMobile ||
        effectiveUser?.phone?.replace('+91', '') ||
        profile?.mobile ||
        ''
      ).replace(/\D/g, '').slice(-10);

      const isProfileMatching = Boolean(
        profile &&
        cleanMobile &&
        (profile.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile
      );

      // Check if consent was previously recorded for audit purposes
      let savedConsentTime = '';
      let savedNoticeVer = 'v1.0';
      try {
        if (typeof window !== 'undefined' && cleanMobile) {
          const rawConsent = localStorage.getItem(`maha_candidate_consent_${cleanMobile}`);
          if (rawConsent) {
            const parsed = JSON.parse(rawConsent);
            if (parsed.consentGiven) {
              savedConsentTime = parsed.consentTimestamp || '';
              savedNoticeVer = parsed.privacyNoticeVersion || 'v1.0';
            }
          }
        }
      } catch {}

      const freshCandidateState: PortalWizardState = {
        ...INITIAL_WIZARD_STATE,
        masterProfile: {
          ...INITIAL_WIZARD_STATE.masterProfile,
          fullName: isProfileMatching ? (profile?.full_name || state.masterProfile.fullName || '') : (state.masterProfile.fullName || ''),
          dateOfBirth: isProfileMatching ? (profile?.date_of_birth || state.masterProfile.dateOfBirth || '') : (state.masterProfile.dateOfBirth || ''),
          gender: isProfileMatching ? (profile?.gender || state.masterProfile.gender || '') : (state.masterProfile.gender || ''),
          mobile: cleanMobile,
          alternateMobile: isProfileMatching ? (profile?.alternate_mobile || profile?.emergency_mobile || (profile as any)?.alternate_mobile || state.masterProfile.alternateMobile || '') : (state.masterProfile.alternateMobile || ''),
          casteCategory: isProfileMatching ? (profile?.caste_category || state.masterProfile.casteCategory || '') : (state.masterProfile.casteCategory || ''),
          homeDistrict: isProfileMatching ? (profile?.district || state.masterProfile.homeDistrict || '') : (state.masterProfile.homeDistrict || ''),
          homeTaluka: isProfileMatching ? (profile?.taluka || state.masterProfile.homeTaluka || '') : (state.masterProfile.homeTaluka || ''),
          addressLine1: isProfileMatching ? ((profile as any)?.address_line1 || state.masterProfile.addressLine1 || '') : (state.masterProfile.addressLine1 || ''),
          pincode: isProfileMatching ? ((profile as any)?.pincode || state.masterProfile.pincode || '') : (state.masterProfile.pincode || ''),
          currentAddressLine1: isProfileMatching ? ((profile as any)?.address_line1 || state.masterProfile.currentAddressLine1 || state.masterProfile.addressLine1 || '') : (state.masterProfile.currentAddressLine1 || state.masterProfile.addressLine1 || ''),
          currentDistrict: isProfileMatching ? (profile?.district || state.masterProfile.currentDistrict || state.masterProfile.homeDistrict || '') : (state.masterProfile.currentDistrict || state.masterProfile.homeDistrict || ''),
          currentTaluka: isProfileMatching ? (profile?.taluka || state.masterProfile.currentTaluka || state.masterProfile.homeTaluka || '') : (state.masterProfile.currentTaluka || state.masterProfile.homeTaluka || ''),
          currentPincode: isProfileMatching ? ((profile as any)?.pincode || state.masterProfile.currentPincode || state.masterProfile.pincode || '') : (state.masterProfile.currentPincode || state.masterProfile.pincode || ''),
          permanentSameAsCurrent: isProfileMatching ? ((profile as any)?.permanent_same_as_current ?? state.masterProfile.permanentSameAsCurrent ?? false) : (state.masterProfile.permanentSameAsCurrent ?? false),
          permanentAddressLine1: isProfileMatching ? ((profile as any)?.permanent_address_line1 || state.masterProfile.permanentAddressLine1 || '') : (state.masterProfile.permanentAddressLine1 || ''),
          permanentDistrict: isProfileMatching ? ((profile as any)?.permanent_district || state.masterProfile.permanentDistrict || '') : (state.masterProfile.permanentDistrict || ''),
          permanentTaluka: isProfileMatching ? ((profile as any)?.permanent_taluka || state.masterProfile.permanentTaluka || '') : (state.masterProfile.permanentTaluka || ''),
          permanentPincode: isProfileMatching ? ((profile as any)?.permanent_pincode || state.masterProfile.permanentPincode || '') : (state.masterProfile.permanentPincode || ''),
          email: isProfileMatching ? (profile?.email || state.masterProfile.email || '') : (state.masterProfile.email || ''),
          candidateId: isProfileMatching ? (profile?.candidate_id || state.masterProfile.candidateId || '') : (state.masterProfile.candidateId || ''),
          profileCreatedDate: isProfileMatching && profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (state.masterProfile.profileCreatedDate || ''),
          consentGiven: false, // Mandatory: Privacy Notice & Consent checkbox must remain unclicked/unchecked by default
          consentTimestamp: savedConsentTime || state.masterProfile.consentTimestamp,
          privacyNoticeVersion: savedNoticeVer || state.masterProfile.privacyNoticeVersion,
        },
        jobSpecific: {
          ...INITIAL_JOB_SPECIFIC,
        },
      };

      // Immediately set the clean state
      setState(freshCandidateState);

      // 3. Authoritatively load this specific candidate's application or draft
      if (job?.id) {
        getExistingApplication(activeCandidateKey, job.id)
          .then(res => {
            if (!isCurrent) return;
            if (res.data && !res.data.is_trashed) {
              setExistingApp(res.data);
              // If draft, resume at saved state
              if (res.data.status === 'draft') {
                const appData = (res.data.application_data || {}) as Record<string, any>;
                if (appData.master_profile || appData.job_specific) {
                  setResumedFromDraft(true);
                  setState({
                    ...freshCandidateState,
                    currentStep: (appData.last_active_step as PortalStep) || 'job_specific',
                    masterProfile: {
                      ...freshCandidateState.masterProfile,
                      ...(appData.master_profile || {}),
                      consentGiven: false, // Mandatory: Keep unclicked/unchecked by default on Step 1
                      mobile: cleanMobile,
                    },
                    jobSpecific: {
                      ...freshCandidateState.jobSpecific,
                      ...(appData.job_specific || {}),
                    },
                  });
                  if (appData.last_saved_at) {
                    setDraftSavedAt(appData.last_saved_at);
                    setDraftSaveStatus('saved');
                  }
                  return;
                }
              }
            } else {
              setExistingApp(null);
              // Check client/local draft storage strictly for this candidate
              loadCandidateDraft(activeCandidateKey, job.id).then(({ draft }) => {
                if (!isCurrent) return;
                if (draft) {
                  setResumedFromDraft(true);
                  setState({
                    ...freshCandidateState,
                    currentStep: draft.lastActiveStep || 'job_specific',
                    masterProfile: {
                      ...freshCandidateState.masterProfile,
                      ...(draft.masterProfile || {}),
                      consentGiven: false, // Mandatory: Keep unclicked/unchecked by default on Step 1
                      mobile: cleanMobile,
                    },
                    jobSpecific: {
                      ...freshCandidateState.jobSpecific,
                      ...(draft.jobSpecific || {}),
                    },
                  });
                  if (draft.lastSavedAt) {
                    setDraftSavedAt(draft.lastSavedAt);
                    setDraftSaveStatus('saved');
                  }
                  return;
                }
                // No draft exists: clean state is already set
              });
            }
          })
          .catch(() => {
            if (!isCurrent) return;
            setExistingApp(null);
          });
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [activeCandidateKey, job?.id, profile, user?.phone, verifiedMobile]);

  // ── Profile Pre-population for Current Candidate (non-destructive) ──────────
  useEffect(() => {
    const cleanMobile = (verifiedMobile || effectiveUser?.phone || '').replace(/\D/g, '').slice(-10);
    const isProfileMatching = Boolean(
      profile &&
      cleanMobile &&
      (profile.mobile || '').replace(/\D/g, '').slice(-10) === cleanMobile
    );

    if (
      isProfileMatching &&
      profile &&
      activeCandidateKey &&
      (profile.id === activeCandidateKey || profile.user_id === activeCandidateKey)
    ) {
      const activeProf = profile;
      setState(prev => {
        // Only fill demographic fields if currently empty
        return {
          ...prev,
          masterProfile: {
            ...prev.masterProfile,
            fullName: prev.masterProfile.fullName || activeProf.full_name || '',
            dateOfBirth: prev.masterProfile.dateOfBirth || activeProf.date_of_birth || '',
            gender: prev.masterProfile.gender || activeProf.gender || '',
            mobile: activeProf.mobile || prev.masterProfile.mobile,
            alternateMobile: prev.masterProfile.alternateMobile || activeProf.alternate_mobile || activeProf.emergency_mobile || (activeProf as any).alternate_mobile || '',
            casteCategory: prev.masterProfile.casteCategory || activeProf.caste_category || '',
            email: prev.masterProfile.email || activeProf.email || '',
            candidateId: prev.masterProfile.candidateId || activeProf.candidate_id || '',
            profileCreatedDate: prev.masterProfile.profileCreatedDate || (activeProf.created_at ? new Date(activeProf.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
            homeDistrict: prev.masterProfile.homeDistrict || activeProf.district || '',
            homeTaluka: prev.masterProfile.homeTaluka || activeProf.taluka || '',
            addressLine1: prev.masterProfile.addressLine1 || (activeProf as any).address_line1 || '',
            pincode: prev.masterProfile.pincode || (activeProf as any).pincode || '',
            currentAddressLine1: prev.masterProfile.currentAddressLine1 || (activeProf as any).address_line1 || '',
            currentDistrict: prev.masterProfile.currentDistrict || activeProf.district || '',
            currentTaluka: prev.masterProfile.currentTaluka || activeProf.taluka || '',
            currentPincode: prev.masterProfile.currentPincode || (activeProf as any).pincode || '',
            permanentSameAsCurrent: prev.masterProfile.permanentSameAsCurrent ?? (activeProf as any).permanent_same_as_current ?? false,
            permanentAddressLine1: prev.masterProfile.permanentAddressLine1 || (activeProf as any).permanent_address_line1 || '',
            permanentDistrict: prev.masterProfile.permanentDistrict || (activeProf as any).permanent_district || '',
            permanentTaluka: prev.masterProfile.permanentTaluka || (activeProf as any).permanent_taluka || '',
            permanentPincode: prev.masterProfile.permanentPincode || (activeProf as any).permanent_pincode || '',
          },
        };
      });
    }
  }, [profile, activeCandidateKey, verifiedMobile, effectiveUser?.phone]);

  // ── Navigation & State Updaters ─────────────────────────────────────────────
  const goToStep = useCallback((step: PortalStep) => {
    setState(prev => ({ ...prev, currentStep: step, errorMessage: null }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateMasterProfile = useCallback((field: keyof MasterProfileFormData, value: any) => {
    setState(prev => {
      // Guard: Never overwrite a valid gender with empty/falsy value
      if (field === 'gender' && !value && prev.masterProfile.gender) {
        return prev;
      }
      return {
        ...prev,
        masterProfile: {
          ...prev.masterProfile,
          [field]: value,
        },
      };
    });
  }, []);

  const updateJobSpecific = useCallback(
    <K extends keyof JobSpecificFormData>(field: K, value: JobSpecificFormData[K]) => {
      setState(prev => ({
        ...prev,
        jobSpecific: {
          ...prev.jobSpecific,
          [field]: value,
        },
      }));
    },
    []
  );

  // ── Draft Save Action (Explicit & Step Transitions) ─────────────────────────
  const saveDraft = useCallback(
    async (stepToSave?: PortalStep, exitAfter = false) => {
      if (!effectiveUser || !job) return false;
      const candidateId = profile?.id || effectiveUser.id;
      const targetStep = stepToSave || state.currentStep;

      setDraftSaveStatus('saving');
      setDraftSaveError(null);

      const res = await saveCandidateDraft({
        job,
        candidateId,
        userId: effectiveUser.id,
        masterProfile: state.masterProfile,
        jobSpecific: state.jobSpecific,
        currentStep: targetStep,
      });

      if (res.success) {
        setDraftSaveStatus('saved');
        setDraftSavedAt(res.savedAt || new Date().toISOString());
        if (exitAfter) {
          try {
            await refreshProfile();
          } catch {}
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(
              'maha_flash_message',
              'Your application has been saved as a draft. You can continue anytime from My Applications.'
            );
          }
          navigate('/candidate/applications');
        }
        return true;
      } else {
        setDraftSaveStatus('error');
        setDraftSaveError(res.error || 'Failed to save draft. Please check your connection and try again.');
        return false;
      }
    },
    [effectiveUser, job, profile?.id, state.currentStep, state.masterProfile, state.jobSpecific, navigate]
  );

  // ── Debounced Auto-save for Step 2 (Job Specific Fields) ────────────────────
  useEffect(() => {
    if (state.currentStep !== 'job_specific' || !effectiveUser || !job) return;
    if (!state.jobSpecific.preferredDistrict) return;

    const timer = setTimeout(() => {
      saveDraft('job_specific', false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.jobSpecific, state.currentStep, effectiveUser, job, saveDraft]);

  // ── Final Transactional Submission Handler ─────────────────────────────────
  const handleReviewSubmit = useCallback(async (declarationData?: FinalDeclarationData) => {
    if (!effectiveUser || !job) return;
    if (state.submitting) return; // Prevent duplicate clicks

    setState(prev => ({ ...prev, submitting: true, errorMessage: null }));

    try {
      const res = await submitCandidateApplication({
        job,
        userId: effectiveUser.id,
        masterProfile: state.masterProfile,
        jobSpecific: state.jobSpecific,
        declarationData,
        declarationText:
          declarationData?.statutory_declaration_text ||
          job.acknowledgement_text?.trim() ||
          'I hereby declare that all the information provided in this application form is true, complete, and correct to the best of my knowledge and belief.',
      });

      if (!res.success) {
        setState(prev => ({
          ...prev,
          submitting: false,
          errorMessage: res.error || 'Submission failed. Please check details and try again.',
        }));
        return;
      }

      // Success: advance to confirmation screen with authoritative data
      setState(prev => ({
        ...prev,
        submitting: false,
        submittedAppId: res.applicationId,
        submittedAppNumber: res.applicationNumber,
        submittedStatus: res.status,
        submittedAt: res.submittedAt,
        currentStep: 'confirmation',
        errorMessage: null,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[CandidateApplyWizard] Submission exception:', err);
      setState(prev => ({
        ...prev,
        submitting: false,
        errorMessage: err.message || 'An unexpected error occurred during submission. Please try again.',
      }));
    }
  }, [effectiveUser, job, state.submitting, state.masterProfile, state.jobSpecific]);

  const handleOtpSuccess = (_isNewUser?: boolean, mobile?: string) => {
    setShowOtpModal(false);
    if (mobile) {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      setVerifiedMobile(clean);
      refreshProfile(clean);
    }
  };

  // ── Active Job-Specific Questionnaire Resolution (Hook placed before early returns) ─
  const activeQuestionnaire = useMemo(() => {
    const q = (job as any)?.questionnaire || (job?.vacancy_allocations as any)?.questionnaire;
    if (
      q &&
      q.status !== 'draft' &&
      q.isVisibleToCandidates !== false &&
      Array.isArray(q.questions) &&
      q.questions.some((item: any) => item.isVisible !== false)
    ) {
      return q as JobQuestionnaire;
    }
    return null;
  }, [job]);

  // ── Dynamic Stepper Steps (Auto-skips Step 4 if job has no questionnaire) ─
  const visibleSteps = useMemo(() => {
    if (activeQuestionnaire) {
      return PORTAL_STEPS;
    }
    return PORTAL_STEPS
      .filter(s => s.id !== 'questionnaire')
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
  }, [activeQuestionnaire]);

  // If current step is questionnaire but questionnaire is inactive or hidden, auto-advance to review
  useEffect(() => {
    if (state.currentStep === 'questionnaire' && !activeQuestionnaire && !jobLoading) {
      goToStep('review');
    }
  }, [state.currentStep, activeQuestionnaire, jobLoading, goToStep]);

  // Dynamic Project Name resolution (aligned with Admin Department / Project field: job.department; declared before early returns)
  const rawProjectName = job?.department || null;
  const projectName = useMemo(() => {
    if (!rawProjectName || typeof rawProjectName !== 'string') return null;
    const trimmed = rawProjectName.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || lower === 'n/a' || lower === 'no project' || lower === 'none' || lower === 'null') {
      return null;
    }
    return trimmed;
  }, [rawProjectName]);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (authLoading || jobLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-[#f0f4f8]">
        <Loader2 className="w-9 h-9 animate-spin text-[#102a43] mb-3" />
        <p className="text-xs font-semibold text-[#486581]">Loading application portal...</p>
      </div>
    );
  }

  // ── Missing Job Guard ──────────────────────────────────────────────────────
  if (!job) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 bg-[#f0f4f8]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#102a43] mb-1">Position Not Found</h3>
          <p className="text-xs text-[#486581] mb-5">The selected job opening could not be located or has closed.</p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#102a43] text-white text-xs font-bold rounded-xl hover:bg-[#243b53] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Openings
          </Link>
        </div>
      </div>
    );
  }

  // ── Inactive / Closed Job Guard ───────────────────────────────────────────
  if (job.status !== 'published' || job.is_trashed) {
    const isClosed = job.status === 'applications_closed';
    const isComingSoon = job.status === 'coming_soon';
    const isFilled = job.status === 'filled';

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 bg-[#f0f4f8]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#102a43] mb-1">
            {isClosed
              ? 'Applications Closed'
              : isComingSoon
              ? 'Opening Soon'
              : isFilled
              ? 'Position Filled'
              : 'Position Inactive'}
          </h3>
          <p className="text-xs text-[#486581] mb-5">
            Applications are currently not being accepted for <strong>{job.title}</strong>.
          </p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#102a43] text-white text-xs font-bold rounded-xl hover:bg-[#243b53] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Openings
          </Link>
        </div>
      </div>
    );
  }

  // ── Unauthenticated State Guard (WhatsApp OTP Login Required) ──────────────
  if (!effectiveUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#f0f4f8]">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-[#102a43]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#102a43] mb-1">WhatsApp Verification Required</h2>
          <p className="text-xs text-[#486581] mb-6 leading-relaxed">
            Please verify your mobile number via WhatsApp OTP to access the application wizard for <strong className="text-[#102a43]">{job.title}</strong>.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOtpModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#102a43] text-white font-semibold rounded-xl text-xs hover:bg-[#243b53] transition-colors shadow-sm cursor-pointer"
            >
              Verify with WhatsApp OTP <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to={job.slug ? `/careers/jobs/${job.slug}` : '/careers'}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Job Details
            </Link>
          </div>
        </div>

        <OTPLoginModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
          title="Candidate Verification"
          subtitle={`Verify your mobile number to apply for ${job.title}`}
        />
      </div>
    );
  }

  // ── Already Applied Guard (Non-Draft Applications) ────────────────────────
  if (existingApp && existingApp.status !== 'draft') {
    const isPaymentPending = existingApp.status === 'payment_pending';
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#f0f4f8]">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-8 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#102a43] mb-1">
            {isPaymentPending ? 'Application Submitted — Payment Pending' : 'Application Already Submitted'}
          </h2>
          <p className="text-xs text-[#486581] mb-5">
            {isPaymentPending
              ? `You have initiated an application for ${job.title}. Please complete the online application fee payment to finalize your registration.`
              : `You have already submitted an active application for ${job.title}.`}
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-6 text-xs">
            <div className="flex justify-between">
              <span className="text-[#627d98]">Application Ref:</span>
              <span className="font-mono font-bold text-[#102a43]">{existingApp.application_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#627d98]">Current Status:</span>
              <span className="font-bold text-blue-700 uppercase text-[11px]">{existingApp.status}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {isPaymentPending ? (
              <button
                type="button"
                onClick={() => navigate('/candidate/payments')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Complete Payment Now
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/candidate/applications')}
                className="flex-1 py-2.5 bg-[#102a43] text-white text-xs font-bold rounded-xl hover:bg-[#243b53] transition-colors"
              >
                View in My Applications
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowJobDetailsModal(true)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Job Details
            </button>
          </div>
        </div>

        <JobDetailsModal
          job={job}
          isOpen={showJobDetailsModal}
          onClose={() => setShowJobDetailsModal(false)}
        />
      </div>
    );
  }

  // ── Active Step Index Calculation ──────────────────────────────────────────
  const currentStepIndex = visibleSteps.findIndex(s => s.id === state.currentStep);

  // ── STEP 5: Final Application Submission Confirmation (Zero Wizard UI) ──────
  if (state.currentStep === 'confirmation') {
    return (
      <div className="min-h-screen bg-[#f0f4f8] py-10 px-4 sm:px-6">
        <div className="max-w-xl mx-auto">
          <Step4Confirmation
            applicationNumber={state.submittedAppNumber || existingApp?.application_number || ''}
            applicationId={state.submittedAppId || existingApp?.id || ''}
            submittedAt={state.submittedAt || existingApp?.created_at || null}
            status={state.submittedStatus || existingApp?.status || (Number(job.application_fee_amount ?? 0) > 0 ? 'payment_pending' : 'submitted')}
            applicationFeeAmount={Number(job.application_fee_amount ?? 0)}
            job={job}
            projectName={projectName}
            masterProfile={state.masterProfile}
            jobSpecific={state.jobSpecific}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header Card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
            {/* Left: Job Title & Conditional Project Name */}
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#102a43] leading-tight tracking-tight">
                {job.title}
              </h1>
              {projectName && (
                <p className="text-xs sm:text-sm font-bold text-[#0b69a3] uppercase tracking-wider">
                  {projectName}
                </p>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {draftSaveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                  Saving draft...
                </span>
              )}
              {draftSaveStatus === 'saved' && draftSavedAt && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Draft saved ({new Date(draftSavedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
              {draftSaveStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-[11px] font-semibold" title={draftSaveError || undefined}>
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  Save failed
                </span>
              )}

              {/* View Job Details Modal */}
              <button
                type="button"
                onClick={() => setShowJobDetailsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#102a43] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="View position specifications and application summary"
              >
                <FileText className="w-3.5 h-3.5 text-[#0b69a3]" />
                <span>Job Details</span>
              </button>

              {/* Save & Exit Button */}
              {state.currentStep !== 'confirmation' && (
                <button
                  type="button"
                  onClick={() => saveDraft(state.currentStep, true)}
                  disabled={draftSaveStatus === 'saving'}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Save current progress and return to candidate applications"
                >
                  Save &amp; Exit
                </button>
              )}

              {/* Candidate Account Dropdown Menu */}
              {effectiveUser && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAccountDropdown(prev => !prev)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#102a43] rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                    title="Candidate account menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#102a43] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                      {profile?.full_name ? profile.full_name.trim().charAt(0).toUpperCase() : 'C'}
                    </div>
                    {profileLoading ? (
                      <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        <span className="hidden sm:inline">Loading...</span>
                      </span>
                    ) : (
                      <span className="max-w-[150px] truncate font-bold text-[#102a43]">
                        {profile?.full_name
                          ? profile.full_name
                          : (verifiedMobile ? `+91 ${verifiedMobile.slice(-10)}` : 'Account')}
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>

                  {showAccountDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAccountDropdown(false)}
                      />
                      <div className="absolute right-0 mt-1 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                        {/* 1. Candidate Identity Section */}
                        <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#102a43] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#102a43] truncate text-xs">
                                {profile?.full_name || 'Candidate'}
                              </p>
                              {profile?.candidate_id && (
                                <p
                                  className="text-[11px] font-mono text-slate-700 font-bold mt-0.5"
                                  title="Authoritative Candidate ID"
                                >
                                  ID: {profile.candidate_id}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-500 font-mono">
                                +91 {verifiedMobile ? verifiedMobile.slice(-10) : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 2. Navigation Menu */}
                        <div className="py-1">
                          <Link
                            to="/candidate/dashboard"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Dashboard</span>
                          </Link>

                          <Link
                            to="/candidate/profile"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                          >
                            <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>My Profile</span>
                          </Link>

                          <Link
                            to="/candidate/applications"
                            onClick={() => setShowAccountDropdown(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                          >
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>My Applications</span>
                          </Link>
                        </div>

                        {/* Divider */}
                        <div className="my-1 border-t border-slate-100" />

                        {/* 3. Sign Out */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAccountDropdown(false);
                            handleSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 font-semibold cursor-pointer text-left transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator Counter */}
          <div className="pt-4 pb-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[#102a43] mb-1.5">
              <span>
                Step {currentStepIndex + 1} of {visibleSteps.length}:{' '}
                <span className="font-bold text-[#0b69a3]">{visibleSteps[currentStepIndex]?.label}</span>
              </span>
              <span className="text-slate-500 font-mono font-bold">
                {Math.round(((currentStepIndex + 1) / visibleSteps.length) * 100)}% Completed
              </span>
            </div>

            {/* Continuous Visual Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0b69a3] transition-all duration-300 rounded-full"
                style={{ width: `${Math.round(((currentStepIndex + 1) / visibleSteps.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${activeQuestionnaire ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-2 pt-4`}>
            {visibleSteps.map((s, idx) => {
              const isCurrent = s.id === state.currentStep;
              const isPast = idx < currentStepIndex;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    // Only allow navigating back to previously completed steps
                    if (isPast) {
                      goToStep(s.id);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-[#102a43] text-white border-[#102a43] shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 cursor-pointer hover:bg-emerald-100/60'
                      : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                  }`}
                  title={isPast ? `Return to ${s.label}` : isCurrent ? s.label : 'Complete current step to proceed'}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-white text-[#102a43]'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.stepNumber}
                    </span>
                    <span className="text-[11px] font-bold truncate">{s.label}</span>
                  </div>
                  <p className={`text-[10px] truncate ${isCurrent ? 'text-slate-200' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {s.shortDescription}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Active Step Body ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">

          {/* Resumed Draft Notice */}
          {resumedFromDraft && draftSavedAt && (
            <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Resumed incomplete application draft. Last saved on{' '}
                  <strong>{new Date(draftSavedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(draftSavedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>.
                </span>
              </span>
              <button
                type="button"
                onClick={() => setResumedFromDraft(false)}
                className="text-blue-500 hover:text-blue-700 text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {state.errorMessage && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <span className="font-bold block">Submission Architecture Notice</span>
                <span className="leading-relaxed">{state.errorMessage}</span>
              </div>
            </div>
          )}

          {/* STEP 1: Create Candidate Profile (Newly added initial step) */}
          {state.currentStep === 'create_profile' && (
            <Step1CreateProfile
              data={state.masterProfile}
              userId={effectiveUser.id}
              verifiedMobile={verifiedMobile || effectiveUser?.phone?.replace('+91', '').trim() || state.masterProfile.mobile}
              candidateId={isCandidateProfileMatching ? (profile?.candidate_id || state.masterProfile.candidateId) : state.masterProfile.candidateId}
              profileCreatedDate={isCandidateProfileMatching ? (state.masterProfile.profileCreatedDate || (profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined)) : state.masterProfile.profileCreatedDate}
              cancelButtonLabel="Cancel Application"
              returnToReview={returnToReview}
              onChange={updateMasterProfile}
              onNext={() => {
                refreshProfile?.();
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                  saveDraft('review', false);
                } else {
                  goToStep('master_profile');
                  saveDraft('master_profile', false);
                }
              }}
              onCancel={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                } else {
                  navigate(job.slug ? `/careers/jobs/${job.slug}` : '/careers');
                }
              }}
            />
          )}

          {/* STEP 2: Basic Information (Prefilled from Step 1) */}
          {state.currentStep === 'master_profile' && (
            <Step2MasterProfile
              data={state.masterProfile}
              userId={effectiveUser.id}
              verifiedMobile={verifiedMobile || effectiveUser?.phone?.replace('+91', '').trim() || state.masterProfile.mobile}
              isCasteRequired={Boolean(job?.vacancy_allocations?.category_allocations && Object.keys(job.vacancy_allocations.category_allocations).length > 0)}
              cancelButtonLabel="Cancel Application"
              returnToReview={returnToReview}
              onChange={updateMasterProfile}
              onNext={() => {
                refreshProfile?.();
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                  saveDraft('review', false);
                } else {
                  goToStep('job_specific');
                  saveDraft('job_specific', false);
                }
              }}
              onBack={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                } else {
                  goToStep('create_profile');
                  saveDraft('create_profile', false);
                }
              }}
              onCancel={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                } else {
                  navigate(job.slug ? `/careers/jobs/${job.slug}` : '/careers');
                }
              }}
            />
          )}

          {/* STEP 3: Position Details & Posting Preferences (Tier 2: Role Quotas) */}
          {state.currentStep === 'job_specific' && (
            <Step2JobSpecific
              data={state.jobSpecific}
              masterProfile={state.masterProfile}
              onMasterProfileChange={updateMasterProfile}
              job={job}
              returnToReview={returnToReview}
              targetSection={targetSection}
              onChange={updateJobSpecific}
              onNext={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                  saveDraft('review', false);
                } else if (activeQuestionnaire) {
                  goToStep('questionnaire');
                  saveDraft('questionnaire', false);
                } else {
                  goToStep('review');
                  saveDraft('review', false);
                }
              }}
              onBack={() => {
                if (returnToReview) {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                } else {
                  goToStep('master_profile');
                  saveDraft('master_profile', false);
                }
              }}
            />
          )}

          {/* STEP 4: Job-Specific Questionnaire (Dynamic Assessment) */}
          {state.currentStep === 'questionnaire' && (
            activeQuestionnaire ? (
              <Step4Questionnaire
                job={job}
                questionnaire={activeQuestionnaire}
                answers={state.jobSpecific.questionnaireResponses || {}}
                onChange={answers => {
                  updateJobSpecific('questionnaireResponses', answers);
                  if (activeQuestionnaire.version) {
                    updateJobSpecific('questionnaireVersion', activeQuestionnaire.version);
                  }
                }}
                onNext={() => {
                  setReturnToReview(false);
                  setTargetSection(null);
                  goToStep('review');
                  saveDraft('review', false);
                }}
                onBack={() => {
                  if (returnToReview) {
                    setReturnToReview(false);
                    setTargetSection(null);
                    goToStep('review');
                  } else {
                    goToStep('job_specific');
                    saveDraft('job_specific', false);
                  }
                }}
              />
            ) : null
          )}

          {/* STEP 5: Review Application & Statutory Declaration */}
          {state.currentStep === 'review' && (
            <Step3ReviewSubmit
              masterProfile={state.masterProfile}
              jobSpecific={state.jobSpecific}
              job={job}
              submitting={state.submitting}
              onBack={() => {
                if (activeQuestionnaire) {
                  goToStep('questionnaire');
                  saveDraft('questionnaire', false);
                } else {
                  goToStep('job_specific');
                  saveDraft('job_specific', false);
                }
              }}
              onEditBasicInfo={() => {
                setReturnToReview(true);
                setTargetSection('basic_info');
                goToStep('create_profile');
                saveDraft('create_profile', false);
              }}
              onEditAddresses={() => {
                setReturnToReview(true);
                setTargetSection('addresses');
                goToStep('master_profile');
                saveDraft('master_profile', false);
              }}
              onEditPosition={() => {
                setReturnToReview(true);
                setTargetSection('posting_location');
                goToStep('job_specific');
                saveDraft('job_specific', false);
              }}
              onEditQualifications={() => {
                setReturnToReview(true);
                setTargetSection('qualifications');
                goToStep('job_specific');
                saveDraft('job_specific', false);
              }}
              onEditExperience={() => {
                setReturnToReview(true);
                setTargetSection('experience');
                goToStep('job_specific');
                saveDraft('job_specific', false);
              }}
              onEditQuestionnaire={activeQuestionnaire ? () => {
                setReturnToReview(true);
                setTargetSection('questionnaire');
                goToStep('questionnaire');
                saveDraft('questionnaire', false);
              } : undefined}
              onSubmit={handleReviewSubmit}
            />
          )}

        </div>

      </div>

      {/* ── JOB DETAILS MODAL ──────────────────────────────────────────────── */}
      <JobDetailsModal
        job={job}
        isOpen={showJobDetailsModal}
        onClose={() => setShowJobDetailsModal(false)}
      />
    </div>
  );
}
