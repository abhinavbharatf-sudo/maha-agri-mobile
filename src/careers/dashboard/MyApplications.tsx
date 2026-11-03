import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, Search, Filter } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { getMyApplications } from '../lib/api';
import type { RmsApplicationWithDetails, ApplicationStatus } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG } from '../lib/constants';

const STATUS_FILTERS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'completed', label: 'Joined' },
  { value: 'rejected', label: 'Not Selected' },
];

export default function MyApplications() {
  const { profile, verifiedMobile, user } = useCandidateAuth();
  const [apps, setApps] = useState<RmsApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    const activeMobile = (verifiedMobile || user?.phone || '').replace(/\D/g, '').slice(-10);
    const profileMobile = (profile?.mobile || '').replace(/\D/g, '').slice(-10);

    if (!profile || (activeMobile && profileMobile && profileMobile !== activeMobile)) {
      setApps([]);
      setLoading(false);
      return;
    }

    getMyApplications(profile.id).then(r => {
      setApps(r.data);
      setLoading(false);
    });
  }, [profile, verifiedMobile, user?.phone]);

  const filtered = apps.filter(a => {
    const matchSearch = !search || a.job_posting?.title.toLowerCase().includes(search.toLowerCase()) ||
      a.application_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-24 border border-primary-100" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-primary-200 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications..."
            className="flex-1 text-sm text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                statusFilter === f.value
                  ? 'bg-primary-900 text-white border-primary-900'
                  : 'bg-white text-primary-600 border-primary-200 hover:border-primary-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
          <FileText className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-600">No applications found</p>
          <Link to="/careers" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-primary-900 text-white text-sm font-bold rounded-xl hover:bg-primary-800 transition-colors">
            Browse Openings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-primary-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-primary-900 text-sm truncate">{a.job_posting?.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-primary-500">
                    <span className="font-mono">{a.application_number}</span>
                    {a.preferred_district && <span>{a.preferred_district}</span>}
                    {a.campaign && <span className="text-primary-400">{a.campaign.name}</span>}
                    <span>{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <ApplicationStatusBadge status={a.status} size="sm" />
              </div>

              {/* Status Progress */}
              <div className="mt-4 flex items-center gap-1">
                {Object.entries(APPLICATION_STATUS_CONFIG)
                  .filter(([, v]) => v.step > 0 && v.step <= 10)
                  .sort(([, a], [, b]) => a.step - b.step)
                  .slice(0, 8)
                  .map(([key, cfg]) => (
                    <div key={key}
                      className={`flex-1 h-1.5 rounded-full transition-all ${
                        cfg.step <= (APPLICATION_STATUS_CONFIG[a.status]?.step ?? 0)
                          ? 'bg-primary-600'
                          : 'bg-primary-100'
                      }`}
                    />
                  ))}
              </div>

              {/* Status-Aware Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  {a.status === 'draft' ? (
                    <span className="text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 font-semibold">
                      Incomplete Draft
                    </span>
                  ) : a.status === 'payment_pending' ? (
                    <span className="text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 font-semibold">
                      Application Fee Pending
                    </span>
                  ) : (
                    <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-semibold">
                      Application Submitted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {a.status === 'draft' && (
                    <Link
                      to={`/careers/portal/apply/${a.job_posting?.id || a.job_posting_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-900 hover:bg-primary-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      Continue Application <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {a.status === 'payment_pending' && (
                    <Link
                      to="/candidate/payments"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      Complete Payment <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {a.status !== 'draft' && a.status !== 'payment_pending' && (
                    <Link
                      to={a.job_posting?.slug ? `/careers/jobs/${a.job_posting.slug}` : '/careers'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      View Position Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
