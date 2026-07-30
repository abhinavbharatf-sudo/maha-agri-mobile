import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Clock, User, Monitor, MapPin, Link2,
  ChevronDown, X, Loader2, CheckCircle, Edit3, Users,
  ExternalLink,
} from 'lucide-react';import {
  listInterviewSlotsForHR,
  createInterviewSlot,
  updateInterviewSlot,
  listAllJobs,
  updateInterviewAttendance,
} from '../lib/api';
import type { RmsInterviewSlot, RmsJobPosting } from '../lib/types';

type SlotStatus = 'open' | 'full' | 'cancelled' | 'completed';
type InterviewMode = 'online' | 'offline' | 'hybrid';

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
  absent:      { label: 'Absent',      color: 'text-red-700' },
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
  mode: 'offline',
  location_or_link: '',
  capacity: 10,
  status: 'open',
};

type SlotWithBookings = RmsInterviewSlot & {
  job_posting?: Pick<RmsJobPosting, 'id' | 'title'>;
  bookings?: Array<{
    id: string;
    attendance_status: string;
    application?: { candidate?: { full_name: string; mobile: string } };
  }>;
};

export default function HRInterviewSlots() {
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

  const load = useCallback(() => {
    setLoading(true);
    listInterviewSlotsForHR(jobFilter ? { job_posting_id: jobFilter } : undefined).then(r => {
      setSlots((r.data ?? []) as SlotWithBookings[]);
      setLoading(false);
    });
  }, [jobFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    listAllJobs().then(r => setJobs((r.data ?? []).map(j => ({ id: j.id, title: j.title }))));
  }, []);

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
    load();
  };

  const handleAttendance = async (bookingId: string, status: 'present' | 'absent' | 'rescheduled') => {
    setAttendanceLoading(bookingId);
    await updateInterviewAttendance(bookingId, status);
    setAttendanceLoading(null);
    load();
  };

  const f = (k: keyof SlotForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: k === 'capacity' ? Number(e.target.value) : e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-primary-700">Interview Slots</h2>
          <p className="text-xs text-primary-400 mt-0.5">Create and manage interview slots for candidates</p>
        </div>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
          className="text-sm border border-primary-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700">
          <option value="">All Job Roles</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-colors">
          <Plus className="w-4 h-4" />
          New Slot
        </button>
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-primary-200 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-primary-900">{editingId ? 'Edit Interview Slot' : 'Create Interview Slot'}</h3>
              <button onClick={() => setShowForm(false)} className="ml-auto p-1 hover:bg-primary-50 rounded-lg text-primary-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Job Role *</Label>
                <select value={form.job_posting_id} onChange={f('job_posting_id')}
                  className={IC}>
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
                <Label>Interviewer Name</Label>
                <input type="text" value={form.interviewer_name} onChange={f('interviewer_name')}
                  placeholder="e.g. Rahul Sharma" className={IC} />
              </div>

              <div>
                <Label>Mode</Label>
                <select value={form.mode} onChange={f('mode')} className={IC}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <Label>{form.mode === 'online' ? 'WhatsApp / Meeting Link' : 'Venue / Location'}</Label>
                <input type="text" value={form.location_or_link} onChange={f('location_or_link')}
                  placeholder={form.mode === 'online' ? 'https://wa.me/...' : 'Office, District HQ...'} className={IC} />
              </div>

              <div>
                <Label>Capacity</Label>
                <input type="number" value={form.capacity} onChange={f('capacity')} min={1} max={200} className={IC} />
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

            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving || !form.job_posting_id || !form.slot_date || !form.slot_time}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingId ? 'Update Slot' : 'Create Slot'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors">
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
        <div className="bg-white rounded-2xl border border-primary-100 p-16 text-center">
          <Calendar className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-600 text-base mb-1">No interview slots</p>
          <p className="text-sm text-primary-400 mb-4">Create your first slot to start scheduling interviews.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" /> Create Slot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, idx) => {
            const modeCfg = MODE_CONFIG[slot.mode as InterviewMode] ?? MODE_CONFIG.offline;
            const statusCfg = STATUS_CONFIG[slot.status as SlotStatus] ?? STATUS_CONFIG.open;
            const bookings = slot.bookings ?? [];
            const isExpanded = expandedSlot === slot.id;
            const ModeIcon = modeCfg.icon;

            return (
              <motion.div key={slot.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-xl border border-primary-100 hover:border-primary-200 transition-all overflow-hidden"
              >
                {/* Slot header */}
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${modeCfg.bg} flex items-center justify-center shrink-0`}>
                      <ModeIcon className={`w-5 h-5 ${modeCfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusCfg.color} ${statusCfg.bg}`}>
                          {statusCfg.label}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${modeCfg.bg} ${modeCfg.color}`}>
                          {modeCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-bold text-primary-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-400" />
                          {new Date(slot.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5 text-primary-700">
                          <Clock className="w-3.5 h-3.5 text-primary-400" />
                          {slot.slot_time}
                        </span>
                        {(slot as unknown as { interviewer_name?: string }).interviewer_name && (
                          <span className="flex items-center gap-1.5 text-primary-600">
                            <User className="w-3.5 h-3.5 text-primary-400" />
                            {(slot as unknown as { interviewer_name?: string }).interviewer_name}
                          </span>
                        )}
                        {slot.job_posting?.title && (
                          <span className="text-xs text-primary-500 font-medium truncate">{slot.job_posting.title}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-primary-50 rounded-xl px-3 py-1.5">
                      <Users className="w-4 h-4 text-primary-400" />
                      <span className="text-sm font-bold text-primary-700">{bookings.length}</span>
                      <span className="text-xs text-primary-400">/ {slot.capacity}</span>
                    </div>
                    <button onClick={() => openEdit(slot)}
                      className="p-2 rounded-lg hover:bg-primary-50 text-primary-400 hover:text-primary-700 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {bookings.length > 0 && (
                      <button onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                        className={`p-2 rounded-lg hover:bg-primary-50 text-primary-400 hover:text-primary-700 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Location/link row */}
                {slot.location_or_link && (
                  <div className="px-4 pb-3 flex items-center gap-2 text-xs text-primary-500">
                    {slot.mode === 'online' ? <Link2 className="w-3.5 h-3.5 shrink-0" /> : <MapPin className="w-3.5 h-3.5 shrink-0" />}
                    {slot.mode === 'online' ? (
                      <a href={slot.location_or_link} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate">
                        {slot.location_or_link}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate">{slot.location_or_link}</span>
                    )}
                  </div>
                )}

                {/* Bookings list */}
                <AnimatePresence>
                  {isExpanded && bookings.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-primary-100"
                    >
                      <div className="p-4 bg-primary-50/50">
                        <p className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Booked Candidates</p>
                        <div className="space-y-2">
                          {bookings.map(booking => {
                            const attCfg = ATTENDANCE_CONFIG[booking.attendance_status] ?? ATTENDANCE_CONFIG.booked;
                            return (
                              <div key={booking.id} className="flex items-center gap-3 bg-white rounded-lg border border-primary-100 p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-primary-900">
                                    {booking.application?.candidate?.full_name ?? 'Unknown'}
                                  </p>
                                  {booking.application?.candidate?.mobile && (
                                    <p className="text-xs text-primary-500">{booking.application.candidate.mobile}</p>
                                  )}
                                </div>
                                <span className={`text-xs font-semibold ${attCfg.color}`}>{attCfg.label}</span>
                                {booking.attendance_status === 'booked' && (
                                  <div className="flex gap-1">
                                    <button disabled={attendanceLoading === booking.id}
                                      onClick={() => handleAttendance(booking.id, 'present')}
                                      className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-60">
                                      {attendanceLoading === booking.id ? '...' : 'Present'}
                                    </button>
                                    <button disabled={attendanceLoading === booking.id}
                                      onClick={() => handleAttendance(booking.id, 'absent')}
                                      className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-60">
                                      Absent
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

const IC = 'w-full text-sm border border-primary-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700';
