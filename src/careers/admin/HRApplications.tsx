import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Filter, FileText, User, MapPin, Calendar, Briefcase,
  ChevronDown, X, Eye,
} from 'lucide-react';
import { listApplicationsForHR, listAllJobs } from '../lib/api';
import type { RmsApplicationWithDetails, ApplicationStatus, RmsJobPosting } from '../lib/types';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge';
import { APPLICATION_STATUS_CONFIG, MAHARASHTRA_DISTRICTS } from '../lib/constants';
import HRCandidateProfile from './HRCandidateProfile';
import { supabase } from '../../lib/supabase/client';

const STATUSES = Object.entries(APPLICATION_STATUS_CONFIG).map(([k, v]) => ({ value: k as ApplicationStatus, label: v.label }));

export default function HRApplications() {
  const [apps, setApps] = useState<RmsApplicationWithDetails[]>([]);
  const [jobs, setJobs] = useState<Pick<RmsJobPosting, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [talukaFilter, setTalukaFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Profile drawer
  const [profileAppId, setProfileAppId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listApplicationsForHR({
      status: statusFilter,
      district: districtFilter || undefined,
      taluka: talukaFilter || undefined,
      job_posting_id: jobFilter || undefined,
      search: search || undefined,
    }).then(r => {
      setApps(r.data ?? []);
      setLoading(false);
    });
  }, [search, statusFilter, districtFilter, talukaFilter, jobFilter]);

  useEffect(() => { load(); }, [load]);

  // Phase 5: HR Realtime Notifications
  useEffect(() => {
    const channel = supabase.channel('hr-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rms_applications' }, payload => {
        // Only trigger load if the application is submitted or relevant to HR queue
        if (payload.new && (payload.new as any).status !== 'draft') {
          // You could also trigger an in-app notification here in the future
          console.log('Realtime update: Application modified', payload);
          load();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    listAllJobs().then(r => setJobs((r.data ?? []).map(j => ({ id: j.id, title: j.title }))));
  }, []);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDistrictFilter('');
    setTalukaFilter('');
    setJobFilter('');
  };

  const hasActiveFilters = search || statusFilter || districtFilter || talukaFilter || jobFilter;

  return (
    <div className="space-y-5">
      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-64 bg-white border border-primary-200 rounded-xl px-3 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, mobile, application number..."
            className="flex-1 text-sm text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none" />
          {search && (
            <button onClick={() => setSearch('')} className="text-primary-300 hover:text-primary-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            hasActiveFilters
              ? 'bg-primary-900 text-white border-primary-900'
              : 'bg-white border-primary-200 text-primary-700 hover:border-primary-400'
          }`}>
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400" />}
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl">
          <span className="text-sm font-bold text-primary-700">{loading ? '—' : apps.length}</span>
          <span className="text-sm text-primary-500">results</span>
        </div>
      </div>

      {/* Expanded filter row */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-primary-100 rounded-xl p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ApplicationStatus | '')}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700">
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">District</label>
                <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700">
                  <option value="">All Districts</option>
                  {MAHARASHTRA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Taluka */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Taluka</label>
                <input value={talukaFilter} onChange={e => setTalukaFilter(e.target.value)}
                  placeholder="Filter by taluka..."
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700" />
              </div>

              {/* Job Role */}
              <div>
                <label className="block text-xs font-bold text-primary-500 uppercase tracking-wider mb-1.5">Job Role</label>
                <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
                  className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-primary-700">
                  <option value="">All Roles</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="mt-3 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => (
          <div key={i} className="animate-pulse bg-white rounded-xl h-20 border border-primary-100" />
        ))}</div>
      ) : apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-primary-100 p-16 text-center">
          <FileText className="w-12 h-12 text-primary-200 mx-auto mb-3" />
          <p className="font-semibold text-primary-600 text-base mb-1">No applications found</p>
          <p className="text-sm text-primary-400">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app, idx) => {
            const candidate = app.candidate as { full_name?: string; mobile?: string; candidate_id?: string; district?: string; taluka?: string } | undefined;
            return (
              <motion.div key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-white rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-center gap-3 p-4">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-primary-400">{app.application_number}</span>
                      <ApplicationStatusBadge status={app.status} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="flex items-center gap-1.5 font-bold text-primary-900">
                        <User className="w-3.5 h-3.5 text-primary-400" />
                        {candidate?.full_name ?? 'Unknown'}
                      </span>
                      {candidate?.mobile && (
                        <span className="text-primary-500 text-xs">{candidate.mobile}</span>
                      )}
                      {app.job_posting?.title && (
                        <span className="flex items-center gap-1 text-primary-700 font-medium text-xs">
                          <Briefcase className="w-3 h-3 text-primary-400" />
                          {app.job_posting.title}
                        </span>
                      )}
                      {(candidate?.district ?? app.preferred_district) && (
                        <span className="flex items-center gap-1 text-xs text-primary-500">
                          <MapPin className="w-3 h-3" />
                          {candidate?.district ?? app.preferred_district}
                          {candidate?.taluka && ` · ${candidate.taluka}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + view */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-primary-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(app.created_at).toLocaleDateString('en-IN')}
                    </span>
                    <button
                      onClick={() => setProfileAppId(app.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary-900 text-white hover:bg-primary-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Candidate Profile Drawer */}
      <AnimatePresence>
        {profileAppId && (
          <HRCandidateProfile
            applicationId={profileAppId}
            onClose={() => setProfileAppId(null)}
            onStatusChanged={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
