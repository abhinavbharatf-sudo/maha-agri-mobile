import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Building2,
  Check,
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { INITIAL_MASTER_PROFILE, type MasterProfileFormData } from '../portal/types';
import Step1CreateProfile from '../portal/steps/Step1CreateProfile';
import Step2MasterProfile from '../portal/steps/Step2MasterProfile';
import { normalizeMobileNumber } from '../../lib/utils';

// Preserved helper to check for Marathi / Devanagari or non-English script for backward-compatibility
export function containsNonEnglish(str: string | null | undefined): boolean {
  if (!str) return false;
  return /[\u0900-\u097F]/.test(str) || !/^[\x20-\x7E\s]*$/.test(str);
}

export default function MyProfile() {
  const { user, profile, refreshProfile, verifiedMobile: contextMobile } = useCandidateAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect');

  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [data, setData] = useState<MasterProfileFormData>(INITIAL_MASTER_PROFILE);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const lastProfileSignatureRef = useRef<string | null>(null);

  // Authoritative mobile resolution derived strictly from authenticated candidate identity
  const authoritativeMobile = useMemo(() => {
    const fromUser = user?.phone ? normalizeMobileNumber(user.phone) : '';
    const fromCtx = contextMobile ? normalizeMobileNumber(contextMobile) : '';
    const fromProfile = profile?.mobile ? normalizeMobileNumber(profile.mobile) : '';
    return fromUser || fromCtx || fromProfile || '';
  }, [user?.phone, contextMobile, profile?.mobile]);

  const cleanVerifiedMobile = authoritativeMobile.replace(/\D/g, '').slice(-10);

  // Initialize and synchronize master profile data from candidate profile
  useEffect(() => {
    if (!profile) {
      if (cleanVerifiedMobile) {
        setData(prev => ({
          ...prev,
          mobile: cleanVerifiedMobile,
        }));
      }
      return;
    }

    // Rehydrate when profile is first loaded or when updated data is returned from server
    const profileSignature = `${profile.id}:${profile.updated_at || profile.created_at || ''}:${profile.full_name || ''}:${profile.mobile || ''}`;
    if (lastProfileSignatureRef.current === profileSignature) return;
    lastProfileSignatureRef.current = profileSignature;

    const formattedCreatedDate = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    const altMobile = profile.alternate_mobile || profile.emergency_mobile || '';
    const currentAddress = profile.address_line1 || '';
    const currentDist = profile.district || '';
    const currentTal = profile.taluka || '';
    const currentPin = profile.pincode || '';

    const permSame = (profile as any).permanent_same_as_current ?? false;
    const permAddress = (profile as any).permanent_address_line1 || (permSame ? currentAddress : '');
    const permDist = (profile as any).permanent_district || (permSame ? currentDist : '');
    const permTal = (profile as any).permanent_taluka || (permSame ? currentTal : '');
    const permPin = (profile as any).permanent_pincode || (permSame ? currentPin : '');

    setData({
      ...INITIAL_MASTER_PROFILE,
      fullName: (profile.full_name || '').toUpperCase(),
      dateOfBirth: profile.date_of_birth || '',
      gender: profile.gender || '',
      mobile: cleanVerifiedMobile || profile.mobile || '',
      alternateMobile: altMobile,
      email: (profile.email || '').toLowerCase(),
      candidateId: profile.candidate_id || '',
      profileCreatedDate: formattedCreatedDate,
      casteCategory: profile.caste_category || '',
      homeDistrict: currentDist,
      homeTaluka: currentTal,
      addressLine1: currentAddress,
      pincode: currentPin,
      currentAddressLine1: currentAddress,
      currentDistrict: currentDist,
      currentTaluka: currentTal,
      currentPincode: currentPin,
      permanentSameAsCurrent: permSame,
      permanentAddressLine1: permAddress,
      permanentDistrict: permDist,
      permanentTaluka: permTal,
      permanentPincode: permPin,
      consentGiven: false,
    });
  }, [profile, cleanVerifiedMobile]);

  // Update single field in master profile
  const updateField = useCallback((field: keyof MasterProfileFormData, value: any) => {
    setData(prev => {
      if (field === 'gender' && !value && prev.gender) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
    setSaveSuccess(false);
  }, []);

  // Handle final completion from Step 2
  const handleFinalSave = useCallback(async () => {
    await refreshProfile();
    setSaveSuccess(true);
    const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior: scrollBehavior });

    if (redirectUrl) {
      setTimeout(() => {
        navigate(redirectUrl);
      }, 1500);
    }
  }, [refreshProfile, redirectUrl, navigate]);

  const displayCandidateId = profile?.candidate_id || data.candidateId || 'Generated upon registration';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4 text-primary-600" />
              <span>MAHA-AGRI Recruitment Management System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#102a43]">
              Candidate Master Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Official verified demographic identity and residential addresses. Automatically synchronized across all job applications.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-900 border border-primary-200 rounded-xl text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-700" />
              {displayCandidateId}
            </span>
            {cleanVerifiedMobile && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                +91 {cleanVerifiedMobile}
              </span>
            )}
          </div>
        </div>

        {/* ── 2-Step Interactive Nav Tabs ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setActiveStep(1);
              const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
              window.scrollTo({ top: 0, behavior: scrollBehavior });
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none focus-visible:ring-offset-2 ${
              activeStep === 1
                ? 'bg-[#102a43] text-white border-[#102a43] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === 1 ? 'bg-white text-[#102a43]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                1
              </span>
              <span className="text-xs sm:text-sm font-bold">
                Step 1: Personal Details &amp; Contact
              </span>
            </div>
            <p className={`text-[11px] pl-8.5 ${activeStep === 1 ? 'text-slate-200' : 'text-slate-500'}`}>
              Full Name, Date of Birth, Gender, Alternate Contact, Email &amp; Consent
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveStep(2);
              const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
              window.scrollTo({ top: 0, behavior: scrollBehavior });
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none focus-visible:ring-offset-2 ${
              activeStep === 2
                ? 'bg-[#102a43] text-white border-[#102a43] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === 2 ? 'bg-white text-[#102a43]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                2
              </span>
              <span className="text-xs sm:text-sm font-bold">
                Step 2: Identity &amp; Address Details
              </span>
            </div>
            <p className={`text-[11px] pl-8.5 ${activeStep === 2 ? 'text-slate-200' : 'text-slate-500'}`}>
              Aadhaar Verification, Caste Category, Current &amp; Permanent Addresses
            </p>
          </button>
        </div>
      </div>

      {/* ── Success Feedback Alert ─────────────────────────────────────────── */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm text-emerald-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">
                Candidate Master Profile Successfully Updated!
              </p>
              <p className="text-emerald-800 text-xs mt-0.5 leading-relaxed">
                Your official identity, Aadhaar verification, and residential addresses have been securely updated in the master recruitment registry and will automatically reflect on all current and upcoming applications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/candidate/applications"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              My Applications
            </Link>
          </div>
        </div>
      )}

      {/* ── Redirect Notification ─────────────────────────────────────────── */}
      {redirectUrl && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <span>You arrived here from an active application workflow. Changes will automatically take effect when you return.</span>
          <button
            type="button"
            onClick={() => navigate(redirectUrl)}
            className="font-bold underline text-blue-700 hover:text-blue-900 shrink-0 ml-2"
          >
            Return to Application →
          </button>
        </div>
      )}

      {/* ── Standalone Form Step Body ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {activeStep === 1 && (
          <Step1CreateProfile
            data={data}
            userId={user?.id || ''}
            verifiedMobile={cleanVerifiedMobile || data.mobile}
            candidateId={profile?.candidate_id || data.candidateId}
            profileCreatedDate={data.profileCreatedDate}
            cancelButtonLabel="Return to Dashboard"
            onChange={updateField}
            onNext={() => {
              setActiveStep(2);
              const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
              window.scrollTo({ top: 0, behavior: scrollBehavior });
            }}
            onCancel={() => navigate('/candidate/dashboard')}
          />
        )}

        {activeStep === 2 && (
          <Step2MasterProfile
            data={data}
            userId={user?.id || ''}
            verifiedMobile={cleanVerifiedMobile || data.mobile}
            isCasteRequired={false}
            submitButtonLabel="Save Master Profile"
            cancelButtonLabel="Return to Dashboard"
            onChange={updateField}
            onNext={handleFinalSave}
            onBack={() => {
              setActiveStep(1);
              const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
              window.scrollTo({ top: 0, behavior: scrollBehavior });
            }}
            onCancel={() => navigate('/candidate/dashboard')}
          />
        )}
      </div>
    </div>
  );
}
