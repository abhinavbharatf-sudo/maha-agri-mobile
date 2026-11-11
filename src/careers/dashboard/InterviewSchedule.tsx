import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Monitor, Clock, CheckCircle2, Phone, AlertCircle,
  Loader2, Sparkles, Building2, Video, RefreshCw, X, ExternalLink,
  Bell, ShieldAlert
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import {
  getMyInterviewBookings,
  getMyApplications,
  listAvailableSlots,
  bookApplicationToSlot,
  submitRescheduleRequest
} from '../lib/api';
import type {
  RmsInterviewBooking,
  RmsInterviewSlot,
  RmsApplicationWithDetails,
  RmsJobPosting
} from '../lib/types';

type BookingWithRelations = RmsInterviewBooking & {
  slot?: RmsInterviewSlot & { job_posting?: Pick<RmsJobPosting, 'id' | 'title'> };
  application?: RmsApplicationWithDetails;
};

const ATTENDANCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  booked:      { label: 'Confirmed',   color: 'text-blue-700',   bg: 'bg-blue-50' },
  present:     { label: 'Attended',    color: 'text-green-700',  bg: 'bg-green-50' },
  absent:      { label: 'No-Show (Absent)', color: 'text-red-700', bg: 'bg-red-50' },
  rescheduled: { label: 'Rescheduled', color: 'text-amber-700',  bg: 'bg-amber-50' },
};

