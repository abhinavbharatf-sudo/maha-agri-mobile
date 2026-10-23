import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, CheckCircle, AlertCircle, User, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { upsertCandidateProfile } from '../lib/api';
import type { RmsCandidateProfile, EducationEntry, ExperienceEntry } from '../lib/types';
import { GENDER_OPTIONS, CASTE_CATEGORY_OPTIONS } from '../lib/constants';
import { MAHARASHTRA_DISTRICTS, getTalukasForDistrict } from '../../data/maharashtraGeography';
import { normalizeMobileNumber } from '../../lib/utils';

// Helper to check for Marathi / Devanagari or non-English script
export function containsNonEnglish(str: string | null | undefined): boolean {
  if (!str) return false;
  // Detect Devanagari script (\u0900-\u097F) or characters outside standard ASCII printable range
  return /[\u0900-\u097F]/.test(str) || !/^[\x20-\x7E\s]*$/.test(str);
}

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  uppercase?: boolean;
  error?: string | null;
  helperText?: string;
  badge?: React.ReactNode;
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  uppercase = true,
  error,
  helperText,
  badge,
}: InputFieldProps) {
  const isEmail = type === 'email';
  const shouldUppercase = uppercase && !isEmail && type !== 'date' && type !== 'tel';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (shouldUppercase) {
      val = val.toUpperCase();
    }
    onChange(val);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={name} className="block text-xs font-semibold text-primary-700">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {badge}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm transition-colors ${
          error
            ? 'border-red-400 bg-red-50/50 text-red-900 focus:border-red-500 focus:outline-none'
            : disabled || readOnly
            ? 'border-primary-200 bg-primary-50/80 text-primary-700 cursor-not-allowed font-medium'
            : 'border-primary-200 bg-white text-primary-900 focus:outline-none focus:border-primary-500'
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-primary-500">{helperText}</p>
      )}
    </div>
  );
}

