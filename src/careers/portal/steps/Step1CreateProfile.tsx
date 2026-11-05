import { useState, useRef } from 'react';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Phone,
  Mail,
  Shield,
  Lock,
  X,
  Clock,
  Check,
  Info
} from 'lucide-react';
import { upsertCandidateProfile } from '../../lib/api';
import type { MasterProfileFormData } from '../types';
import { calculateAgeWithMonths, getLocalTodayIso } from '../utils/verhoeff';

interface Step1CreateProfileProps {
  data: MasterProfileFormData;
  userId: string;
  verifiedMobile: string;
  candidateId?: string;
  profileCreatedDate?: string;
  isCasteRequired?: boolean;
  cancelButtonLabel?: string;
  returnToReview?: boolean;
  onChange: (field: keyof MasterProfileFormData, value: any) => void;
  onNext: () => void;
  onCancel: () => void;
}

export type FieldErrors = Partial<Record<keyof MasterProfileFormData | 'consent', string>>;

export const PRIVACY_NOTICE_TEXT =
  'I consent to the collection and processing of my personal information for recruitment purposes.';

export const PRIVACY_NOTICE_VERSION = 'v1.0';

export default function Step1CreateProfile({
  data,
  userId,
  verifiedMobile,
  candidateId,
  profileCreatedDate,
  cancelButtonLabel,
  returnToReview,
  onChange,
  onNext,
  onCancel,
}: Step1CreateProfileProps) {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Focus and auto-scroll element references
  const fieldRefs = {
    fullName: useRef<HTMLInputElement>(null),
    dateOfBirth: useRef<HTMLInputElement>(null),
    gender: useRef<HTMLSelectElement>(null),
    alternateMobile: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    consent: useRef<HTMLInputElement>(null),
  };

  const cleanVerifiedMobile = (verifiedMobile || data.mobile || '').replace(/\D/g, '').slice(-10);
  const ageDetails = data.dateOfBirth ? calculateAgeWithMonths(data.dateOfBirth) : null;

  // Determine if a real permanent Candidate ID exists from the server
  const rawCandidateId = candidateId || data.candidateId || '';
  const isPermanentId = Boolean(
    rawCandidateId &&
    !rawCandidateId.toLowerCase().includes('dummy') &&
    !rawCandidateId.toLowerCase().includes('pending')
  );

  const displayCandidateId = isPermanentId
    ? rawCandidateId
    : 'Will be generated after profile creation';

  const displayCreatedDate = (isPermanentId && (profileCreatedDate || data.profileCreatedDate))
    ? (profileCreatedDate || data.profileCreatedDate)
    : 'Will be recorded upon profile creation';

  // Single field validator
  const validateField = (field: keyof MasterProfileFormData | 'consent', value: any): string | null => {
    switch (field) {
      case 'fullName': {
        const trimmed = (value || '').trim();
        if (!trimmed) {
          return 'Full name is required. Must match name on Aadhaar Card.';
        }
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English letters (A–Z) and spaces are allowed. Please enter text in English CAPITAL letters.';
        }
        if (/\d/.test(trimmed)) {
          return 'Only English letters (A–Z) and spaces are allowed. Numbers are not permitted.';
        }
        const englishOnlyRegex = /^[A-Z\s'-]+$/;
        if (!englishOnlyRegex.test(trimmed)) {
          return 'Only English letters (A–Z) and spaces are allowed.';
        }
        if (trimmed.length < 2) {
          return 'Please enter a valid full name (minimum 2 characters).';
        }
        return null;
      }

      case 'dateOfBirth': {
        const trimmed = (value || '').trim();
        if (!trimmed) {
          return 'Date of birth is required.';
        }
        const dob = new Date(trimmed);
        if (isNaN(dob.getTime())) {
          return 'Enter a valid date of birth.';
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dob > today) {
          return 'Date of birth cannot be in the future.';
        }
        const minDob = new Date('1940-01-01');
        if (dob < minDob) {
          return 'Please enter a realistic date of birth (after 1940).';
        }

        const ageInfo = calculateAgeWithMonths(trimmed);
        if (ageInfo && !ageInfo.is18OrAbove) {
          return 'You must be at least 18 years old to proceed.';
        }
        return null;
      }

      case 'gender': {
        const trimmed = (value || '').trim();
        if (!trimmed) {
          return 'Please select your gender.';
        }
        const validGenders = ['Male', 'Female', 'Transgender', 'male', 'female', 'other'];
        if (!validGenders.includes(trimmed)) {
          return 'Please select a valid gender option.';
        }
        return null;
      }

      case 'alternateMobile': {
        const raw = (value || '').trim().replace(/\D/g, '');
        if (!raw) return null; // Optional
        const cleanDigits = raw.length === 12 && raw.startsWith('91')
          ? raw.slice(2)
          : raw.length === 11 && raw.startsWith('0')
          ? raw.slice(1)
          : raw;
        if (cleanDigits.length !== 10) {
          return 'Alternate mobile number must be exactly 10 digits.';
        }
        if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
          return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
        }
        // Alternate number may be identical to WhatsApp verified number
        return null;
      }

      case 'email': {
        const trimmed = (value || '').trim().toLowerCase();
        if (!trimmed) return null; // Optional
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English characters are allowed. Marathi / Devanagari characters are not permitted.';
        }
        if (!trimmed.includes('@')) {
          return "Email address must contain '@' (e.g. name@example.com).";
        }
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address with a valid domain (e.g. name@example.com).';
        }
        return null;
      }

      case 'consent': {
        if (!value) {
          return 'You must accept the Privacy Notice to proceed.';
        }
        return null;
      }

      default:
        return null;
    }
  };

  const handleFieldChange = (field: keyof MasterProfileFormData, value: string) => {
    let finalValue = value;
    if (field === 'fullName') {
      finalValue = value.toUpperCase();
    } else if (field === 'alternateMobile') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'email') {
      finalValue = value.toLowerCase().replace(/\s+/g, '');
    }

    onChange(field, finalValue);

    // Live validation update
    const err = validateField(field, finalValue);
    setErrors(prev => {
      const next = { ...prev };
      if (err) {
        next[field] = err;
      } else {
        delete next[field];
      }
      return next;
    });

    if (formError) setFormError(null);
  };

  const handleConsentCheckboxChange = (checked: boolean) => {
    onChange('consentGiven', checked);
    if (checked) {
      onChange('consentTimestamp', new Date().toISOString());
      onChange('privacyNoticeVersion', PRIVACY_NOTICE_VERSION);
      setErrors(prev => {
        const next = { ...prev };
        delete next.consent;
        return next;
      });
    }
  };

  // Comprehensive validation across all mandatory fields
  const validateAllFields = (): { isValid: boolean; newErrors: FieldErrors } => {
    const newErrors: FieldErrors = {};

    const fnErr = validateField('fullName', data.fullName);
    if (fnErr) newErrors.fullName = fnErr;

    const dobErr = validateField('dateOfBirth', data.dateOfBirth);
    if (dobErr) newErrors.dateOfBirth = dobErr;

    const gErr = validateField('gender', data.gender);
    if (gErr) newErrors.gender = gErr;

    const altErr = validateField('alternateMobile', data.alternateMobile);
    if (altErr) newErrors.alternateMobile = altErr;

    if (data.email) {
      const emErr = validateField('email', data.email);
      if (emErr) newErrors.email = emErr;
    }

    if (!data.consentGiven) {
      newErrors.consent = 'You must accept the Privacy Notice to proceed.';
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      newErrors,
    };
  };

  const executeSaveProfile = async () => {
    setSaving(true);
    setFormError(null);

    try {
      const cleanMobile = cleanVerifiedMobile;
      if (!cleanMobile || cleanMobile.length !== 10) {
        setFormError('A valid 10-digit verified WhatsApp mobile number is required.');
        setSaving(false);
        return;
      }

      if (!userId || userId === 'profile-user') {
        setFormError('Authentication required. Please log in with your verified WhatsApp mobile number.');
        setSaving(false);
        return;
      }

      // Format gender for database enum/check compatibility
      let dbGender: 'male' | 'female' | 'other' | 'prefer_not_to_say' = 'other';
      const normalizedGender = (data.gender || '').toLowerCase();
      if (normalizedGender === 'male') dbGender = 'male';
      else if (normalizedGender === 'female') dbGender = 'female';
      else dbGender = 'other';

      const rawAlt = data.alternateMobile?.trim().replace(/\D/g, '') || '';
      const cleanAlt = (
        rawAlt.length === 12 && rawAlt.startsWith('91')
          ? rawAlt.slice(2)
          : rawAlt.length === 11 && rawAlt.startsWith('0')
          ? rawAlt.slice(1)
          : rawAlt
      ) || null;
      const payload: Record<string, unknown> = {
        user_id: userId,
        mobile: cleanMobile,
        full_name: data.fullName.trim(),
        date_of_birth: data.dateOfBirth,
        gender: dbGender,
        emergency_mobile: cleanAlt,
        alternate_mobile: cleanAlt,
        email: data.email?.trim() || null,
      };

      const { data: savedProfile, error: saveErr } = await upsertCandidateProfile(payload as any);

      if (saveErr || !savedProfile) {
        console.error('[Step1CreateProfile] Save failed:', saveErr);
        const detailedError =
          (saveErr as any)?.message ||
          (typeof saveErr === 'string' ? saveErr : null) ||
          'Failed to save candidate profile. Please verify your details and try again.';
        setFormError(detailedError);
        setSaving(false);
        return;
      }

      // Store consent audit record in local storage
      try {
        if (typeof window !== 'undefined') {
          const consentPayload = {
            candidateId: savedProfile.candidate_id || displayCandidateId,
            userId,
            mobile: cleanMobile,
            consentGiven: true,
            consentTimestamp: data.consentTimestamp || new Date().toISOString(),
            privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
          };
          localStorage.setItem(`maha_candidate_consent_${cleanMobile}`, JSON.stringify(consentPayload));
        }
      } catch {}

      if (savedProfile.candidate_id) {
        onChange('candidateId', savedProfile.candidate_id);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaving(false);
        setSaveSuccess(false);
        onNext();
      }, 400);
    } catch (err: any) {
      console.error('[Step1CreateProfile] Exception:', err);
      setFormError(err?.message || 'An unexpected error occurred while saving your profile.');
      setSaving(false);
      setSaveSuccess(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Prevent duplicate clicks

    // If consent checkbox is NOT checked, display consent modal
    if (!data.consentGiven) {
      setShowConsentModal(true);
      return;
    }

    // If checkbox already checked, validate and proceed
    const { isValid, newErrors } = validateAllFields();
    if (!isValid) {
      setErrors(newErrors);
      const fieldOrder: (keyof typeof fieldRefs)[] = ['fullName', 'dateOfBirth', 'gender', 'alternateMobile', 'email', 'consent'];
      const firstInvalidKey = fieldOrder.find(k => newErrors[k]);
      if (firstInvalidKey && (fieldRefs as Record<string, any>)[firstInvalidKey]?.current) {
        const el = (fieldRefs as Record<string, any>)[firstInvalidKey].current;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 150);
      }
      return;
    }

    setErrors({});
    await executeSaveProfile();
  };

  // Consent Modal "I Agree & Continue" Handler
  const handleModalConsentAgree = async () => {
    setShowConsentModal(false);

    // 1. Record explicit consent
    const nowIso = new Date().toISOString();
    onChange('consentGiven', true);
    onChange('consentTimestamp', nowIso);
    onChange('privacyNoticeVersion', PRIVACY_NOTICE_VERSION);

    // 2. Validate all mandatory fields
    const { newErrors } = validateAllFields();
    delete newErrors.consent; // User just agreed in modal

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const fieldOrder: (keyof typeof fieldRefs)[] = ['fullName', 'dateOfBirth', 'gender', 'alternateMobile', 'email'];
      const firstInvalidKey = fieldOrder.find(k => newErrors[k]);
      if (firstInvalidKey && (fieldRefs as Record<string, any>)[firstInvalidKey]?.current) {
        const el = (fieldRefs as Record<string, any>)[firstInvalidKey].current;
        const scrollBehavior = (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
        el.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
        setTimeout(() => el.focus(), 150);
      }
      return;
    }

    setErrors({});
    // 3. Save profile and proceed to Step 2
    await executeSaveProfile();
  };

  const handleModalCancel = () => {
    setShowConsentModal(false);
    // Explicitly do not record consent
  };

  const getFieldClass = (hasError: boolean, isReadOnly = false) =>
    `w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-none ${
      isReadOnly
        ? 'bg-slate-100 text-slate-700 border border-slate-300 cursor-not-allowed select-none'
        : hasError
        ? 'border-2 border-red-500 bg-red-50/40 text-red-950 focus:ring-2 focus:ring-red-500/20'
        : 'border border-slate-300 bg-white text-[#102a43] focus:ring-2 focus:ring-[#102a43]/20 focus:border-[#102a43]'
    }`;

  return (
    <>
      <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
        {/* Step Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-[#102a43] text-white flex items-center justify-center shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102a43]">Step 1: Personal Details &amp; Contact</h2>
            <p className="text-xs text-[#627d98]">
              Essential personal and contact details. Reusable across all your job applications.
            </p>
          </div>
        </div>

        {returnToReview && (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Editing from Review:</strong> Make your updates below and save to return directly to Step 4 Review &amp; Submit.
              </span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
            >
              Cancel &amp; Return
            </button>
          </div>
        )}

        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Profile Save Notice</span>
              <span>{formError}</span>
            </div>
          </div>
        )}

        {/* ── A. Personal Details ──────────────────────────────────────────────── */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
            <User className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">A. Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: Full Name as per Aadhaar Card */}
            <div className="sm:col-span-2">
              <label htmlFor="field-fullName" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Full Name as per Aadhaar Card <span className="text-red-500">*</span>
              </label>
              <input
                id="field-fullName"
                ref={fieldRefs.fullName}
                type="text"
                placeholder="E.G. RAMESH SAKHARAM PATIL"
                value={data.fullName || ''}
                onChange={e => handleFieldChange('fullName', e.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'fullName-error' : 'fullName-hint'}
                className={getFieldClass(Boolean(errors.fullName))}
              />
              {errors.fullName ? (
                <p id="fullName-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.fullName}
                </p>
              ) : (
                <p id="fullName-hint" className="mt-1 text-[11px] text-slate-500">
                  Enter your full name in English exactly as shown on your official identity document.
                </p>
              )}
            </div>

            {/* Field 2: Date of Birth & Dynamic Age Display (Format: XX Years XX Months) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="field-dateOfBirth" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                {ageDetails !== null && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    ageDetails.is18OrAbove
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : 'text-red-700 bg-red-50 border-red-200'
                  }`}>
                    Age: {ageDetails.formatted}
                  </span>
                )}
              </div>
              <input
                id="field-dateOfBirth"
                ref={fieldRefs.dateOfBirth}
                type="date"
                max={getLocalTodayIso()}
                min="1940-01-01"
                value={data.dateOfBirth || ''}
                onChange={e => handleFieldChange('dateOfBirth', e.target.value)}
                aria-invalid={Boolean(errors.dateOfBirth)}
                aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : 'dateOfBirth-hint'}
                className={getFieldClass(Boolean(errors.dateOfBirth))}
              />
              {errors.dateOfBirth ? (
                <p id="dateOfBirth-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.dateOfBirth}
                </p>
              ) : (
                <p id="dateOfBirth-hint" className="mt-1 text-[11px] text-slate-500">
                  Age is dynamically calculated based on your selected date of birth. Minimum 18 years required.
                </p>
              )}
            </div>

            {/* Field 3: Gender Dropdown */}
            <div>
              <label htmlFor="field-gender" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="field-gender"
                ref={fieldRefs.gender}
                value={data.gender || ''}
                onChange={e => handleFieldChange('gender', e.target.value)}
                aria-invalid={Boolean(errors.gender)}
                aria-describedby={errors.gender ? 'gender-error' : 'gender-hint'}
                className={`${getFieldClass(Boolean(errors.gender))} cursor-pointer`}
              >
                <option value="">-- Select Gender --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
              </select>
              {errors.gender ? (
                <p id="gender-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.gender}
                </p>
              ) : (
                <p id="gender-hint" className="mt-1 text-[11px] text-slate-500">Select your official gender identity.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── B. Contact Details ───────────────────────────────────────────────── */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
            <Phone className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">B. Contact Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 4: WhatsApp Verified Mobile Number (Read-Only) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="field-verifiedMobile" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                  WhatsApp Verified Mobile Number <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified via OTP
                </span>
              </div>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-semibold text-xs sm:text-sm select-none">
                  +91
                </span>
                <div className="relative flex-1">
                  <input
                    id="field-verifiedMobile"
                    type="text"
                    readOnly
                    disabled
                    value={cleanVerifiedMobile || '—'}
                    aria-describedby="verifiedMobile-hint"
                    className={`${getFieldClass(false, true)} rounded-l-none`}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <p id="verifiedMobile-hint" className="mt-1 text-[11px] text-slate-500">
                Bound strictly to your authenticated WhatsApp session. Non-editable.
              </p>
            </div>

            {/* Field 5: Alternate Mobile Number (Optional, can be same as WhatsApp) */}
            <div>
              <label htmlFor="field-alternateMobile" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Alternate Mobile Number <span className="text-slate-400 font-normal text-[11px] normal-case tracking-normal">(Optional)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-semibold text-xs sm:text-sm select-none">
                  +91
                </span>
                <div className="relative flex-1">
                  <input
                    id="field-alternateMobile"
                    ref={fieldRefs.alternateMobile}
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit Indian mobile number"
                    value={data.alternateMobile ? data.alternateMobile.replace(/^\+?91/, '') : ''}
                    onChange={e => {
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(-10);
                      handleFieldChange('alternateMobile', cleanDigits);
                    }}
                    aria-invalid={Boolean(errors.alternateMobile)}
                    aria-describedby={errors.alternateMobile ? "alternateMobile-error" : "alternateMobile-hint"}
                    className={`${getFieldClass(Boolean(errors.alternateMobile))} rounded-l-none`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              {errors.alternateMobile ? (
                <p id="alternateMobile-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.alternateMobile}
                </p>
              ) : (
                <p id="alternateMobile-hint" className="mt-1 text-[11px] text-slate-500">
                  Secondary contact for recruitment updates. May be identical to your WhatsApp verified number.
                </p>
              )}
            </div>

            {/* Field 6: Email Address (Optional) - Full width (100%) on separate row below mobile fields */}
            <div className="sm:col-span-2 w-full">
              <label htmlFor="field-email" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Email Address <span className="text-slate-400 font-normal text-[11px] normal-case tracking-normal">(Optional)</span>
              </label>
              <div className="relative w-full">
                <input
                  id="field-email"
                  ref={fieldRefs.email}
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="name@example.com"
                  value={data.email || ''}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : "email-hint"}
                  className={`${getFieldClass(Boolean(errors.email))} pr-10 lowercase font-normal`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.email ? (
                <p id="email-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.email}
                </p>
              ) : (
                <p id="email-hint" className="mt-1 text-[11px] text-slate-500">
                  English small letters only. Used for interview call letters and official communications.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Privacy Notice & Consent (Compact UI) ───────────────────────── */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[#102a43]">
            <Shield className="w-4 h-4 text-blue-700 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Privacy Notice &amp; Consent</h3>
          </div>

          {/* Privacy Notice Box - Standard 13-14px typography with exact required wording */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-[13px] sm:text-sm text-slate-700 leading-relaxed font-normal">
            <p>{PRIVACY_NOTICE_TEXT}</p>
          </div>

          {/* Mandatory Checkbox - Exact label */}
          <div>
            <label htmlFor="field-consent" className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                id="field-consent"
                ref={fieldRefs.consent}
                type="checkbox"
                checked={Boolean(data.consentGiven)}
                onChange={e => handleConsentCheckboxChange(e.target.checked)}
                aria-describedby={errors.consent ? "consent-error" : undefined}
                className="w-4 h-4 rounded border-slate-300 text-[#102a43] focus:ring-[#102a43] cursor-pointer"
              />
              <span className="text-xs sm:text-[13px] font-semibold text-[#102a43]">
                I have read and agree to the Privacy Notice. <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.consent && (
              <p id="consent-error" className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.consent}
              </p>
            )}
          </div>
        </div>

        {/* ── Form Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-4 border-t border-slate-200 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-center disabled:opacity-50"
          >
            {cancelButtonLabel || 'Cancel Application'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-400 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-98 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? (
              saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span>Profile Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Saving Profile...</span>
                </>
              )
            ) : (
              <>
                <span>Save &amp; Continue &rarr;</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Consent Popup Modal ────────────────────────────────────────────── */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5 text-[#102a43]">
                <Shield className="w-5 h-5 text-blue-700 shrink-0" />
                <h3 id="consent-modal-title" className="text-sm font-bold text-[#102a43]">
                  Privacy Consent Required
                </h3>
              </div>
              <button
                type="button"
                onClick={handleModalCancel}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-800 leading-relaxed">
                Please read and accept the Privacy Notice before proceeding with your Candidate Profile.
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-[13px] text-slate-700 font-normal">
                {PRIVACY_NOTICE_TEXT}
              </div>
            </div>

            {/* Modal Footer / Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleModalCancel}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalConsentAgree}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>I Agree &amp; Continue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