export default function InterviewSchedule() {
  const { profile } = useCandidateAuth();
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [applications, setApplications] = useState<RmsApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Available slots for eligible free-job applications without bookings
  const [slotsByApp, setSlotsByApp] = useState<Record<string, RmsInterviewSlot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingWithRelations | null>(null);
  const [availableRescheduleSlots, setAvailableRescheduleSlots] = useState<RmsInterviewSlot[]>([]);
  const [selectedRescheduleSlotId, setSelectedRescheduleSlotId] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [submittingReschedule, setSubmittingReschedule] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setBookingError(null);
    try {
      const [bRes, aRes] = await Promise.all([
        getMyInterviewBookings(profile.id),
        getMyApplications(profile.id),
      ]);

      const currentBookings = (bRes.data ?? []) as BookingWithRelations[];
      const currentApps = (aRes.data ?? []) as RmsApplicationWithDetails[];
      setBookings(currentBookings);
      setApplications(currentApps);

      const bookedAppIds = new Set(
        currentBookings.filter(b => b.attendance_status !== 'rescheduled').map(b => b.application_id)
      );

      const eligibleApps = currentApps.filter(app => {
        if (bookedAppIds.has(app.id)) return false;
        const isEligibleStatus = ['submitted', 'interview_slot_pending'].includes(app.status);
        return isEligibleStatus;
      });

      if (eligibleApps.length > 0) {
        setSlotsLoading(true);
        const slotsMap: Record<string, RmsInterviewSlot[]> = {};
        await Promise.all(
          eligibleApps.map(async app => {
            if (app.job_posting_id) {
              const { data: openSlots } = await listAvailableSlots(app.job_posting_id);
              slotsMap[app.id] = openSlots ?? [];
            }
          })
        );
        setSlotsByApp(slotsMap);
        setSlotsLoading(false);
      } else {
        setSlotsByApp({});
      }
    } catch (err) {
      console.error('[InterviewSchedule] Error loading schedule data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookSlot = async (applicationId: string, slotId: string) => {
    setBookingSlotId(slotId);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const { data, error } = await bookApplicationToSlot(applicationId, slotId);
      if (error || !data) {
        setBookingError((error as { message?: string })?.message || 'Failed to book slot. Please try another slot.');
        return;
      }
      setBookingSuccess('Interview slot confirmed! WhatsApp reminders will be sent to your registered number in IST.');
      await loadData();
    } catch (err: any) {
      setBookingError(err?.message || 'An unexpected error occurred while booking the slot.');
    } finally {
      setBookingSlotId(null);
    }
  };

  const openRescheduleModal = async (booking: BookingWithRelations) => {
    setRescheduleBooking(booking);
    setRescheduleError(null);
    setRescheduleReason('');
    setSelectedRescheduleSlotId('');
    const jobId = booking.application?.job_posting_id || booking.slot?.job_posting_id;
    if (jobId) {
      const { data } = await listAvailableSlots(jobId);
      setAvailableRescheduleSlots((data ?? []).filter(s => s.id !== booking.slot_id));
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleBooking || !selectedRescheduleSlotId || !rescheduleReason.trim()) return;
    setSubmittingReschedule(true);
    setRescheduleError(null);
    try {
      const res = await submitRescheduleRequest(
        rescheduleBooking.application_id,
        selectedRescheduleSlotId,
        rescheduleReason.trim()
      );

      if (res.error) {
        setRescheduleError(res.error);
        return;
      }

      setRescheduleBooking(null);
      setBookingSuccess(res.data?.message || 'Reschedule processed successfully.');
      await loadData();
    } catch (err: any) {
      setRescheduleError(err?.message || 'Failed to reschedule interview.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-white animate-pulse rounded-xl border border-primary-100" />
        ))}
      </div>
    );
  }

  const renderBooking = (booking: BookingWithRelations, idx: number) => {
    const slot = booking.slot;
    const cfg = ATTENDANCE_CONFIG[booking.attendance_status] ?? ATTENDANCE_CONFIG.booked;
    const meetLink = booking.google_meet_link || slot?.location_or_link;
    const isOnline = slot?.mode === 'online' || (meetLink && meetLink.startsWith('http'));
    const isUpcoming = slot?.slot_date && new Date(slot.slot_date) >= new Date();
    const isAbsent = booking.attendance_status === 'absent';

    return (
      <motion.div key={booking.id}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
        className={`bg-white rounded-2xl border-2 p-5 ${isUpcoming ? 'border-blue-200' : 'border-primary-100'}`}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <div className={`w-10 h-10 rounded-xl ${isUpcoming ? 'bg-blue-600' : 'bg-primary-100'} flex items-center justify-center shrink-0`}>
            <Calendar className={`w-5 h-5 ${isUpcoming ? 'text-white' : 'text-primary-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-primary-900 text-sm">
                {booking.application?.job_posting?.title ?? slot?.job_posting?.title ?? 'Interview'}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
              {isUpcoming && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Scheduled (IST)</span>}
              {booking.reschedule_count > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Rescheduled {booking.reschedule_count}/3 times
                </span>
              )}
            </div>

            {slot && (
              <div className="space-y-2 mt-2 text-xs">
                <div className="flex items-center gap-2 text-primary-800 font-semibold">
                  <Calendar className="w-4 h-4 text-primary-400 shrink-0" />
                  <span>
                    {new Date(slot.slot_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <Clock className="w-4 h-4 text-primary-400 shrink-0 ml-2" />
                  <span>{slot.slot_time?.slice(0, 5)} IST (Asia/Kolkata)</span>
                </div>

                {/* Google Meet Online Join Link (Correction 4) */}
                {booking.google_meet_link ? (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2 text-blue-900 font-medium">
                      <Video className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Google Meet: <strong className="font-mono text-xs">{booking.google_meet_link}</strong></span>
                    </div>
                    <a
                      href={booking.google_meet_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Meeting
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center gap-2 mt-2 text-xs text-amber-800">
                    <Video className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Google Meet Link: <em>Will be generated and provided by Admin prior to the interview.</em></span>
                  </div>
                )}

                {/* Automated Notification Schedule Notice */}
                <div className="p-2.5 bg-primary-50/60 rounded-xl border border-primary-100 flex items-center gap-2 text-[11px] text-primary-600">
                  <Bell className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                  <span>Automated WhatsApp reminders scheduled: <strong>1-Day</strong>, <strong>3-Hour</strong>, and <strong>10-Minute</strong> prior with Google Meet join link.</span>
                </div>
              </div>
            )}

            {/* No Show Alert */}
            {isAbsent && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>
                  <strong>Missed Interview:</strong> You were marked absent. If Admin approves a re-attempt, you may book 1 replacement slot.
                </span>
              </div>
            )}
          </div>

          {/* Reschedule Button */}
          {booking.attendance_status === 'booked' && (
            <button
              onClick={() => openRescheduleModal(booking)}
              className="px-3 py-1.5 border border-primary-300 text-primary-700 text-xs font-semibold rounded-xl hover:bg-primary-50 flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Reschedule
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {bookingSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{bookingSuccess}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{bookingError}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed Bookings Section */}
      {bookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wide">
            Your Interview Schedule ({bookings.length})
          </h3>
          {bookings.map((booking, idx) => renderBooking(booking, idx))}
        </div>
      )}

      {/* Available Slots for Booking Section */}
      {Object.keys(slotsByApp).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wide">
            Available Interview Slots for Booking
          </h3>
          {Object.entries(slotsByApp).map(([appId, slots]) => {
            const app = applications.find(a => a.id === appId);
            return (
              <div key={appId} className="bg-white rounded-2xl border border-primary-200 p-5 space-y-3">
                <div>
                  <h4 className="font-bold text-primary-900 text-sm">{app?.job_posting?.title || 'Open Position'}</h4>
                  <p className="text-xs text-primary-500">Application #{app?.application_number} &bull; Select a convenient slot below</p>
                </div>
                {slots.length === 0 ? (
                  <p className="text-xs text-primary-400">No open interview slots available right now. Please check back soon.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {slots.map(slot => (
                      <div key={slot.id} className="p-3 bg-primary-50/50 rounded-xl border border-primary-100 flex flex-col justify-between space-y-2">
                        <div className="text-xs">
                          <p className="font-bold text-primary-900">{slot.slot_date}</p>
                          <p className="text-primary-600">{slot.slot_time} IST ({slot.mode})</p>
                        </div>
                        <button
                          onClick={() => handleBookSlot(appId, slot.id)}
                          disabled={bookingSlotId === slot.id}
                          className="w-full py-1.5 bg-primary-900 text-white font-bold rounded-lg text-xs hover:bg-primary-800 disabled:opacity-50"
                        >
                          {bookingSlotId === slot.id ? 'Booking...' : 'Book Slot'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: RESCHEDULE INTERVIEW ─────────────────────────── */}
      <AnimatePresence>
        {rescheduleBooking && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-primary-200"
            >
              <div className="flex justify-between items-center pb-3 border-b border-primary-100">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary-900" />
                  <h3 className="font-bold text-primary-900 text-sm">Reschedule Interview Slot</h3>
                </div>
                <button onClick={() => setRescheduleBooking(null)} className="p-1 rounded-lg text-primary-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {rescheduleError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-primary-50/60 rounded-xl border border-primary-100">
                  <p className="font-bold text-primary-900">Current Slot:</p>
                  <p className="text-primary-600">
                    {rescheduleBooking.slot?.slot_date} at {rescheduleBooking.slot?.slot_time} IST
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Approved reschedules: {rescheduleBooking.reschedule_count}/3 allowed.
                  </p>
                  <p className="text-[11px] text-primary-600 mt-0.5">
                    <strong>Mandatory Admin Approval:</strong> Every reschedule request is submitted as <em>Pending</em> and requires Admin approval. Your current slot remains booked and active until replacement is approved.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-primary-700 mb-1">Select Replacement Slot *</label>
                  {availableRescheduleSlots.length === 0 ? (
                    <p className="text-xs text-primary-400">No other open slots found for this job position.</p>
                  ) : (
                    <select
                      value={selectedRescheduleSlotId}
                      onChange={e => setSelectedRescheduleSlotId(e.target.value)}
                      className="w-full text-xs border border-primary-200 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-300 font-medium"
                    >
                      <option value="">Select an available date & time</option>
                      {availableRescheduleSlots.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.slot_date} &bull; {s.slot_time} IST &bull; {s.mode} ({s.capacity - s.booked_count} left)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-primary-700 mb-1">Reason for Reschedule *</label>
                  <textarea
                    rows={2}
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    placeholder="Please specify why you need to reschedule..."
                    className="w-full text-xs border border-primary-200 rounded-xl p-2.5 focus:ring-1 focus:ring-primary-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-primary-100">
                <button
                  onClick={() => setRescheduleBooking(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary-200 text-primary-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={submittingReschedule || !selectedRescheduleSlotId || !rescheduleReason.trim()}
                  className="px-4 py-2 bg-primary-900 text-white text-xs font-bold rounded-xl hover:bg-primary-800 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submittingReschedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm Reschedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
