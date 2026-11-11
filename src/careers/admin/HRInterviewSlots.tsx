import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Clock, User, Monitor, MapPin, Link2,
  ChevronDown, X, Loader2, CheckCircle, Edit3, Users,
  ExternalLink, UserCheck, ShieldCheck, AlertCircle, RefreshCw,
  Award, Trash2, CheckCircle2, Video, History, Search,
  Mail, Building2, Check, Info
} from 'lucide-react';
import {
  listInterviewSlotsForHR,
  createInterviewSlot,
  updateInterviewSlot,
  listAllJobs,
  updateInterviewAttendance,
  listInterviewers,
  authorizeInterviewer,
  updateInterviewer,
  toggleInterviewerStatus,
  getInterviewerAuditHistory,
  listStaffDirectory,
  getInterviewerSchedules,
  upsertInterviewerSchedule,
  getInterviewerOverrides,
  createInterviewerOverride,
  listRescheduleRequests,
  reviewRescheduleRequest,
  recordNoShow,
  approveNoShowReattempt,
  updateBookingMeetLink,
} from '../lib/api';
import type {
  RmsInterviewSlot,
  RmsJobPosting,
  RmsInterviewer,
  RmsInterviewerSchedule,
  RmsInterviewerOverride,
  RmsRescheduleRequest,
  StaffUser,
  InterviewerAuditEntry,
} from '../lib/types';
import InterviewEvaluationModal from './components/InterviewEvaluationModal';

type ActiveTab = 'slots' | 'interviewers' | 'schedules' | 'reschedules' | 'noshows';
type SlotStatus = 'open' | 'full' | 'cancelled' | 'completed';
type InterviewMode = 'online' | 'offline' | 'hybrid';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MODE_CONFIG: Record<InterviewMode, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  online:  { label: 'Online',  icon: Monitor, color: 'text-blue-700',   bg: 'bg-blue-50' },
  offline: { label: 'Offline', icon: MapPin,  color: 'text-orange-700', bg: 'bg-orange-50' },
  hybrid:  { label: 'Hybrid',  icon: Link2,   color: 'text-purple-700', bg: 'bg-purple-50' },
};

