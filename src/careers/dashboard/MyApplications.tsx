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
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'completed', label: 'Joined' },
  { value: 'rejected', label: 'Not Selected' },
];

export default function MyApplications() {
  const { profile } = useCandidateAuth();
  const [apps, setApps] = useState<RmsApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    if (!profile) return;
    getMyApplications(profile.id).then(r => {
      setApps(r.data);
      setLoading(false);
    });
  }, [profile]);

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
