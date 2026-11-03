import { useState, useMemo } from 'react';
import {
  ShieldCheck, ArrowLeft, Send, CheckCircle2,
  User, MapPin, GraduationCap, Briefcase, AlertCircle, Lock, Award, ClipboardList
} from 'lucide-react';
import type { RmsJobPosting } from '../../lib/types';
import type { MasterProfileFormData, JobSpecificFormData, JobQuestionnaire, JobQuestion } from '../types';
import { calculateAge, maskAadhaar } from '../utils/verhoeff';

interface Step3ReviewSubmitProps {
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
  job: RmsJobPosting;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onEditQuestionnaire?: () => void;
}

const STANDARD_DECLARATION =
  'I hereby declare that all the information provided in this application form is true, complete, and correct to the best of my knowledge and belief. I understand that any false information, misrepresentation, or suppression of material facts will render my candidature liable to cancellation at any stage of the recruitment process, including after appointment. I confirm that I have read and understood the eligibility criteria, terms, and conditions for the above position and I fulfil all the requirements. I agree to abide by the rules and regulations of the digital operations platform and terms of engagement.';

export default function Step3ReviewSubmit({
  masterProfile,
  jobSpecific,
  job,
  submitting,
  onBack,
  onSubmit,
  onEditQuestionnaire,
}: Step3ReviewSubmitProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const questionnaire: JobQuestionnaire | null = useMemo(() => {
    const q = (job as any)?.questionnaire || (job?.vacancy_allocations as any)?.questionnaire;
    if (
      q &&
      q.status !== 'draft' &&
      q.isVisibleToCandidates !== false &&
      Array.isArray(q.questions) &&
      q.questions.some((item: any) => item.isVisible !== false)
    ) {
      return q;
    }
    return null;
  }, [job]);

  const hasQuestionnaire = Boolean(questionnaire);

  // Administrative or fallback declaration text
  const declarationText = job.acknowledgement_text?.trim() || STANDARD_DECLARATION;
  const ageYears = masterProfile.dateOfBirth ? calculateAge(masterProfile.dateOfBirth) : null;

  const handleProceed = () => {
    if (!acknowledged) {
      setValidationError('You must read and accept the mandatory declaration before submitting.');
      return;
    }
    setValidationError(null);
    onSubmit();
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#102a43]">
            {hasQuestionnaire ? 'Step 5: Review Application & Declaration' : 'Step 4: Review Application & Declaration'}
          </h2>
          <p className="text-xs text-[#627d98]">
            Carefully verify all details below before proceeding to final submission.
          </p>
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Summary Card 1: Basic Information (Demographics & Addresses) ── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
          <User className="w-4 h-4 text-[#102a43]" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[#627d98] block mb-0.5">Full Name (as per Aadhaar Card)</span>
            <span className="font-semibold text-[#102a43]">{masterProfile.fullName || '—'}</span>
          </div>

          {masterProfile.aadhaarNumber && (
            <div>
              <span className="text-[#627d98] block mb-0.5">Aadhaar Number</span>
              <span className="font-mono font-bold text-[#102a43] flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                {maskAadhaar(masterProfile.aadhaarNumber)}
              </span>
            </div>
          )}

          {masterProfile.email && (
            <div>
              <span className="text-[#627d98] block mb-0.5">Email Address</span>
              <span className="font-semibold text-[#102a43] truncate block">{masterProfile.email}</span>
            </div>
          )}

          <div>
            <span className="text-[#627d98] block mb-0.5">Date of Birth &amp; Age</span>
            <span className="font-semibold text-[#102a43]">
              {masterProfile.dateOfBirth || '—'}
              {ageYears !== null && ` (${ageYears} Years)`}
            </span>
          </div>

          <div>
            <span className="text-[#627d98] block mb-0.5">Gender</span>
            <span className="font-semibold text-[#102a43] capitalize">{masterProfile.gender || '—'}</span>
          </div>

          <div>
            <span className="text-[#627d98] block mb-0.5">Verified WhatsApp Mobile</span>
            <span className="font-semibold text-[#102a43]">
              +91 {masterProfile.mobile || '—'}
            </span>
          </div>

          {masterProfile.alternateMobile && (
            <div>
              <span className="text-[#627d98] block mb-0.5">Alternate Mobile</span>
              <span className="font-semibold text-[#102a43]">+91 {masterProfile.alternateMobile}</span>
            </div>
          )}

          {masterProfile.casteCategory && (
            <div>
              <span className="text-[#627d98] block mb-0.5">Caste Category</span>
              <span className="font-semibold text-[#102a43]">{masterProfile.casteCategory}</span>
            </div>
          )}
        </div>

        {/* Addresses Summary */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <span className="font-bold text-[#102a43] uppercase tracking-wider block text-[11px]">
              Current Residential Address
            </span>
            <p className="text-slate-800 font-semibold">{masterProfile.currentAddressLine1 || masterProfile.addressLine1 || '—'}</p>
            <p className="text-slate-600">
              Taluka: <span className="font-semibold text-slate-800">{masterProfile.currentTaluka || masterProfile.homeTaluka || '—'}</span>, District: <span className="font-semibold text-slate-800">{masterProfile.currentDistrict || masterProfile.homeDistrict || '—'}</span>
            </p>
            <p className="text-slate-600">
              PIN Code: <span className="font-mono font-semibold text-slate-800">{masterProfile.currentPincode || masterProfile.pincode || '—'}</span>
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#102a43] uppercase tracking-wider block text-[11px]">
                Permanent Residential Address
              </span>
              {masterProfile.permanentSameAsCurrent && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Same as Current
                </span>
              )}
            </div>
            {masterProfile.permanentSameAsCurrent ? (
              <p className="text-slate-600 italic text-[11px]">Identical to Current Residential Address.</p>
            ) : (
              <>
                <p className="text-slate-800 font-semibold">{masterProfile.permanentAddressLine1 || masterProfile.currentAddressLine1 || masterProfile.addressLine1 || '—'}</p>
                <p className="text-slate-600">
                  Taluka: <span className="font-semibold text-slate-800">{masterProfile.permanentTaluka || masterProfile.currentTaluka || masterProfile.homeTaluka || '—'}</span>, District: <span className="font-semibold text-slate-800">{masterProfile.permanentDistrict || masterProfile.currentDistrict || masterProfile.homeDistrict || '—'}</span>
                </p>
                <p className="text-slate-600">
                  PIN Code: <span className="font-mono font-semibold text-slate-800">{masterProfile.permanentPincode || masterProfile.currentPincode || masterProfile.pincode || '—'}</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Card 2: Position & Preferred Posting Location ─────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
          <MapPin className="w-4 h-4 text-[#102a43]" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Position &amp; Preferred Posting Location</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[#627d98] block mb-0.5">Applied Position</span>
            <span className="font-semibold text-[#102a43]">{job.title}</span>
          </div>

          <div>
            <span className="text-[#627d98] block mb-0.5">Department</span>
            <span className="font-semibold text-[#102a43]">{job.department || 'MAHA-AGRI Digital Operations'}</span>
          </div>

          <div>
            <span className="text-[#627d98] block mb-0.5">Posting Level</span>
            <span className="font-semibold text-[#102a43]">
              {job.posting_level || (job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district' ? 'District-wise' : 'Taluka-wise')}
            </span>
          </div>

          <div>
            <span className="text-[#627d98] block mb-0.5">Preferred District</span>
            <span className="font-semibold text-[#102a43]">{jobSpecific.preferredDistrict || '—'}</span>
          </div>

          {job.posting_level !== 'District-wise' && job.vacancy_level !== 'district' && job.vacancy_allocations?.vacancy_level !== 'district' && (
            <div>
              <span className="text-[#627d98] block mb-0.5">Preferred Taluka</span>
              <span className="font-semibold text-[#102a43]">{jobSpecific.preferredTaluka || '—'}</span>
            </div>
          )}

          {jobSpecific.locationConfirmed && (
            <div className="sm:col-span-2">
              <span className="text-[#627d98] block mb-0.5">Location Difference Confirmation</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                Acknowledged &amp; Willing to Work at Selected Location
              </span>
            </div>
          )}
        </div>

        {/* Answered Location & Mobility Questions */}
        {jobSpecific.locationAnswers && Object.keys(jobSpecific.locationAnswers).length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Candidate Work Location Preferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(jobSpecific.locationAnswers).map(([qId, val]) => {
                const questionObj = (job.location_questions || job.vacancy_allocations?.location_questions)?.find(
                  (q: any) => q.id === qId
                );
                const qText = questionObj?.questionText || (
                  qId === 'work_outside_district'
                    ? 'Willing to work outside native district'
                    : qId === 'travel_within_district'
                    ? 'Willing to travel within assigned district'
                    : qId === 'work_travel_assigned_taluka'
                    ? 'Willing to work and travel in assigned taluka'
                    : qId === 'work_another_taluka'
                    ? 'Willing to work in another taluka within assigned district'
                    : qId
                );
                return (
                  <div key={qId} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
                    <span className="text-slate-700 font-medium">{qText}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] shrink-0 ${
                      val === true ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {val === true ? 'Yes' : 'No'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Card 3: Educational Qualifications & Experience ─────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
          <GraduationCap className="w-4 h-4 text-[#102a43]" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Educational Qualifications &amp; Work Experience</h3>
        </div>

        {/* Declarations List for Qualifications */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Declared Educational Qualifications ({jobSpecific.qualifications?.length || 1})
          </h4>

          {Array.isArray(jobSpecific.qualifications) && jobSpecific.qualifications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {jobSpecific.qualifications.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className={`p-3 rounded-lg border ${
                    q.isPrimary
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#102a43]">
                      {q.level || 'Qualification'}
                    </span>
                    {q.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <Award className="w-3 h-3 text-emerald-600" />
                        Highest Qualification
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 font-medium mb-1">
                    {q.course
                      ? q.course === 'Other' && q.customCourse
                        ? q.customCourse
                        : q.course
                      : q.level === 'SSC'
                      ? 'Standard Board Curriculum'
                      : 'Course Not Specified'}
                  </p>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Year: <strong className="text-slate-800">{q.passingYear || '—'}</strong></span>
                    <span>
                      {q.gradingFormat === 'cgpa' ? 'CGPA:' : 'Percentage:'}{' '}
                      <strong className="text-slate-800">
                        {q.marksValue ? (q.gradingFormat === 'cgpa' ? `${q.marksValue} / 10.0` : `${q.marksValue}%`) : '—'}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#627d98] block mb-0.5">Highest Qualification</span>
                <span className="font-semibold text-[#102a43]">{jobSpecific.highestQualification || '—'}</span>
              </div>
              <div>
                <span className="text-[#627d98] block mb-0.5">Passing Year</span>
                <span className="font-semibold text-[#102a43]">{jobSpecific.passingYear || '—'}</span>
              </div>
              <div>
                <span className="text-[#627d98] block mb-0.5">Marks / Percentage</span>
                <span className="font-semibold text-[#102a43]">{jobSpecific.marksPercentage || '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Declarations List for Work Experience */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Work Experience History
            </h4>
            <span className="font-bold text-xs text-[#102a43]">
              {jobSpecific.experienceType === 'experienced'
                ? `Total: ${jobSpecific.experienceYears || '0'} Years ${jobSpecific.experienceMonths || '0'} Months ${jobSpecific.experienceDays || '0'} Days`
                : 'Status: Fresher (0 Years)'}
            </span>
          </div>

          {jobSpecific.experienceType === 'experienced' && Array.isArray(jobSpecific.experiences) && jobSpecific.experiences.length > 0 ? (
            <div className="space-y-2.5 text-xs">
              {jobSpecific.experiences.map((exp, idx) => (
                <div key={exp.id || idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-[#102a43] text-xs">{exp.employer}</span>
                      {exp.designation && <span className="text-slate-500 ml-1.5 font-medium">({exp.designation})</span>}
                    </div>
                    <span className="font-semibold text-slate-700 text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {exp.years || '0'} Y {exp.months || '0'} M {exp.days || '0'} D
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px] flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                    <span>
                      Period: <strong className="text-slate-800">{exp.startDate || '—'}</strong> to{' '}
                      <strong className="text-slate-800">{exp.isCurrent ? 'Present' : (exp.endDate || '—')}</strong>
                    </span>
                    <span>
                      Experience Certificate:{' '}
                      <strong className={exp.hasCertificate === 'yes' ? 'text-emerald-700' : 'text-slate-700'}>
                        {exp.hasCertificate === 'yes' ? 'Available' : 'Not Available'}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Candidate declared as Fresher / Entry-Level applicant with no prior formal field employment.
            </p>
          )}
        </div>
      </div>

      {/* ── Summary Card 4: Job-Specific Questionnaire Responses ──────────── */}
      {hasQuestionnaire && questionnaire && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#102a43]">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Job-Specific Assessment Responses
              </h3>
            </div>
            {onEditQuestionnaire && (
              <button
                type="button"
                onClick={onEditQuestionnaire}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                Edit Responses
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {questionnaire.questions.map((q: JobQuestion, idx: number) => {
              // 1. Skip questions individually hidden by HR
              if (q.isVisible === false) return null;

              const answers = jobSpecific.questionnaireResponses || {};
              const rawVal = answers[q.id];

              // 2. Check conditional visibility & parent cascade
              if (q.condition) {
                const parentQ = questionnaire.questions.find(item => item.id === q.condition!.dependsOnQuestionId);
                if (parentQ && parentQ.isVisible === false) return null;

                const parentVal = answers[q.condition.dependsOnQuestionId];
                const matches = Array.isArray(parentVal)
                  ? parentVal.includes(q.condition.expectedValue)
                  : parentVal === q.condition.expectedValue;
                if (!matches) return null;
              }

              let displayVal = '—';
              if (rawVal === true) displayVal = 'Yes';
              else if (rawVal === false) displayVal = 'No';
              else if (Array.isArray(rawVal)) {
                if (q.options && q.options.length > 0) {
                  displayVal = rawVal
                    .map(v => q.options?.find(o => o.value === v)?.label || v)
                    .join(', ') || '—';
                } else {
                  displayVal = rawVal.join(', ') || '—';
                }
              } else if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                if (q.type === 'radio' || q.type === 'select') {
                  const opt = q.options?.find(o => o.value === rawVal);
                  displayVal = opt ? opt.label : String(rawVal);
                } else {
                  displayVal = String(rawVal);
                }
              }

              return (
                <div key={q.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="font-semibold text-slate-600 block mb-1">
                    {idx + 1}. {q.questionText}
                  </span>
                  <span className="font-bold text-[#102a43] whitespace-pre-wrap">
                    {displayVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Statutory Legal Declaration ──────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#102a43]">
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
            Statutory Legal Undertaking &amp; Declaration
          </h3>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
          {declarationText}
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none group pt-1">
          <div
            onClick={() => setAcknowledged(!acknowledged)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              acknowledged
                ? 'bg-[#102a43] border-[#102a43]'
                : 'border-slate-300 bg-white group-hover:border-slate-400'
            }`}
          >
            {acknowledged && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <span
            onClick={() => setAcknowledged(!acknowledged)}
            className="text-xs font-semibold text-slate-800 leading-relaxed"
          >
            I have read, understood, and accept the above declaration. I confirm that all information provided is accurate and complete, and I accept the terms of application submission.
          </span>
        </label>
      </div>

      {/* ── Navigation Buttons ──────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> {hasQuestionnaire ? 'Back to Questionnaire' : 'Back to Position Details'}
        </button>

        <button
          type="button"
          onClick={handleProceed}
          disabled={submitting || !acknowledged}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
        </button>
      </div>
    </div>
  );
}