export default function MyProfile() {
  const { user, profile, refreshProfile } = useCandidateAuth();
  const [form, setForm] = useState<Partial<RmsCandidateProfile>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect');

  const isDirtyRef = useRef(false);
  const initializedProfileIdRef = useRef<string | null>(null);

  // Sync profile and auth into form state without overwriting active user edits
  useEffect(() => {
    const verifiedMobile = user?.phone ? normalizeMobileNumber(user.phone) : '';
    const userMetaName = (user?.user_metadata?.full_name as string) || '';

    setForm(prev => {
      const profileId = profile?.id ?? (profile ? 'profile-loaded' : null);
      const isNewProfile = profileId && profileId !== initializedProfileIdRef.current;

      if (isNewProfile) {
        initializedProfileIdRef.current = profileId;
        if (!isDirtyRef.current) {
          return {
            ...profile,
            mobile: profile?.mobile || verifiedMobile || '',
            full_name: profile?.full_name ? profile.full_name.toUpperCase() : (userMetaName ? userMetaName.toUpperCase() : ''),
            alternate_mobile: profile?.alternate_mobile || '',
            caste_category: profile?.caste_category || '',
          };
        } else {
          // Retain active user input, backfill unedited fields from loaded profile
          const merged: Partial<RmsCandidateProfile> = { ...profile };
          (Object.keys(prev) as (keyof RmsCandidateProfile)[]).forEach(k => {
            const val = prev[k];
            if (val !== undefined && val !== null && val !== '') {
              // @ts-expect-error dynamic assignment of defined form values
              merged[k] = val;
            }
          });
          if (!merged.mobile && verifiedMobile) merged.mobile = verifiedMobile;
          return merged;
        }
      }

      // For new candidates where profile is not yet in DB, prefill verified mobile from auth session
      if (!prev.mobile && verifiedMobile) {
        return {
          ...prev,
          mobile: verifiedMobile,
          full_name: prev.full_name || (userMetaName ? userMetaName.toUpperCase() : ''),
        };
      }

      return prev;
    });
  }, [profile, user]);

  const set = (key: keyof RmsCandidateProfile, value: unknown) => {
    isDirtyRef.current = true;
    setForm(f => ({ ...f, [key]: value }));

    // Real-time script check
    if (typeof value === 'string' && containsNonEnglish(value)) {
      setFieldErrors(prev => ({
        ...prev,
        [key]: 'कृपया केवळ इंग्रजी मोठ्या अक्षरांचा (CAPITAL LETTERS) वापर करा. मराठी किंवा इतर लिपी स्वीकारली जात नाही.',
      }));
    } else {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleDistrictChange = (district: string) => {
    isDirtyRef.current = true;
    setForm(f => ({ ...f, district, taluka: '' }));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next.district;
      delete next.taluka;
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Full name validation
    if (!form.full_name?.trim()) {
      errors.full_name = 'कृपया पूर्ण नाव प्रविष्ट करा.';
    } else if (containsNonEnglish(form.full_name)) {
      errors.full_name = 'कृपया केवळ इंग्रजी मोठ्या अक्षरांचा (CAPITAL LETTERS) वापर करा.';
    }

    // 2. WhatsApp Number validation
    const verifiedMobile = form.mobile || (user?.phone ? normalizeMobileNumber(user.phone) : '');
    if (!verifiedMobile || verifiedMobile.length !== 10) {
      errors.mobile = 'व्हॉट्सअ‍ॅप मोबाईल क्रमांक वैध नाही.';
    }

    // 3. Alternate Mobile Number validation
    if (form.alternate_mobile?.trim()) {
      const alt = form.alternate_mobile.trim();
      if (!/^\d{10}$/.test(alt)) {
        errors.alternate_mobile = 'पर्यायी मोबाईल क्रमांक १० अंकी असावा.';
      } else if (alt === verifiedMobile) {
        errors.alternate_mobile = 'पर्यायी मोबाईल क्रमांक हा व्हॉट्सअ‍ॅप क्रमांकासारखा असू नये.';
      }
    }

    // 4. Caste Category validation
    if (!form.caste_category?.trim()) {
      errors.caste_category = 'कृपया जात प्रवर्ग (Caste Category) निवडा.';
    }

    // 5. Address, District & Taluka validation
    if (!form.district?.trim()) {
      errors.district = 'कृपया जिल्हा निवडा.';
    }
    if (!form.taluka?.trim()) {
      errors.taluka = 'कृपया तालुका निवडा.';
    }

    // 6. Script validation across text fields
    const textFields: (keyof RmsCandidateProfile)[] = [
      'father_name', 'mother_name', 'address_line1', 'address_line2',
      'city', 'emergency_name', 'emergency_relation'
    ];
    for (const key of textFields) {
      const val = form[key];
      if (typeof val === 'string' && containsNonEnglish(val)) {
        errors[key] = 'कृपया केवळ इंग्रजी मोठ्या अक्षरांचा (CAPITAL LETTERS) वापर करा.';
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setGeneralError('कृपया फॉर्ममधील सर्व आवश्यक माहिती योग्य स्वरूपात भरा.');
      return false;
    }

    setGeneralError(null);
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateForm()) return;

    setSaving(true);
    setGeneralError(null);

    const verifiedMobile = form.mobile ?? (user.phone ? normalizeMobileNumber(user.phone) : '');

    const payload = {
      ...form,
      user_id: user.id,
      mobile: verifiedMobile,
      full_name: (form.full_name ?? '').toUpperCase(),
      caste_category: form.caste_category ?? null,
      alternate_mobile: form.alternate_mobile ? form.alternate_mobile.trim() : null,
      profile_complete: !!(
        form.full_name &&
        verifiedMobile &&
        form.caste_category &&
        form.district &&
        form.taluka &&
        form.date_of_birth
      ),
    };

    const { error: err } = await upsertCandidateProfile(payload as Parameters<typeof upsertCandidateProfile>[0]);
    setSaving(false);

    if (err) {
      return setGeneralError(`प्रोफाइल जतन करताना त्रुटी आली: ${err.message}`);
    }

    isDirtyRef.current = false;
    setSaved(true);
    await refreshProfile();

    if (redirectUrl) {
      setTimeout(() => {
        navigate(redirectUrl);
      }, 1200);
    } else {
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const addEducation = () => {
    isDirtyRef.current = true;
    const edu = (form.education as EducationEntry[]) ?? [];
    set('education', [...edu, { degree: '', institution: '', board: '', year: '', percentage: '' }]);
  };

  const removeEducation = (i: number) => {
    isDirtyRef.current = true;
    const edu = [...((form.education as EducationEntry[]) ?? [])];
    edu.splice(i, 1);
    set('education', edu);
  };

  const updateEducation = (i: number, key: keyof EducationEntry, value: string) => {
    isDirtyRef.current = true;
    const edu = [...((form.education as EducationEntry[]) ?? [])];
    const upper = key === 'year' || key === 'percentage' ? value : value.toUpperCase();
    edu[i] = { ...edu[i], [key]: upper };
    set('education', edu);
  };

  const addExperience = () => {
    isDirtyRef.current = true;
    const exp = (form.experience as ExperienceEntry[]) ?? [];
    set('experience', [...exp, { title: '', organization: '', from_date: '', to_date: null, description: '' }]);
  };

  const removeExperience = (i: number) => {
    isDirtyRef.current = true;
    const exp = [...((form.experience as ExperienceEntry[]) ?? [])];
    exp.splice(i, 1);
    set('experience', exp);
  };

  const updateExperience = (i: number, key: keyof ExperienceEntry, value: string | null) => {
    isDirtyRef.current = true;
    const exp = [...((form.experience as ExperienceEntry[]) ?? [])];
    const upper = key === 'from_date' || key === 'to_date' || !value ? value : value.toUpperCase();
    exp[i] = { ...exp[i], [key]: upper };
    set('experience', exp);
  };

  // Filtered talukas for the selected district
  const talukasForSelectedDistrict = form.district ? getTalukasForDistrict(form.district) : [];

  return (
    <div className="max-w-3xl">
      {redirectUrl && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-sm text-emerald-800">
          <div>
            <span className="font-semibold">Complete your profile to proceed with your application.</span>
            <p className="text-xs text-emerald-600 mt-0.5">Your profile details will be linked directly to your application.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(redirectUrl)}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 hover:border-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Application
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
          <User className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary-900">My Profile</h2>
          <p className="text-sm text-primary-500">
            ENTER ALL INFORMATION IN ENGLISH CAPITAL LETTERS ONLY. (केवळ इंग्रजी मोठ्या अक्षरांचा वापर करा)
          </p>
        </div>
        {profile?.candidate_id && (
          <span className="ml-auto font-mono text-xs bg-primary-900 text-white px-3 py-1.5 rounded-full">
            {profile.candidate_id}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">
            Personal Information
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField
              label="Full Name"
              name="full_name"
              value={form.full_name ?? ''}
              onChange={v => set('full_name', v)}
              required
              placeholder="ENTER FULL NAME IN CAPITAL LETTERS"
              error={fieldErrors.full_name}
            />

            <InputField
              label="WhatsApp Number"
              name="mobile"
              value={form.mobile ?? ''}
              onChange={() => {}}
              readOnly
              required
              helperText="Verified via WhatsApp OTP during login"
              badge={
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                </span>
              }
              error={fieldErrors.mobile}
            />

            <InputField
              label="Alternate Mobile Number (Optional)"
              name="alternate_mobile"
              value={form.alternate_mobile ?? ''}
              onChange={v => set('alternate_mobile', v.replace(/\D/g, '').slice(0, 10))}
              placeholder="ENTER 10-DIGIT MOBILE NUMBER"
              helperText="Must not be the same as WhatsApp number"
              error={fieldErrors.alternate_mobile}
            />

            <div>
              <label htmlFor="caste_category" className="block text-xs font-semibold text-primary-700 mb-1.5">
                Caste Category <span className="text-red-500">*</span>
              </label>
              <select
                id="caste_category"
                value={form.caste_category ?? ''}
                onChange={e => set('caste_category', e.target.value)}
                required
                className={`w-full border rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none bg-white transition-colors ${
                  fieldErrors.caste_category
                    ? 'border-red-400 bg-red-50/50 focus:border-red-500'
                    : 'border-primary-200 focus:border-primary-500'
                }`}
              >
                <option value="">SELECT CASTE CATEGORY</option>
                {CASTE_CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {fieldErrors.caste_category && (
                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.caste_category}</p>
              )}
            </div>

            <InputField
              label="Date of Birth"
              name="date_of_birth"
              value={form.date_of_birth ?? ''}
              onChange={v => set('date_of_birth', v)}
              type="date"
              error={fieldErrors.date_of_birth}
            />

            <div>
              <label htmlFor="gender" className="block text-xs font-semibold text-primary-700 mb-1.5">
                Gender
              </label>
              <select
                id="gender"
                value={form.gender ?? ''}
                onChange={e => set('gender', e.target.value)}
                className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 bg-white"
              >
                <option value="">SELECT GENDER</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g.value} value={g.value}>{g.label.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <InputField
              label="Father's Name"
              name="father_name"
              value={form.father_name ?? ''}
              onChange={v => set('father_name', v)}
              placeholder="ENTER FATHER'S NAME IN CAPITAL LETTERS"
              error={fieldErrors.father_name}
            />

            <InputField
              label="Mother's Name"
              name="mother_name"
              value={form.mother_name ?? ''}
              onChange={v => set('mother_name', v)}
              placeholder="ENTER MOTHER'S NAME IN CAPITAL LETTERS"
              error={fieldErrors.mother_name}
            />
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">
            Address
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <InputField
                label="Address Line 1"
                name="address_line1"
                value={form.address_line1 ?? ''}
                onChange={v => set('address_line1', v)}
                placeholder="ENTER ADDRESS LINE 1 IN CAPITAL LETTERS"
                error={fieldErrors.address_line1}
              />
            </div>

            <div className="sm:col-span-2">
              <InputField
                label="Address Line 2"
                name="address_line2"
                value={form.address_line2 ?? ''}
                onChange={v => set('address_line2', v)}
                placeholder="ENTER ADDRESS LINE 2 IN CAPITAL LETTERS"
                error={fieldErrors.address_line2}
              />
            </div>

            <div>
              <label htmlFor="district" className="block text-xs font-semibold text-primary-700 mb-1.5">
                District <span className="text-red-500">*</span>
              </label>
              <select
                id="district"
                value={form.district ?? ''}
                onChange={e => handleDistrictChange(e.target.value)}
                required
                className={`w-full border rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none bg-white transition-colors ${
                  fieldErrors.district
                    ? 'border-red-400 bg-red-50/50 focus:border-red-500'
                    : 'border-primary-200 focus:border-primary-500'
                }`}
              >
                <option value="">SELECT DISTRICT</option>
                {MAHARASHTRA_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d.toUpperCase()}</option>
                ))}
              </select>
              {fieldErrors.district && (
                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.district}</p>
              )}
            </div>

            <div>
              <label htmlFor="taluka" className="block text-xs font-semibold text-primary-700 mb-1.5">
                Taluka <span className="text-red-500">*</span>
              </label>
              <select
                id="taluka"
                value={form.taluka ?? ''}
                onChange={e => set('taluka', e.target.value)}
                required
                disabled={!form.district}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  !form.district
                    ? 'border-primary-200 bg-primary-50/80 text-primary-400 cursor-not-allowed'
                    : fieldErrors.taluka
                    ? 'border-red-400 bg-red-50/50 text-primary-900 focus:border-red-500'
                    : 'border-primary-200 bg-white text-primary-900 focus:outline-none focus:border-primary-500'
                }`}
              >
                <option value="">
                  {form.district ? 'SELECT TALUKA' : 'SELECT DISTRICT FIRST'}
                </option>
                {talukasForSelectedDistrict.map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
              {fieldErrors.taluka && (
                <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.taluka}</p>
              )}
            </div>

            <InputField
              label="City / Village"
              name="city"
              value={form.city ?? ''}
              onChange={v => set('city', v)}
              placeholder="ENTER CITY OR VILLAGE IN CAPITAL LETTERS"
              error={fieldErrors.city}
            />

            <InputField
              label="Pincode"
              name="pincode"
              value={form.pincode ?? ''}
              onChange={v => set('pincode', v.replace(/\D/g, '').slice(0, 6))}
              placeholder="ENTER 6-DIGIT PINCODE"
              error={fieldErrors.pincode}
            />
          </div>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-primary-100">
            <h3 className="text-sm font-bold text-primary-800">Education</h3>
            <button
              type="button"
              onClick={addEducation}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Education
            </button>
          </div>
          {((form.education as EducationEntry[]) ?? []).length === 0 ? (
            <button
              type="button"
              onClick={addEducation}
              className="w-full py-6 border-2 border-dashed border-primary-200 rounded-xl text-sm text-primary-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
              + Add your educational qualifications
            </button>
          ) : (
            <div className="space-y-4">
              {((form.education as EducationEntry[]) ?? []).map((edu, i) => (
                <div key={i} className="relative p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <button
                    type="button"
                    onClick={() => removeEducation(i)}
                    className="absolute top-3 right-3 p-1 hover:bg-red-100 rounded text-primary-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pr-8">
                    <InputField
                      label="Degree / Certificate"
                      name={`edu-${i}-degree`}
                      value={edu.degree}
                      onChange={v => updateEducation(i, 'degree', v)}
                      placeholder="E.G. B.SC AGRICULTURE"
                    />
                    <InputField
                      label="Institution"
                      name={`edu-${i}-institution`}
                      value={edu.institution}
                      onChange={v => updateEducation(i, 'institution', v)}
                      placeholder="COLLEGE / INSTITUTE NAME"
                    />
                    <InputField
                      label="Board / University"
                      name={`edu-${i}-board`}
                      value={edu.board}
                      onChange={v => updateEducation(i, 'board', v)}
                      placeholder="UNIVERSITY OR BOARD NAME"
                    />
                    <InputField
                      label="Year of Passing"
                      name={`edu-${i}-year`}
                      value={edu.year}
                      onChange={v => updateEducation(i, 'year', v.replace(/\D/g, '').slice(0, 4))}
                      placeholder="E.G. 2024"
                    />
                    <InputField
                      label="Percentage / CGPA"
                      name={`edu-${i}-percentage`}
                      value={edu.percentage}
                      onChange={v => updateEducation(i, 'percentage', v)}
                      placeholder="E.G. 78.5% OR 8.2 CGPA"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Experience */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-primary-100">
            <h3 className="text-sm font-bold text-primary-800">Work Experience</h3>
            <button
              type="button"
              onClick={addExperience}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          </div>
          {((form.experience as ExperienceEntry[]) ?? []).length === 0 ? (
            <button
              type="button"
              onClick={addExperience}
              className="w-full py-6 border-2 border-dashed border-primary-200 rounded-xl text-sm text-primary-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
              + Add work experience (leave blank for freshers)
            </button>
          ) : (
            <div className="space-y-4">
              {((form.experience as ExperienceEntry[]) ?? []).map((exp, i) => (
                <div key={i} className="relative p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <button
                    type="button"
                    onClick={() => removeExperience(i)}
                    className="absolute top-3 right-3 p-1 hover:bg-red-100 rounded text-primary-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pr-8">
                    <InputField
                      label="Job Title"
                      name={`exp-${i}-title`}
                      value={exp.title}
                      onChange={v => updateExperience(i, 'title', v)}
                      placeholder="E.G. FIELD OFFICER"
                    />
                    <InputField
                      label="Organization"
                      name={`exp-${i}-org`}
                      value={exp.organization}
                      onChange={v => updateExperience(i, 'organization', v)}
                      placeholder="COMPANY OR ORGANIZATION NAME"
                    />
                    <InputField
                      label="From Date"
                      name={`exp-${i}-from`}
                      value={exp.from_date}
                      onChange={v => updateExperience(i, 'from_date', v)}
                      type="date"
                    />
                    <InputField
                      label="To Date (leave blank if current)"
                      name={`exp-${i}-to`}
                      value={exp.to_date ?? ''}
                      onChange={v => updateExperience(i, 'to_date', v || null)}
                      type="date"
                    />
                    <div className="sm:col-span-2">
                      <label htmlFor={`exp-${i}-desc`} className="block text-xs font-semibold text-primary-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        id={`exp-${i}-desc`}
                        value={exp.description}
                        onChange={e => updateExperience(i, 'description', e.target.value.toUpperCase())}
                        placeholder="ENTER ROLES & RESPONSIBILITIES IN CAPITAL LETTERS"
                        rows={2}
                        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 resize-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Communication & Emergency Contact */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">
            Communication & Emergency Contact
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField
              label="Email Address"
              name="email"
              value={form.email ?? ''}
              onChange={v => set('email', v)}
              type="email"
              uppercase={false}
              placeholder="name@example.com"
              error={fieldErrors.email}
            />
            <InputField
              label="Emergency Contact Name"
              name="emergency_name"
              value={form.emergency_name ?? ''}
              onChange={v => set('emergency_name', v)}
              placeholder="ENTER EMERGENCY CONTACT NAME"
              error={fieldErrors.emergency_name}
            />
            <InputField
              label="Emergency Contact Mobile"
              name="emergency_mobile"
              value={form.emergency_mobile ?? ''}
              onChange={v => set('emergency_mobile', v.replace(/\D/g, '').slice(0, 10))}
              placeholder="ENTER 10-DIGIT MOBILE"
              error={fieldErrors.emergency_mobile}
            />
            <InputField
              label="Relation"
              name="emergency_relation"
              value={form.emergency_relation ?? ''}
              onChange={v => set('emergency_relation', v)}
              placeholder="E.G. FATHER, MOTHER, BROTHER"
              error={fieldErrors.emergency_relation}
            />
          </div>
        </motion.div>

        {/* Save & Errors */}
        {generalError && (
          <div className="flex items-start gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{generalError}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-70 transition-all"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving Profile...
            </span>
          ) : saved ? (
            <><CheckCircle className="w-5 h-5 text-emerald-400" /> {redirectUrl ? 'Profile Saved! Redirecting to application…' : 'Profile Saved!'}</>
          ) : (
            <><Save className="w-5 h-5" /> Save Profile</>
          )}
        </button>
      </form>
    </div>
  );
}
