import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, User, MapPin,
  GraduationCap, Briefcase, FileText, Eye, Loader2, Phone, Plus,
  Trash2, ChevronRight, Shield, Ban, Lock,
} from 'lucide-react';
import {
  getJob, getCandidateProfile, upsertCandidateProfile,
  createApplication, updateApplicationStatus, checkDuplicateAadhaar,
  getExistingApplication
} from '../lib/api';
import type { RmsJobPosting, RmsCandidateProfile, RmsApplication } from '../lib/types';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import OTPLoginModal from '../components/OTPLoginModal';
import { submitApplicationWithOtp } from '../../crm/lib/api';
import { MAHARASHTRA_DISTRICTS } from '../lib/constants';
import { getTalukasForDistrict } from '../../data/maharashtraGeography';
import { sendApplicationSubmittedTemplate } from '../../services/whatsappService';
import { formatAadhaarDisplay } from '../portal/utils/verhoeff';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step =
  | 'loading' | 'otp'
  | 'personal' | 'address' | 'education' | 'experience'
  | 'preference' | 'declaration' | 'preview' | 'submitting' | 'locked';

interface EduEntry  { degree: string; institution: string; board: string; year: string; percentage: string }
interface ExpEntry  { title: string; organization: string; from_date: string; to_date: string; description: string }

const EMPTY_EDU: EduEntry = { degree: '', institution: '', board: '', year: '', percentage: '' };
const EMPTY_EXP: ExpEntry = { title: '', organization: '', from_date: '', to_date: '', description: '' };

const STEP_LABELS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'personal',    label: 'Personal',    icon: User },
  { key: 'address',     label: 'Address',     icon: MapPin },
  { key: 'education',   label: 'Education',   icon: GraduationCap },
  { key: 'experience',  label: 'Experience',  icon: Briefcase },
  { key: 'preference',  label: 'Preference',  icon: MapPin },
  { key: 'declaration', label: 'Declaration', icon: Shield },
  { key: 'preview',     label: 'Preview',     icon: Eye },
];

