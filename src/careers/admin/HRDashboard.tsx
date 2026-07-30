import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, FileText, CreditCard, Users,
  ArrowRight, CheckCircle, Clock, AlertCircle,
  TrendingUp, Activity, UserCheck, XCircle, Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { listTodayInterviews, getPendingDocumentVerifications, getTodayPayments, getTodayJoining, listAllApplications, getApplicationStatusCounts } from '../lib/api';
import type { RmsInterviewSlot, RmsCandidateDocument, RmsPayment, RmsAppointmentLetter, ApplicationStatus } from '../lib/types';

const PIPELINE_STAGES: { key: ApplicationStatus[]; label: string; icon: React.ElementType; color: string; textColor: string; linkStatus: ApplicationStatus }[] = [
  { key: ['submitted', 'draft'], label: 'New Applications', icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-700', linkStatus: 'submitted' },
  { key: ['documents_uploaded'], label: 'Pending Verification', icon: AlertCircle, color: 'bg-amber-500', textColor: 'text-amber-700', linkStatus: 'documents_uploaded' },
  { key: ['interview_scheduled', 'interview_slot_pending'], label: 'Interview Scheduled', icon: Calendar, color: 'bg-indigo-500', textColor: 'text-indigo-700', linkStatus: 'interview_scheduled' },
  { key: ['selected'], label: 'Selected', icon: UserCheck, color: 'bg-emerald-500', textColor: 'text-emerald-700', linkStatus: 'selected' },
  { key: ['rejected'], label: 'Not Selected', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-700', linkStatus: 'rejected' },
  { key: ['appointment_issued'], label: 'Appointment Issued', icon: Award, color: 'bg-purple-500', textColor: 'text-purple-700', linkStatus: 'appointment_issued' },
  { key: ['completed'], label: 'Joined', icon: CheckCircle, color: 'bg-teal-500', textColor: 'text-teal-700', linkStatus: 'completed' },
];

export default function HRDashboard() {
  const [todayInterviews, setTodayInterviews] = useState<RmsInterviewSlot[]>([]);
  const [pendingDocs, setPendingDocs] = useState<RmsCandidateDocument[]>([]);
  const [todayPayments, setTodayPayments] = useState<RmsPayment[]>([]);
  const [todayJoining, setTodayJoining] = useState<RmsAppointmentLetter[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<ApplicationStatus, number>>({} as Record<ApplicationStatus, number>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listTodayInterviews(),
      getPendingDocumentVerifications(),
      getTodayPayments(),
      getTodayJoining(),
      listAllApplications(),
      getApplicationStatusCounts(),
    ]).then(([interviews, docs, payments, joining, apps, counts]) => {
      setTodayInterviews(interviews.data ?? []);
      setPendingDocs(docs.data ?? []);
      setTodayPayments(payments.data ?? []);
      setTodayJoining(joining.data ?? []);
      setTotalApplications((apps.data ?? []).length);
      setStatusCounts(counts);
      setLoading(false);
    });
  }, []);

  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const widgets = [
    {
      id: 'interviews',
      label: "Today's Interviews",
      count: todayInterviews.length,
      icon: Calendar,
      color: 'bg-blue-500',
      border: 'border-blue-200',
      link: '/admin/rms/interviews',
      items: todayInterviews.slice(0, 3).map(slot => ({
        key: slot.id,
        primary: `${slot.slot_time?.slice(0, 5)} — ${slot.mode}`,
        secondary: slot.location_or_link ?? 'TBD',
      })),
    },
    {
      id: 'documents',
      label: 'Document Verification',
      count: pendingDocs.length,
      icon: FileText,
      color: 'bg-amber-500',
      border: 'border-amber-200',
      link: '/admin/rms/documents',
      items: pendingDocs.slice(0, 3).map(d => ({
        key: d.id,
        primary: (d as RmsCandidateDocument & { candidate?: { full_name: string } }).candidate?.full_name ?? 'Candidate',
        secondary: d.document_label ?? d.document_type,
      })),
    },
    {
      id: 'payments',
      label: "Today's Payments",
      count: todayPayments.length,
      icon: CreditCard,
      color: 'bg-emerald-500',
      border: 'border-emerald-200',
      link: '/admin/rms/applications',
      items: todayPayments.slice(0, 3).map(p => ({
        key: p.id,
        primary: (p as RmsPayment & { application?: { candidate?: { full_name: string } } }).application?.candidate?.full_name ?? 'Candidate',
        secondary: `₹${Number(p.amount).toLocaleString('en-IN')} — ${p.payment_type === 'application_fee' ? 'App Fee' : 'Onboarding'}`,
      })),
      footer: `₹${todayTotal.toLocaleString('en-IN')} collected today`,
    },
    {
      id: 'joining',
      label: "Today's Joining",
      count: todayJoining.length,
      icon: Users,
      color: 'bg-primary-600',
      border: 'border-primary-200',
      link: '/admin/rms/letters',
      items: todayJoining.slice(0, 3).map(l => ({
        key: l.id,
        primary: (l as RmsAppointmentLetter & { application?: { candidate?: { full_name: string }; job_posting?: { title: string } } }).application?.candidate?.full_name ?? 'Candidate',
        secondary: (l as RmsAppointmentLetter & { application?: { candidate?: { full_name: string }; job_posting?: { title: string } } }).application?.job_posting?.title ?? '',
      })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick-action bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'New Campaign',        to: '/admin/rms/campaigns?new=1', icon: TrendingUp },
          { label: 'New Job Posting',     to: '/admin/rms/jobs?new=1',      icon: FileText },
          { label: 'Schedule Drive',      to: '/admin/rms/drives?new=1',    icon: Calendar },
          { label: 'View All Applications', to: '/admin/rms/applications',  icon: Activity },
        ].map(a => (
          <Link key={a.label} to={a.to}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-primary-200 rounded-xl text-sm font-semibold text-primary-700 hover:bg-primary-50 hover:border-primary-400 transition-all">
            <a.icon className="w-4 h-4" />
            {a.label}
          </Link>
        ))}
      </div>

      {/* Recruitment Pipeline — 7 status buckets */}
      <div>
        <h2 className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">Recruitment Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = stage.key.reduce((sum, k) => sum + (statusCounts[k] ?? 0), 0);
            return (
              <Link key={stage.label} to={`/admin/rms/applications?status=${stage.linkStatus}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all p-4 text-center group"
                >
                  <div className={`w-10 h-10 rounded-xl ${stage.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform`}>
                    <stage.icon className="w-5 h-5 text-white" />
                  </div>
                  {loading ? (
                    <div className="h-7 bg-primary-100 animate-pulse rounded-lg mb-1" />
                  ) : (
                    <div className={`text-2xl font-black ${stage.textColor} mb-0.5`}>{count}</div>
                  )}
                  <div className="text-xs font-semibold text-primary-600 leading-tight">{stage.label}</div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications',   value: totalApplications,      color: 'text-primary-900' },
          { label: 'Pending Docs',          value: pendingDocs.length,     color: 'text-amber-700'   },
          { label: "Today's Interviews",    value: todayInterviews.length, color: 'text-blue-700'    },
          { label: "Today's Joining",       value: todayJoining.length,    color: 'text-emerald-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-primary-100 p-5">
            <p className="text-xs font-bold text-primary-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Today Widgets */}
      <div className="grid md:grid-cols-2 gap-5">
        {widgets.map((w, i) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white rounded-2xl border-2 p-5 ${w.count > 0 ? w.border : 'border-primary-100'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${w.count > 0 ? w.color : 'bg-primary-100'} flex items-center justify-center`}>
                  <w.icon className={`w-5 h-5 ${w.count > 0 ? 'text-white' : 'text-primary-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-900">{w.label}</p>
                  {w.count > 0 && (
                    <p className={`text-xs font-semibold ${w.color.replace('bg-', 'text-')}`}>
                      {w.count} {w.count === 1 ? 'item' : 'items'}
                    </p>
                  )}
                </div>
              </div>
              <Link to={w.link} className="text-xs font-semibold text-primary-600 hover:text-primary-900 flex items-center gap-1 transition-colors">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(j => <div key={j} className="animate-pulse bg-primary-50 rounded-lg h-10" />)}
              </div>
            ) : w.items.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-primary-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                No pending items for today
              </div>
            ) : (
              <div className="space-y-2">
                {w.items.map(item => (
                  <div key={item.key} className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800 truncate">{item.primary}</p>
                      <p className="text-xs text-primary-500 truncate">{item.secondary}</p>
                    </div>
                  </div>
                ))}
                {w.count > 3 && (
                  <p className="text-xs text-primary-400 text-center">+{w.count - 3} more</p>
                )}
              </div>
            )}

            {'footer' in w && w.footer && w.count > 0 && (
              <div className="mt-3 pt-3 border-t border-primary-100 text-xs font-bold text-emerald-700">
                {w.footer}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Pending Actions Summary */}
      {!loading && (pendingDocs.length > 0 || todayInterviews.length > 0 || todayJoining.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Pending Actions</p>
              <ul className="mt-1 space-y-1 text-xs text-amber-700">
                {pendingDocs.length > 0 && (
                  <li>{pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} awaiting verification</li>
                )}
                {todayInterviews.length > 0 && (
                  <li>{todayInterviews.length} interview{todayInterviews.length !== 1 ? 's' : ''} scheduled today</li>
                )}
                {todayJoining.length > 0 && (
                  <li>{todayJoining.length} candidate{todayJoining.length !== 1 ? 's' : ''} joining today — mark attendance</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
