import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  PhoneCall,
  Target,
  TrendingUp,
  Clock,
  AlertCircle,
  PhoneOff,
  ShieldAlert,
  RefreshCw,
  UserCheck,
  CheckCircle,
  Briefcase,
  Layers,
  ArrowRight,
  UserX,
  Play
} from 'lucide-react';
import {
  fetchLeads,
  fetchStaffWorkloads,
  assignLeadHybrid,
  getCandidateDisplayName,
  isNewVisitorLead,
  type CRMLead,
  type CRMStaffMember
} from '../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';

export default function CRMDashboard() {
  const { user, roleKey } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [staffWorkloads, setStaffWorkloads] = useState<CRMStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const isSupervisor = Boolean(
    roleKey && ['team_leader', 'crm_manager', 'admin', 'super_admin'].includes(roleKey)
  );

  const [viewMode, setViewMode] = useState<'staff' | 'supervisor'>(isSupervisor ? 'supervisor' : 'staff');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, staffData] = await Promise.all([
        fetchLeads(),
        fetchStaffWorkloads()
      ]);
      setLeads(leadsData as CRMLead[]);
      setStaffWorkloads(staffData);
    } catch (err: any) {
      console.error('[CRMDashboard] Error loading dashboard data:', err);
      setError(err?.message || 'Failed to load CRM data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const now = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Filtered dataset for staff view
  const myLeads = useMemo(() => {
    if (!user?.id) return [];
    return leads.filter(l => l.lead_owner_id === user.id);
  }, [leads, user?.id]);

  const activeLeads = viewMode === 'staff' ? myLeads : leads;

  // ── Seven KPI Metrics Calculation ───────────────────────────
  // 1. Total unique Master Leads
  const totalCount = activeLeads.length;

  // 2. New Visitors (OTP Verified): verified OTP, no profile, no application
  const newVisitors = useMemo(() => activeLeads.filter(isNewVisitorLead), [activeLeads]);
  const newVisitorsCount = newVisitors.length;
  const newVisitorsTodayCount = useMemo(() => {
    return newVisitors.filter(l => {
      const vDate = l.otp_verified_at || l.created_at;
      return vDate && isSameDay(new Date(vDate), now);
    }).length;
  }, [newVisitors, now]);

  // 3. Unassigned Leads (Master leads with no assigned owner)
  const unassignedCount = leads.filter(l => !l.lead_owner_id).length;
  const assignedToMeCount = myLeads.length;

  // 4. Today's Follow-ups (Pending tasks due today)
  const followupsToday = activeLeads.filter(lead =>
    (lead.followups || []).some(
      f => f.status === 'Pending' && isSameDay(new Date(f.followup_date), now)
    )
  ).length;

  // 5. Overdue Follow-ups (Pending tasks past due time)
  const overdueCount = activeLeads.filter(lead =>
    (lead.followups || []).some(f => {
      if (f.status !== 'Pending') return false;
      const fDate = new Date(f.followup_date);
      return fDate < now && !isSameDay(fDate, now);
    })
  ).length;

  // 6. Incomplete Applications (Started but not submitted)
  const incompleteAppsCount = activeLeads.filter(l => {
    const isSubmitted = (l.applications || []).some(a => a.status === 'submitted') ||
      (l.interested_jobs || []).some(j => j.current_stage === 'Application Submitted') ||
      l.current_journey_stage === 'Application Submitted';
    if (isSubmitted) return false;
    return (l.applications || []).some(a => a.status === 'draft') ||
      (l.interested_jobs || []).some(j => j.current_stage === 'Application Started' || j.current_stage === 'Application Incomplete') ||
      l.current_journey_stage === 'Application Started' ||
      l.current_journey_stage === 'Application Incomplete';
  }).length;

  // 7. Submitted Applications (Successfully submitted)
  const submittedAppsCount = activeLeads.filter(l =>
    (l.applications || []).some(a => a.status === 'submitted') ||
    (l.interested_jobs || []).some(j => j.current_stage === 'Application Submitted') ||
    l.current_journey_stage === 'Application Submitted'
  ).length;

  // Overdue follow-up escalation list
  const overdueFollowupList = useMemo(() => {
    const list: Array<{ lead: CRMLead; followupDate: string; staffName: string }> = [];
    for (const lead of leads) {
      const overdue = lead.followups?.find(f => {
        if (f.status !== 'Pending') return false;
        const fDate = new Date(f.followup_date);
        return fDate < now && !isSameDay(fDate, now);
      });
      if (overdue) {
        list.push({
          lead,
          followupDate: overdue.followup_date,
          staffName: lead.owner?.full_name || 'Unassigned'
        });
      }
    }
    return list;
  }, [leads]);

  // Bulk Auto-Assign Handler
  const handleAutoAssignUnassigned = async () => {
    const unassignedLeads = leads.filter(l => !l.lead_owner_id);
    if (unassignedLeads.length === 0) return;

    setAutoAssigning(true);
    setAssignMessage(null);
    let assignedCount = 0;

    try {
      for (const lead of unassignedLeads) {
        const assignedId = await assignLeadHybrid(lead.id);
        if (assignedId) assignedCount++;
      }
      setAssignMessage(`Successfully assigned ${assignedCount} unassigned lead(s) via Hybrid Round-Robin.`);
      await loadData();
    } catch (err: any) {
      setAssignMessage(`Assignment error: ${err?.message || 'Failed to complete auto-assignment.'}`);
    } finally {
      setAutoAssigning(false);
      setTimeout(() => setAssignMessage(null), 5000);
    }
  };

  // ── Exactly Seven KPI Cards in Mandated Order ───────────────────
  const sevenKPICards = useMemo(() => [
    {
      id: 'total-leads',
      label: 'Total Leads',
      sublabel: viewMode === 'supervisor' ? 'Unique Master Leads' : 'My Assigned Leads',
      value: viewMode === 'supervisor' ? totalCount : myLeads.length,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200/90',
      linkTo: viewMode === 'supervisor' ? '/crm/leads' : '/crm/leads?filter=Assigned To Me',
    },
    {
      id: 'new-visitors',
      label: 'New Visitors (OTP Verified)',
      sublabel: newVisitorsTodayCount > 0 ? `+${newVisitorsTodayCount} verified today` : 'Verified OTP • No app yet',
      value: newVisitorsCount,
      todayCount: newVisitorsTodayCount,
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200/90',
      linkTo: '/crm/visitors',
      todayLinkTo: '/crm/visitors?date=today',
    },
    {
      id: 'unassigned-leads',
      label: 'Unassigned Leads',
      sublabel: 'Awaiting team distribution',
      value: unassignedCount,
      icon: UserX,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200/90',
      linkTo: '/crm/leads?filter=Unassigned',
    },
    {
      id: 'todays-followups',
      label: "Today's Follow-ups",
      sublabel: viewMode === 'supervisor' ? 'Team tasks due today' : 'My tasks due today',
      value: followupsToday,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200/90',
      linkTo: '/crm/followups?tab=today',
    },
    {
      id: 'overdue-followups',
      label: 'Overdue Follow-ups',
      sublabel: 'Pending tasks past due time',
      value: overdueCount,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200/90',
      linkTo: '/crm/followups?tab=overdue',
    },
    {
      id: 'incomplete-apps',
      label: 'Incomplete Applications',
      sublabel: 'Started • Not submitted',
      value: incompleteAppsCount,
      icon: Layers,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200/90',
      linkTo: '/crm/leads?stage=Application Incomplete',
    },
    {
      id: 'submitted-apps',
      label: 'Submitted Applications',
      sublabel: 'Successfully submitted',
      value: submittedAppsCount,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/90',
      linkTo: '/crm/leads?stage=Application Submitted',
    },
  ], [
    viewMode,
    totalCount,
    myLeads.length,
    newVisitorsCount,
    newVisitorsTodayCount,
    unassignedCount,
    followupsToday,
    overdueCount,
    incompleteAppsCount,
    submittedAppsCount
  ]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-900 m-4 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-red-600" />
        <div>
          <h3 className="font-bold text-base">Error Loading CRM Overview</h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {viewMode === 'supervisor' ? 'Team Operations Overview' : 'My Daily CRM Workbench'}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {viewMode === 'supervisor'
              ? 'Real-time team workload, assignment balancing, and overdue escalations.'
              : 'Focus on your assigned candidates, follow-ups due today, and priority calls.'}
          </p>
        </div>

        {isSupervisor && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('staff')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'staff'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Work ({assignedToMeCount})
            </button>
            <button
              onClick={() => setViewMode('supervisor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'supervisor'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Overview
            </button>
          </div>
        )}
      </div>

      {assignMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl font-medium flex items-center justify-between">
          <span>{assignMessage}</span>
          <button onClick={() => setAssignMessage(null)} className="text-xs text-blue-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Exactly Seven KPI Cards in Mandated Order */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {sevenKPICards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              to={stat.linkTo}
              key={stat.id}
              className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                {stat.id === 'new-visitors' && stat.todayCount !== undefined && stat.todayCount > 0 && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    title={`${stat.todayCount} verified today`}
                  >
                    +{stat.todayCount} today
                  </span>
                )}
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight line-clamp-1 group-hover:text-slate-600 transition-colors">
                  {stat.label}
                </span>
                <span className="block text-2xl font-bold text-slate-900 leading-none">
                  {stat.value}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                  {stat.sublabel}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* SUPERVISOR VIEW SPECIFIC SECTION: Team Workload & Unassigned Leads */}
      {viewMode === 'supervisor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Workload Balancer */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" /> Staff Workload Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hybrid Round-Robin limit: 50 active leads per staff member
                </p>
              </div>
              {unassignedCount > 0 && (
                <button
                  onClick={handleAutoAssignUnassigned}
                  disabled={autoAssigning}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  {autoAssigning ? 'Distributing...' : `Auto-Assign (${unassignedCount})`}
                </button>
              )}
            </div>

            <div className="space-y-3.5">
              {staffWorkloads.map(staff => {
                const count = staff.active_lead_count || 0;
                const percentage = Math.min(100, Math.round((count / 50) * 100));
                const isOverloaded = count >= 50;

                return (
                  <div key={staff.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold">{staff.full_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700">
                          {staff.role_name}
                        </span>
                      </div>
                      <span className={isOverloaded ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {count} / 50 leads ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isOverloaded ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {staffWorkloads.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No active CRM staff profiles detected.
                </div>
              )}
            </div>
          </div>

          {/* Quick Supervisor Action Box */}
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Assignment Radar</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {unassignedCount} Unassigned
                </span>
              </div>
              <h4 className="text-lg font-bold mb-2">Unassigned Queue</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Candidates waiting for personal telecaller follow-up. Click below to distribute evenly using workload balancing.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleAutoAssignUnassigned}
                disabled={autoAssigning || unassignedCount === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                {autoAssigning ? 'Distributing Leads...' : 'Auto-Assign Unassigned'}
              </button>
              <Link
                to="/crm/leads?filter=Unassigned"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-colors text-center block"
              >
                Inspect Unassigned Queue
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SUPERVISOR VIEW: Overdue Escalations Table */}
      {viewMode === 'supervisor' && overdueFollowupList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Overdue Follow-up Escalation Queue ({overdueFollowupList.length})</span>
            </div>
            <Link
              to="/crm/leads?filter=Overdue Follow-ups"
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              View All Overdue
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {overdueFollowupList.slice(0, 5).map(({ lead, followupDate, staffName }) => (
              <div key={lead.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <Link
                    to={`/crm/leads/${lead.id}`}
                    className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {getCandidateDisplayName(lead)}
                  </Link>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {lead.mobile_number} • Assigned to: <span className="font-semibold">{staffName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-rose-600 font-semibold text-[11px]">
                    Due: {new Date(followupDate).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/crm/leads/${lead.id}`}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leads & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              {viewMode === 'staff' ? 'My Recent Leads' : 'Recent Recruitment Leads'}
            </h3>
            <Link
              to={viewMode === 'staff' ? '/crm/leads?filter=Assigned To Me' : '/crm/leads'}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                    {getCandidateDisplayName(lead).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link
                      to={`/crm/leads/${lead.id}`}
                      className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors"
                    >
                      {getCandidateDisplayName(lead)}
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lead.mobile_number} • {lead.district || lead.state}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {lead.current_journey_stage || 'OTP Verified'}
                  </span>
                  <p className="text-[11px] font-semibold text-emerald-600">{lead.lead_score} pts</p>
                </div>
              </div>
            ))}

            {activeLeads.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active leads found in this view.
              </div>
            )}
          </div>
        </div>

        {/* Telecaller Quick Outreach Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dialer Action</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Ready
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Today's Call Schedule</h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              You have <span className="font-bold text-blue-600">{followupsToday}</span> follow-up(s) scheduled for today.
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/crm/followups?tab=today"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Start Calling Queue
            </Link>
            <Link
              to="/crm/leads"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors text-center block"
            >
              Browse All Leads
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
