import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  getJobBySlug, listPublishedJobs, listJobBadges,
  listRecruitmentSteps, listJobFaqs, incrementJobViews,
  getExistingApplication
} from '../lib/api';
import { subscribeToJobUpdates } from '../lib/jobEvents';
import type {
  RmsJobPosting, RmsJobBadge, RmsRecruitmentStep,
  RmsJobFaq, RmsApplication
} from '../lib/types';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { isDummyOtpMode } from '../lib/dummyOtp';
import OTPLoginModal from '../components/OTPLoginModal';
import { trackJobView } from '../../crm/lib/api';
import JobDetailContent from '../components/JobDetailContent';

export default function JobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile, verifiedMobile, setVerifiedMobile } = useCandidateAuth();

  const [job, setJob] = useState<RmsJobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpOpen, setOtpOpen] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<RmsJobPosting[]>([]);
  const [badges, setBadges] = useState<RmsJobBadge[]>([]);
  const [customSteps, setCustomSteps] = useState<RmsRecruitmentStep[]>([]);
  const [customFaqs, setCustomFaqs] = useState<RmsJobFaq[]>([]);
  const [existingApp, setExistingApp] = useState<RmsApplication | null>(null);

  // Digital acknowledgement checkbox
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [ackHighlight, setAckHighlight] = useState(false);
  const [isSubmittingDeclaration, setIsSubmittingDeclaration] = useState(false);

  const ackRef = useRef<HTMLDivElement>(null);
  const ackInputRef = useRef<HTMLInputElement>(null);

  // ── Load Job & Metadata ─────────────────────────────────────────────────────
  const loadJobData = useCallback((targetSlug?: string) => {
    const s = targetSlug || slug;
    if (!s) return;
    Promise.all([getJobBySlug(s), listPublishedJobs()]).then(([j, all]) => {
      const jobData = j.data;
      setJob(jobData);
      setRelatedJobs((all.data || []).filter(r => r.slug !== s).slice(0, 3));
      setLoading(false);
      if (jobData?.id) {
        Promise.all([
          listJobBadges(jobData.id),
          listRecruitmentSteps(jobData.id),
          listJobFaqs(jobData.id),
        ]).then(([b, sSteps, f]) => {
          setBadges((b.data || []).filter(x => x.enabled));
          setCustomSteps((sSteps.data || []).filter(x => x.enabled));
          setCustomFaqs((f.data || []).filter(x => x.enabled));
        });
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    loadJobData();

    // Invalidate & refresh immediately when this job (or any job) is updated in Admin
    const unsubscribe = subscribeToJobUpdates(detail => {
      if (detail.slug && detail.slug !== slug && job?.id && detail.jobId === job.id) {
        // HR updated the job title/slug — navigate smoothly to the new slug
        navigate(`/careers/jobs/${detail.slug}`, { replace: true });
      } else if (!detail.slug || detail.slug === slug || (job?.id && detail.jobId === job.id)) {
        loadJobData();
      } else {
        // Another job was updated; refresh related jobs list
        listPublishedJobs().then(all => {
          setRelatedJobs((all.data || []).filter(r => r.slug !== slug).slice(0, 3));
        });
      }
    });

    // Invalidate & refresh whenever user switches back to this tab
    const handleFocus = () => loadJobData();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadJobData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [slug, loadJobData, navigate, job?.id]);

  // Check if current authenticated candidate has an existing active application
  useEffect(() => {
    const activeMobile = (verifiedMobile || user?.phone || '').replace(/\D/g, '').slice(-10);
    const profileMobile = (profile?.mobile || '').replace(/\D/g, '').slice(-10);

    if (profile?.id && job?.id && (!activeMobile || profileMobile === activeMobile)) {
      getExistingApplication(profile.id, job.id)
        .then(res => {
          if (res.data && !res.data.is_trashed) {
            setExistingApp(res.data);
          } else {
            setExistingApp(null);
          }
        })
        .catch(() => setExistingApp(null));
    } else {
      setExistingApp(null);
    }
  }, [profile?.id, profile?.mobile, job?.id, verifiedMobile, user?.phone]);

  // View tracking
  useEffect(() => {
    if (job?.id) {
      incrementJobViews(job.id);
      if (user?.id) {
        trackJobView(user.id, job.id, user.id, user.phone || profile?.mobile).catch(() => {});
      }
    }
  }, [job?.id, user?.id, user?.phone, profile?.mobile]);

  // Status checks
  const isClosed = !job || ['coming_soon', 'applications_closed', 'filled', 'hidden', 'draft', 'archived'].includes(job.status);

  // Core application navigation & auth progression logic
  const proceedToApplication = useCallback(() => {
    if (!job?.id) return;
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;

    if (user?.id || (isDummyOtpMode() && verifiedMobile)) {
      navigate(`/careers/portal/apply/${job.id}`);
      return;
    }

    setOtpOpen(true);
  }, [existingApp, isClosed, navigate, user?.id, verifiedMobile, job?.id]);

  const handleApply = useCallback(() => {
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;
    if (!acknowledged) {
      setShowDialog(true);
      return;
    }

    proceedToApplication();
  }, [existingApp, isClosed, acknowledged, proceedToApplication]);

  const handleAcceptDeclaration = useCallback(() => {
    if (isSubmittingDeclaration) return;
    setIsSubmittingDeclaration(true);
    setAcknowledged(true);
    setShowDialog(false);
    proceedToApplication();
    setTimeout(() => {
      setIsSubmittingDeclaration(false);
    }, 300);
  }, [isSubmittingDeclaration, proceedToApplication]);

  const handleLoginSuccess = (_isNewUser?: boolean, mobile?: string) => {
    setOtpOpen(false);
    setExistingApp(null);
    if (mobile) {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      setVerifiedMobile(clean);
    }
    navigate(`/careers/portal/apply/${job?.id}`);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-900">Position Not Found</h2>
        <p className="text-sm text-slate-600">The requested job opening does not exist or has been archived.</p>
        <Link to="/careers" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white rounded-xl text-sm font-bold hover:bg-primary-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Browse All Openings
        </Link>
      </div>
    );
  }

  return (
    <>
      <JobDetailContent
        job={job}
        mode="page"
        badges={badges}
        customSteps={customSteps}
        customFaqs={customFaqs}
        relatedJobs={relatedJobs}
        existingApp={existingApp}
        onApply={handleApply}
        acknowledged={acknowledged}
        onAcknowledgeChange={setAcknowledged}
        ackHighlight={ackHighlight}
        ackRef={ackRef}
        ackInputRef={ackInputRef}
      />

      {/* ── VALIDATION DIALOG MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Declaration Required</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Please confirm that you have reviewed the eligibility criteria, responsibilities, and guidelines for this position before proceeding.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 py-2.5 px-4 min-h-[44px] border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDeclaration}
                  onClick={handleAcceptDeclaration}
                  className="flex-1 py-2.5 px-4 min-h-[44px] bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Accept &amp; Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── OTP LOGIN MODAL ─────────────────────────────────────────────────── */}
      <OTPLoginModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSuccess={handleLoginSuccess}
        title="Candidate Login to Apply"
        subtitle={`Please log in to submit your application for ${job.title}`}
      />
    </>
  );
}
