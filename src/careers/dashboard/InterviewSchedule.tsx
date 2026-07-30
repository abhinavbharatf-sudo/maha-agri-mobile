import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Monitor, Clock, CheckCircle2, X, Phone } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyInterviewBookings } from '../lib/api';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyInterviewBookings(profile.id).then(r => {
      setBookings((r.data ?? []) as BookingWithRelations[]);
      setLoading(false);
    });
  }, [profile]);

  const upcoming = bookings.filter(b => b.slot?.slot_date && new Date(b.slot.slot_date) >= new Date());
  const past     = bookings.filter(b => !b.slot?.slot_date || new Date(b.slot.slot_date) < new Date());

  if (loading) {
    return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-28 bg-white animate-pulse rounded-xl border border-primary-100" />)}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
        <Calendar className="w-12 h-12 text-primary-200 mx-auto mb-3" />
        <p className="font-bold text-primary-600 text-lg mb-2">No Interviews Scheduled</p>
        <p className="text-primary-500 text-sm">Your upcoming interviews will appear here once assigned by HR.</p>
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
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Upcoming</h3>
          <div className="space-y-3">{upcoming.map((b, i) => renderBooking(b, i))}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Past Interviews</h3>
          <div className="space-y-3 opacity-70">{past.map((b, i) => renderBooking(b, i))}</div>
        </div>
      )}
    </div>
  );
}
