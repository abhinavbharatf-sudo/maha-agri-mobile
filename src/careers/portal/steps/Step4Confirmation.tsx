import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Building2,
  Calendar,
  MapPin,
  User,
  ArrowRight,
  Printer,
  LayoutDashboard,
  Clock,
  CreditCard,
  AlertCircle,
  GraduationCap,
  Award,
  Briefcase
} from 'lucide-react';
import type { RmsJobPosting } from '../../lib/types';
import type { MasterProfileFormData, JobSpecificFormData } from '../types';

interface Step4ConfirmationProps {
  applicationNumber: string;
  applicationId: string;
  submittedAt: string | null;
  status?: string | null;
  applicationFeeAmount?: number;
  job: RmsJobPosting;
  masterProfile: MasterProfileFormData;
  jobSpecific: JobSpecificFormData;
}

export default function Step4Confirmation({
  applicationNumber,
  applicationId,
  submittedAt,
  status,
  applicationFeeAmount = 0,
  job,
  masterProfile,
  jobSpecific,
}: Step4ConfirmationProps) {
  const navigate = useNavigate();

  const isPaymentPending = status === 'payment_pending' || (applicationFeeAmount > 0 && status !== 'submitted');

  const formattedTimestamp = submittedAt
    ? new Date(submittedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  return (
    <div className="space-y-6">
      {/* ── Status Hero ─────────────────────────────────────────────────────── */}
      {isPaymentPending ? (
        <div className="text-center py-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Clock className="w-9 h-9" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-2">
            Application Registered — Payment Pending
          </div>
          <h2 className="text-xl font-bold text-[#102a43] mb-1">Fee Payment Required</h2>
          <p className="text-xs text-[#627d98] max-w-md mx-auto">
            Your application for <strong className="text-[#102a43]">{job.title}</strong> has been registered. Please complete the application fee payment to finalize your submission.
          </p>
        </div>
      ) : (
        <div className="text-center py-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            Application Submitted Successfully
          </div>
          <h2 className="text-xl font-bold text-[#102a43] mb-1">Receipt &amp; Acknowledgement</h2>
          <p className="text-xs text-[#627d98] max-w-md mx-auto">
            Your official application for <strong className="text-[#102a43]">{job.title}</strong> has been successfully registered with the digital operations platform.
          </p>
        </div>
      )}

      {/* ── Official Reference Banner ────────────────────────────────────────── */}
      <div className="bg-[#102a43] text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block mb-1">
            Authoritative Application Number
          </span>
          <div className="text-2xl font-mono font-extrabold tracking-wide text-white">
            {applicationNumber || 'PENDING'}
          </div>
          {applicationId && (
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Ref ID: {applicationId}
            </span>
          )}
        </div>

        <div className="flex sm:flex-col items-end text-left sm:text-right gap-1 border-t sm:border-t-0 border-slate-700/60 pt-3 sm:pt-0 w-full sm:w-auto">
          <span className="text-[11px] text-slate-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Timestamp:
          </span>
          <span className="text-xs font-semibold text-white">{formattedTimestamp}</span>
        </div>
      </div>

      {/* ── Payment Callout Banner (Only for paid positions) ──────────────────── */}
      {isPaymentPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm text-amber-950">
                Application Fee: ₹{applicationFeeAmount.toLocaleString('en-IN')}
              </span>
              <p className="text-amber-800 leading-relaxed mt-0.5">
                Candidature activation requires successful fee settlement via the existing payment gateway.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/candidate/payments')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <CreditCard className="w-4 h-4" /> Pay Application Fee <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Snapshot Summary Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Candidate Details */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
            <User className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Applicant Profile</h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#627d98]">Applicant Name:</span>
              <span className="font-semibold text-[#102a43]">{masterProfile.fullName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#627d98]">Verified Phone:</span>
              <span className="font-semibold text-[#102a43]">+91 {masterProfile.mobile || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#627d98]">Home Location:</span>
              <span className="font-semibold text-[#102a43]">
                {masterProfile.homeTaluka ? `${masterProfile.homeTaluka}, ` : ''}{masterProfile.homeDistrict || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Position Details */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
            <Building2 className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Position Allocation</h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#627d98]">Designation:</span>
              <span className="font-semibold text-[#102a43]">{job.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#627d98]">Department:</span>
              <span className="font-semibold text-[#102a43]">{job.department || 'MAHA-AGRI'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#627d98] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Preferred District:
              </span>
              <span className="font-semibold text-[#102a43]">
                {jobSpecific.preferredTaluka ? `${jobSpecific.preferredTaluka}, ` : ''}{jobSpecific.preferredDistrict || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Declared Educational Credentials Snapshot (Included in Print/Save) ─── */}
      <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[#102a43]">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#102a43]" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Educational Qualifications</h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Total Declared: {Array.isArray(jobSpecific.qualifications) && jobSpecific.qualifications.length > 0 ? jobSpecific.qualifications.length : (jobSpecific.highestQualification ? 1 : 0)}
          </span>
        </div>

        {Array.isArray(jobSpecific.qualifications) && jobSpecific.qualifications.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {jobSpecific.qualifications.map((q, idx) => (
              <div
                key={q.id || idx}
                className={`p-3 rounded-lg border ${
                  q.isPrimary ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#102a43]">{q.level || 'Qualification'}</span>
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
                    : q.customQualification || 'Course Not Specified'}
                </p>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
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
        ) : jobSpecific.highestQualification ? (
          <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/30 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#102a43]">{jobSpecific.highestQualification}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <Award className="w-3 h-3 text-emerald-600" />
                Highest Qualification
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-[11px] mt-2">
              <span>Passing Year: <strong className="text-slate-800">{jobSpecific.passingYear || '—'}</strong></span>
              <span>Percentage / Marks: <strong className="text-slate-800">{jobSpecific.marksPercentage ? `${jobSpecific.marksPercentage}%` : '—'}</strong></span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No educational records declared.</p>
        )}
      </div>

      {/* ── Work Experience Summary (if applicable) ─────────────────────────── */}
      {Array.isArray(jobSpecific.experiences) && jobSpecific.experiences.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[#102a43]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#102a43]" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Work Experience</h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Total Duration: {jobSpecific.experienceYears || '0'} Years {jobSpecific.experienceMonths || '0'} Months {jobSpecific.experienceDays ? `${jobSpecific.experienceDays} Days` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {jobSpecific.experiences.map((exp, idx) => (
              <div key={exp.id || idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#102a43]">{exp.employer || 'Employer'}</span>
                  {exp.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Currently Working
                    </span>
                  )}
                </div>
                {exp.designation && <p className="text-slate-600 font-medium mb-1">Role: {exp.designation}</p>}
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Duration: <strong className="text-slate-800">{exp.years}Y {exp.months}M {exp.days ? `${exp.days}D` : ''}</strong></span>
                  <span>Certificate: <strong className="text-slate-800">{exp.hasCertificate === 'yes' ? 'Available' : 'No'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Next Steps Information Notice ────────────────────────────────────── */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
        <h4 className="font-bold text-[#102a43]">What happens next?</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
          {isPaymentPending ? (
            <>
              <li>Please complete the fee payment from your Candidate Dashboard to activate review.</li>
              <li>A WhatsApp confirmation receipt will be dispatched immediately upon successful payment settlement.</li>
              <li>You can view receipt details and transaction history anytime under My Payments.</li>
            </>
          ) : (
            <>
              <li>A confirmation notification has been queued for your verified WhatsApp number.</li>
              <li>Our recruitment team will review your eligibility against the vacancy criteria.</li>
              <li>You can track application updates, interview invitations, and document verification requests in your Candidate Dashboard.</li>
            </>
          )}
        </ul>
      </div>

      {/* ── Navigation Actions ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-4 h-4" /> Print / Save Acknowledgement
        </button>

        <button
          type="button"
          onClick={() => navigate('/candidate/applications')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-[#102a43] text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          View My Applications
        </button>

        {isPaymentPending ? (
          <button
            type="button"
            onClick={() => navigate('/candidate/payments')}
            className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <CreditCard className="w-4 h-4" /> Proceed to Fee Payment <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/candidate/dashboard')}
            className="inline-flex items-center justify-center gap-2 flex-1 px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Candidate Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
