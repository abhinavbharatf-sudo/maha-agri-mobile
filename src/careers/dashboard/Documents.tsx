import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Upload, ExternalLink, CheckCircle2, AlertTriangle, Clock, X, Loader2 } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications, getMyDocuments, uploadCandidateDocument } from '../lib/api';
import type { RmsApplicationWithDetails, RmsCandidateDocument } from '../lib/types';

const DOC_STATUS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:             { label: 'Pending Upload',   icon: Clock,          color: 'text-amber-700',  bg: 'bg-amber-50' },
  uploaded:            { label: 'Under Review',     icon: Clock,          color: 'text-blue-700',   bg: 'bg-blue-50' },
  verified:            { label: 'Verified',         icon: CheckCircle2,   color: 'text-green-700',  bg: 'bg-green-50' },
  rejected:            { label: 'Rejected',         icon: X,              color: 'text-red-700',    bg: 'bg-red-50' },
  correction_required: { label: 'Needs Correction', icon: AlertTriangle,  color: 'text-orange-700', bg: 'bg-orange-50' },
};

const REQUIRED_DOCS = [
  { type: 'photo',         label: 'Passport Photo' },
  { type: 'aadhaar',       label: 'Aadhaar Card' },
  { type: 'qualification', label: 'Educational Certificate' },
  { type: 'caste',         label: 'Caste Certificate (if applicable)' },
];

export default function CandidateDocuments() {
  const { user, profile } = useCandidateAuth();
  const [applications, setApplications] = useState<RmsApplicationWithDetails[]>([]);
  const [documents, setDocuments] = useState<RmsCandidateDocument[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getMyApplications(profile.id), getMyDocuments(profile.id)]).then(([apps, docs]) => {
      const activeApps = (apps.data ?? []).filter(a => !['draft','withdrawn'].includes(a.status));
      setApplications(activeApps);
      if (activeApps.length > 0) setSelectedApp(activeApps[0].id);
      setDocuments(docs.data ?? []);
      setLoading(false);
    });
  }, [profile]);

  const appDocs = documents.filter(d => d.application_id === selectedApp);
  const uploadedTypes = new Set(appDocs.map(d => d.document_type));

  const handleUpload = async (docType: string, docLabel: string, file: File) => {
    if (!user || !profile || !selectedApp) return;
    setUploading(docType);
    await uploadCandidateDocument(user.id, profile.id, selectedApp, file, docType, docLabel);
    const { data } = await getMyDocuments(profile.id);
    setDocuments(data ?? []);
    setUploading(null);
  };

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl border border-primary-100" />)}</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
        <FolderOpen className="w-12 h-12 text-primary-200 mx-auto mb-3" />
        <p className="font-bold text-primary-600 text-lg mb-2">No Active Applications</p>
        <p className="text-primary-500 text-sm">Documents will appear here after you submit an application.</p>
      </div>
    );
  }

  const selectedAppData = applications.find(a => a.id === selectedApp);

  return (
    <div className="space-y-5">
      {/* Application selector */}
      {applications.length > 1 && (
        <div>
          <p className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-2">Select Application</p>
          <div className="flex flex-wrap gap-2">
            {applications.map(a => (
              <button key={a.id} onClick={() => setSelectedApp(a.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                  selectedApp === a.id
                    ? 'bg-primary-900 text-white border-primary-900'
                    : 'bg-white text-primary-700 border-primary-200 hover:border-primary-400'
                }`}>
                {a.job_posting?.title ?? a.application_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current application context */}
      {selectedAppData && (
        <div className="bg-primary-50 rounded-xl border border-primary-100 px-4 py-3 text-sm">
          <span className="font-semibold text-primary-900">{selectedAppData.job_posting?.title}</span>
          <span className="mx-2 text-primary-300">·</span>
          <span className="font-mono text-xs text-primary-500">{selectedAppData.application_number}</span>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {REQUIRED_DOCS.map((req, idx) => {
          const uploaded = appDocs.find(d => d.document_type === req.type);
          const cfg = DOC_STATUS[uploaded?.status ?? 'pending'];
          const Icon = cfg.icon;
          return (
            <motion.div key={req.type}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-xl border border-primary-100 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-900 text-sm">{req.label}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                  {uploaded?.file_name && (
                    <p className="text-xs text-primary-400 truncate mt-0.5">{uploaded.file_name}</p>
                  )}
                  {uploaded?.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">{uploaded.rejection_reason}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {uploaded?.storage_path && (
                    <a href={uploaded.storage_path} target="_blank" rel="noreferrer"
                      className="p-2 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {(!uploaded || uploaded.status === 'pending' || uploaded.status === 'correction_required' || uploaded.status === 'rejected') && (
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      uploading === req.type
                        ? 'bg-primary-100 text-primary-400 cursor-not-allowed'
                        : 'bg-primary-900 text-white hover:bg-primary-800'
                    }`}>
                      {uploading === req.type
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Upload className="w-3 h-3" />}
                      {uploadedTypes.has(req.type) ? 'Re-upload' : 'Upload'}
                      <input type="file" className="hidden"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        disabled={uploading !== null}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(req.type, req.label, file);
                          e.target.value = '';
                        }} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-primary-400 text-center">
        Accepted formats: PDF, JPEG, PNG, WEBP — Max 10MB per file
      </p>
    </div>
  );
}
