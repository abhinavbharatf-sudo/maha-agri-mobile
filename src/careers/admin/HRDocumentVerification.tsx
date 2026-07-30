import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, Loader2, User, FileText, Search, X, Filter,
} from 'lucide-react';
import {
  listDocumentsForVerification,
  verifyDocument,
  rejectDocument,
  requestDocumentCorrection,
} from '../lib/api';
import type { RmsCandidateDocument, RmsCandidateProfile, ApplicationStatus } from '../lib/types';
import { useAuth } from '../../lib/auth/AuthContext';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';

interface DocWithRelations extends RmsCandidateDocument {
  candidate?: Pick<RmsCandidateProfile, 'id' | 'full_name' | 'mobile' | 'candidate_id'>;
  application?: {
    id: string;
    application_number: string;
    status: ApplicationStatus;
    job_posting?: { id: string; title: string };
  };
}

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:             { label: 'Pending',            color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  uploaded:            { label: 'Awaiting Review',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  verified:            { label: 'Verified',           color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  rejected:            { label: 'Rejected',           color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  correction_required: { label: 'Correction Needed',  color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Documents' },
  { value: 'uploaded', label: 'Awaiting Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'correction_required', label: 'Correction Required' },
];

export default function HRDocumentVerification() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocWithRelations[]>([]);
  const [filtered, setFiltered] = useState<DocWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('uploaded');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; mode: 'reject' | 'correction' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listDocumentsForVerification().then(r => {
      setDocs((r.data ?? []) as DocWithRelations[]);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let results = docs;
    if (statusFilter) results = results.filter(d => d.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(d =>
        (d.candidate?.full_name ?? '').toLowerCase().includes(s) ||
        (d.candidate?.mobile ?? '').includes(s) ||
        (d.document_type ?? '').toLowerCase().includes(s) ||
        (d.application?.application_number ?? '').toLowerCase().includes(s)
      );
    }
    setFiltered(results);
  }, [docs, statusFilter, search]);

  const handleVerify = async (doc: DocWithRelations) => {
    setDocLoading(doc.id);
    await verifyDocument(doc.id, user?.id ?? '');
    load();
    setDocLoading(null);
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setDocLoading(rejectModal.id);
    if (rejectModal.mode === 'reject') {
      await rejectDocument(rejectModal.id, rejectReason.trim(), user?.id ?? '');
    } else {
      await requestDocumentCorrection(rejectModal.id, rejectReason.trim());
    }
    setRejectModal(null);
    setRejectReason('');
    setDocLoading(null);
    load();
  };

  // Counts per status
  const counts = docs.reduce<Record<string, number>>((acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'uploaded',            label: 'Awaiting Review', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
          { key: 'verified',            label: 'Verified',        color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
          { key: 'rejected',            label: 'Rejected',        color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
          { key: 'correction_required', label: 'Correction Req.', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
        ].map(item => (
          <button key={item.key}
            onClick={() => setStatusFilter(item.key)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
              statusFilter === item.key ? `${item.bg} ${item.border}` : 'bg-white border-primary-100'
            }`}>
            <div className={`text-2xl font-black mb-0.5 ${item.color}`}>{counts[item.key] ?? 0}</div>
            <div className="text-xs font-semibold text-primary-600">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-56 bg-white border border-primary-200 rounded-xl px-3 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by candidate, document type, application..."
            className="flex-1 text-sm text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none" />
          {search && (
            <button onClick={() => setSearch('')} className="text-primary-300 hover:text-primary-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-primary-200 rounded-xl px-3 py-2.5 bg-white text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-300">
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl">
          <span className="text-sm font-bold text-primary-700">{loading ? '—' : filtered.length}</span>
          <span className="text-sm text-primary-500">documents</span>
        </div>
      </div>

      {/* Document cards */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-primary-100 h-24 animate-pulse" />
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-16 text-center">
          <FolderOpen className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-600 text-base mb-1">No documents found</p>
          <p className="text-sm text-primary-400">
            {statusFilter === 'uploaded' ? 'All documents have been reviewed.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc, idx) => {
            const cfg = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.pending;
            const isLoading = docLoading === doc.id;
            return (
              <motion.div key={doc.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.025 }}
                className="bg-white rounded-xl border border-primary-100 hover:border-primary-200 transition-all"
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Doc info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold text-primary-900 text-sm capitalize">
                          {doc.document_label ?? doc.document_type.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-500">
                        {doc.candidate && (
                          <span className="flex items-center gap-1.5 font-semibold text-primary-700">
                            <User className="w-3.5 h-3.5 text-primary-400" />
                            {doc.candidate.full_name}
                            <span className="font-mono font-normal">· {doc.candidate.mobile}</span>
                          </span>
                        )}
                        {doc.application && (
                          <>
                            <span className="font-mono">{doc.application.application_number}</span>
                            {doc.application.job_posting?.title && (
                              <span>{doc.application.job_posting.title}</span>
                            )}
                            <ApplicationStatusBadge status={doc.application.status} size="sm" />
                          </>
                        )}
                        {doc.file_name && (
                          <span className="text-primary-400 truncate max-w-48">{doc.file_name}</span>
                        )}
                      </div>

                      {doc.rejection_reason && (
                        <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                          <span className="font-semibold">Reason: </span>{doc.rejection_reason}
                        </div>
                      )}

                      {doc.verified_at && (
                        <p className="mt-1 text-xs text-primary-400">
                          Reviewed: {new Date(doc.verified_at).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {doc.storage_path && (
                        <a href={doc.storage_path} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}

                      {(doc.status === 'uploaded' || doc.status === 'pending') && (
                        <>
                          <button disabled={isLoading}
                            onClick={() => handleVerify(doc)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Verify
                          </button>

                          <button disabled={!!docLoading}
                            onClick={() => { setRejectModal({ id: doc.id, mode: 'correction' }); setRejectReason(''); }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-60">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Correction
                          </button>

                          <button disabled={!!docLoading}
                            onClick={() => { setRejectModal({ id: doc.id, mode: 'reject' }); setRejectReason(''); }}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60">
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject / Correction Modal */}
      <AnimatePresence>
        {rejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setRejectModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  {rejectModal.mode === 'reject'
                    ? <XCircle className="w-6 h-6 text-red-500" />
                    : <AlertTriangle className="w-6 h-6 text-amber-500" />}
                  <h3 className="font-bold text-primary-900">
                    {rejectModal.mode === 'reject' ? 'Reject Document' : 'Request Correction'}
                  </h3>
                </div>
                <p className="text-sm text-primary-600 mb-4">
                  {rejectModal.mode === 'reject'
                    ? 'Provide a reason for rejecting this document.'
                    : 'Describe what needs to be corrected or re-uploaded.'}
                </p>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                  placeholder="e.g. Image is blurry, please re-upload a clear scan..."
                  className="w-full text-sm border border-primary-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none mb-4" />
                <div className="flex gap-3">
                  <button onClick={handleRejectConfirm} disabled={!rejectReason.trim() || !!docLoading}
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                      rejectModal.mode === 'reject'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                    {docLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {rejectModal.mode === 'reject' ? 'Reject Document' : 'Send Correction Request'}
                  </button>
                  <button onClick={() => setRejectModal(null)}
                    className="px-4 text-sm font-semibold py-2.5 rounded-xl border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
