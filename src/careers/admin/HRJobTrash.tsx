import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, AlertCircle, CheckCircle, X, Briefcase, ArrowLeft, Clock, Search } from 'lucide-react';
import { listTrashedJobs, restoreJob, deleteJob, bulkRestoreJobs } from '../lib/api';
import type { RmsJobPosting } from '../lib/types';
import { EMPLOYMENT_TYPE_LABELS, JOB_STATUS_CONFIG } from '../lib/constants';

export default function HRJobTrash() {
  const [jobs,          setJobs]          = useState<RmsJobPosting[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<RmsJobPosting | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<RmsJobPosting | null>(null);
  const [processing,    setProcessing]    = useState(false);
  const [actionError,   setActionError]   = useState<string | null>(null);
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());

  const load = () =>
    listTrashedJobs().then(r => { setJobs(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.department?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      j.slug.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setProcessing(true); setActionError(null);
    const { error } = await restoreJob(restoreTarget.id);
    setProcessing(false);
    if (error) { setActionError(error.message); return; }
    setSuccessMsg(`"${restoreTarget.title}" has been restored to active jobs.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    setRestoreTarget(null);
    load();
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true); setActionError(null);
    const { error } = await deleteJob(deleteTarget.id);
    setProcessing(false);
    if (error) { setActionError(error.message); return; }
    setSuccessMsg(`"${deleteTarget.title}" has been permanently deleted.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    setDeleteTarget(null);
    load();
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setProcessing(true); setActionError(null);
    const { error } = await bulkRestoreJobs(ids);
    setProcessing(false);
    if (error) { setActionError(error.message); return; }
    setSuccessMsg(`${ids.length} job(s) restored.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    setSelectedIds(new Set());
    load();
  };

  const closeDialogs = () => {
    if (processing) return;
    setRestoreTarget(null);
    setDeleteTarget(null);
    setActionError(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredJobs.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredJobs.map(j => j.id)));
  };

  return (
    <div className="space-y-5">

      {/* Restore confirmation dialog */}
      <AnimatePresence>
        {restoreTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && closeDialogs()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-start gap-4 p-6 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-primary-900">Restore Job Posting</h3>
                  <p className="text-sm text-primary-500 mt-0.5">This job will be moved back to active job listings.</p>
                </div>
                <button onClick={closeDialogs} disabled={processing}
                  className="p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 pb-4">
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-sm font-semibold text-primary-900 truncate">{restoreTarget.title}</p>
                  {restoreTarget.department && <p className="text-xs text-primary-500 mt-0.5">{restoreTarget.department}</p>}
                </div>
                <p className="text-sm text-primary-600 mt-3">The job will be restored with its previous status. You can edit and publish it again from Job Postings.</p>
                {actionError && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{actionError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button type="button" onClick={closeDialogs} disabled={processing}
                  className="flex-1 py-2.5 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 text-sm transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="button" onClick={handleRestore} disabled={processing}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm transition-colors disabled:opacity-60">
                  {processing ? 'Restoring…' : 'Restore Job'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permanent delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && closeDialogs()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-start gap-4 p-6 pb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-primary-900">Permanently Delete</h3>
                  <p className="text-sm text-primary-500 mt-0.5">This action permanently deletes the job and cannot be undone.</p>
                </div>
                <button onClick={closeDialogs} disabled={processing}
                  className="p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 pb-4">
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-sm font-semibold text-primary-900 truncate">{deleteTarget.title}</p>
                  {deleteTarget.department && <p className="text-xs text-primary-500 mt-0.5">{deleteTarget.department}</p>}
                </div>
                <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 font-medium">All associated data including badges, flow steps, FAQs and vacancies will be permanently removed. This cannot be undone.</p>
                </div>
                {actionError && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{actionError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button type="button" onClick={closeDialogs} disabled={processing}
                  className="flex-1 py-2.5 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl hover:bg-primary-50 text-sm transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="button" onClick={handlePermanentDelete} disabled={processing}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 text-sm transition-colors disabled:opacity-60">
                  {processing ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success notification */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary-900">Job Trash</h2>
          <p className="text-sm text-primary-500 mt-0.5">Archived jobs are stored here. Restore or permanently delete them.</p>
        </div>
        <Link to="/admin/rms/jobs"
          className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search archived jobs..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:border-primary-500 bg-white" />
      </div>

      {/* Bulk Restore */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary-700">{selectedIds.size} selected</span>
          <button onClick={handleBulkRestore} disabled={processing}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50">
            Bulk Restore
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-900 rounded-full animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-2xl border border-primary-100"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-primary-300" />
          </div>
          <p className="text-primary-600 font-semibold">{search ? 'No archived jobs match your search.' : 'Trash is empty'}</p>
          {!search && <p className="text-primary-400 text-sm mt-1">Archived job postings will appear here.</p>}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" checked={selectedIds.size === filteredJobs.length && filteredJobs.length > 0}
              onChange={toggleSelectAll} className="rounded border-primary-300" />
            <span className="text-xs text-primary-500">Select All</span>
          </div>
          {filteredJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-primary-100 p-4 flex items-start gap-4"
            >
              <input type="checkbox" checked={selectedIds.has(job.id)} onChange={() => toggleSelect(job.id)}
                className="rounded border-primary-300 mt-1" />
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                <Briefcase className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-primary-900 truncate">{job.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${JOB_STATUS_CONFIG[job.status]?.badge ?? 'bg-primary-50 text-primary-500'}`}>
                    {JOB_STATUS_CONFIG[job.status]?.label ?? job.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-primary-500">
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>{job.location}</span>}
                  {job.employment_type && <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>}
                </div>
                {job.trashed_at && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                    <Clock className="w-3 h-3" />
                    Archived {new Date(job.trashed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setRestoreTarget(job); setActionError(null); }}
                  title="Restore job"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
                <button
                  onClick={() => { setDeleteTarget(job); setActionError(null); }}
                  title="Permanently delete"
                  className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
