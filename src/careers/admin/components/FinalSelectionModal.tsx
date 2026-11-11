import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, ShieldAlert, Loader2, Award, Clock } from 'lucide-react';
import { recordFinalSelection } from '../../lib/api';

interface FinalSelectionModalProps {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDecisionRecorded?: () => void;
}

export default function FinalSelectionModal({
  applicationId,
  candidateName,
  jobTitle,
  isOpen,
  onClose,
  onDecisionRecorded,
}: FinalSelectionModalProps) {
  const [decision, setDecision] = useState<'selected' | 'rejected' | 'on_hold'>('selected');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await recordFinalSelection(applicationId, decision, remarks);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (onDecisionRecorded) onDecisionRecorded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-primary-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-primary-100">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-900" />
            <h3 className="font-bold text-primary-900 text-base">Record Final Selection Decision</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-primary-400 hover:text-primary-700 hover:bg-primary-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-3 text-xs text-primary-600 bg-primary-50/60 p-3 rounded-xl border border-primary-100">
          <p><span className="font-semibold text-primary-900">Candidate:</span> {candidateName}</p>
          <p className="mt-0.5"><span className="font-semibold text-primary-900">Position:</span> {jobTitle}</p>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5 my-4">
          <div>
            <label className="block text-xs font-bold text-primary-700 mb-1.5 uppercase tracking-wide">
              Selection Decision *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('selected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decision === 'selected'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Selected
              </button>
              <button
                type="button"
                onClick={() => setDecision('on_hold')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decision === 'on_hold'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                On Hold
              </button>
              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  decision === 'rejected'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-red-800 border-red-200 hover:bg-red-50'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary-700 mb-1 uppercase tracking-wide">
              Official Decision Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Provide justification and hiring committee notes..."
              className="w-full text-xs border border-primary-200 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-primary-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 rounded-xl border border-primary-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-800 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm Decision
          </button>
        </div>
      </motion.div>
    </div>
  );
}
