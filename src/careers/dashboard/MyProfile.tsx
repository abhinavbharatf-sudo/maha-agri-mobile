import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { upsertCandidateProfile } from '../lib/api';
import type { RmsCandidateProfile, EducationEntry, ExperienceEntry } from '../lib/types';
import { MAHARASHTRA_DISTRICTS, GENDER_OPTIONS } from '../lib/constants';

export default function MyProfile() {
  const { user, profile, refreshProfile } = useCandidateAuth();
  const [form, setForm] = useState<Partial<RmsCandidateProfile>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = (key: keyof RmsCandidateProfile, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      user_id: user.id,
      mobile: form.mobile ?? '',
      full_name: form.full_name ?? '',
      profile_complete: !!(form.full_name && form.mobile && form.district && form.date_of_birth),
    };
    const { error: err } = await upsertCandidateProfile(payload as Parameters<typeof upsertCandidateProfile>[0]);
    setSaving(false);
    if (err) return setError(err.message);
    setSaved(true);
    await refreshProfile();
    setTimeout(() => setSaved(false), 3000);
  };

  const addEducation = () => {
    const edu = (form.education as EducationEntry[]) ?? [];
    set('education', [...edu, { degree: '', institution: '', board: '', year: '', percentage: '' }]);
  };

  const removeEducation = (i: number) => {
    const edu = [...((form.education as EducationEntry[]) ?? [])];
    edu.splice(i, 1);
    set('education', edu);
  };

  const updateEducation = (i: number, key: keyof EducationEntry, value: string) => {
    const edu = [...((form.education as EducationEntry[]) ?? [])];
    edu[i] = { ...edu[i], [key]: value };
    set('education', edu);
  };

  const addExperience = () => {
    const exp = (form.experience as ExperienceEntry[]) ?? [];
    set('experience', [...exp, { title: '', organization: '', from_date: '', to_date: null, description: '' }]);
  };

  const removeExperience = (i: number) => {
    const exp = [...((form.experience as ExperienceEntry[]) ?? [])];
    exp.splice(i, 1);
    set('experience', exp);
  };

  const updateExperience = (i: number, key: keyof ExperienceEntry, value: string | null) => {
    const exp = [...((form.experience as ExperienceEntry[]) ?? [])];
    exp[i] = { ...exp[i], [key]: value };
    set('experience', exp);
  };

  const InputField = ({ label, name, value, onChange, type = 'text', required = false }: {
    label: string; name: string; value: string; onChange: (v: string) => void;
    type?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-primary-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 transition-colors bg-white"
      />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
          <User className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary-900">My Profile</h2>
          <p className="text-sm text-primary-500">This information is reused for all your applications</p>
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
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">Personal Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Full Name" name="full_name" value={form.full_name ?? ''} onChange={v => set('full_name', v)} required />
            <InputField label="Mobile Number" name="mobile" value={form.mobile ?? ''} onChange={v => set('mobile', v.replace(/\D/g, '').slice(0, 10))} required />
            <InputField label="Date of Birth" name="date_of_birth" value={form.date_of_birth ?? ''} onChange={v => set('date_of_birth', v)} type="date" />
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">Gender</label>
              <select value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}
                className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 bg-white">
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <InputField label="Father's Name" name="father_name" value={form.father_name ?? ''} onChange={v => set('father_name', v)} />
            <InputField label="Mother's Name" name="mother_name" value={form.mother_name ?? ''} onChange={v => set('mother_name', v)} />
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">Address</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <InputField label="Address Line 1" name="address_line1" value={form.address_line1 ?? ''} onChange={v => set('address_line1', v)} />
            </div>
            <div className="sm:col-span-2">
              <InputField label="Address Line 2" name="address_line2" value={form.address_line2 ?? ''} onChange={v => set('address_line2', v)} />
            </div>
            <InputField label="City" name="city" value={form.city ?? ''} onChange={v => set('city', v)} />
            <InputField label="Taluka" name="taluka" value={form.taluka ?? ''} onChange={v => set('taluka', v)} />
            <div>
              <label className="block text-xs font-semibold text-primary-700 mb-1.5">District <span className="text-red-500">*</span></label>
              <select value={form.district ?? ''} onChange={e => set('district', e.target.value)} required
                className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 bg-white">
                <option value="">Select district</option>
                {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <InputField label="Pincode" name="pincode" value={form.pincode ?? ''} onChange={v => set('pincode', v.replace(/\D/g, '').slice(0, 6))} />
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
            <button type="button" onClick={addEducation}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors">
              <Plus className="w-4 h-4" /> Add Education
            </button>
          </div>
          {((form.education as EducationEntry[]) ?? []).length === 0 ? (
            <button type="button" onClick={addEducation}
              className="w-full py-6 border-2 border-dashed border-primary-200 rounded-xl text-sm text-primary-400 hover:border-primary-400 hover:text-primary-600 transition-colors">
              + Add your educational qualifications
            </button>
          ) : (
            <div className="space-y-4">
              {((form.education as EducationEntry[]) ?? []).map((edu, i) => (
                <div key={i} className="relative p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <button type="button" onClick={() => removeEducation(i)}
                    className="absolute top-3 right-3 p-1 hover:bg-red-100 rounded text-primary-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pr-8">
                    <InputField label="Degree / Certificate" name={`edu-${i}-degree`} value={edu.degree} onChange={v => updateEducation(i, 'degree', v)} />
                    <InputField label="Institution" name={`edu-${i}-institution`} value={edu.institution} onChange={v => updateEducation(i, 'institution', v)} />
                    <InputField label="Board / University" name={`edu-${i}-board`} value={edu.board} onChange={v => updateEducation(i, 'board', v)} />
                    <InputField label="Year of Passing" name={`edu-${i}-year`} value={edu.year} onChange={v => updateEducation(i, 'year', v)} />
                    <InputField label="Percentage / CGPA" name={`edu-${i}-percentage`} value={edu.percentage} onChange={v => updateEducation(i, 'percentage', v)} />
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
            <button type="button" onClick={addExperience}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 transition-colors">
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          </div>
          {((form.experience as ExperienceEntry[]) ?? []).length === 0 ? (
            <button type="button" onClick={addExperience}
              className="w-full py-6 border-2 border-dashed border-primary-200 rounded-xl text-sm text-primary-400 hover:border-primary-400 hover:text-primary-600 transition-colors">
              + Add work experience (leave blank for freshers)
            </button>
          ) : (
            <div className="space-y-4">
              {((form.experience as ExperienceEntry[]) ?? []).map((exp, i) => (
                <div key={i} className="relative p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <button type="button" onClick={() => removeExperience(i)}
                    className="absolute top-3 right-3 p-1 hover:bg-red-100 rounded text-primary-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pr-8">
                    <InputField label="Job Title" name={`exp-${i}-title`} value={exp.title} onChange={v => updateExperience(i, 'title', v)} />
                    <InputField label="Organization" name={`exp-${i}-org`} value={exp.organization} onChange={v => updateExperience(i, 'organization', v)} />
                    <InputField label="From Date" name={`exp-${i}-from`} value={exp.from_date} onChange={v => updateExperience(i, 'from_date', v)} type="date" />
                    <InputField label="To Date (leave blank if current)" name={`exp-${i}-to`} value={exp.to_date ?? ''} onChange={v => updateExperience(i, 'to_date', v || null)} type="date" />
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-primary-700 mb-1.5">Description</label>
                      <textarea value={exp.description} onChange={e => updateExperience(i, 'description', e.target.value)}
                        rows={2} className="w-full border border-primary-200 rounded-lg px-3 py-2.5 text-sm text-primary-900 focus:outline-none focus:border-primary-500 resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Communication */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-primary-100 p-6"
        >
          <h3 className="text-sm font-bold text-primary-800 mb-5 pb-3 border-b border-primary-100">Communication & Emergency Contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InputField label="Email Address" name="email" value={form.email ?? ''} onChange={v => set('email', v)} type="email" />
            <InputField label="WhatsApp Number" name="whatsapp" value={form.whatsapp ?? ''} onChange={v => set('whatsapp', v.replace(/\D/g, '').slice(0, 10))} />
            <InputField label="Emergency Contact Name" name="emergency_name" value={form.emergency_name ?? ''} onChange={v => set('emergency_name', v)} />
            <InputField label="Emergency Contact Mobile" name="emergency_mobile" value={form.emergency_mobile ?? ''} onChange={v => set('emergency_mobile', v.replace(/\D/g, '').slice(0, 10))} />
            <InputField label="Relation" name="emergency_relation" value={form.emergency_relation ?? ''} onChange={v => set('emergency_relation', v)} />
          </div>
        </motion.div>

        {/* Save */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-70 transition-all">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : saved ? (
            <><CheckCircle className="w-5 h-5 text-emerald-400" /> Profile Saved!</>
          ) : (
            <><Save className="w-5 h-5" /> Save Profile</>
          )}
        </button>
      </form>
    </div>
  );
}
