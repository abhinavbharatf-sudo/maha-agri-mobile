import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import type { RmsJobPosting, RmsJobBadge, RmsRecruitmentStep, RmsJobFaq } from '../lib/types';
import { listJobBadges, listRecruitmentSteps, listJobFaqs } from '../lib/api';
import JobDetailContent from '../components/JobDetailContent';

export interface JobDetailsModalProps {
  job: RmsJobPosting;
  isOpen: boolean;
  onClose: () => void;
  onContinueApplication?: () => void;
}

export default function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onContinueApplication,
}: JobDetailsModalProps) {
  const [badges, setBadges] = useState<RmsJobBadge[]>([]);
  const [customSteps, setCustomSteps] = useState<RmsRecruitmentStep[]>([]);
  const [customFaqs, setCustomFaqs] = useState<RmsJobFaq[]>([]);

  // Fetch optional badges, steps, and FAQs if job.id exists
  useEffect(() => {
    if (!isOpen || !job?.id) return;
    Promise.all([
      listJobBadges(job.id),
      listRecruitmentSteps(job.id),
      listJobFaqs(job.id),
    ]).then(([b, sSteps, f]) => {
      setBadges((b.data || []).filter(x => x.enabled));
      setCustomSteps((sSteps.data || []).filter(x => x.enabled));
      setCustomFaqs((f.data || []).filter(x => x.enabled));
    }).catch(() => {
      // Graceful fallback to static defaults
    });
  }, [isOpen, job?.id]);

  // Keyboard accessibility and body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const handleContinue = () => {
    if (onContinueApplication) {
      onContinueApplication();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-details-modal-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-full sm:h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── STICKY MODAL HEADER ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-800 border border-primary-200">
                Official Position Specifications
              </span>
              {job.department && (
                <span className="text-xs font-semibold text-slate-500 truncate">
                  • {job.department}
                </span>
              )}
            </div>
            <h2 id="job-details-modal-title" className="text-base sm:text-lg font-bold text-slate-900 truncate flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-700 shrink-0 hidden sm:inline" />
              <span>{job.title}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE MODAL CONTENT (Single Source of Truth via JobDetailContent) ── */}
        <div className="flex-1 overflow-y-auto">
          <JobDetailContent
            job={job}
            mode="modal"
            badges={badges}
            customSteps={customSteps}
            customFaqs={customFaqs}
            hideBreadcrumbs={true}
            hideHeroAction={true}
            hideOtherOpenings={true}
            hideMobileStickyBar={true}
          />
        </div>

        {/* ── STICKY MODAL FOOTER ────────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-end gap-3 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-[#102a43] hover:bg-[#243b53] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Continue Application
          </button>
        </div>

      </div>
    </div>
  );
}