const STATUS_CONFIG: Record<SlotStatus, { label: string; color: string; bg: string }> = {
  open:      { label: 'Open',      color: 'text-green-700',   bg: 'bg-green-50 border-green-200' },
  full:      { label: 'Full',      color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  completed: { label: 'Completed', color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200' },
};

const ATTENDANCE_CONFIG: Record<string, { label: string; color: string }> = {
  booked:      { label: 'Booked',      color: 'text-blue-700' },
  present:     { label: 'Present',     color: 'text-green-700' },
  absent:      { label: 'Absent (No-Show)', color: 'text-red-700' },
  rescheduled: { label: 'Rescheduled', color: 'text-amber-700' },
};

interface SlotForm {
  job_posting_id: string;
  slot_date: string;
  slot_time: string;
  interviewer_name: string;
  mode: InterviewMode;
  location_or_link: string;
  capacity: number;
  status: SlotStatus;
}

const EMPTY_FORM: SlotForm = {
  job_posting_id: '',
  slot_date: new Date().toISOString().split('T')[0],
  slot_time: '10:00',
  interviewer_name: '',
  mode: 'online',
  location_or_link: 'https://meet.google.com/',
  capacity: 8,
  status: 'open',
};

type SlotWithBookings = RmsInterviewSlot & {
  job_posting?: Pick<RmsJobPosting, 'id' | 'title'>;
  bookings?: Array<{
    id: string;
    attendance_status: string;
    google_meet_link?: string;
    reschedule_count?: number;
    no_show_reattempt_approved?: boolean;
    application?: {
      id: string;
      candidate?: { full_name: string; mobile: string };
      job_posting?: { title: string };
    };
  }>;
};

export default function HRInterviewSlots() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('slots');
  const [slots, setSlots] = useState<SlotWithBookings[]>([]);
  const [jobs, setJobs] = useState<Pick<RmsJobPosting, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);

  // Interviewers State
  const [interviewers, setInterviewers] = useState<RmsInterviewer[]>([]);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [newInterviewerUserId, setNewInterviewerUserId] = useState('');
  const [newInterviewerMeetLink, setNewInterviewerMeetLink] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  // Staff Directory & Interviewer Authorization State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaffList, setLoadingStaffList] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deauthorization Modal State
  const [deauthModal, setDeauthModal] = useState<{
    isOpen: boolean;
    interviewer: RmsInterviewer | null;
    reason: string;
    customReason: string;
    submitting: boolean;
  }>({
    isOpen: false,
    interviewer: null,
    reason: 'On Leave',
    customReason: '',
    submitting: false,
  });

  // Audit History Modal State
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    interviewer: RmsInterviewer | null;
    logs: InterviewerAuditEntry[];
    loading: boolean;
  }>({
    isOpen: false,
    interviewer: null,
    logs: [],
    loading: false,
  });

  // Schedules & Overrides State
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>('');
  const [schedules, setSchedules] = useState<RmsInterviewerSchedule[]>([]);
  const [overrides, setOverrides] = useState<RmsInterviewerOverride[]>([]);
  const [newOverrideDate, setNewOverrideDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOverrideIsLeave, setNewOverrideIsLeave] = useState(true);
  const [newOverrideReason, setNewOverrideReason] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Reschedule Requests State
  const [rescheduleRequests, setRescheduleRequests] = useState<RmsRescheduleRequest[]>([]);
  const [loadingReschedules, setLoadingReschedules] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  // Meeting Link Management State (Correction 4)
  const [meetLinkInputs, setMeetLinkInputs] = useState<Record<string, string>>({});
  const [savingMeetLinkId, setSavingMeetLinkId] = useState<string | null>(null);
  const [meetLinkMsg, setMeetLinkMsg] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Evaluation Modal State
  const [evaluationModal, setEvaluationModal] = useState<{
    isOpen: boolean;
    applicationId: string;
    candidateName: string;
    jobTitle: string;
  }>({
    isOpen: false,
    applicationId: '',
    candidateName: '',
    jobTitle: '',
  });

  const loadSlots = useCallback(() => {
    setLoading(true);
    listInterviewSlotsForHR(jobFilter ? { job_posting_id: jobFilter } : undefined).then(r => {
      setSlots((r.data ?? []) as SlotWithBookings[]);
      setLoading(false);
    });
  }, [jobFilter]);

  const loadInterviewersData = useCallback(() => {
    setLoadingInterviewers(true);
    listInterviewers().then(r => {
      setInterviewers(r.data);
      if (r.data.length > 0 && !selectedInterviewerId) {
        setSelectedInterviewerId(r.data[0].id);
      }
      setLoadingInterviewers(false);
    });
  }, [selectedInterviewerId]);

  const loadStaffList = useCallback(async () => {
    setLoadingStaffList(true);
    const res = await listStaffDirectory({ status: 'active' });
    if (res.data) setStaffList(res.data);
    setLoadingStaffList(false);
  }, []);

  const loadReschedules = useCallback(() => {
    setLoadingReschedules(true);
    listRescheduleRequests().then(r => {
      setRescheduleRequests(r.data);
      setLoadingReschedules(false);
    });
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    listAllJobs().then(r => setJobs((r.data ?? []).map(j => ({ id: j.id, title: j.title }))));
  }, []);

  useEffect(() => {
    if (activeTab === 'interviewers' || activeTab === 'schedules') {
      loadInterviewersData();
      loadStaffList();
    } else if (activeTab === 'reschedules') {
      loadReschedules();
    }
  }, [activeTab, loadInterviewersData, loadStaffList, loadReschedules]);

  useEffect(() => {
    if (selectedInterviewerId) {
      getInterviewerSchedules(selectedInterviewerId).then(r => setSchedules(r.data));
      getInterviewerOverrides(selectedInterviewerId).then(r => setOverrides(r.data));
    }
  }, [selectedInterviewerId]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (slot: SlotWithBookings) => {
    setEditingId(slot.id);
    setForm({
      job_posting_id: slot.job_posting_id,
      slot_date: slot.slot_date,
      slot_time: slot.slot_time,
      interviewer_name: (slot as unknown as { interviewer_name?: string }).interviewer_name ?? '',
      mode: slot.mode as InterviewMode,
      location_or_link: slot.location_or_link ?? '',
      capacity: slot.capacity,
      status: slot.status as SlotStatus,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.job_posting_id || !form.slot_date || !form.slot_time) return;
    setSaving(true);
    const payload = {
      job_posting_id: form.job_posting_id,
      slot_date: form.slot_date,
      slot_time: form.slot_time,
      interviewer_name: form.interviewer_name,
      mode: form.mode,
      location_or_link: form.location_or_link,
      capacity: form.capacity,
      status: form.status,
    };
    if (editingId) {
      await updateInterviewSlot(editingId, payload);
    } else {
      await createInterviewSlot(payload as Parameters<typeof createInterviewSlot>[0]);
    }
    setSaving(false);
    setShowForm(false);
    loadSlots();
  };

  const handleAttendance = async (bookingId: string, status: 'present' | 'absent') => {
    setAttendanceLoading(bookingId);
    if (status === 'absent') {
      await recordNoShow(bookingId, 'Candidate marked absent by interviewer');
    } else {
      await updateInterviewAttendance(bookingId, 'present');
    }
    setAttendanceLoading(null);
    loadSlots();
  };

  const handleApproveReattempt = async (bookingId: string) => {
    setAttendanceLoading(bookingId);
    await approveNoShowReattempt(bookingId, 'Admin approved single re-attempt');
    setAttendanceLoading(null);
    loadSlots();
  };

  const selectedStaff = staffList.find(s => s.id === newInterviewerUserId);
  const existingInterviewStatus = interviewers.find(i => i.user_id === newInterviewerUserId);

  const handleAuthorizeInterviewer = async () => {
    if (!newInterviewerUserId.trim()) return;
    setAuthorizing(true);
    setAuthFeedback(null);
    try {
      const res = await authorizeInterviewer(
        newInterviewerUserId.trim(),
        newInterviewerMeetLink.trim() || undefined,
        selectedStaff?.designation || undefined
      );
      if (res.error) {
        setAuthFeedback({ type: 'error', message: res.error.message || 'Failed to authorize interviewer.' });
      } else {
        setAuthFeedback({ type: 'success', message: `Successfully authorized ${selectedStaff?.full_name || 'Staff User'} as an interviewer.` });
        setNewInterviewerUserId('');
        setNewInterviewerMeetLink('');
        loadInterviewersData();
      }
    } catch (err: unknown) {
      setAuthFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error authorizing interviewer' });
    } finally {
      setAuthorizing(false);
    }
  };

  const handleQuickReactivate = async (interviewerId: string) => {
    setAuthorizing(true);
    setAuthFeedback(null);
    const res = await toggleInterviewerStatus(interviewerId, true);
    if (res.error) {
      setAuthFeedback({ type: 'error', message: res.error.message });
    } else {
      setAuthFeedback({ type: 'success', message: 'Interviewer reactivated successfully.' });
      setNewInterviewerUserId('');
      loadInterviewersData();
    }
    setAuthorizing(false);
  };

  const openDeauthModal = (intv: RmsInterviewer) => {
    setDeauthModal({
      isOpen: true,
      interviewer: intv,
      reason: 'On Leave',
      customReason: '',
      submitting: false,
    });
  };

  const handleConfirmDeauth = async () => {
    if (!deauthModal.interviewer) return;
    setDeauthModal(prev => ({ ...prev, submitting: true }));
    const finalReason = deauthModal.reason === 'Other' ? (deauthModal.customReason || 'Deauthorized by admin') : deauthModal.reason;
    const res = await toggleInterviewerStatus(deauthModal.interviewer.id, false, finalReason);
    if (res.error) {
      setAuthFeedback({ type: 'error', message: res.error.message });
    } else {
      setAuthFeedback({ type: 'success', message: `Interviewer ${deauthModal.interviewer.user_profile?.full_name || ''} deauthorized.` });
      loadInterviewersData();
    }
    setDeauthModal(prev => ({ ...prev, isOpen: false, submitting: false }));
  };

  const handleToggleInterviewerActive = async (intv: RmsInterviewer) => {
    if (intv.is_active) {
      openDeauthModal(intv);
    } else {
      const res = await toggleInterviewerStatus(intv.id, true);
      if (res.error) {
        setAuthFeedback({ type: 'error', message: res.error.message });
      } else {
        setAuthFeedback({ type: 'success', message: 'Interviewer reactivated.' });
        loadInterviewersData();
      }
    }
  };

  const openAuditModal = async (intv: RmsInterviewer) => {
    setAuditModal({
      isOpen: true,
      interviewer: intv,
      logs: [],
      loading: true,
    });
    const res = await getInterviewerAuditHistory(intv.id);
    setAuditModal(prev => ({
      ...prev,
      logs: res.data || [],
      loading: false,
    }));
  };

  const handleSaveDaySchedule = async (dayOfWeek: number, startTime: string, endTime: string, capacity: number) => {
    if (!selectedInterviewerId) return;
    setSavingSchedule(true);
    await upsertInterviewerSchedule({
      interviewer_id: selectedInterviewerId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      daily_capacity: capacity,
      is_active: true,
    });
    const { data } = await getInterviewerSchedules(selectedInterviewerId);
    setSchedules(data);
    setSavingSchedule(false);
  };

  const handleAddOverride = async () => {
    if (!selectedInterviewerId || !newOverrideDate) return;
    await createInterviewerOverride({
      interviewer_id: selectedInterviewerId,
      override_date: newOverrideDate,
      is_leave: newOverrideIsLeave,
      reason: newOverrideReason,
    });
    const { data } = await getInterviewerOverrides(selectedInterviewerId);
    setOverrides(data);
    setNewOverrideReason('');
  };

  const handleReviewReschedule = async (requestId: string, action: 'approved' | 'rejected') => {
    setReviewingId(requestId);
    await reviewRescheduleRequest(requestId, action, adminRemarks || 'Reviewed by Admin');
    setAdminRemarks('');
    setReviewingId(null);
    loadReschedules();
  };

  const handleSaveMeetLink = async (bookingId: string) => {
    const link = (meetLinkInputs[bookingId] ?? '').trim();
    setSavingMeetLinkId(bookingId);
    setMeetLinkMsg(null);
    try {
      const { error } = await updateBookingMeetLink(bookingId, link);
      if (error) {
        setMeetLinkMsg({ id: bookingId, success: false, text: error });
      } else {
        setMeetLinkMsg({ id: bookingId, success: true, text: 'Google Meet link saved successfully!' });
        loadSlots();
      }
    } catch (err: any) {
      setMeetLinkMsg({ id: bookingId, success: false, text: err?.message || 'Failed to update meeting link.' });
    } finally {
      setSavingMeetLinkId(null);
    }
  };

  const f = (k: keyof SlotForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: k === 'capacity' ? Number(e.target.value) : e.target.value }));

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex border-b border-primary-200 gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('slots')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'slots'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Interview Slots
        </button>
        <button
          onClick={() => setActiveTab('interviewers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'interviewers'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Interviewer Pool ({interviewers.length})
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'schedules'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <Clock className="w-4 h-4" /> Weekly Schedules & Leaves
        </button>
        <button
          onClick={() => setActiveTab('reschedules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === 'reschedules'
              ? 'bg-primary-900 text-white border-b-2 border-primary-900 shadow-sm'
              : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
          }`}
        >
          <RefreshCw className="w-4 h-4" /> Reschedule Requests ({rescheduleRequests.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* ── TAB 1: INTERVIEW SLOTS ──────────────────────────────── */}
      {activeTab === 'slots' && (
        <div className="space-y-5">
          {/* Header bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-primary-700">Interview Slots & Bookings</h2>
              <p className="text-xs text-primary-400 mt-0.5">Create slots, manage Google Meet links, and evaluate candidates</p>
            </div>
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
              className="text-xs border border-primary-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-300 bg-white text-primary-700">
              <option value="">All Job Roles</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 transition-colors">
              <Plus className="w-4 h-4" /> New Slot
            </button>
          </div>

          {/* Create/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-primary-200 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-primary-900 text-sm">{editingId ? 'Edit Interview Slot' : 'Create Interview Slot'}</h3>
                  <button onClick={() => setShowForm(false)} className="ml-auto p-1 hover:bg-primary-50 rounded-lg text-primary-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2">
                    <Label>Job Role *</Label>
                    <select value={form.job_posting_id} onChange={f('job_posting_id')} className={IC}>
                      <option value="">Select Job Role</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label>Date *</Label>
                    <input type="date" value={form.slot_date} onChange={f('slot_date')} className={IC} />
                  </div>

                  <div>
                    <Label>Time *</Label>
                    <input type="time" value={form.slot_time} onChange={f('slot_time')} className={IC} />
                  </div>

                  <div>
                    <Label>Mode</Label>
                    <select value={form.mode} onChange={f('mode')} className={IC}>
                      <option value="online">Online (Google Meet)</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <Label>{form.mode === 'online' ? 'Google Meet Link *' : 'Venue / Location'}</Label>
                    <input
                      type="text"
                      value={form.location_or_link}
                      onChange={f('location_or_link')}
                      placeholder={form.mode === 'online' ? 'https://meet.google.com/abc-defg-hij' : 'Office, District HQ...'}
                      className={IC}
                    />
                  </div>

                  <div>
                    <Label>Capacity (Default 8)</Label>
                    <input type="number" value={form.capacity} onChange={f('capacity')} min={1} max={50} className={IC} />
                  </div>

                  {editingId && (
                    <div>
                      <Label>Status</Label>
                      <select value={form.status} onChange={f('status')} className={IC}>
                        <option value="open">Open</option>
                        <option value="full">Full</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 mt-4">
                  <button onClick={handleSave} disabled={saving || !form.job_posting_id || !form.slot_date || !form.slot_time}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {editingId ? 'Update Slot' : 'Create Slot'}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary-200 text-primary-700 hover:bg-primary-50">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slots list */}
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-primary-100 h-20 animate-pulse" />
            ))}</div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
              <Calendar className="w-10 h-10 text-primary-200 mx-auto mb-2" />
              <p className="font-semibold text-primary-600 text-sm mb-1">No interview slots found</p>
              <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-900 text-white text-xs font-bold rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Create Slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, idx) => {
                const modeCfg = MODE_CONFIG[slot.mode as InterviewMode] ?? MODE_CONFIG.online;
                const statusCfg = STATUS_CONFIG[slot.status as SlotStatus] ?? STATUS_CONFIG.open;
                const bookings = slot.bookings ?? [];
                const isExpanded = expandedSlot === slot.id;
                const ModeIcon = modeCfg.icon;

                return (
                  <motion.div key={slot.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                    className="bg-white rounded-xl border border-primary-100 hover:border-primary-200 transition-all overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-3 p-3.5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${modeCfg.bg} flex items-center justify-center shrink-0`}>
                          <ModeIcon className={`w-4 h-4 ${modeCfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color} ${statusCfg.bg}`}>
                              {statusCfg.label}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${modeCfg.bg} ${modeCfg.color}`}>
                              {modeCfg.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="font-bold text-primary-900 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary-400" />
                              {new Date(slot.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className="flex items-center gap-1 text-primary-700">
                              <Clock className="w-3.5 h-3.5 text-primary-400" />
                              {slot.slot_time}
                            </span>
                            {slot.job_posting?.title && (
                              <span className="text-[11px] text-primary-500 font-medium truncate">{slot.job_posting.title}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-primary-50 rounded-xl px-2.5 py-1">
                          <Users className="w-3.5 h-3.5 text-primary-400" />
                          <span className="text-xs font-bold text-primary-700">{bookings.length}</span>
                          <span className="text-[11px] text-primary-400">/ {slot.capacity}</span>
                        </div>
                        <button onClick={() => openEdit(slot)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-400 hover:text-primary-700">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {bookings.length > 0 && (
                          <button onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                            className={`p-1.5 rounded-lg hover:bg-primary-50 text-primary-400 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>

                    {slot.location_or_link && (
                      <div className="px-3.5 pb-2.5 flex items-center gap-1.5 text-xs text-primary-500">
                        <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <a href={slot.location_or_link} target="_blank" rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate font-medium">
                          {slot.location_or_link}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Bookings / Candidates List */}
                    <AnimatePresence>
                      {isExpanded && bookings.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-primary-100 bg-primary-50/40 p-3.5 space-y-2">
                          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">Booked Candidates ({bookings.length})</p>
                          {bookings.map(booking => {
                            const attCfg = ATTENDANCE_CONFIG[booking.attendance_status] ?? ATTENDANCE_CONFIG.booked;
                            const candidateName = booking.application?.candidate?.full_name ?? 'Candidate';
                            const jobTitle = booking.application?.job_posting?.title ?? slot.job_posting?.title ?? 'Interview';

                            return (
                              <div key={booking.id} className="bg-white rounded-xl border border-primary-100 p-3 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-primary-900">{candidateName}</p>
                                    <p className="text-[11px] text-primary-400">
                                      {booking.application?.candidate?.mobile || 'No mobile'}
                                      {booking.reschedule_count ? ` • Reschedules: ${booking.reschedule_count}/3` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-bold ${attCfg.color}`}>{attCfg.label}</span>
                                    {booking.attendance_status === 'booked' && (
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={() => handleAttendance(booking.id, 'present')}
                                          disabled={attendanceLoading === booking.id}
                                          className="text-[11px] font-bold px-2.5 py-1 bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
                                        >
                                          Present
                                        </button>
                                        <button
                                          onClick={() => handleAttendance(booking.id, 'absent')}
                                          disabled={attendanceLoading === booking.id}
                                          className="text-[11px] font-bold px-2.5 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                                        >
                                          Mark No-Show
                                        </button>
                                      </div>
                                    )}
                                    {booking.attendance_status === 'absent' && !booking.no_show_reattempt_approved && (
                                      <button
                                        onClick={() => handleApproveReattempt(booking.id)}
                                        disabled={attendanceLoading === booking.id}
                                        className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-1"
                                      >
                                        <RefreshCw className="w-3 h-3" /> Approve 1 Re-attempt
                                      </button>
                                    )}
                                    {/* Evaluate Button */}
                                    {booking.application?.id && (
                                      <button
                                        onClick={() => setEvaluationModal({
                                          isOpen: true,
                                          applicationId: booking.application!.id,
                                          candidateName,
                                          jobTitle,
                                        })}
                                        className="text-[11px] font-bold px-3 py-1 bg-primary-900 text-white rounded-lg hover:bg-primary-800 flex items-center gap-1"
                                      >
                                        <Award className="w-3 h-3" /> Evaluate (100 Marks)
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Correction 4: Manual Admin Google Meet Link Management */}
                                <div className="pt-2 border-t border-primary-100 flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 text-[11px] text-primary-700 font-semibold shrink-0">
                                    <Video className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Google Meet:</span>
                                  </div>
                                  <input
                                    type="url"
                                    placeholder="https://meet.google.com/..."
                                    value={meetLinkInputs[booking.id] !== undefined ? meetLinkInputs[booking.id] : (booking.google_meet_link || '')}
                                    onChange={e => setMeetLinkInputs(prev => ({ ...prev, [booking.id]: e.target.value }))}
                                    className="flex-1 min-w-[220px] text-xs border border-primary-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-primary-400 font-mono"
                                  />
                                  <button
                                    onClick={() => handleSaveMeetLink(booking.id)}
                                    disabled={savingMeetLinkId === booking.id}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg disabled:opacity-50 flex items-center gap-1 transition-colors"
                                  >
                                    {savingMeetLinkId === booking.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Save Link
                                  </button>
                                  {booking.google_meet_link && (
                                    <a
                                      href={booking.google_meet_link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-blue-600 hover:text-blue-800 shrink-0"
                                      title="Open / Verify Meeting Link"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                {meetLinkMsg && meetLinkMsg.id === booking.id && (
                                  <p className={`text-[11px] font-medium ${meetLinkMsg.success ? 'text-green-600' : 'text-red-600'}`}>
                                    {meetLinkMsg.text}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: INTERVIEWER POOL MANAGEMENT ────────────────────── */}
      {activeTab === 'interviewers' && (
        <div className="space-y-5">
          {/* Top Feedback Banner */}
          {authFeedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                authFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {authFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{authFeedback.message}</span>
              </div>
              <button onClick={() => setAuthFeedback(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Authorize New Staff Interviewer Box */}
          <div className="bg-white rounded-2xl border border-primary-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-900" /> Authorize New Staff Interviewer
                </h3>
                <p className="text-xs text-primary-500 mt-0.5">
                  Select an active staff member (Admin, HR, CSM, Telecaller, Independent Interviewer, or Staff) to authorize as an RMS Interviewer.
                </p>
              </div>
              <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-200">
                {staffList.length} Active Staff Eligible
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Staff Selector */}
              <div className="lg:col-span-5 space-y-1.5">
                <Label>Select Active Staff User *</Label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-primary-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter staff by name, email, or designation..."
                      value={staffSearchQuery}
                      onChange={e => setStaffSearchQuery(e.target.value)}
                      className="w-full text-[11px] border border-primary-200 rounded-lg pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <select
                    value={newInterviewerUserId}
                    onChange={e => {
                      setNewInterviewerUserId(e.target.value);
                      setAuthFeedback(null);
                    }}
                    className={IC}
                    disabled={loadingStaffList}
                  >
                    <option value="">-- Choose Staff User ({loadingStaffList ? 'Loading...' : 'Select'} ) --</option>
                    {staffList
                      .filter(s => {
                        if (!staffSearchQuery.trim()) return true;
                        const q = staffSearchQuery.toLowerCase();
                        return (
                          s.full_name?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q) ||
                          s.designation?.toLowerCase().includes(q) ||
                          s.department?.toLowerCase().includes(q)
                        );
                      })
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.designation} • {s.department}) — {s.email}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Default Meet Link */}
              <div className="lg:col-span-5 space-y-1.5">
                <Label>Default Google Meet Link (Optional)</Label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={newInterviewerMeetLink}
                  onChange={e => setNewInterviewerMeetLink(e.target.value)}
                  className={IC}
                />
                <p className="text-[10px] text-primary-500">
                  Can be customized per booking or defaulted from interviewer profile.
                </p>
              </div>

              {/* Authorize Action Button */}
              <div className="lg:col-span-2 flex flex-col justify-end">
                <button
                  onClick={handleAuthorizeInterviewer}
                  disabled={authorizing || !newInterviewerUserId.trim() || !!(existingInterviewStatus && existingInterviewStatus.is_active)}
                  className="w-full py-2.5 px-4 bg-primary-900 hover:bg-primary-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {authorizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Authorizing...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" /> Authorize
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected Staff Pre-Check Notice */}
            {newInterviewerUserId && selectedStaff && (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-xs">
                    {selectedStaff.full_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-primary-900">{selectedStaff.full_name}</span>
                    <span className="text-primary-500 text-[11px] ml-1.5">({selectedStaff.email})</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.2 rounded border border-indigo-200">
                        {selectedStaff.designation}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {selectedStaff.department}
                      </span>
                    </div>
                  </div>
                </div>

                {existingInterviewStatus ? (
                  existingInterviewStatus.is_active ? (
                    <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-semibold text-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Already an Active Interviewer in the Pool</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs">
                      <Info className="w-3.5 h-3.5" />
                      <span>Previously Deauthorized.</span>
                      <button
                        onClick={() => handleQuickReactivate(existingInterviewStatus.id)}
                        disabled={authorizing}
                        className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-[11px] transition-colors"
                      >
                        ⚡ 1-Click Reactivate
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Eligible for Interviewer Authorization</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Authorized Interviewers Pool Table */}
          <div className="bg-white rounded-2xl border border-primary-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-primary-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-700" /> Authorized Interviewer Pool
                </h4>
                <p className="text-[11px] text-primary-500 mt-0.5">
                  Internal staff authorized to take candidate interviews. Automatic balanced round-robin allocates only to Active interviewers.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {interviewers.filter(i => i.is_active).length} Active
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 font-bold border border-neutral-200">
                  {interviewers.filter(i => !i.is_active).length} Deauthorized
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-800 font-bold border border-primary-200">
                  {interviewers.length} Total Pool
                </span>
              </div>
            </div>

            {loadingInterviewers ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto mb-2" />
                <p className="text-xs text-primary-500">Loading interviewer pool...</p>
              </div>
            ) : interviewers.length === 0 ? (
              <div className="p-8 text-center text-xs text-primary-500">
                No interviewers authorized yet. Select an active staff member above to authorize.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-primary-50/70 border-b border-primary-100 text-primary-800 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Interviewer / Staff Member</th>
                      <th className="py-3 px-3">Designation & Dept</th>
                      <th className="py-3 px-3 text-center">Staff Account</th>
                      <th className="py-3 px-3 text-center">Interviewer Status</th>
                      <th className="py-3 px-3">Authorized On</th>
                      <th className="py-3 px-3">Default Meet Link</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {interviewers.map(intv => {
                      const staffInfo = staffList.find(s => s.id === intv.user_id);
                      const displayName = intv.user_profile?.full_name || staffInfo?.full_name || 'Staff User';
                      const displayEmail = intv.user_profile?.email || staffInfo?.email || '—';
                      const displayDesignation = intv.user_profile?.designation || staffInfo?.designation || intv.role_at_authorization || 'Other Staff';
                      const displayDept = intv.user_profile?.department || staffInfo?.department || 'Operations';
                      const isStaffActive = staffInfo?.is_active ?? intv.user_profile?.is_active ?? true;

                      return (
                        <tr key={intv.id} className="hover:bg-primary-50/40 transition-colors">
                          {/* Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-900 font-bold flex items-center justify-center shrink-0 text-xs">
                                {displayName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-primary-900 truncate">{displayName}</p>
                                <p className="text-[11px] text-primary-500 truncate flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-primary-400" /> {displayEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Designation & Dept */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-0.5">
                              <span className="inline-block text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                {displayDesignation}
                              </span>
                              <p className="text-[11px] text-primary-500">{displayDept}</p>
                            </div>
                          </td>

                          {/* Staff System Status */}
                          <td className="py-3.5 px-3 text-center">
                            {isStaffActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Staff
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive Staff
                              </span>
                            )}
                          </td>

                          {/* Interviewer Status */}
                          <td className="py-3.5 px-3 text-center">
                            {intv.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200"
                                title={intv.deauthorization_reason ? `Reason: ${intv.deauthorization_reason}` : 'Deauthorized'}
                              >
                                <AlertCircle className="w-3 h-3 text-rose-600" /> Deauthorized
                              </span>
                            )}
                          </td>

                          {/* Authorized On */}
                          <td className="py-3.5 px-3">
                            <p className="text-primary-800 font-medium">
                              {intv.authorized_at ? new Date(intv.authorized_at).toLocaleDateString() : '—'}
                            </p>
                            <p className="text-[10px] text-primary-500 font-mono">
                              Role: {intv.role_at_authorization || displayDesignation}
                            </p>
                          </td>

                          {/* Meet Link */}
                          <td className="py-3.5 px-3">
                            {intv.default_meet_link ? (
                              <a
                                href={intv.default_meet_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-mono hover:underline"
                              >
                                <Video className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[120px]">{intv.default_meet_link}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-primary-400 text-[11px] italic">Not configured</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Active / Deactivate */}
                              {intv.is_active ? (
                                <button
                                  onClick={() => handleToggleInterviewerActive(intv)}
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                                  title="Deauthorize interviewer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleInterviewerActive(intv)}
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                  title="Reactivate interviewer"
                                >
                                  Reactivate
                                </button>
                              )}

                              {/* View Weekly Schedule */}
                              <button
                                onClick={() => {
                                  setActiveTab('schedules');
                                  setSelectedInterviewerId(intv.id);
                                }}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-primary-200 text-primary-700 bg-white hover:bg-primary-50 transition-colors flex items-center gap-1"
                                title="Manage weekly availability"
                              >
                                <Clock className="w-3 h-3 text-primary-500" /> Schedule
                              </button>

                              {/* View Audit History */}
                              <button
                                onClick={() => openAuditModal(intv)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-1"
                                title="View authorization logs"
                              >
                                <History className="w-3 h-3 text-slate-500" /> Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: WEEKLY SCHEDULES & LEAVES ──────────────────────── */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-primary-200 p-4">
            <Label>Select Interviewer</Label>
            <select
              value={selectedInterviewerId}
              onChange={e => setSelectedInterviewerId(e.target.value)}
              className={IC}
            >
              {interviewers.map(i => (
                <option key={i.id} value={i.id}>
                  {i.user_profile?.full_name || i.user_id} ({i.is_active ? 'Active' : 'Inactive'})
                </option>
              ))}
            </select>
          </div>

          {selectedInterviewerId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Weekly Working Days */}
              <div className="bg-white rounded-2xl border border-primary-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wide">
                  Weekly Schedule & Daily Capacity (30-min Duration)
                </h4>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((dayName, dayIdx) => {
                    const sched = schedules.find(s => s.day_of_week === dayIdx);
                    return (
                      <div key={dayIdx} className="p-2.5 rounded-xl border border-primary-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary-800 w-24">{dayName}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            defaultValue={sched?.start_time || '10:00'}
                            id={`start-${dayIdx}`}
                            className="border border-primary-200 rounded p-1 text-[11px]"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            defaultValue={sched?.end_time || '17:00'}
                            id={`end-${dayIdx}`}
                            className="border border-primary-200 rounded p-1 text-[11px]"
                          />
                          <input
                            type="number"
                            defaultValue={sched?.daily_capacity || 8}
                            id={`cap-${dayIdx}`}
                            min={1} max={30}
                            className="w-12 border border-primary-200 rounded p-1 text-center text-[11px]"
                            title="Daily interview limit"
                          />
                          <button
                            onClick={() => {
                              const s = (document.getElementById(`start-${dayIdx}`) as HTMLInputElement)?.value;
                              const e = (document.getElementById(`end-${dayIdx}`) as HTMLInputElement)?.value;
                              const c = Number((document.getElementById(`cap-${dayIdx}`) as HTMLInputElement)?.value || 8);
                              handleSaveDaySchedule(dayIdx, s, e, c);
                            }}
                            className="px-2 py-1 bg-primary-100 text-primary-900 font-bold rounded hover:bg-primary-200 text-[11px]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date-Specific Overrides / Leave */}
              <div className="bg-white rounded-2xl border border-primary-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wide">
                  Schedule Overrides & Leave Management
                </h4>
                <div className="p-3 bg-primary-50/60 rounded-xl space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Date</Label>
                      <input
                        type="date"
                        value={newOverrideDate}
                        onChange={e => setNewOverrideDate(e.target.value)}
                        className={IC}
                      />
                    </div>
                    <div>
                      <Label>Override Type</Label>
                      <select
                        value={newOverrideIsLeave ? 'leave' : 'custom'}
                        onChange={e => setNewOverrideIsLeave(e.target.value === 'leave')}
                        className={IC}
                      >
                        <option value="leave">On Leave (Unavailable)</option>
                        <option value="custom">Custom Working Hours</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Reason / Notes</Label>
                    <input
                      type="text"
                      placeholder="e.g. Field visit or personal leave..."
                      value={newOverrideReason}
                      onChange={e => setNewOverrideReason(e.target.value)}
                      className={IC}
                    />
                  </div>
                  <button
                    onClick={handleAddOverride}
                    className="w-full py-2 bg-primary-900 text-white font-bold rounded-xl text-xs hover:bg-primary-800"
                  >
                    Register Date Override / Leave
                  </button>
                </div>

                <div className="space-y-1.5 mt-3">
                  <p className="text-[11px] font-bold text-primary-500 uppercase">Existing Date Overrides:</p>
                  {overrides.length === 0 ? (
                    <p className="text-xs text-primary-400">No overrides configured for this interviewer.</p>
                  ) : (
                    overrides.map(ovr => (
                      <div key={ovr.id} className="p-2 rounded-lg border border-primary-100 flex items-center justify-between text-xs bg-white">
                        <div>
                          <span className="font-bold text-primary-800">{ovr.override_date}: </span>
                          <span className={ovr.is_leave ? 'text-red-700 font-semibold' : 'text-primary-600'}>
                            {ovr.is_leave ? 'ON LEAVE' : 'Custom Hours'}
                          </span>
                          {ovr.reason && <span className="text-primary-400"> &bull; {ovr.reason}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: RESCHEDULE REQUESTS REVIEW ─────────────────────── */}
      {activeTab === 'reschedules' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Reschedule Policy:</strong> Every reschedule request (1st, 2nd, 3rd) requires Admin review and approval before slot reassignment is performed. Candidate's original booking is strictly preserved until replacement is confirmed. On approval, the previous Google Meet link is cleared so Admin can assign a distinct link for the new slot.
            </span>
          </div>

          <div className="space-y-3">
            {loadingReschedules ? (
              <div className="h-24 bg-white rounded-xl animate-pulse" />
            ) : rescheduleRequests.length === 0 ? (
              <div className="p-12 bg-white rounded-xl text-center text-xs text-primary-500">
                No reschedule requests awaiting review.
              </div>
            ) : (
              rescheduleRequests.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-primary-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary-900">
                        {req.application?.candidate?.full_name} &bull; {req.application?.job_posting?.title}
                      </p>
                      <p className="text-[11px] text-primary-500">
                        Attempt #{req.reschedule_number} &bull; Requested on: {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      req.status === 'approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-primary-50/50 rounded-lg text-xs space-y-1">
                    <p><span className="font-semibold text-primary-700">Reason:</span> {req.reason}</p>
                    {req.requested_slot && (
                      <p className="text-primary-600">
                        <span className="font-semibold">Target Slot:</span> {req.requested_slot.slot_date} at {req.requested_slot.slot_time} ({req.requested_slot.mode})
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Admin review remarks..."
                        value={adminRemarks}
                        onChange={e => setAdminRemarks(e.target.value)}
                        className="flex-1 text-xs border border-primary-200 rounded-xl p-2"
                      />
                      <button
                        onClick={() => handleReviewReschedule(req.id, 'approved')}
                        disabled={reviewingId === req.id}
                        className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve Swap
                      </button>
                      <button
                        onClick={() => handleReviewReschedule(req.id, 'rejected')}
                        disabled={reviewingId === req.id}
                        className="px-3.5 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      <InterviewEvaluationModal
        isOpen={evaluationModal.isOpen}
        applicationId={evaluationModal.applicationId}
        candidateName={evaluationModal.candidateName}
        jobTitle={evaluationModal.jobTitle}
        onClose={() => setEvaluationModal(prev => ({ ...prev, isOpen: false }))}
        onSubmitted={() => loadSlots()}
      />

      {/* Deauthorization Modal */}
      {deauthModal.isOpen && deauthModal.interviewer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-primary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" /> Deauthorize Interviewer
              </h3>
              <button
                onClick={() => setDeauthModal(prev => ({ ...prev, isOpen: false }))}
                className="text-primary-400 hover:text-primary-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-primary-600">
              Are you sure you want to deauthorize{' '}
              <strong className="text-primary-900">
                {deauthModal.interviewer.user_profile?.full_name || 'this interviewer'}
              </strong>
              ? This excludes them from automatic interview allocation without deleting past interview evaluations.
            </p>

            <div className="space-y-2">
              <Label>Reason for Deauthorization *</Label>
              <select
                value={deauthModal.reason}
                onChange={e => setDeauthModal(prev => ({ ...prev, reason: e.target.value }))}
                className={IC}
              >
                <option value="On Leave">On Leave</option>
                <option value="Designation Changed">Designation Changed</option>
                <option value="Temporary Suspension">Temporary Suspension</option>
                <option value="Performance Review">Performance Review</option>
                <option value="Other">Other (Specify below)</option>
              </select>

              {deauthModal.reason === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter specific reason..."
                  value={deauthModal.customReason}
                  onChange={e => setDeauthModal(prev => ({ ...prev, customReason: e.target.value }))}
                  className={IC}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeauthModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-primary-200 text-primary-700 text-xs font-bold rounded-xl hover:bg-primary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeauth}
                disabled={deauthModal.submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {deauthModal.submitting ? 'Deauthorizing...' : 'Confirm Deauthorization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {auditModal.isOpen && auditModal.interviewer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-primary-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-800" /> Interviewer Audit History
                </h3>
                <p className="text-xs text-primary-500 mt-0.5">
                  {auditModal.interviewer.user_profile?.full_name || 'Interviewer'} ({auditModal.interviewer.user_profile?.email || auditModal.interviewer.user_id})
                </p>
              </div>
              <button
                onClick={() => setAuditModal(prev => ({ ...prev, isOpen: false }))}
                className="text-primary-400 hover:text-primary-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {auditModal.loading ? (
                <div className="p-8 text-center text-xs text-primary-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
                  Loading audit events...
                </div>
              ) : auditModal.logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-primary-500 border rounded-xl">
                  No authorization audit records logged yet.
                </div>
              ) : (
                auditModal.logs.map(log => {
                  const isAuth = log.action === 'AUTHORIZED' || log.action === 'REACTIVATED';
                  return (
                    <div key={log.id} className="p-3 rounded-xl border border-primary-100 bg-slate-50 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isAuth ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        Designation at time: <strong className="text-slate-900">{log.designation_at_time || 'Staff'}</strong>
                      </p>
                      {log.reason && (
                        <p className="text-slate-500 text-[11px] italic">
                          Reason: {log.reason}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono">
                        By user: {log.performed_by}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAuditModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

const IC = 'w-full text-xs border border-primary-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700';
