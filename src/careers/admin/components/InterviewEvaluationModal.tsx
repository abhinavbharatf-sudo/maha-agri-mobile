import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Award, CheckCircle2, AlertCircle, Loader2, Lock, UserCheck } from 'lucide-react';
import { submitInterviewEvaluation, getApplicationEvaluations } from '../../lib/api';
import type { RmsInterviewEvaluation } from '../../lib/types';

interface EvaluationModalProps {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function InterviewEvaluationModal({
  applicationId,
  candidateName,
  jobTitle,
  isOpen,
  onClose,
  onSubmitted,
}: EvaluationModalProps) {
  const [commScore, setCommScore] = useState(16);
  const [subjectScore, setSubjectScore] = useState(20);
  const [expScore, setExpScore] = useState(12);
  const [practicalScore, setPracticalScore] = useState(20);
  const [overallScore, setOverallScore] = useState(12);

  const [comments, setComments] = useState({
    communication: '',
    subject_knowledge: '',
    experience: '',
    practical_knowledge: '',
    overall_rating: '',
  });

  const [overallNotes, setOverallNotes] = useState('');
  const [recommendation, setRecommendation] = useState<'selected' | 'wait_list' | 'rejected' | 'hold'>('selected');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEvals, setExistingEvals] = useState<RmsInterviewEvaluation[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(true);

  const totalScore = commScore + subjectScore + expScore + practicalScore + overallScore;

  useEffect(() => {
    if (!isOpen || !applicationId) return;
    setLoadingEvals(true);
    getApplicationEvaluations(applicationId).then(res => {
      setExistingEvals(res.data);
      setLoadingEvals(false);
    });
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitInterviewEvaluation({
        applicationId,
        scoreCommunication: commScore,
        scoreSubjectKnowledge: subjectScore,
        scoreExperience: expScore,
        scorePracticalKnowledge: practicalScore,
        scoreOverallRating: overallScore,
        criterionComments: comments,
        overallObservations: overallNotes,
        recommendation,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-primary-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-primary-100">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-900" />
              <h3 className="font-bold text-primary-900 text-lg">Interview Evaluation Form (100 Marks)</h3>
            </div>
            <p className="text-xs text-primary-600 mt-1">
              Candidate: <span className="font-semibold">{candidateName}</span> &bull; Position: <span className="font-semibold">{jobTitle}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-primary-400 hover:text-primary-700 hover:bg-primary-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing evaluations from other interviewers */}
        {existingEvals.length > 0 && (
          <div className="my-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
            <p className="font-bold text-blue-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> Multi-Interviewer Evaluations Recorded ({existingEvals.length}):
            </p>
            <div className="space-y-1.5">
              {existingEvals.map((ev, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-primary-800">{ev.evaluator_name || 'Interviewer'}: </span>
                    <span className="font-bold text-emerald-700">{ev.total_score ?? 0}/100</span> &bull; Recommendation:{' '}
                    <span className="uppercase font-bold text-primary-700">{ev.recommendation}</span>
                  </div>
                  <span className="text-primary-400 text-[11px]">{new Date(ev.evaluated_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Score Criteria Breakdown */}
        <div className="space-y-4 my-4">
          {/* 1. Communication Skills (Max 20) */}
          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-primary-800">1. Communication & Articulation Skills</label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900">{commScore} / 20</span>
            </div>
            <input
              type="range" min={0} max={20} value={commScore}
              onChange={e => setCommScore(Number(e.target.value))}
              className="w-full accent-primary-900 cursor-pointer"
            />
            <input
              type="text" placeholder="Optional comments on communication..."
              value={comments.communication}
              onChange={e => setComments({ ...comments, communication: e.target.value })}
              className="mt-2 w-full text-xs border border-primary-200 rounded-lg p-2 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* 2. Subject Knowledge (Max 25) */}
          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-primary-800">2. Subject & Domain Knowledge</label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900">{subjectScore} / 25</span>
            </div>
            <input
              type="range" min={0} max={25} value={subjectScore}
              onChange={e => setSubjectScore(Number(e.target.value))}
              className="w-full accent-primary-900 cursor-pointer"
            />
            <input
              type="text" placeholder="Optional comments on subject knowledge..."
              value={comments.subject_knowledge}
              onChange={e => setComments({ ...comments, subject_knowledge: e.target.value })}
              className="mt-2 w-full text-xs border border-primary-200 rounded-lg p-2 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* 3. Relevant Experience (Max 15) */}
          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-primary-800">3. Relevant Practical Experience</label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900">{expScore} / 15</span>
            </div>
            <input
              type="range" min={0} max={15} value={expScore}
              onChange={e => setExpScore(Number(e.target.value))}
              className="w-full accent-primary-900 cursor-pointer"
            />
            <input
              type="text" placeholder="Optional comments on experience..."
              value={comments.experience}
              onChange={e => setComments({ ...comments, experience: e.target.value })}
              className="mt-2 w-full text-xs border border-primary-200 rounded-lg p-2 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* 4. Practical Knowledge / Problem Solving (Max 25) */}
          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-primary-800">4. Practical Problem Solving & Aptitude</label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900">{practicalScore} / 25</span>
            </div>
            <input
              type="range" min={0} max={25} value={practicalScore}
              onChange={e => setPracticalScore(Number(e.target.value))}
              className="w-full accent-primary-900 cursor-pointer"
            />
            <input
              type="text" placeholder="Optional comments on practical knowledge..."
              value={comments.practical_knowledge}
              onChange={e => setComments({ ...comments, practical_knowledge: e.target.value })}
              className="mt-2 w-full text-xs border border-primary-200 rounded-lg p-2 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* 5. Overall Personality & Fit (Max 15) */}
          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-primary-800">5. Overall Personality & Cultural Fit</label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-900">{overallScore} / 15</span>
            </div>
            <input
              type="range" min={0} max={15} value={overallScore}
              onChange={e => setOverallScore(Number(e.target.value))}
              className="w-full accent-primary-900 cursor-pointer"
            />
            <input
              type="text" placeholder="Optional comments on overall personality..."
              value={comments.overall_rating}
              onChange={e => setComments({ ...comments, overall_rating: e.target.value })}
              className="mt-2 w-full text-xs border border-primary-200 rounded-lg p-2 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          {/* Total Marks Banner */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Aggregated Marks</p>
              <p className="text-xs text-emerald-700">Strictly confidential &mdash; hidden from candidate portal.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-800">{totalScore}</span>
              <span className="text-xs font-bold text-emerald-600"> / 100</span>
            </div>
          </div>

          {/* Overall Observations & Recommendation */}
          <div>
            <label className="block text-xs font-bold text-primary-700 mb-1">Overall Qualitative Observations</label>
            <textarea
              rows={2}
              value={overallNotes}
              onChange={e => setOverallNotes(e.target.value)}
              placeholder="Candidate demonstrated strong knowledge of government agricultural policies..."
              className="w-full text-xs border border-primary-200 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary-700 mb-1">Interviewer Recommendation *</label>
            <select
              value={recommendation}
              onChange={e => setRecommendation(e.target.value as any)}
              className="w-full text-xs border border-primary-200 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-300 font-semibold"
            >
              <option value="selected">Recommend for Selection</option>
              <option value="wait_list">Add to Wait List</option>
              <option value="hold">Keep on Hold</option>
              <option value="rejected">Not Recommended (Reject)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-primary-100">
          <p className="text-[11px] text-primary-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Locks upon submission
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 rounded-xl border border-primary-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-800 rounded-xl transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit Evaluation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
