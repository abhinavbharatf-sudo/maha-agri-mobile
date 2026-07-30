import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, CreditCard, FolderOpen, BookOpen, ArrowRight,
  CheckCircle2, Clock, AlertCircle, FileText,
  TrendingUp, Award,
} from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications, getMyDocuments } from '../lib/api';
import type { RmsApplicationWithDetails, RmsCandidateDocument } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';

export default function CandidateDashboard() {
  const { profile } = useCandidateAuth();
  const [applications, setApplications] = useState<RmsApplicationWithDetails[]>([]);
  const [pendingDocs, setPendingDocs] = useState<RmsCandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getMyApplications(profile.id),
      getMyDocuments(profile.id),
    ]).then(([apps, docs]) => {
      setApplications(apps.data);
      setPendingDocs(docs.data.filter(d => d.status === 'pending' || d.status === 'correction_required'));
      setLoading(false);
    });
  }, [profile]);

  const upcomingInterview = applications
    .flatMap(a => (a as RmsApplicationWithDetails & { interview_booking?: { slot?: { slot_date?: string; slot_time?: string; mode?: string; location_or_link?: string } } }).interview_booking
      ? [{ app: a, booking: (a as RmsApplicationWithDetails & { interview_booking?: { slot?: { slot_date?: string; slot_time?: string; mode?: string; location_or_link?: string } } }).interview_booking! }]
      : []
    )
    .filter(x => x.booking?.slot?.slot_date && new Date(x.booking.slot.slot_date) >= new Date())
    .sort((a, b) => new Date(a.booking.slot!.slot_date!).getTime() - new Date(b.booking.slot!.slot_date!).getTime())[0];

  const pendingPayments = applications.filter(a =>
    a.status === 'payment_pending' || a.status === 'onboarding_pending'
  );

  const upcomingTraining = applications.find(a => a.status === 'training_pending');

  const widgets = [
    {
      id: 'interviews',
      label: 'Upcoming Interview',
      icon: Calendar,
      color: 'bg-blue-500',
      light: 'bg-blue-50',
      border: 'border-blue-200',
      count: upcomingInterview ? 1 : 0,
      content: upcomingInterview ? (
        <div>
          <p className="font-semibold text-primary-900 text-sm truncate">{upcomingInterview.app.job_posting?.title}</p>
          <p className="text-xs text-primary-600 mt-1">
            {new Date(upcomingInterview.booking.slot!.slot_date!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}
            {upcomingInterview.booking.slot!.slot_time?.slice(0, 5)}
          </p>
          <p className="text-xs text-primary-500 mt-0.5">{upcomingInterview.booking.slot!.mode}</p>
        </div>
      ) : (
        <p className="text-sm text-primary-500">No upcoming interviews</p>
      ),
      link: '/candidate/interviews',
    },
    {
      id: 'payments',
      label: 'Pending Payments',
      icon: CreditCard,
      color: 'bg-amber-500',
      light: 'bg-amber-50',
      border: 'border-amber-200',
      count: pendingPayments.length,
      content: pendingPayments.length > 0 ? (
        <div className="space-y-1">
          {pendingPayments.slice(0, 2).map(a => (
            <div key={a.id} className="flex items-center justify-between">
              <p className="text-xs font-medium text-primary-800 truncate flex-1">{a.job_posting?.title}</p>
              <span className="text-xs font-bold text-amber-700 ml-2 shrink-0">
                {a.status === 'payment_pending' ? 'App Fee' : 'Onboarding Fee'}
              </span>
            </div>
          ))}
          {pendingPayments.length > 2 && (
            <p className="text-xs text-primary-500">+{pendingPayments.length - 2} more</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" /> All payments complete
        </div>
      ),
      link: '/candidate/payments',
    },
    {
      id: 'documents',
      label: 'Pending Documents',
      icon: FolderOpen,
      color: 'bg-red-500',
      light: 'bg-red-50',
      border: 'border-red-200',
      count: pendingDocs.length,
      content: pendingDocs.length > 0 ? (
        <div className="space-y-1">
          {pendingDocs.slice(0, 2).map(d => (
            <div key={d.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'correction_required' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <p className="text-xs font-medium text-primary-800 truncate">{d.document_label ?? d.document_type}</p>
              {d.status === 'correction_required' && (
                <span className="text-xs text-red-600 font-semibold shrink-0">Fix Required</span>
              )}
            </div>
          ))}
          {pendingDocs.length > 2 && (
            <p className="text-xs text-primary-500">+{pendingDocs.length - 2} more pending</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" /> All documents submitted
        </div>
      ),
      link: '/candidate/documents',
    },
    {
      id: 'training',
      label: 'Upcoming Training',
      icon: BookOpen,
      color: 'bg-emerald-500',
      light: 'bg-emerald-50',
      border: 'border-emerald-200',
      count: upcomingTraining ? 1 : 0,
      content: upcomingTraining ? (
        <div>
          <p className="font-semibold text-primary-900 text-sm truncate">{upcomingTraining.job_posting?.title}</p>
          <p className="text-xs text-primary-500 mt-1">Training pending allocation</p>
        </div>
      ) : (
        <p className="text-sm text-primary-500">No pending training</p>
      ),
      link: '/candidate/training',
    },
  ];

  const activeApps = applications.filter(a => !['draft', 'rejected', 'withdrawn', 'completed'].includes(a.status));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-800 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Candidate'}!
        </h2>
        <p className="text-primary-200 text-sm">
          {profile?.candidate_id && (
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-xs mr-2">{profile.candidate_id}</span>
          )}
          {activeApps.length > 0
            ? `You have ${activeApps.length} active application${activeApps.length !== 1 ? 's' : ''}.`
            : 'No active applications. Browse open positions to apply.'}
        </p>
        {!profile?.profile_complete && (
          <Link
            to="/candidate/profile"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-400 text-primary-900 text-sm font-bold rounded-lg hover:bg-amber-300 transition-colors"
          >
            <AlertCircle className="w-4 h-4" /> Complete Your Profile <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 5 Widgets Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-36 border border-primary-100" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {widgets.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={w.link}
                className={`block bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all group ${
                  w.count > 0 ? w.border : 'border-primary-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${w.count > 0 ? w.color : 'bg-primary-100'} flex items-center justify-center`}>
                    <w.icon className={`w-5 h-5 ${w.count > 0 ? 'text-white' : 'text-primary-400'}`} />
                  </div>
                  {w.count > 0 && (
                    <span className={`text-lg font-bold ${w.color.replace('bg-', 'text-').replace('-500', '-600')}`}>
                      {w.count}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-2">{w.label}</p>
                {w.content}
                <div className="mt-3 flex items-center gap-1 text-xs text-primary-400 group-hover:text-primary-700 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Applications Overview */}
      <div className="bg-white rounded-2xl border border-primary-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-primary-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            My Applications
          </h3>
          <Link to="/candidate/applications" className="text-sm text-primary-600 hover:text-primary-900 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="animate-pulse bg-primary-50 rounded-lg h-16" />)}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-primary-200 mx-auto mb-3" />
            <p className="text-primary-500 font-medium">No applications yet</p>
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 mt-3 px-5 py-2 bg-primary-900 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
            >
              Browse Openings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-900 text-sm truncate">{a.job_posting?.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-primary-500 font-mono">{a.application_number}</span>
                    {a.preferred_district && (
                      <span className="text-xs text-primary-500">{a.preferred_district}</span>
                    )}
                  </div>
                </div>
                <ApplicationStatusBadge status={a.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/careers" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all group">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-900 transition-colors">
            <FileText className="w-5 h-5 text-primary-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">Browse Jobs</p>
            <p className="text-xs text-primary-500">Find new positions</p>
          </div>
        </Link>
        <Link to="/candidate/documents" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all group">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-900 transition-colors">
            <FolderOpen className="w-5 h-5 text-primary-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">My Documents</p>
            <p className="text-xs text-primary-500">Upload & manage</p>
          </div>
        </Link>
        <Link to="/candidate/letters" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all group">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-900 transition-colors">
            <Award className="w-5 h-5 text-primary-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">Appointment Letters</p>
            <p className="text-xs text-primary-500">Download your letters</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
