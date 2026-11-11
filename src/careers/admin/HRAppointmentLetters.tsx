import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award, Plus, FileText, CheckCircle2, Clock, AlertCircle,
  Download, ExternalLink, ShieldCheck, UserCheck, Loader2,
  Calendar, MapPin, DollarSign, X, Check, Lock
} from 'lucide-react';
import {
  listAllApplications,
  listAppointmentTemplates,
  upsertAppointmentTemplate,
  listOrganizationSignatures,
  upsertOrganizationSignature,
  generateProvisionalAppointmentLetter,
  issueFinalAppointmentLetter,
} from '../lib/api';
import { supabase } from '../../lib/supabase/client';
import type {
  RmsAppointmentLetter,
  RmsAppointmentTemplate,
  RmsOrganizationSignature,
  RmsApplicationWithDetails,
} from '../lib/types';
import PrintableAppointmentLetterModal from '../components/PrintableAppointmentLetterModal';

type ActiveTab = 'letters' | 'templates' | 'signatures';

export default function HRAppointmentLetters() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('letters');
  const [letters, setLetters] = useState<any[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(true);
  const [templates, setTemplates] = useState<RmsAppointmentTemplate[]>([]);
  const [signatures, setSignatures] = useState<RmsOrganizationSignature[]>([]);
  const [previewLetter, setPreviewLetter] = useState<any | null>(null);

  // Issue Provisional Letter Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<RmsApplicationWithDetails[]>([]);
  const [targetAppId, setTargetAppId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedOrgSigId, setSelectedOrgSigId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [joiningVenue, setJoiningVenue] = useState('MAHA-AGRI Central Operations Hub, Pune');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Template Form State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [tmplDesignation, setTmplDesignation] = useState('');
  const [tmplCommonTerms, setTmplCommonTerms] = useState(
    '1. The employee shall adhere to government confidentiality mandates.\n2. Standard 3-month probation period applies.\n3. Working hours are 9:30 AM to 5:30 PM, Monday to Saturday.'
  );
  const [tmplPositionTerms, setTmplPositionTerms] = useState(
    '1. Responsible for agricultural field operations.\n2. Weekly progress reports must be submitted to District Officer.'
  );

  // Signature Form State
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigName, setSigName] = useState('Dr. Rajesh Patil');
  const [sigDesignation, setSigDesignation] = useState('Director of Human Resources & Operations');
  const [sigImageUrl, setSigImageUrl] = useState('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=200');

  const loadLetters = useCallback(async () => {
    setLoadingLetters(true);
    const { data, error } = await supabase
      .from('rms_appointment_letters')
      .select(`
        *,
        application:rms_applications(
          id, application_number, status,
          candidate:rms_candidate_profiles(id, full_name, mobile, email),
          job_posting:rms_job_postings(id, title)
        ),
        org_signature:rms_organization_signatures(*)
      `)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      setLetters(data);
    }
    setLoadingLetters(false);
  }, []);

  const loadTemplatesAndSignatures = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      listAppointmentTemplates(),
      listOrganizationSignatures(),
    ]);
    setTemplates(tRes.data);
    setSignatures(sRes.data);
    if (sRes.data.length > 0 && !selectedOrgSigId) {
      setSelectedOrgSigId(sRes.data[0].id);
    }
    if (tRes.data.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(tRes.data[0].id);
    }
  }, [selectedOrgSigId, selectedTemplateId]);

  const loadEligibleApplications = useCallback(async () => {
    const res = await listAllApplications({ status: 'selected' as any });
    setSelectedApplications(res.data);
  }, []);

  useEffect(() => {
    loadLetters();
    loadTemplatesAndSignatures();
    loadEligibleApplications();
  }, [loadLetters, loadTemplatesAndSignatures, loadEligibleApplications]);

  const handleIssueLetter = async () => {
    if (!targetAppId || !joiningDate || !joiningVenue) return;
    setIssuing(true);
    setIssueError(null);
    try {
      const res = await generateProvisionalAppointmentLetter(
        targetAppId,
        joiningDate,
        joiningVenue,
        selectedTemplateId || undefined,
        selectedOrgSigId || undefined
      );

      if (res.error) {
        setIssueError(res.error);
        return;
      }

      setShowIssueModal(false);
      loadLetters();
    } catch (err: any) {
      setIssueError(err?.message || 'Failed to issue letter.');
    } finally {
      setIssuing(false);
    }
  };

  const handleIssueFinalLetter = async (applicationId: string) => {
    const res = await issueFinalAppointmentLetter(applicationId);
    if (res.error) {
      alert(`Cannot issue final letter: ${res.error}`);
    } else {
      loadLetters();
    }
  };

  const handleSaveTemplate = async () => {
    if (!tmplDesignation.trim()) return;
    const commonList = tmplCommonTerms.split('\n').filter(t => t.trim().length > 0);
    const positionList = tmplPositionTerms.split('\n').filter(t => t.trim().length > 0);
    await upsertAppointmentTemplate({
      designation: tmplDesignation.trim(),
      common_terms: commonList,
      position_terms: positionList,
      is_active: true,
    });
    setShowTemplateModal(false);
    loadTemplatesAndSignatures();
  };

  const handleSaveSignature = async () => {
    if (!sigName.trim() || !sigDesignation.trim()) return;
    await upsertOrganizationSignature({
      signatory_name: sigName.trim(),
      designation: sigDesignation.trim(),
      signature_image_url: sigImageUrl.trim(),
      is_active: true,
    });
    setShowSigModal(false);
    loadTemplatesAndSignatures();
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex border-b border-primary-200 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('letters')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'letters'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <Award className="w-4 h-4" /> Appointment Letters ({letters.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'templates'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <FileText className="w-4 h-4" /> Letter Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('signatures')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'signatures'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Org Signatures ({signatures.length})
        </button>
      </div>

      {/* ── TAB 1: APPOINTMENT LETTERS ──────────────────────────── */}
      {activeTab === 'letters' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-primary-900">Provisional & Final Appointment Letters</h2>
              <p className="text-xs text-primary-500">
                Track candidate 3-day digital signatures, 7-day onboarding fee payment windows, and issue final letters
              </p>
            </div>
            <button
              onClick={() => {
                setShowIssueModal(true);
                loadEligibleApplications();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Issue Provisional Letter
            </button>
          </div>

          {loadingLetters ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
          ) : letters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
              <Award className="w-10 h-10 text-primary-200 mx-auto mb-2" />
              <p className="font-semibold text-primary-600 text-sm mb-1">No appointment letters issued yet</p>
              <p className="text-xs text-primary-400">Issue a provisional letter to selected candidates with verified documents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {letters.map((letter: any) => {
                const isProvisional = letter.letter_type === 'provisional';
                const isSigned = letter.signature_status === 'signed';
                const isExpired = letter.signature_status === 'expired';
                const paymentCompleted = letter.onboarding_payment_status === 'completed';

                return (
                  <div key={letter.id} className="bg-white rounded-xl border border-primary-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isProvisional ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {letter.letter_type} Letter
                        </span>
                        <span className="font-mono text-xs font-bold text-primary-900">{letter.letter_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isSigned ? 'bg-green-100 text-green-800' :
                          isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Digital Signature: {letter.signature_status}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          paymentCompleted ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          Onboarding Fee: {letter.onboarding_payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-primary-900">
                          {letter.application?.candidate?.full_name || 'Candidate'}
                        </p>
                        <p className="text-primary-500">{letter.application?.job_posting?.title || 'Position'}</p>
                      </div>
                      <div>
                        <p className="text-primary-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Joining: {letter.joining_date || 'TBD'}
                        </p>
                        <p className="text-primary-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5" /> {letter.joining_venue || 'Pune'}
                        </p>
                      </div>
                      <div>
                        {letter.signing_deadline_at && (
                          <p className="text-[11px] text-amber-700">
                            <strong>3-Day Deadline:</strong> {new Date(letter.signing_deadline_at).toLocaleDateString()}
                          </p>
                        )}
                        {letter.onboarding_payment_deadline_at && (
                          <p className="text-[11px] text-blue-700">
                            <strong>7-Day Payment:</strong> {new Date(letter.onboarding_payment_deadline_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Candidate Digital Signature Proof */}
                    {isSigned && (
                      <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Digitally Signed by: {letter.signed_legal_name}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                            Hash: {letter.doc_hash?.substring(0, 32)}...
                          </p>
                        </div>
                        {letter.signature_image_data && (
                          <img
                            src={letter.signature_image_data}
                            alt="Candidate Signature"
                            className="h-7 border border-emerald-200 bg-white rounded px-2"
                          />
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-primary-100">
                      <button
                        onClick={() => setPreviewLetter(letter)}
                        className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> View / Print Official Letter
                      </button>
                      {isProvisional && isSigned && paymentCompleted && (
                        <button
                          onClick={() => handleIssueFinalLetter(letter.application_id)}
                          className="px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800"
                        >
                          Issue Final Appointment Letter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TEMPLATES ─────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-primary-900">Appointment Letter Templates</h3>
              <p className="text-xs text-primary-500">Configure standard organizational terms and position terms</p>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white rounded-xl border border-primary-200 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary-900 text-xs">{tmpl.designation}</h4>
                  <span className="text-[11px] font-semibold text-primary-500">v{tmpl.version}</span>
                </div>
                <div className="text-xs text-primary-600 space-y-1">
                  <p className="font-semibold text-primary-700">Common Terms ({tmpl.common_terms?.length || 0}):</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-primary-500">
                    {(tmpl.common_terms || []).slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                  <p className="font-semibold text-primary-700 mt-2">Position Terms ({tmpl.position_terms?.length || 0}):</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-primary-500">
                    {(tmpl.position_terms || []).slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ORGANIZATION SIGNATURES ───────────────────────── */}
      {activeTab === 'signatures' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-primary-900">Pre-Configured Organization Signatures</h3>
              <p className="text-xs text-primary-500">Pre-embedded official signatures for appointment letters</p>
            </div>
            <button
              onClick={() => setShowSigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Register Signatory
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signatures.map(sig => (
              <div key={sig.id} className="bg-white rounded-xl border border-primary-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-primary-900 text-xs">{sig.signatory_name}</p>
                    <p className="text-[11px] text-primary-500">{sig.designation}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sig.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {sig.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="p-3 bg-primary-50/50 rounded-lg flex items-center justify-center border border-primary-100">
                  <img src={sig.signature_image_url} alt="Official Signature" className="h-10 object-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: ISSUE PROVISIONAL APPOINTMENT LETTER ─────────── */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-primary-200 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-primary-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-900" />
                  <h3 className="font-bold text-primary-900 text-sm">Issue Provisional Appointment Letter</h3>
                </div>
                <button onClick={() => setShowIssueModal(false)} className="p-1 rounded-lg text-primary-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {issueError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{issueError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <Label>Selected Candidate *</Label>
                  <select value={targetAppId} onChange={e => setTargetAppId(e.target.value)} className={IC}>
                    <option value="">Select Candidate (Status = Selected)</option>
                    {selectedApplications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.candidate?.full_name} &bull; {app.job_posting?.title} ({app.application_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Appointment Template</Label>
                  <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={IC}>
                    <option value="">Standard Agreement</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.designation} (v{t.version})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Organization Signatory *</Label>
                  <select value={selectedOrgSigId} onChange={e => setSelectedOrgSigId(e.target.value)} className={IC}>
                    {signatures.map(s => (
                      <option key={s.id} value={s.id}>{s.signatory_name} ({s.designation})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Joining Date *</Label>
                    <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className={IC} />
                  </div>
                  <div>
                    <Label>Reporting Venue *</Label>
                    <input type="text" value={joiningVenue} onChange={e => setJoiningVenue(e.target.value)} className={IC} />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                  <p className="font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 3-Calendar-Day Digital Signing Deadline
                  </p>
                  <p className="mt-0.5">Candidate must complete the built-in digital signature and WhatsApp OTP verification within 72 hours.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-primary-100">
                <button
                  onClick={() => setShowIssueModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary-200 text-primary-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssueLetter}
                  disabled={issuing || !targetAppId || !joiningDate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60"
                >
                  {issuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Generate Letter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CREATE TEMPLATE ──────────────────────────────── */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-3">
              <h3 className="font-bold text-primary-900 text-sm">Create Appointment Template</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <Label>Designation / Role Title *</Label>
                  <input type="text" value={tmplDesignation} onChange={e => setTmplDesignation(e.target.value)} className={IC} />
                </div>
                <div>
                  <Label>Common Organizational Terms (One per line)</Label>
                  <textarea rows={3} value={tmplCommonTerms} onChange={e => setTmplCommonTerms(e.target.value)} className={IC} />
                </div>
                <div>
                  <Label>Position-Specific Terms (One per line)</Label>
                  <textarea rows={3} value={tmplPositionTerms} onChange={e => setTmplPositionTerms(e.target.value)} className={IC} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowTemplateModal(false)} className="px-3 py-1.5 text-xs border rounded-xl">Cancel</button>
                <button onClick={handleSaveTemplate} className="px-4 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-xl">Save Template</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: REGISTER SIGNATURE ───────────────────────────── */}
      <AnimatePresence>
        {showSigModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-3">
              <h3 className="font-bold text-primary-900 text-sm">Register Organization Signatory</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <Label>Signatory Name *</Label>
                  <input type="text" value={sigName} onChange={e => setSigName(e.target.value)} className={IC} />
                </div>
                <div>
                  <Label>Official Designation *</Label>
                  <input type="text" value={sigDesignation} onChange={e => setSigDesignation(e.target.value)} className={IC} />
                </div>
                <div>
                  <Label>Digital Signature Image URL *</Label>
                  <input type="text" value={sigImageUrl} onChange={e => setSigImageUrl(e.target.value)} className={IC} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowSigModal(false)} className="px-3 py-1.5 text-xs border rounded-xl">Cancel</button>
                <button onClick={handleSaveSignature} className="px-4 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-xl">Register Signatory</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PRINTABLE APPOINTMENT LETTER MODAL (Correction 5) ──────── */}
      <PrintableAppointmentLetterModal
        isOpen={!!previewLetter}
        onClose={() => setPreviewLetter(null)}
        letter={previewLetter}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1">{children}</label>;
}

const IC = 'w-full text-xs border border-primary-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-300 bg-white text-primary-700';