const IC = 'w-full border border-primary-200 rounded-xl px-3 py-2.5 text-sm text-primary-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all placeholder-primary-400';
const LBL = 'block text-xs font-bold text-primary-600 uppercase tracking-wider mb-1.5';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Apply() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, verifiedMobile, loading: authLoading, refreshProfile } = useCandidateAuth();

  const [job, setJob] = useState<RmsJobPosting | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [candidate, setCandidate] = useState<RmsCandidateProfile | null>(null);
  const [lockedApp, setLockedApp] = useState<RmsApplication | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  // ── Personal ──────────────────────────────────────────────────────────────
  const [fullName, setFullName]     = useState('');
  const [dob, setDob]               = useState('');
  const [gender, setGender]         = useState('');
  const [fatherName, setFatherName] = useState('');
  const [aadhaar, setAadhaar]       = useState('');
  const [email, setEmail]           = useState('');

  // ── Address ───────────────────────────────────────────────────────────────
  const [addrLine1, setAddrLine1] = useState('');
  const [city, setCity]           = useState('');
  const [district, setDistrict]   = useState('');
  const [taluka, setTaluka]       = useState('');
  const [pincode, setPincode]     = useState('');

  // ── Education ─────────────────────────────────────────────────────────────
  const [education, setEducation] = useState<EduEntry[]>([{ ...EMPTY_EDU }]);

  // ── Experience ────────────────────────────────────────────────────────────
  const [experience, setExperience] = useState<ExpEntry[]>([]);

  // ── Preference ────────────────────────────────────────────────────────────
  const [prefDistrict, setPrefDistrict] = useState('');
  const [prefTaluka, setPrefTaluka]     = useState('');

  // ── Declaration ───────────────────────────────────────────────────────────
  const [declared, setDeclared] = useState(false);

  // ── Init: fetch job ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) {
      setJobLoading(false);
      return;
    }
    setJobLoading(true);
    getJob(jobId)
      .then(r => setJob(r.data))
      .finally(() => setJobLoading(false));
  }, [jobId]);

  const loadCandidate = useCallback(async (uid: string, currentJobId?: string) => {
    const { data } = await getCandidateProfile(uid);
    setCandidate(data);
    if (data) {
      // 1. Guard against duplicate active applications for THIS specific job
      if (currentJobId) {
        const { data: existingApp } = await getExistingApplication(data.id, currentJobId);
        if (existingApp && !existingApp.is_trashed) {
          setLockedApp(existingApp);
          setStep('locked');
          return;
        }
      }

      setFullName(data.full_name ?? '');
      setDob(data.date_of_birth ?? '');
      setGender(data.gender ?? '');
      setFatherName(data.father_name ?? '');
      setAadhaar(data.aadhar_number ?? '');
      setEmail(data.email ?? '');
      setAddrLine1(data.address_line1 ?? '');
      setCity(data.city ?? '');
      setDistrict(data.district ?? '');
      setTaluka(data.taluka ?? '');
      setPincode(data.pincode ?? '');
      if ((data.education as EduEntry[] ?? []).length > 0) setEducation(data.education as EduEntry[]);
      if ((data.experience as ExpEntry[] ?? []).length > 0) setExperience(data.experience as ExpEntry[]);
      setPrefDistrict(data.district ?? '');
      setStep(data.profile_complete ? 'preference' : 'personal');

      // 2. CRM Integration: Track Application Started event
      if (currentJobId && data.mobile) {
        import('../../crm/lib/api').then(({ getLeadForUser, updateLeadStage }) => {
          getLeadForUser(uid, data.mobile).then(lead => {
            if (lead?.id) {
              updateLeadStage(lead.id, currentJobId, 'Application Started', uid, 'Candidate').catch(err => {
                console.warn('[Apply] Stage update warning:', err);
              });
            }
          }).catch(err => {
            console.warn('[Apply] Lead lookup warning:', err);
          });
        }).catch(() => {});
      }
    } else {
      setStep('personal');
    }
  }, []);

  // ── Auth gate: wait for auth to settle, then route to OTP gate or form ───────
  // Runs whenever authLoading, user, or jobId changes.
  useEffect(() => {
    if (authLoading) return;                              // still resolving session
    if (step !== 'loading' && step !== 'otp') return;    // already past auth gate
    if (!user) {
      setStep('otp');                                     // not signed in → gate
      return;
    }
    loadCandidate(user.id, jobId);                       // signed in → load profile & check job application
  }, [authLoading, user, step, loadCandidate, jobId]);

  // ── OTP Success ───────────────────────────────────────────────────────────
  const handleOtpSuccess = (_isNewUser?: boolean, mobile?: string) => {
    setShowOtp(false);
    if (mobile && typeof window !== 'undefined') {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      try {
        sessionStorage.setItem('maha_candidate_verified_mobile', clean);
        localStorage.setItem('maha_candidate_verified_mobile', clean);
      } catch {}
    }
    if (user && jobId) {
      loadCandidate(user.id, jobId);
    }
    void refreshProfile();
  };

  // ── Profile Save + Advance ────────────────────────────────────────────────
  const saveProfile = async (extra: Record<string, unknown> = {}, nextStep: Step) => {
    if (!user) return;
    setError(null);

    // Resolve authoritative 10-digit mobile number from verified mobile, profile, or auth session
    const effectiveMobile = (
      candidate?.mobile ||
      verifiedMobile ||
      user.phone ||
      (user.user_metadata?.phone as string) ||
      (user.user_metadata?.mobile as string) ||
      ''
    ).replace(/\D/g, '').slice(-10);

    if (!effectiveMobile || effectiveMobile.length !== 10) {
      setError('A valid 10-digit verified mobile number is required to save your profile.');
      return;
    }

    const profileData = {
      user_id: user.id,
      mobile: effectiveMobile,
      full_name: fullName.trim(),
      date_of_birth: dob || null,
      gender: gender || null,
      father_name: fatherName.trim() || null,
      email: email.trim() || null,
      address_line1: addrLine1.trim() || null,
      city: city.trim() || null,
      district: district || null,
      taluka: taluka.trim() || null,
      pincode: pincode.trim() || null,
      state: 'Maharashtra',
      education: education.filter(e => e.degree.trim()),
      experience: experience.filter(e => e.title.trim()),
      ...(candidate?.candidate_id ? { candidate_id: candidate.candidate_id } : {}),
      ...extra,
    };
    const { data, error: err } = await upsertCandidateProfile(profileData as Parameters<typeof upsertCandidateProfile>[0]);
    if (err) {
      console.error('[Apply] Failed to save candidate profile:', {
        code: (err as { code?: string })?.code,
        message: (err as { message?: string })?.message,
      });
      setError((err as { message?: string })?.message || 'Failed to save profile. Please try again.');
      return;
    }
    if (data) setCandidate(data);
    setStep(nextStep);
  };

  // ── Step validators ───────────────────────────────────────────────────────
  const validatePersonal = async () => {
    if (!fullName.trim())   return setError('Full name is required.');
    if (!dob)               return setError('Date of birth is required.');
    if (!gender)            return setError('Gender is required.');
    if (aadhaar && aadhaar.replace(/\s/g,'').length !== 12) return setError('Aadhaar must be 12 digits.');
    if (aadhaar && user) {
      const isDup = await checkDuplicateAadhaar(aadhaar.replace(/\s/g,''), user.id);
      if (isDup) return setError('This Aadhaar number is already registered with another account.');
    }
    await saveProfile({}, 'address');
  };

  const validateAddress = async () => {
    if (!district) return setError('District is required.');
    if (!city.trim()) return setError('City/Village is required.');
    await saveProfile({}, 'education');
  };

  const validateEducation = async () => {
    if (education.filter(e => e.degree.trim()).length === 0)
      return setError('Please add at least one educational qualification.');
    await saveProfile({}, 'experience');
  };

  // ── Smart Location & District Allocations ──────────────────────────────────
  const allowedDistricts = useMemo<string[]>(() => {
    if (Array.isArray(job?.location_districts) && job.location_districts.length > 0) {
      return job.location_districts.filter(Boolean);
    }
    return [...MAHARASHTRA_DISTRICTS];
  }, [job?.location_districts]);

  const isDistrictLevel = useMemo(() => {
    return (
      job?.vacancy_level === 'district' ||
      job?.vacancy_allocations?.vacancy_level === 'district'
    );
  }, [job?.vacancy_level, job?.vacancy_allocations]);

  const availableTalukas = useMemo<string[]>(() => {
    if (!prefDistrict) return [];
    const distAlloc = job?.vacancy_allocations?.district_allocations?.[prefDistrict];
    if (distAlloc?.taluka_allocations && Object.keys(distAlloc.taluka_allocations).length > 0) {
      const talukas: string[] = [];
      Object.entries(distAlloc.taluka_allocations).forEach(([tName, tConfig]: [string, any]) => {
        if (tConfig && tConfig.included !== false) {
          talukas.push(tName);
        }
      });
      if (talukas.length > 0) return talukas;
    }
    return getTalukasForDistrict(prefDistrict);
  }, [prefDistrict, job?.vacancy_allocations]);

  const validatePreference = () => {
    if (!prefDistrict) return setError('Preferred district is required.');
    if (allowedDistricts.length > 0 && !allowedDistricts.includes(prefDistrict)) {
      return setError(`The selected district (${prefDistrict}) is not eligible for this position.`);
    }
    if (!isDistrictLevel && prefTaluka && availableTalukas.length > 0 && !availableTalukas.includes(prefTaluka)) {
      return setError(`The selected taluka (${prefTaluka}) has no allocated vacancies in ${prefDistrict}.`);
    }
    setError(null);
    setStep('declaration');
  };

  // ── Final Application Submit (Direct submission for authenticated candidate) ──
  const handleSubmitApplication = async () => {
    if (!user || !candidate || !job || !declared) return;
    if (job.status !== 'published' || job.is_trashed) {
      setError('Applications are closed for this position.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const effectiveMobile = (
      candidate.mobile ||
      verifiedMobile ||
      user.phone ||
      ''
    ).replace(/\D/g, '').slice(-10);

    // Ensure profile_complete is set
    await upsertCandidateProfile({
      user_id: user.id,
      mobile: effectiveMobile || candidate.mobile,
      full_name: candidate.full_name,
      ...(candidate.candidate_id ? { candidate_id: candidate.candidate_id } : {}),
      profile_complete: true,
    } as Parameters<typeof upsertCandidateProfile>[0]);

    // Construct immutable audit snapshot of submission details
    const submissionSnapshot = {
      submitted_at: new Date().toISOString(),
      candidate: {
        id: candidate.id,
        candidate_id: candidate.candidate_id,
        full_name: candidate.full_name,
        mobile: candidate.mobile,
        email: candidate.email,
        aadhar_number: aadhaar.trim() || null,
        date_of_birth: candidate.date_of_birth,
        gender: candidate.gender,
        father_name: candidate.father_name,
        address_line1: candidate.address_line1,
        city: candidate.city,
        district: candidate.district,
        taluka: candidate.taluka,
        state: candidate.state,
        pincode: candidate.pincode,
        education_entries: candidate.education_entries,
        experience_entries: candidate.experience_entries,
      },
      preferences: {
        preferred_district: prefDistrict,
        preferred_taluka: prefTaluka || null,
      },
      job: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        application_fee_amount: Number(job.application_fee_amount ?? 0),
        vacancy_level: job.vacancy_level,
      },
      declaration: {
        accepted: declared,
        declared_at: new Date().toISOString(),
      },
    };

    const isFreeJob = Number(job.application_fee_amount ?? 0) === 0;
    const targetStatus = isFreeJob ? 'submitted' : 'payment_pending';

    const { data, error: err } = await createApplication({
      candidate_id: candidate.id,
      job_posting_id: job.id,
      preferred_district: prefDistrict,
      preferred_location: prefTaluka || undefined,
      preferred_taluka: prefTaluka || null,
      status: targetStatus,
      application_data: {
        preferred_taluka: prefTaluka || null,
        submission_snapshot: submissionSnapshot,
      },
    });

    if (err || !data) {
      setSubmitting(false);
      console.error('[Apply] Application submission failed:', err);
      const errCode = (err as { code?: string })?.code;
      const errMsg = (err as { message?: string })?.message;

      if (errCode === '23505') {
        return setError('You have already applied for this position.');
      }
      if (errCode === 'INVALID_DISTRICT') {
        return setError(errMsg || `The selected district (${prefDistrict}) is not eligible for this position.`);
      }
      if (errCode === 'INVALID_TALUKA') {
        return setError(errMsg || `The selected taluka (${prefTaluka}) has no allocated vacancies in this district.`);
      }
      if (
        errCode === 'APPLICATIONS_CLOSED' ||
        errCode === '23514' ||
        errMsg?.includes('closed')
      ) {
        return setError(errMsg || 'Applications are closed for this position.');
      }
      return setError(errMsg || 'Failed to submit application. Please try again.');
    }

    // Set authoritative status based on whether fee payment is required
    await updateApplicationStatus(data.id, targetStatus);

    // WhatsApp Notification: Dispatch application confirmation ONLY for free jobs upon direct submission
    // For paid jobs, WhatsApp confirmation is sent upon payment completion in /candidate/payments
    if (isFreeJob && candidate.mobile) {
      try {
        await sendApplicationSubmittedTemplate(
          candidate.mobile,
          candidate.full_name || 'Candidate',
          job.title,
          data.application_number,
        );
      } catch (notifErr) {
        console.error('[Apply] Failed to dispatch application submitted WhatsApp message:', notifErr);
      }
    }

    // CRM Integration: Track Application Submitted (reusing authoritative application number)
    try {
      await submitApplicationWithOtp(user.id, job.id, user.id, {
        ...candidate,
        application_id: data.application_number,
      }, data.application_number);
    } catch (crmErr) {
      console.error('Failed to log application via CRM API:', crmErr);
    }

    navigate('/careers/apply/success/' + data.id);
  };

  // ─── Render loading ────────────────────────────────────────────────────────
  if (step === 'loading' || jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  // ─── Missing Job / Invalid ID ──────────────────────────────────────────────
  if (!job) {
    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-primary-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Position Not Found</h2>
          <p className="text-sm text-primary-600 mb-6">
            The job listing could not be found or the link may be invalid.
          </p>
          <button
            onClick={() => navigate('/careers')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all"
          >
            Browse All Positions <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Closed / Non-published Job Guard ──────────────────────────────────────
  if (job.status !== 'published' || job.is_trashed) {
    const isClosed = job.status === 'applications_closed';
    const isComingSoon = job.status === 'coming_soon';
    const isFilled = job.status === 'filled';
    const titleText = isClosed
      ? 'Applications Closed'
      : isComingSoon
      ? 'Applications Opening Soon'
      : isFilled
      ? 'Position Filled'
      : 'Position Not Available';

    const messageText = isClosed
      ? `Applications for "${job.title}" are now closed. No new applications are being accepted for this position.`
      : isComingSoon
      ? `Applications for "${job.title}" have not opened yet. Please check back when applications are officially opened.`
      : isFilled
      ? `This position ("${job.title}") has already been filled.`
      : `This position is currently not accepting applications.`;

    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-primary-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">{titleText}</h2>
          <p className="text-sm text-primary-600 mb-6 leading-relaxed">
            {messageText}
          </p>
          <button
            onClick={() => navigate('/careers')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all"
          >
            Browse Active Openings <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'locked') {
    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-primary-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Application Already Submitted</h2>
          <p className="text-sm text-primary-600 mb-6">
            You have already submitted an active application for this position{lockedApp?.application_number ? ` (ID: ${lockedApp.application_number})` : ''}. The application is currently under review by our recruitment team.
          </p>
          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/candidate/applications')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all shadow-sm"
            >
              View My Applications <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/careers')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-primary-200 text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-all"
            >
              Browse Other Positions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── OTP Gate ──────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-primary-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary-900 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Login to Apply</h2>
          <p className="text-sm text-primary-500 mb-6">
            {job ? <>Applying for <strong className="text-primary-800">{job.title}</strong></> : 'Please log in with your mobile number to continue.'}
          </p>
          <button onClick={() => setShowOtp(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all">
            Login with OTP <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <OTPLoginModal isOpen={showOtp} onClose={() => setShowOtp(false)} onSuccess={handleOtpSuccess}
          title="Login to Apply" subtitle="Sign in with your registered mobile number" />
      </div>
    );
  }

  // ─── Progress bar ──────────────────────────────────────────────────────────
  const isMasterProfileComplete = Boolean(candidate?.profile_complete);
  const formSteps = isMasterProfileComplete
    ? [
        { key: 'preference' as Step,  label: 'Job Preference',  icon: MapPin },
        { key: 'declaration' as Step, label: 'Declaration', icon: Shield },
        { key: 'preview' as Step,     label: 'Preview',     icon: Eye },
      ]
    : STEP_LABELS;
  const currentIdx = formSteps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-primary-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Job context header */}
        <div className="flex items-center gap-3 mb-5 bg-white rounded-xl border border-primary-100 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-primary-500 font-medium">Applying for</p>
            <p className="text-sm font-bold text-primary-900 truncate">{job.title}</p>
          </div>
          {job.application_fee_amount > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg shrink-0">
              Fee: ₹{job.application_fee_amount}
            </span>
          )}
        </div>

        {/* Step progress */}
        {currentIdx >= 0 && (
          <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
            {formSteps.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-1 shrink-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    done ? 'bg-emerald-100 text-emerald-700' :
                    active ? 'bg-primary-900 text-white' :
                    'bg-white text-primary-400 border border-primary-100'
                  }`}>
                    {done ? <CheckCircle2 className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                  {i < formSteps.length - 1 && <ChevronRight className="w-3 h-3 text-primary-300 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="bg-white rounded-2xl border border-primary-100 p-6 md:p-8"
          >
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* ── PERSONAL ──────────────────────────────────────────────── */}
            {step === 'personal' && (
              <StepShell title="Personal Details" subtitle="Your basic information"
                onBack={() => navigate(`/careers/jobs/${job.slug}`)}
                onNext={validatePersonal}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={LBL}>Full Name *</label>
                    <input className={IC} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As per Aadhaar card" />
                  </div>
                  <div>
                    <label className={LBL}>Date of Birth *</label>
                    <input type="date" className={IC} value={dob} onChange={e => setDob(e.target.value)} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className={LBL}>Gender *</label>
                    <select className={IC} value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Father's Name</label>
                    <input className={IC} value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Father's full name" />
                  </div>
                  <div>
                    <label className={LBL}>Email</label>
                    <input type="email" className={IC} value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LBL}>Aadhaar Number</label>
                    <input className={IC} value={formatAadhaarDisplay(aadhaar)}
                      onChange={e => setAadhaar(e.target.value.replace(/\D/g,'').slice(0,12))}
                      placeholder="1234-5678-9012" inputMode="numeric" maxLength={14} />
                    <p className="mt-1 text-xs text-primary-400">Used for duplicate application prevention. Must be unique.</p>
                  </div>
                </div>
              </StepShell>
            )}

            {/* ── ADDRESS ───────────────────────────────────────────────── */}
            {step === 'address' && (
              <StepShell title="Address Details" subtitle="Your current residential address"
                onBack={() => setStep('personal')} onNext={validateAddress}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={LBL}>Address Line *</label>
                    <input className={IC} value={addrLine1} onChange={e => setAddrLine1(e.target.value)} placeholder="House No., Street, Village/Ward" />
                  </div>
                  <div>
                    <label className={LBL}>District *</label>
                    <select
                      className={IC}
                      value={district}
                      onChange={e => {
                        setDistrict(e.target.value);
                        setTaluka('');
                      }}
                    >
                      <option value="">Select district</option>
                      {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Taluka</label>
                    {district && getTalukasForDistrict(district).length > 0 ? (
                      <select className={IC} value={taluka} onChange={e => setTaluka(e.target.value)}>
                        <option value="">Select taluka</option>
                        {getTalukasForDistrict(district).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <input className={IC} value={taluka} onChange={e => setTaluka(e.target.value)} placeholder="Taluka name" />
                    )}
                  </div>
                  <div>
                    <label className={LBL}>City / Village *</label>
                    <input className={IC} value={city} onChange={e => setCity(e.target.value)} placeholder="City or Village" />
                  </div>
                  <div>
                    <label className={LBL}>PIN Code</label>
                    <input className={IC} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit PIN" inputMode="numeric" maxLength={6} />
                  </div>
                </div>
              </StepShell>
            )}

            {/* ── EDUCATION ─────────────────────────────────────────────── */}
            {step === 'education' && (
              <StepShell title="Educational Qualifications" subtitle="Add your educational background"
                onBack={() => setStep('address')} onNext={validateEducation}>
                <div className="space-y-4">
                  {education.map((edu, i) => (
                    <div key={i} className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-primary-600">Qualification {i + 1}</span>
                        {education.length > 1 && (
                          <button onClick={() => setEducation(education.filter((_, j) => j !== i))}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className={LBL}>Degree / Certificate *</label>
                          <input className={IC} value={edu.degree}
                            onChange={e => setEducation(education.map((x, j) => j === i ? { ...x, degree: e.target.value } : x))}
                            placeholder="e.g. B.Sc. Agriculture, HSC, SSC" />
                        </div>
                        <div className="col-span-2">
                          <label className={LBL}>Institution</label>
                          <input className={IC} value={edu.institution}
                            onChange={e => setEducation(education.map((x, j) => j === i ? { ...x, institution: e.target.value } : x))}
                            placeholder="College / School name" />
                        </div>
                        <div>
                          <label className={LBL}>Year of Passing</label>
                          <input className={IC} value={edu.year}
                            onChange={e => setEducation(education.map((x, j) => j === i ? { ...x, year: e.target.value } : x))}
                            placeholder="e.g. 2020" inputMode="numeric" maxLength={4} />
                        </div>
                        <div>
                          <label className={LBL}>Percentage / Grade</label>
                          <input className={IC} value={edu.percentage}
                            onChange={e => setEducation(education.map((x, j) => j === i ? { ...x, percentage: e.target.value } : x))}
                            placeholder="e.g. 72%" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEducation([...education, { ...EMPTY_EDU }])}
                    className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-900 transition-colors">
                    <Plus className="w-4 h-4" /> Add Another Qualification
                  </button>
                </div>
              </StepShell>
            )}

            {/* ── EXPERIENCE ────────────────────────────────────────────── */}
            {step === 'experience' && (
              <StepShell title="Work Experience" subtitle="Add relevant work experience (optional)"
                onBack={() => setStep('education')}
                onNext={async () => { await saveProfile({}, 'preference'); }}
                nextLabel="Save & Continue">
                <div className="space-y-4">
                  {experience.map((exp, i) => (
                    <div key={i} className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-primary-600">Experience {i + 1}</span>
                        <button onClick={() => setExperience(experience.filter((_, j) => j !== i))}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className={LBL}>Job Title / Role *</label>
                          <input className={IC} value={exp.title}
                            onChange={e => setExperience(experience.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                            placeholder="e.g. Field Supervisor" />
                        </div>
                        <div className="col-span-2">
                          <label className={LBL}>Organization</label>
                          <input className={IC} value={exp.organization}
                            onChange={e => setExperience(experience.map((x, j) => j === i ? { ...x, organization: e.target.value } : x))}
                            placeholder="Organization name" />
                        </div>
                        <div>
                          <label className={LBL}>From Year</label>
                          <input className={IC} value={exp.from_date}
                            onChange={e => setExperience(experience.map((x, j) => j === i ? { ...x, from_date: e.target.value } : x))}
                            placeholder="2020" inputMode="numeric" maxLength={4} />
                        </div>
                        <div>
                          <label className={LBL}>To Year</label>
                          <input className={IC} value={exp.to_date}
                            onChange={e => setExperience(experience.map((x, j) => j === i ? { ...x, to_date: e.target.value } : x))}
                            placeholder="2023 / Present" maxLength={7} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setExperience([...experience, { ...EMPTY_EXP }])}
                    className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-900 transition-colors">
                    <Plus className="w-4 h-4" /> Add Experience
                  </button>
                  {experience.length === 0 && (
                    <p className="text-sm text-primary-400 text-center py-4 bg-primary-50 rounded-xl">
                      No experience required for this position. You can skip this step.
                    </p>
                  )}
                </div>
              </StepShell>
            )}

            {/* ── PREFERENCE ────────────────────────────────────────────── */}
            {step === 'preference' && (
              <StepShell title="Location Preference" subtitle="Select your preferred posting location"
                onBack={() => isMasterProfileComplete ? navigate(`/careers/jobs/${job.slug}`) : setStep('experience')} 
                onNext={validatePreference}>
                <div className="space-y-4">
                  {/* Master Profile Summary Card for Complete Profiles */}
                  {isMasterProfileComplete && (
                    <div className="p-4 bg-primary-50/70 rounded-xl border border-primary-200/80 mb-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-primary-900 uppercase tracking-wider">
                            Verified Candidate Profile
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/candidate/profile?redirect=/careers/apply/${job.id}`)}
                          className="text-xs font-semibold text-primary-700 hover:text-primary-950 underline underline-offset-2 flex items-center gap-1"
                        >
                          Edit in My Profile
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-primary-400 font-medium">Candidate Name: </span>
                          <span className="font-bold text-primary-900">{candidate?.full_name || fullName}</span>
                        </div>
                        <div>
                          <span className="text-primary-400 font-medium">Mobile (Verified): </span>
                          <span className="font-bold text-primary-900">{candidate?.mobile || user?.phone || '—'}</span>
                        </div>
                        {email && (
                          <div>
                            <span className="text-primary-400 font-medium">Email: </span>
                            <span className="font-bold text-primary-900">{email}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-primary-400 font-medium">Home District / Taluka: </span>
                          <span className="font-bold text-primary-900">{district ? `${district}${taluka ? `, ${taluka}` : ''}` : '—'}</span>
                        </div>
                        {education.length > 0 && education[0].degree && (
                          <div className="sm:col-span-2">
                            <span className="text-primary-400 font-medium">Highest Qualification: </span>
                            <span className="font-bold text-primary-900">
                              {education[0].degree}{education[0].percentage ? ` (${education[0].percentage})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isDistrictLevel && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">District-Level Opening</p>
                        <p className="text-emerald-700 mt-0.5">
                          This vacancy is open district-wide. Candidates residing in any taluka within the selected district are eligible to apply.
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={LBL}>Preferred District *</label>
                    <select
                      className={IC}
                      value={prefDistrict}
                      onChange={e => {
                        setPrefDistrict(e.target.value);
                        setPrefTaluka('');
                      }}
                    >
                      <option value="">Select preferred district</option>
                      {allowedDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>
                      Preferred Taluka {isDistrictLevel ? '(Optional — District-wide)' : ''}
                    </label>
                    {availableTalukas.length > 0 ? (
                      <select
                        className={IC}
                        value={prefTaluka}
                        onChange={e => setPrefTaluka(e.target.value)}
                        disabled={!prefDistrict}
                      >
                        <option value="">
                          {isDistrictLevel ? 'All Talukas (District-wide Quota)' : 'Select preferred taluka'}
                        </option>
                        {availableTalukas.map(t => {
                          const distAlloc = job?.vacancy_allocations?.district_allocations?.[prefDistrict];
                          const vacCount = distAlloc?.taluka_allocations?.[t]?.vacancies;
                          return (
                            <option key={t} value={t}>
                              {t}{vacCount !== undefined && vacCount !== null ? ` (${vacCount} ${vacCount === 1 ? 'vacancy' : 'vacancies'})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        className={IC}
                        value={prefTaluka}
                        onChange={e => setPrefTaluka(e.target.value)}
                        placeholder={!prefDistrict ? 'Select a district first' : 'Enter preferred taluka'}
                        disabled={!prefDistrict}
                      />
                    )}
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
                    <p className="font-semibold mb-1">Note:</p>
                    <p>Location preference is subject to availability of vacancies. Final posting district will be determined by HR based on eligibility and vacancy.</p>
                  </div>
                </div>
              </StepShell>
            )}

            {/* ── DECLARATION ───────────────────────────────────────────── */}
            {step === 'declaration' && (
              <StepShell title="Declaration" subtitle="Please read and accept before proceeding"
                onBack={() => setStep('preference')}
                onNext={() => { if (!declared) { setError('You must accept the declaration to continue.'); return; } setError(null); setStep('preview'); }}>
                <div className="space-y-4">
                  <div className="bg-primary-50 rounded-xl border border-primary-100 p-4 text-sm text-primary-700 space-y-2 leading-relaxed">
                    <p className="font-bold text-primary-900">Declaration by Applicant</p>
                    <p>I hereby declare that all the information provided in this application form is true, complete, and correct to the best of my knowledge and belief.</p>
                    <p>I understand that any false information, misrepresentation, or suppression of material facts will render my candidature liable to cancellation at any stage of the recruitment process, including after appointment.</p>
                    <p>I confirm that I have read and understood the eligibility criteria, terms, and conditions for the above position and I fulfil all the requirements.</p>
                    <p>I agree to abide by the rules and regulations of Abhinav Bharat Foundation and the terms of engagement for the applied position.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      declared ? 'bg-primary-900 border-primary-900' : 'border-primary-300 group-hover:border-primary-500'
                    }`} onClick={() => setDeclared(!declared)}>
                      {declared && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-primary-700 font-medium select-none" onClick={() => setDeclared(!declared)}>
                      I have read, understood, and accept the above declaration. I confirm that all information provided is accurate and complete.
                    </span>
                  </label>
                </div>
              </StepShell>
            )}

            {/* ── PREVIEW ───────────────────────────────────────────────── */}
            {step === 'preview' && (
              <div>
                <h2 className="text-xl font-bold text-primary-900 mb-1">Review Application</h2>
                <p className="text-sm text-primary-500 mb-5">Verify all details before final submission.</p>

                <div className="space-y-4 mb-6">
                  <PreviewSection title="Position">
                    <PreviewField label="Role" value={job.title} />
                    {job.department && <PreviewField label="Department" value={job.department} />}
                    {job.application_fee_amount > 0 && <PreviewField label="Application Fee" value={`₹${job.application_fee_amount} (payable after submission)`} />}
                  </PreviewSection>

                  <PreviewSection title="Personal Details">
                    <PreviewField label="Full Name" value={fullName} />
                    <PreviewField label="Date of Birth" value={dob ? new Date(dob).toLocaleDateString('en-IN') : '—'} />
                    <PreviewField label="Gender" value={gender} />
                    {fatherName && <PreviewField label="Father's Name" value={fatherName} />}
                    {email && <PreviewField label="Email" value={email} />}
                    {aadhaar && <PreviewField label="Aadhaar" value={`XXXX XXXX ${aadhaar.slice(-4)}`} />}
                  </PreviewSection>

                  <PreviewSection title="Address">
                    <PreviewField label="District" value={district} />
                    <PreviewField label="Taluka" value={taluka || '—'} />
                    <PreviewField label="City" value={city} />
                    <PreviewField label="PIN" value={pincode || '—'} />
                  </PreviewSection>

                  <PreviewSection title="Education">
                    {education.filter(e => e.degree.trim()).map((e, i) => (
                      <div key={i} className="col-span-2 text-sm text-primary-800 bg-primary-50 rounded-lg p-2">
                        <span className="font-semibold">{e.degree}</span>{e.institution ? ` — ${e.institution}` : ''}{e.year ? `, ${e.year}` : ''}{e.percentage ? `, ${e.percentage}` : ''}
                      </div>
                    ))}
                  </PreviewSection>

                  <PreviewSection title="Location Preference">
                    <PreviewField label="Preferred District" value={prefDistrict} />
                    <PreviewField label="Preferred Taluka" value={prefTaluka || '—'} />
                  </PreviewSection>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('declaration')} disabled={submitting}
                    className="flex items-center gap-2 px-5 py-3 border border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors disabled:opacity-50">
                    <ArrowLeft className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={handleSubmitApplication} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-70 transition-all">
                    {submitting
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Application...</>
                      : (job.application_fee_amount ?? 0) > 0
                        ? <><CheckCircle2 className="w-5 h-5" /> Submit & Proceed to Fee Payment</>
                        : <><CheckCircle2 className="w-5 h-5" /> Submit Application</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Step shell ───────────────────────────────────────────────────────────────
function StepShell({
  title, subtitle, children, onBack, onNext, nextLabel = 'Save & Continue',
}: {
  title: string; subtitle: string; children: React.ReactNode;
  onBack?: () => void; onNext?: () => void; nextLabel?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-primary-900 mb-0.5">{title}</h2>
      <p className="text-sm text-primary-500 mb-5">{subtitle}</p>
      {children}
      <div className="flex gap-3 mt-6">
        {onBack && (
          <button onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 border border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        {onNext && (
          <button onClick={onNext}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all">
            {nextLabel} <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Preview helpers ──────────────────────────────────────────────────────────
function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-primary-100 rounded-xl overflow-hidden">
      <div className="bg-primary-50 px-4 py-2 border-b border-primary-100">
        <p className="text-xs font-bold text-primary-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4">{children}</div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-primary-400">{label}</p>
      <p className="text-sm font-semibold text-primary-900 capitalize">{value || '—'}</p>
    </div>
  );
}
