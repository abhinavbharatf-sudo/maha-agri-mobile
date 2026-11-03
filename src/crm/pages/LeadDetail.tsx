import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  ArrowLeft,
  Briefcase,
  MessagesSquare,
  MapPin,
  CalendarClock,
  Target,
  PhoneOff,
  Mail,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
  CheckCircle,
  FileText,
  UserCheck,
  Send,
  Layers,
  X
} from 'lucide-react';
import {
  fetchLeadDetails,
  fetchEligibleStaff,
  reassignLead,
  logCall,
  addComment,
  scheduleFollowUp,
  fetchUnifiedLeadTimeline,
  getCandidateDisplayName,
  formatPhoneDisplay,
  formatTimestampIST,
  type CRMLead,
  type CRMStaffMember
} from '../lib/api';
import {
  evaluateLeadReminders,
  dispatchAutomatedReminder,
  type ReminderScheduleEvaluation
} from '../lib/reminderAutomation';
import { useAuth } from '../../lib/auth/AuthContext';

export default function LeadDetail() {
  const { user, roleKey } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [lead, setLead] = useState<CRMLead | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [reminderEvaluations, setReminderEvaluations] = useState<ReminderScheduleEvaluation[]>([]);
  const [eligibleStaff, setEligibleStaff] = useState<CRMStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'timeline' | 'followups' | 'calls' | 'notes'>('overview');

  // Cloud Telephony Simulated State
  const [activeCallState, setActiveCallState] = useState<'idle' | 'dialing' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);

  // Call Logging Modal State
  const [showCallForm, setShowCallForm] = useState(false);
  const [callStatus, setCallStatus] = useState('Connected');
  const [callDisposition, setCallDisposition] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [callNextFollowup, setCallNextFollowup] = useState('');
  const [loggingCall, setLoggingCall] = useState(false);

  // Follow-up Form State
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followupDate, setFollowupDate] = useState('');
  const [followupType, setFollowupType] = useState('Call');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupFeedback, setFollowupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Comment State
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reminder Dispatch State
  const [dispatchingReminder, setDispatchingReminder] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const isSupervisor = Boolean(
    roleKey && ['team_leader', 'crm_manager', 'admin', 'super_admin'].includes(roleKey)
  );

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [leadData, timelineData, reminderData, staffData] = await Promise.all([
        fetchLeadDetails(id),
        fetchUnifiedLeadTimeline(id),
        evaluateLeadReminders(id),
        fetchEligibleStaff()
      ]);
      setLead(leadData as CRMLead);
      setTimelineEvents(timelineData);
      setReminderEvaluations(reminderData);
      setEligibleStaff(staffData);
    } catch (err: any) {
      console.error('[LeadDetail] Load error:', err);
      setError(err?.message || 'Failed to load lead details from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    let timer: any;
    if (activeCallState === 'connected') {
      timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCallState]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setActiveCallState('ended');
    setShowCallForm(true);
  };

  // Submit Call Log
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !callNotes.trim() || !user?.id) return;
    setLoggingCall(true);
    try {
      await logCall(id, user.id, callStatus, callDisposition, callNotes.trim(), callNextFollowup);
      if (callNextFollowup) {
        await scheduleFollowUp(
          id,
          new Date(callNextFollowup).toISOString(),
          'Call',
          `Follow-up scheduled from call disposition: ${callDisposition}`,
          null,
          user.id
        );
      }
      setShowCallForm(false);
      setActiveCallState('idle');
      setCallNotes('');
      setCallNextFollowup('');
      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingCall(false);
    }
  };

  // Submit Follow-up
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user?.id) {
      setFollowupFeedback({ type: 'error', message: 'Staff authentication required to schedule follow-ups.' });
      return;
    }
    if (!followupDate) {
      setFollowupFeedback({ type: 'error', message: 'Please select a valid date and time.' });
      return;
    }
    setSchedulingFollowup(true);
    setFollowupFeedback(null);
    try {
      await scheduleFollowUp(
        id,
        new Date(followupDate).toISOString(),
        followupType,
        followupNotes.trim(),
        null,
        user.id
      );
      setFollowupFeedback({ type: 'success', message: 'Follow-up reminder scheduled successfully.' });
      setFollowupDate('');
      setFollowupNotes('');
      await loadAll();
      setTimeout(() => {
        setShowFollowUpForm(false);
        setFollowupFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFollowupFeedback({
        type: 'error',
        message: err?.message || 'Failed to schedule follow-up.'
      });
    } finally {
      setSchedulingFollowup(false);
    }
  };

  // Submit Reassignment
  const handleReassignLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user?.id) return;
    if (!selectedStaffId) {
      setReassignMessage({ type: 'error', message: 'Select an active staff member.' });
      return;
    }
    if (!reassignReason.trim()) {
      setReassignMessage({ type: 'error', message: 'Mandatory reason is required.' });
      return;
    }

    setReassigning(true);
    setReassignMessage(null);
    try {
      const res = await reassignLead(id, selectedStaffId, reassignReason.trim(), user.id);
      if (!res.success) {
        setReassignMessage({ type: 'error', message: res.error || 'Reassignment failed.' });
        return;
      }
      setReassignMessage({ type: 'success', message: 'Lead reassigned successfully.' });
      await loadAll();
      setTimeout(() => {
        setShowReassignModal(false);
        setReassignMessage(null);
        setReassignReason('');
      }, 1500);
    } catch (err: any) {
      setReassignMessage({ type: 'error', message: err?.message || 'Reassignment error.' });
    } finally {
      setReassigning(false);
    }
  };

  // Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim() || !user?.id) return;
    setSubmittingComment(true);
    try {
      await addComment(id, user.id, commentText.trim());
      setCommentText('');
      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Dispatch Automated Reminder Now
  const handleDispatchReminder = async (evaluation: ReminderScheduleEvaluation) => {
    if (!user?.id) return;
    setDispatchingReminder(true);
    setReminderNotice(null);
    try {
      const res = await dispatchAutomatedReminder(evaluation, user.id);
      if (res.success) {
        setReminderNotice('Automated WhatsApp reminder successfully dispatched and logged.');
      } else {
        setReminderNotice(`Dispatch notice: ${res.error || 'Could not send message.'}`);
      }
      await loadAll();
    } catch (err: any) {
      setReminderNotice(`Dispatch failed: ${err?.message || 'Network error.'}`);
    } finally {
      setDispatchingReminder(false);
      setTimeout(() => setReminderNotice(null), 6000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-sm">Loading Candidate Record...</span>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="p-8 bg-red-50 text-red-900 rounded-2xl border border-red-200 m-6 max-w-lg mx-auto text-center space-y-4">
      <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
      <div>
        <h3 className="text-lg font-bold">Failed to Load Candidate Details</h3>
        <p className="text-xs text-red-700 mt-1">{error}</p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
        <Link
          to="/crm/leads"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
        </Link>
      </div>
    </div>
  );

  if (!lead) {
    return (
      <div className="p-8 bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 m-6 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
        <div>
          <h3 className="text-lg font-bold">Candidate Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">Lead record does not exist or has been removed.</p>
        </div>
        <div className="flex items-center justify-center pt-2">
          <Link
            to="/crm/leads"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const displayName = getCandidateDisplayName(lead);
  const hasRealName = Boolean(lead.candidate_profile?.full_name?.trim() || lead.first_name?.trim());
  const primaryApp = lead.applications?.[0];
  const appliedTaluka = primaryApp?.preferred_location?.trim() || 'All Talukas (District-wide)';
  const appliedDistrict = primaryApp?.preferred_district || lead.district || 'District';

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-24 md:pb-6 relative">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/crm/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-bold transition-all shadow-xs group"
            title="Return to CRM Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            to="/crm/leads"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>All Leads</span>
          </Link>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full">
            <Link
              to="/crm/leads"
              className="p-2.5 bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors shrink-0"
              title="Back to Leads"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-between md:justify-start gap-2.5 mb-1 w-full">
                <h2 className="text-xl md:text-2xl font-bold truncate">
                  {hasRealName ? displayName : 'Visitor Lead (Name pending)'}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    lead.priority === 'High' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {lead.priority} Priority
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-600/80 text-white border border-blue-400/40">
                    {lead.current_journey_stage || 'OTP Verified'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-300 font-medium">
                <span className="font-mono text-slate-400">{lead.internal_candidate_id}</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp: <strong className="text-white font-mono">{formatPhoneDisplay(lead.mobile_number)}</strong>
                </span>
                {lead.alternate_mobile_number && (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    Alt: <strong className="text-white font-mono">{formatPhoneDisplay(lead.alternate_mobile_number)}</strong>
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {lead.email}
                  </span>
                )}
                <span className="text-slate-400 text-[11px] whitespace-nowrap">
                  Registered: <strong className="text-slate-200">{formatTimestampIST(lead.created_at)}</strong>
                </span>
                {lead.otp_verified_at && (
                  <span className="text-indigo-300 text-[11px] whitespace-nowrap">
                    OTP Verified: <strong className="text-white">{formatTimestampIST(lead.otp_verified_at)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/91${lead.mobile_number}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <MessagesSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button
              onClick={() => {
                setShowCallForm(true);
                setShowFollowUpForm(false);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Log Call
            </button>
            <button
              onClick={() => {
                setShowFollowUpForm(true);
                setShowCallForm(false);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5 text-indigo-400" /> Follow-up
            </button>
            {isSupervisor && (
              <button
                onClick={() => {
                  setShowReassignModal(true);
                  setSelectedStaffId(lead.lead_owner_id || '');
                  setReassignReason('');
                  setReassignMessage(null);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" /> Reassign
              </button>
            )}
          </div>
        </div>

        {/* Contact & Location Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50 border-t border-slate-200 text-xs">
          <div className="p-3.5 space-y-1">
            <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">Contact</span>
            <div className="text-slate-800 font-semibold">Primary: {formatPhoneDisplay(lead.mobile_number)}</div>
            <div className="text-slate-600">Alt: {lead.alternate_mobile_number ? formatPhoneDisplay(lead.alternate_mobile_number) : 'None'}</div>
          </div>
          <div className="p-3.5 space-y-1">
            <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">Location</span>
            <div className="text-slate-800 font-semibold">Applied Taluka: {appliedTaluka}</div>
            <div className="text-slate-600">District: {appliedDistrict}</div>
          </div>
          <div className="p-3.5 space-y-1">
            <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">Assigned Staff</span>
            <div className="text-slate-800 font-semibold">{lead.owner?.full_name || 'Unassigned'}</div>
            <div className="text-emerald-600 font-bold">{lead.lead_score} pts</div>
          </div>
          <div className="p-3.5 space-y-1">
            <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">Next Follow-up</span>
            <div className="text-slate-800 font-semibold">
              {lead.next_followup
                ? new Date(lead.next_followup.followup_date).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'None scheduled'}
            </div>
            <div className="text-slate-600">Last: {lead.latest_call?.call_disposition || 'No calls'}</div>
          </div>
        </div>
      </div>

      {reminderNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl">
          {reminderNotice}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview & Automation', icon: Target },
          { id: 'jobs', label: `Jobs & Applications (${(lead.applications?.length || 0) + (lead.interested_jobs?.length || 0)})`, icon: Briefcase },
          { id: 'timeline', label: `Activity Timeline (${timelineEvents.length})`, icon: Clock },
          { id: 'followups', label: `Follow-ups & Tasks (${lead.followups?.length || 0})`, icon: CalendarClock },
          { id: 'calls', label: `Call History (${lead.calls?.length || 0})`, icon: Phone },
          { id: 'notes', label: `Internal Notes (${(lead as any).comments?.length || 0})`, icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Forms Area */}
      {showCallForm && (
        <div className="bg-white p-5 rounded-2xl shadow-lg border-2 border-emerald-100 animate-in fade-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Log Call Disposition</h3>
            <button onClick={() => setShowCallForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleLogCall} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                <select value={callStatus} onChange={e => setCallStatus(e.target.value)} className="w-full text-xs border-slate-200 rounded-xl">
                  <option>Connected</option>
                  <option>No Answer</option>
                  <option>Busy</option>
                  <option>Wrong Number</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Outcome</label>
                <select value={callDisposition} onChange={e => setCallDisposition(e.target.value)} className="w-full text-xs border-slate-200 rounded-xl">
                  <option>Interested</option>
                  <option>Callback Requested</option>
                  <option>Not Interested</option>
                  <option>Documents Pending</option>
                  <option>Application Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Call Notes *</label>
              <textarea
                value={callNotes}
                onChange={e => setCallNotes(e.target.value)}
                required
                placeholder="Summary of discussion with candidate..."
                className="w-full text-xs border-slate-200 rounded-xl h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Next Follow-up (Optional)</label>
              <input
                type="datetime-local"
                value={callNextFollowup}
                onChange={e => setCallNextFollowup(e.target.value)}
                className="w-full text-xs border-slate-200 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowCallForm(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={loggingCall} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg shadow-sm disabled:opacity-50">
                {loggingCall ? 'Saving...' : 'Save Call Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showFollowUpForm && (
        <div className="bg-white p-5 rounded-2xl shadow-lg border-2 border-indigo-100 animate-in fade-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Schedule Follow-up</h3>
            <button onClick={() => setShowFollowUpForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {followupFeedback && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold mb-3 ${followupFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {followupFeedback.message}
            </div>
          )}
          <form onSubmit={handleScheduleFollowUp} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  required
                  className="w-full text-xs border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Type</label>
                <select value={followupType} onChange={e => setFollowupType(e.target.value)} className="w-full text-xs border-slate-200 rounded-xl">
                  <option>Call</option>
                  <option>WhatsApp</option>
                  <option>Email</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Instructions</label>
              <textarea
                value={followupNotes}
                onChange={e => setFollowupNotes(e.target.value)}
                placeholder="Reason for follow-up..."
                className="w-full text-xs border-slate-200 rounded-xl h-20 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowFollowUpForm(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={schedulingFollowup} className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-sm disabled:opacity-50">
                {schedulingFollowup ? 'Scheduling...' : 'Schedule Reminder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT */}

      {/* TAB 1: OVERVIEW & AUTOMATION */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Automated Reminders Status Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Reminder Automation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated outreach schedule based on candidate journey stage progression.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {reminderEvaluations.map((evalItem, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{evalItem.stageName}</span>
                      {evalItem.jobTitle && (
                        <span className="text-xs text-slate-600 font-medium">({evalItem.jobTitle})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Reminders Sent: <strong className="text-slate-800">{evalItem.remindersSentCount} / 2</strong></span>
                      {evalItem.nextReminderDueAt && (
                        <span>Next Due: <strong className="text-slate-800">{new Date(evalItem.nextReminderDueAt).toLocaleString()}</strong></span>
                      )}
                      {evalItem.cooldownActive && (
                        <span className="text-amber-600 font-semibold">• 12h Cooldown Active</span>
                      )}
                    </div>
                    {evalItem.reason && (
                      <p className="text-[11px] text-slate-400 italic pt-0.5">{evalItem.reason}</p>
                    )}
                  </div>

                  {evalItem.canSend && (
                    <button
                      onClick={() => handleDispatchReminder(evalItem)}
                      disabled={dispatchingReminder}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {dispatchingReminder ? 'Sending...' : 'Dispatch Reminder Now'}
                    </button>
                  )}
                </div>
              ))}

              {reminderEvaluations.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No active reminder cycle for this lead.</p>
              )}
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Profile Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Candidate Name:</span>
                  <span className="font-semibold text-slate-900">{displayName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Primary Mobile:</span>
                  <span className="font-semibold text-slate-900">{formatPhoneDisplay(lead.mobile_number)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Alternate Mobile:</span>
                  <span className="font-semibold text-slate-900">{lead.alternate_mobile_number ? formatPhoneDisplay(lead.alternate_mobile_number) : 'Not provided'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-semibold text-slate-900">{lead.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Home District:</span>
                  <span className="font-semibold text-slate-900">{lead.district || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Home Taluka:</span>
                  <span className="font-semibold text-slate-900">{lead.candidate_profile?.taluka || 'Not provided'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Lead Assignment & Origin</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Assigned Staff:</span>
                  <span className="font-semibold text-slate-900">{lead.owner?.full_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Lead Source:</span>
                  <span className="font-semibold text-slate-900">{lead.lead_source || 'Career Portal'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">Registered On:</span>
                  <span className="font-semibold text-slate-900">{formatTimestampIST(lead.created_at)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">OTP Verified At:</span>
                  <span className="font-semibold text-slate-900">
                    {formatTimestampIST(lead.otp_verified_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lead Score:</span>
                  <span className="font-bold text-emerald-600">{lead.lead_score} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOBS & APPLICATIONS */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            Job Applications & Location Preferences
          </h3>

          {lead.applications && lead.applications.length > 0 ? (
            <div className="space-y-3">
              {lead.applications.map(app => (
                <div key={app.id} className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{app.job_title || 'Position Applied'}</h4>
                      <span className="font-mono text-xs font-semibold bg-white px-2 py-0.5 border border-slate-200 text-slate-700 rounded-md">
                        {app.application_number}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Applied Taluka: <strong className="text-slate-900">{app.preferred_location || 'All Talukas (District-wide)'}</strong>
                      </span>
                      <span>•</span>
                      <span>Applied District: <strong className="text-slate-900">{app.preferred_district || lead.district || 'District'}</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Submitted: {new Date(app.submitted_at || app.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    app.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : lead.interested_jobs && lead.interested_jobs.length > 0 ? (
            <div className="space-y-3">
              {lead.interested_jobs.map(job => (
                <div key={job.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{job.job?.title || 'Viewed Position'}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      First viewed: {new Date(job.viewed_date || job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    {job.current_stage}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No applications or interested jobs recorded yet.</p>
          )}
        </div>
      )}

      {/* TAB 3: UNIFIED TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Unified Journey Timeline
          </h3>
          <div className="space-y-4">
            {timelineEvents.map(evt => (
              <div key={evt.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  evt.type === 'call' ? 'bg-blue-100 text-blue-600' :
                  evt.type === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' :
                  evt.type === 'followup' ? 'bg-indigo-100 text-indigo-600' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {evt.type === 'call' ? <Phone className="w-4 h-4" /> :
                   evt.type === 'whatsapp' ? <MessagesSquare className="w-4 h-4" /> :
                   evt.type === 'followup' ? <CalendarClock className="w-4 h-4" /> :
                   <Target className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{evt.title}</span>
                      {evt.type === 'whatsapp' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          evt.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          evt.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          evt.status === 'Scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {evt.status || 'Sent'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{evt.description}</p>
                  {evt.type === 'whatsapp' && evt.metadata?.message_id && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      Msg ID: {evt.metadata.message_id}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {timelineEvents.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No timeline events recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FOLLOW-UPS & TASKS */}
      {activeTab === 'followups' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-600" /> Scheduled Follow-ups
            </h3>
            <button
              onClick={() => setShowFollowUpForm(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              + Add Follow-up
            </button>
          </div>

          <div className="space-y-3">
            {lead.followups?.map(f => (
              <div key={f.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{f.followup_type} Follow-up</div>
                  <p className="text-xs text-slate-600 mt-0.5">{f.notes || 'No notes specified.'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scheduled for: {new Date(f.followup_date).toLocaleString()}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  f.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {f.status}
                </span>
              </div>
            ))}

            {(!lead.followups || lead.followups.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No follow-ups currently scheduled.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CALLS */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" /> Call History & Logs
            </h3>
            <button
              onClick={() => setShowCallForm(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              + Log New Call
            </button>
          </div>

          <div className="space-y-3">
            {lead.calls?.map(c => (
              <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    {c.call_status} • Disposition: {c.disposition}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{c.notes}</p>
              </div>
            ))}

            {(!lead.calls || lead.calls.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No calls logged yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: INTERNAL NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" /> Internal Notes
          </h3>

          <form onSubmit={handleAddComment} className="space-y-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add an internal observation, document status, or recruitment note..."
              required
              className="w-full text-xs border-slate-200 rounded-xl h-20 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {submittingComment ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </form>

          <div className="space-y-3 pt-2">
            {(lead as any).comments?.map((comment: any) => (
              <div key={comment.id} className="p-3 bg-orange-50/60 rounded-xl border border-orange-100 space-y-1">
                <p className="text-xs text-slate-800">{comment.comment_text}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>{comment.user?.full_name || 'Staff Member'}</span>
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}

            {(!(lead as any).comments || (lead as any).comments.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-4">No internal notes yet.</p>
            )}
          </div>
        </div>
      )}

      {/* REASSIGN MODAL */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reassign Lead Owner</h3>
                <p className="text-xs text-slate-500 mt-0.5">Candidate: {displayName} ({lead.internal_candidate_id})</p>
              </div>
              <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reassignMessage && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold mb-3 ${
                reassignMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
              }`}>
                {reassignMessage.message}
              </div>
            )}

            <form onSubmit={handleReassignLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select New Owner *</label>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  required
                  className="w-full text-xs border-slate-200 rounded-xl"
                >
                  <option value="">Select an active staff member...</option>
                  {eligibleStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reassignment Reason (Mandatory) *
                </label>
                <textarea
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  required
                  placeholder="State the justification for transferring this lead..."
                  className="w-full text-xs border-slate-200 rounded-xl h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
