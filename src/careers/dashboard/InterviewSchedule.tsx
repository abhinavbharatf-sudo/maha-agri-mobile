import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Monitor, Clock, CheckCircle2, Phone, AlertCircle, Loader2, Sparkles, Building2 } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyInterviewBookings, getMyApplications, listAvailableSlots, bookApplicationToSlot } from '../lib/api';
import type { RmsInterviewBooking, RmsInterviewSlot, RmsApplicationWithDetails, RmsJobPosting } from '../lib/types';

type BookingWithRelations = RmsInterviewBooking & {
  slot?: RmsInterviewSlot & { job_posting?: Pick<RmsJobPosting, 'id' | 'title'> };
  application?: RmsApplicationWithDetails;
};

const ATTENDANCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  booked:      { label: 'Confirmed',   color: 'text-blue-700',   bg: 'bg-blue-50' },
  present:     { label: 'Attended',    color: 'text-green-700',  bg: 'bg-green-50' },
  absent:      { label: 'Absent',      color: 'text-red-700',    bg: 'bg-red-50' },
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

      // Identify applications eligible for free-job interview slot self-booking
      const bookedAppIds = new Set(currentBookings.map(b => b.application_id));
      const eligibleFreeApps = currentApps.filter(app => {
        if (bookedAppIds.has(app.id)) return false;
        const isFree = Number(app.job_posting?.application_fee_amount ?? 0) === 0;
        const isEligibleStatus = ['submitted', 'interview_slot_pending'].includes(app.status);
        return isFree && isEligibleStatus;
      });

      if (eligibleFreeApps.length > 0) {
        setSlotsLoading(true);
        const slotsMap: Record<string, RmsInterviewSlot[]> = {};
        await Promise.all(
          eligibleFreeApps.map(async app => {
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
      setBookingSuccess('Interview slot confirmed successfully! A confirmation WhatsApp message has been sent to your registered number.');
      await loadData();
    } catch (err: any) {
      setBookingError(err?.message || 'An unexpected error occurred while booking the slot.');
    } finally {
      setBookingSlotId(null);
    }
  };

  const upcoming = bookings.filter(b => b.slot?.slot_date && new Date(b.slot.slot_date) >= new Date());
  const past     = bookings.filter(b => !b.slot?.slot_date || new Date(b.slot.slot_date) < new Date());

  // Applications eligible for slot booking (free jobs only, submitted/pending, unbooked)
  const bookedAppIds = new Set(bookings.map(b => b.application_id));
  const unbookedFreeApps = applications.filter(app => {
    if (bookedAppIds.has(app.id)) return false;
    const isFree = Number(app.job_posting?.application_fee_amount ?? 0) === 0;
    const isEligibleStatus = ['submitted', 'interview_slot_pending'].includes(app.status);
    return isFree && isEligibleStatus;
  });

  // Check if candidate has unpaid paid applications
  const unpaidPaidApps = applications.filter(app => {
    const isPaid = Number(app.job_posting?.application_fee_amount ?? 0) > 0;
    return isPaid && app.status !== 'payment_successful';
  });

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
    const isOnline = slot?.mode === 'online';
    const isUpcoming = slot?.slot_date && new Date(slot.slot_date) >= new Date();

    return (
      <motion.div key={booking.id}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
        className={`bg-white rounded-xl border-2 p-5 ${isUpcoming ? 'border-blue-200' : 'border-primary-100'}`}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <div className={`w-10 h-10 rounded-xl ${isUpcoming ? 'bg-blue-500' : 'bg-primary-100'} flex items-center justify-center shrink-0`}>
            <Calendar className={`w-5 h-5 ${isUpcoming ? 'text-white' : 'text-primary-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-primary-900 text-sm">
                {booking.application?.job_posting?.title ?? slot?.job_posting?.title ?? 'Interview'}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
              {isUpcoming && <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Upcoming</span>}
            </div>

            {slot && (
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 text-sm text-primary-700">
                  <Calendar className="w-4 h-4 text-primary-400 shrink-0" />
                  <span className="font-semibold">
                    {new Date(slot.slot_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <Clock className="w-4 h-4 text-primary-400 shrink-0 ml-1" />
                  <span>{slot.slot_time?.slice(0, 5)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-primary-600">
                  {isOnline ? <Monitor className="w-4 h-4 text-primary-400 shrink-0" /> : <MapPin className="w-4 h-4 text-primary-400 shrink-0" />}
                  <span>{slot.mode === 'online' ? 'Online Interview' : slot.mode === 'hybrid' ? 'Hybrid Mode' : 'In-Person Interview'}</span>
                </div>

                {slot.location_or_link && (
                  <div className="flex items-start gap-2 text-sm">
                    {isOnline ? (
                      <a href={slot.location_or_link} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 hover:underline font-semibold">
                        <Phone className="w-4 h-4 shrink-0" />
                        Join Interview Link
                      </a>
                    ) : (
                      <span className="text-primary-600">
                        <MapPin className="w-4 h-4 inline mr-1 text-primary-400" />
                        {slot.location_or_link}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isUpcoming && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
            <span className="font-bold">Important:</span> Please carry a valid photo ID, original documents and this confirmation. Arrive 15 minutes early.
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      <AnimatePresence>
        {bookingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{bookingSuccess}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification */}
      <AnimatePresence>
        {bookingError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{bookingError}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Slot Booking Section for Eligible Free Applications */}
      {unbookedFreeApps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-primary-900 uppercase tracking-wider">
              Select Your Interview Slot
            </h3>
          </div>

          {unbookedFreeApps.map(app => {
            const availableSlots = slotsByApp[app.id] ?? [];
            return (
              <div key={app.id} className="bg-white rounded-2xl border-2 border-emerald-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-100 pb-3">
                  <div>
                    <h4 className="font-bold text-primary-900 text-base">{app.job_posting?.title}</h4>
                    <p className="text-xs text-primary-500 font-mono">Application: {app.application_number}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Free Job • Booking Open
                  </span>
                </div>

                {slotsLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-primary-500 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span>Loading available interview slots...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-primary-50 rounded-xl text-center text-sm text-primary-600">
                    <Calendar className="w-6 h-6 text-primary-400 mx-auto mb-1.5" />
                    <p className="font-semibold text-primary-800">Interview slots will be opened shortly</p>
                    <p className="text-xs text-primary-500 mt-1">
                      HR is preparing interview schedules for this position. You will receive a WhatsApp message once slots are available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-primary-600 font-medium">
                      Please select a convenient date and time for your interview:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {availableSlots.map(slot => {
                        const isBookingThis = bookingSlotId === slot.id;
                        const isOnline = slot.mode === 'online';
                        return (
                          <div
                            key={slot.id}
                            className="bg-primary-50/60 rounded-xl p-4 border border-primary-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center gap-2 text-sm font-bold text-primary-900">
                                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  {new Date(slot.slot_date).toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
                                <Clock className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                                <span>{slot.slot_time?.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-primary-600">
                                {isOnline ? (
                                  <Monitor className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                                <span className="capitalize">{slot.mode} Interview</span>
                              </div>
                              {slot.location_or_link && (
                                <p className="text-[11px] text-primary-500 truncate">
                                  {slot.location_or_link}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleBookSlot(app.id, slot.id)}
                              disabled={bookingSlotId !== null}
                              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isBookingThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Confirming...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Book This Slot</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unpaid Paid Applications Notice */}
      {unpaidPaidApps.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Notice for paid applications:</span>{' '}
            {unpaidPaidApps.map(a => a.job_posting?.title).join(', ')} requires fee payment before interview slots can be scheduled.
          </div>
        </div>
      )}

      {/* Booked Interviews Section */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Upcoming Interviews</h3>
          <div className="space-y-3">{upcoming.map((b, i) => renderBooking(b, i))}</div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Past Interviews</h3>
          <div className="space-y-3 opacity-70">{past.map((b, i) => renderBooking(b, i))}</div>
        </div>
      )}

      {/* Empty State when no bookings and no unbooked free applications */}
      {bookings.length === 0 && unbookedFreeApps.length === 0 && (
        <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-bold text-primary-600 text-lg mb-2">No Interviews Scheduled</p>
          <p className="text-primary-500 text-sm">Your upcoming interviews will appear here once assigned or booked.</p>
        </div>
      )}
    </div>
  );
}
