import { useState, useMemo } from 'react';
import {
  ShieldCheck, ArrowLeft, Send, CheckCircle2,
  User, MapPin, GraduationCap, Briefcase, AlertCircle, Lock, Award, ClipboardList,
  Edit, Home, HelpCircle, Loader2, Info
} from 'lucide-react';
import type { RmsJobPosting } from '../../lib/types';
import type { MasterProfileFormData, JobSpecificFormData, JobQuestionnaire, JobQuestion, FinalDeclarationData } from '../types';
import { calculateAge, maskAadhaar } from '../utils/verhoeff';
import { getLocationVacancyStatus } from '../utils/vacancyEligibility';

interface Step3ReviewSubmitProps {
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
  job: RmsJobPosting;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (declarationData: FinalDeclarationData) => void;
  onEditBasicInfo?: () => void;
  onEditAddresses?: () => void;
  onEditPosition?: () => void;
  onEditQualifications?: () => void;
  onEditExperience?: () => void;
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
  onEditBasicInfo,
  onEditAddresses,
  onEditPosition,
  onEditQualifications,
  onEditExperience,
  onEditQuestionnaire,
}: Step3ReviewSubmitProps) {
  // Independent validation states
  const [statutoryAccepted, setStatutoryAccepted] = useState(false);
  const [statutoryAcceptedAt, setStatutoryAcceptedAt] = useState<string | null>(null);

  const [finalAcknowledged, setFinalAcknowledged] = useState(false);
  const [finalAcknowledgedAt, setFinalAcknowledgedAt] = useState<string | null>(null);

  // Popup modal states (supports both modal and alert listeners)
  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const showStatutoryAlert = showStatutoryModal;
  const setShowStatutoryAlert = setShowStatutoryModal;

  const [showAcknowledgementModal, setShowAcknowledgementModal] = useState(false);
  const showAcknowledgementAlert = showAcknowledgementModal;
  const setShowAcknowledgementAlert = setShowAcknowledgementModal;

  const [showFinalConfirmModal, setShowFinalConfirmModal] = useState(false);

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
  const declarationText = job.acknowledgement_text?.trim() || STANDARD_DECLARATION;
  const ageYears = masterProfile.dateOfBirth ? calculateAge(masterProfile.dateOfBirth) : null;

  const FINAL_ACKNOWLEDGEMENT_TEXT =
    'I have carefully reviewed all information in this application. I understand that after final submission, I cannot edit my application, and duplicate applications for the same position will not be accepted.';

  // Final Submit Click Handler
  const handleFinalSubmitClick = () => {
    // 1. If Statutory Legal Undertaking is unchecked, open Statutory Consent Modal
    if (!statutoryAccepted) {
      setShowStatutoryModal(true);
      return;
    }
    // 2. If Final Acknowledgement is unchecked, open Acknowledgement Consent Modal
    if (!finalAcknowledged) {
      setShowAcknowledgementModal(true);
      return;
    }
    // 3. Both are explicitly accepted: open final confirmation modal
    setShowFinalConfirmModal(true);
  };

  const handleAcceptStatutoryInModal = () => {
    const nowIso = new Date().toISOString();
    setStatutoryAccepted(true);
    setStatutoryAcceptedAt(nowIso);
    setShowStatutoryModal(false);

    // If final acknowledgement is still not accepted, open it next
    if (!finalAcknowledged) {
      setShowAcknowledgementModal(true);
    } else {
      setShowFinalConfirmModal(true);
    }
  };

  const handleAcceptAcknowledgementInModal = () => {
    const nowIso = new Date().toISOString();
    setFinalAcknowledged(true);
    setFinalAcknowledgedAt(nowIso);
    setShowAcknowledgementModal(false);

    // Both accepted: proceed directly to final confirmation modal
    setShowFinalConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    if (submitting) return;
    const nowIso = new Date().toISOString();
    const statutoryTime = statutoryAcceptedAt || nowIso;
    const ackTime = finalAcknowledgedAt || nowIso;
    const declarationVersion = (job as any)?.declaration_version || 'v1.0';

    const declarationPayload: FinalDeclarationData = {
      statutory_declaration_accepted: statutoryAccepted,
      statutory_declaration_text: declarationText,
      statutory_declaration_accepted_at: nowIso,
      statutory_declaration_version: declarationVersion,

      final_acknowledgement_accepted: finalAcknowledged,
      final_acknowledgement_text: FINAL_ACKNOWLEDGEMENT_TEXT,
      final_acknowledgement_accepted_at: nowIso,
      final_acknowledgement_version: 'v1.0',

      acknowledged: statutoryAccepted && finalAcknowledged,
      declaration_text: declarationText,
      acknowledged_at: nowIso,
    };
    onSubmit(declarationPayload);
  };

  return (
    <div className="space-y-6">
      {/* ── Stage Distinction Banner ────────────────────────────────────────── */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-0.5">
          <p className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
            Review Stage &mdash; Please Verify Before Submission
          </p>
          <p className="leading-relaxed">
            Please carefully review all sections of your application below. You may click <strong>Edit</strong> on any section to make changes. Once final submission is confirmed, your application will become locked and no edits can be made.
          </p>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#102a43]">
            {hasQuestionnaire ? 'Step 5: Review Application & Declaration' : 'Step 4: Review Application & Declaration'}
          </h2>
          <p className="text-xs text-[#627d98]">
            Final verification of your candidate profile, posting location, qualifications and work experience.
          </p>
        </div>
      </div>

      {/* ── SECTION 1: Basic Information ───────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#102a43]">
            <User className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">1. Basic Information</h3>
          </div>
          {onEditBasicInfo && (
            <button
              type="button"
              onClick={onEditBasicInfo}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Edit Basic Information"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          )}
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
      </div>

      {/* ── SECTION 2: Residential Addresses ───────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#102a43]">
            <Home className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">2. Residential Addresses</h3>
          </div>
          {onEditAddresses && (
            <button
              type="button"
              onClick={onEditAddresses}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Edit Residential Addresses"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Current Address Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
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

          {/* Permanent Address Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
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

      {/* ── SECTION 3: Position & Preferred Posting Location ────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#102a43]">
            <MapPin className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">3. Position &amp; Preferred Posting Location</h3>
          </div>
          {onEditPosition && (
            <button
              type="button"
              onClick={onEditPosition}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Edit Position & Posting Location"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          )}
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
            <span className="text-[#627d98] block mb-0.5">Drive Level</span>
            <span className="font-semibold text-[#102a43]">
              {job.posting_level || (job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district' ? 'District-wise' : 'Taluka-wise')}
            </span>
          </div>

          {Array.isArray(jobSpecific.preferredDistricts) && jobSpecific.preferredDistricts.length > 0 ? (
            /* Multi-district Preferences View */
            <div className="sm:col-span-2 md:col-span-3 pt-2 space-y-3">
              <span className="text-[#627d98] font-bold uppercase tracking-wider block text-[11px]">
                Selected Preferred Posting Locations ({jobSpecific.preferredDistricts.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {jobSpecific.preferredDistricts.map(p => {
                  const distVac = getLocationVacancyStatus(p.district, null, job);
                  return (
                    <div key={p.id || p.priority} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#102a43] text-xs">Priority {p.priority}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          distVac.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : distVac.status === 'NO VACANCY'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {distVac.status === 'AVAILABLE' ? 'Vacancy Available' : distVac.status === 'NO VACANCY' ? 'No Vacancy' : 'Availability Pending'}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-xs">District: {p.district}</p>
                      {Array.isArray(p.talukas) && p.talukas.length > 0 && p.talukas[0] && (
                        <p className="text-slate-600 text-xs">
                          Taluka{p.talukas.length > 1 ? 's' : ''}: <span className="font-semibold text-slate-800">{p.talukas.filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mobility Consent Record */}
              {jobSpecific.mobilityConsent?.consented ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Mobility Consent Accepted:</strong> Willing to work in selected outside districts ({jobSpecific.mobilityConsent.outsideDistricts?.join(', ') || 'selected districts'}).
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-800">
                    Recorded: {new Date(jobSpecific.mobilityConsent.consentedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ) : jobSpecific.locationConfirmed ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Location Difference Confirmation: Acknowledged &amp; Willing to Work at Selected Location</span>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Mobility Declaration: Preferred locations match residential area.</span>
                </div>
              )}
            </div>
          ) : (
            /* Single District/Taluka View */
            <>
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
            </>
          )}
        </div>

        {/* Mobility Answers */}
        {jobSpecific.locationAnswers && Object.keys(jobSpecific.locationAnswers).length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Work Location Flexibility Preferences
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

      {/* ── SECTION 4: Educational Qualifications ───────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#102a43]">
            <GraduationCap className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              4. Educational Qualifications ({jobSpecific.qualifications?.length || 1})
            </h3>
          </div>
          {onEditQualifications && (
            <button
              type="button"
              onClick={onEditQualifications}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Edit Educational Qualifications"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {Array.isArray(jobSpecific.qualifications) && jobSpecific.qualifications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {jobSpecific.qualifications.map((q, idx) => (
              <div
                key={q.id || idx}
                className={`p-3.5 rounded-xl border ${
                  q.isPrimary
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-[#102a43] text-xs">
                    {q.level || 'Qualification'}
                  </span>
                  {q.isPrimary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <Award className="w-3 h-3 text-emerald-600" />
                      Highest Qualification
                    </span>
                  )}
                </div>
                <p className="text-slate-800 font-semibold mb-1">
                  {q.course
                    ? q.course === 'Other' && q.customCourse
                      ? q.customCourse
                      : q.course
                    : q.level === 'SSC'
                    ? 'Standard Board Curriculum'
                    : 'Course Not Specified'}
                </p>
                <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                  <span>Passing Year: <strong className="text-slate-800">{q.passingYear || '—'}</strong></span>
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

      {/* ── SECTION 5: Work Experience ──────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#102a43]">
            <Briefcase className="w-4 h-4 text-[#102a43]" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              5. Work Experience History
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-[#102a43] bg-slate-100 px-2.5 py-1 rounded-lg">
              {jobSpecific.experienceType === 'experienced'
                ? `Total: ${jobSpecific.experienceYears || '0'}Y ${jobSpecific.experienceMonths || '0'}M ${jobSpecific.experienceDays || '0'}D`
                : 'Status: Fresher'}
            </span>
            {onEditExperience && (
              <button
                type="button"
                onClick={onEditExperience}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Work Experience"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
        </div>

        {jobSpecific.experienceType === 'experienced' && Array.isArray(jobSpecific.experiences) && jobSpecific.experiences.length > 0 ? (
          <div className="space-y-2.5 text-xs">
            {jobSpecific.experiences.map((exp, idx) => (
              <div key={exp.id || idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-[#102a43] text-xs">{exp.employer}</span>
                    {exp.designation && <span className="text-slate-500 ml-1.5 font-medium">({exp.designation})</span>}
                  </div>
                  <span className="font-semibold text-slate-700 text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {exp.years || '0'} Y {exp.months || '0'} M {exp.days || '0'} D
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] flex-wrap gap-2 pt-1.5 border-t border-slate-200/60">
                  <span>
                    Period: <strong className="text-slate-800">{exp.startDate || '—'}</strong> to{' '}
                    <strong className="text-slate-800">{exp.isCurrent ? 'Present' : (exp.endDate || '—')}</strong>
                  </span>
                  <span>
                    Experience Certificate:{' '}
                    <strong className={exp.hasCertificate === 'yes' ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                      {exp.hasCertificate === 'yes' ? 'Available' : 'Not Available'}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            Candidate declared as Fresher / Entry-Level applicant with no prior formal employment history.
          </p>
        )}
      </div>

      {/* ── SECTION 6: Job-Specific Questionnaire (Conditional) ─────────────── */}
      {hasQuestionnaire && questionnaire && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#102a43]">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                6. Job-Specific Assessment Responses
              </h3>
            </div>
            {onEditQuestionnaire && (
              <button
                type="button"
                onClick={onEditQuestionnaire}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Responses
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {questionnaire.questions.map((q: JobQuestion, idx: number) => {
              if (q.isVisible === false) return null;
              const answers = jobSpecific.questionnaireResponses || {};
              const rawVal = answers[q.id];

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

      {/* ── SECTION 7: Statutory Legal Undertaking & Declaration ────────────── */}
      <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/80 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#102a43]">
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
            Statutory Legal Undertaking &amp; Declaration
          </h3>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
          {declarationText}
        </div>

        {/* Checkbox 1: Statutory Legal Undertaking */}
        <label className="flex items-start gap-3 cursor-pointer select-none group pt-1">
          <input
            type="checkbox"
            checked={statutoryAccepted}
            onChange={e => {
              setStatutoryAccepted(e.target.checked);
              if (e.target.checked) {
                if (!statutoryAcceptedAt) setStatutoryAcceptedAt(new Date().toISOString());
              } else {
                setStatutoryAcceptedAt(null);
              }
            }}
            className="w-4 h-4 mt-0.5 rounded text-[#102a43] focus:ring-[#102a43] border-slate-300 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-800 leading-relaxed">
            I have read, understood, and accept the statutory declaration. I confirm that all information provided is accurate and complete, and I accept the terms of application submission.
          </span>
        </label>
      </div>

      {/* ── SECTION 8: Mandatory Final Review Acknowledgement ───────────────── */}
      <div className="border border-amber-200 rounded-xl p-5 bg-amber-50/40 space-y-3">
        <div className="flex items-center gap-2 text-amber-900">
          <Lock className="w-4 h-4 text-amber-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Mandatory Final Acknowledgement
          </h3>
        </div>

        {/* Checkbox 2: Final Submission Lock Acknowledgement */}
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={finalAcknowledged}
            onChange={e => {
              setFinalAcknowledged(e.target.checked);
              if (e.target.checked) {
                if (!finalAcknowledgedAt) setFinalAcknowledgedAt(new Date().toISOString());
              } else {
                setFinalAcknowledgedAt(null);
              }
            }}
            className="w-4 h-4 mt-0.5 rounded text-[#102a43] focus:ring-[#102a43] border-slate-300 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-900 leading-relaxed">
            I have carefully reviewed all information in this application. I understand that after final submission, I cannot edit my application, and duplicate applications for the same position will not be accepted.
          </span>
        </label>
      </div>

      {/* ── Navigation Actions ──────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100 flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {hasQuestionnaire ? 'Back to Questionnaire' : '← Back to Position Details'}
        </button>

        {/* Always Clickable Final Submit Button */}
        <button
          type="button"
          onClick={handleFinalSubmitClick}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Confirm &amp; Final Submit
            </>
          )}
        </button>
      </div>

      {/* ── POPUP MODAL 1: Statutory Legal Undertaking & Declaration Modal ───── */}
      {showStatutoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="statutory-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 id="statutory-modal-title" className="text-base font-bold text-[#102a43]">
                  Statutory Declaration Required &mdash; Statutory Legal Undertaking &amp; Declaration
                </h3>
                <p className="text-xs text-[#627d98]">
                  Mandatory Legal Declaration for: <strong>{job.title}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Please read the complete statutory undertaking carefully. You must explicitly agree to these legal terms before submitting your application.
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed overflow-y-auto whitespace-pre-line flex-1 max-h-64 font-sans">
              {declarationText}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatutoryModal(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel &amp; Review Form
              </button>
              <button
                type="button"
                onClick={handleAcceptStatutoryInModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP MODAL 2: Mandatory Final Review Acknowledgement Modal ──────── */}
      {showAcknowledgementModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ack-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="ack-modal-title" className="text-base font-bold text-[#102a43]">
                  Final Acknowledgement Required &mdash; Mandatory Final Acknowledgement
                </h3>
                <p className="text-xs text-[#627d98]">
                  Application Review &amp; Locking Confirmation
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                Important Notice on Application Submission:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">
                <li><strong>No Further Edits:</strong> Once submitted, application details cannot be modified or updated.</li>
                <li><strong>Duplicate Applications Blocked:</strong> Candidates cannot submit another application for the same position.</li>
                <li><strong>Permanent Snapshot:</strong> All candidate details and preferences will be permanently recorded.</li>
              </ul>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed italic">
              &ldquo;{FINAL_ACKNOWLEDGEMENT_TEXT}&rdquo;
            </div>

            <p className="text-xs text-slate-600">
              By clicking <strong>I Agree &amp; Continue</strong>, you explicitly confirm this acknowledgement.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAcknowledgementModal(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel &amp; Review Form
              </button>
              <button
                type="button"
                onClick={handleAcceptAcknowledgementInModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP MODAL 3: Final Confirmation Modal ────────────────────────── */}
      {showFinalConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#102a43]">
                  Confirm Final Application Submission
                </h3>
                <p className="text-xs text-[#627d98]">
                  Position: <strong>{job.title}</strong>
                </p>
              </div>
            </div>

            {/* Critical Locking Warnings */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                Please note the following before final submission:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">
                <li><strong>The application becomes locked</strong> immediately after final submission.</li>
                <li><strong>You cannot edit</strong> or modify any submitted information once submitted.</li>
                <li><strong>Duplicate applications</strong> for the same position will not be accepted.</li>
              </ul>
            </div>

            <p className="text-xs text-[#486581] leading-relaxed">
              Are you sure you want to finalize and submit your application now?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFinalConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Yes, Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
