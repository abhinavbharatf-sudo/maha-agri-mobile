import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  UserCheck,
  MessagesSquare,
  CheckCircle,
  X,
  Filter,
  RotateCcw,
  User,
  Briefcase,
  AlertTriangle,
  CalendarClock,
  ArrowLeft
} from 'lucide-react';
import {
  fetchLeads,
  fetchEligibleStaff,
  reassignLead,
  assignLeadHybrid,
  logCall,
  scheduleFollowUp,
  getCandidateDisplayName,
  formatPhoneDisplay,
  formatTimestampIST,
  isNewVisitorLead,
  type CRMLead,
  type CRMStaffMember
} from '../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';

export interface LeadListProps {
  initialView?: 'all' | 'visitors' | 'followups';
}

const JOURNEY_STAGES = [
  'OTP Verified',
  'Job Viewed',
  'Application Started',
  'Profile Incomplete',
  'Profile Completed',
  'Application Incomplete',
  'Application Submitted',
];

export default function LeadList({ initialView }: LeadListProps) {
  const { user, roleKey } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active view mode: route takes precedence, then searchParam, then prop, default to 'all'
  const activeView = useMemo<'all' | 'visitors' | 'followups'>(() => {
    if (location.pathname === '/crm/visitors') return 'visitors';
    if (location.pathname === '/crm/followups') return 'followups';
    if (searchParams.get('view') === 'visitors') return 'visitors';
    if (searchParams.get('view') === 'followups') return 'followups';
    if (initialView) return initialView;
    return 'all';
  }, [location.pathname, searchParams, initialView]);

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [eligibleStaff, setEligibleStaff] = useState<CRMStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [followupFilter, setFollowupFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Follow-up specific sub-tab filter
  const [followupSubTab, setFollowupSubTab] = useState<'all' | 'today' | 'overdue' | 'callbacks'>('all');
  // Visitor specific sub-tab filter
  const [visitorDateFilter, setVisitorDateFilter] = useState<'all' | 'today'>('all');

  // Reassignment Modal State
  const [reassignModalLead, setReassignModalLead] = useState<CRMLead | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Quick Call Modal State
  const [callModalLead, setCallModalLead] = useState<CRMLead | null>(null);
  const [callStatus, setCallStatus] = useState('Connected');
  const [callDisposition, setCallDisposition] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [callLogging, setCallLogging] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const isSupervisor = Boolean(
    roleKey && ['team_leader', 'crm_manager', 'admin', 'super_admin'].includes(roleKey)
  );

  // Auto-Assignment State
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignNotice, setAutoAssignNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const unassignedCount = useMemo(() => {
    return leads.filter(l => !l.lead_owner_id).length;
  }, [leads]);

  const handleAutoAssignUnassigned = async () => {
    if (autoAssigning || unassignedCount === 0) return;
    setAutoAssigning(true);
    setAutoAssignNotice(null);
    try {
      const unassigned = leads.filter(l => !l.lead_owner_id);
      let successCount = 0;
      for (const lead of unassigned) {
        const assignedId = await assignLeadHybrid(lead.id);
        if (assignedId) successCount++;
      }
      setAutoAssignNotice({
        type: 'success',
        text: `Successfully distributed ${successCount} lead(s) using Hybrid Round-Robin.`,
      });
      await loadData();
    } catch (err: any) {
      setAutoAssignNotice({
        type: 'error',
        text: err?.message || 'Failed to auto-assign leads.',
      });
    } finally {
      setAutoAssigning(false);
      setTimeout(() => setAutoAssignNotice(null), 6000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, staffData] = await Promise.all([
        fetchLeads(),
        fetchEligibleStaff()
      ]);
      setLeads(leadsData as CRMLead[]);
      setEligibleStaff(staffData);
    } catch (err: any) {
      console.error('Error fetching CRM data:', err);
      setError(err?.message || 'Failed to load leads from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Handle URL query parameter pre-selection
  useEffect(() => {
    // 1. Stage parameter
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      if (stageParam === 'OTP Verified' || stageParam === 'Visitor — OTP Verified') {
        setStageFilter('OTP Verified');
      } else if (stageParam === 'Job Details Viewed' || stageParam === 'Job Viewed') {
        setStageFilter('Job Viewed');
      } else if (stageParam === 'Profile Incomplete' || stageParam === 'Profile Started') {
        setStageFilter('Profile Incomplete');
      } else if (stageParam === 'Profile Completed' || stageParam === 'Profile Complete') {
        setStageFilter('Profile Completed');
      } else if (stageParam === 'Application Started') {
        setStageFilter('Application Started');
      } else if (stageParam === 'Application Incomplete') {
        setStageFilter('Application Incomplete');
      } else if (stageParam === 'Application Submitted') {
        setStageFilter('Application Submitted');
      }
    }

    // 2. Generic filter parameter
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      if (filterParam === 'Unassigned') {
        setStaffFilter('Unassigned');
      } else if (filterParam === 'Assigned To Me') {
        setStaffFilter('Assigned To Me');
      } else if (filterParam === 'Follow-up Due Today') {
        setFollowupFilter('Due Today');
      } else if (filterParam === 'Overdue Follow-ups') {
        setFollowupFilter('Overdue');
      } else if (filterParam === 'Application Incomplete') {
        setStageFilter('Application Incomplete');
      } else if (filterParam === 'Application Submitted') {
        setStageFilter('Application Submitted');
      } else if (filterParam === 'OTP Verified') {
        setStageFilter('OTP Verified');
      }
    }

    // 3. Staff parameter
    const staffParam = searchParams.get('staff');
    if (staffParam) {
      if (staffParam === 'Unassigned') {
        setStaffFilter('Unassigned');
      } else if (staffParam === 'Assigned To Me') {
        setStaffFilter('Assigned To Me');
      } else {
        setStaffFilter(staffParam);
      }
    }

    // 4. Tab parameter for follow-ups
    const tabParam = searchParams.get('tab');
    if (tabParam === 'today') {
      setFollowupSubTab('today');
    } else if (tabParam === 'overdue') {
      setFollowupSubTab('overdue');
    } else if (tabParam === 'callbacks') {
      setFollowupSubTab('callbacks');
    } else if (tabParam === 'all') {
      setFollowupSubTab('all');
    }

    // 5. Date parameter for visitors
    const dateParam = searchParams.get('date');
    if (dateParam === 'today') {
      setVisitorDateFilter('today');
    } else if (dateParam === 'all') {
      setVisitorDateFilter('all');
    }
  }, [searchParams]);

  // Extract unique districts present in current dataset
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.district?.trim()) set.add(l.district.trim());
      l.applications?.forEach(a => {
        if (a.preferred_district?.trim()) set.add(a.preferred_district.trim());
      });
    });
    return Array.from(set).sort();
  }, [leads]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStageFilter('All');
    setFollowupFilter('All');
    setStaffFilter('All');
    setDistrictFilter('All');
    setPriorityFilter('All');
    setFollowupSubTab('all');
    setVisitorDateFilter('all');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    stageFilter !== 'All' ||
    followupFilter !== 'All' ||
    staffFilter !== 'All' ||
    districtFilter !== 'All' ||
    priorityFilter !== 'All' ||
    (activeView === 'followups' && followupSubTab !== 'all') ||
    (activeView === 'visitors' && visitorDateFilter !== 'all') ||
    searchParams.get('stage') ||
    searchParams.get('filter') ||
    searchParams.get('staff') ||
    searchParams.get('date') ||
    searchParams.get('tab')
  );

  // Handle Reassignment Submission
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalLead || !user?.id) return;
    if (!selectedStaffId) {
      setReassignError('Please select a target staff member.');
      return;
    }
    if (!reassignReason.trim()) {
      setReassignError('A mandatory reason is required for lead reassignment.');
      return;
    }

    setReassignLoading(true);
    setReassignError(null);
    try {
      const res = await reassignLead(
        reassignModalLead.id,
        selectedStaffId,
        reassignReason.trim(),
        user.id
      );
      if (!res.success) {
        setReassignError(res.error || 'Failed to reassign lead.');
        return;
      }
      setReassignModalLead(null);
      setSelectedStaffId('');
      setReassignReason('');
      await loadData();
    } catch (err: any) {
      setReassignError(err?.message || 'Reassignment request failed.');
    } finally {
      setReassignLoading(false);
    }
  };

  // Handle Quick Call Log Submission
  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callModalLead || !user?.id) return;
    if (!callNotes.trim()) {
      setCallError('Please provide notes for this call.');
      return;
    }

    setCallLogging(true);
    setCallError(null);
    try {
      await logCall(
        callModalLead.id,
        user.id,
        callStatus,
        callDisposition,
        callNotes.trim(),
        nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null
      );

      if (nextFollowupDate) {
        await scheduleFollowUp(
          callModalLead.id,
          new Date(nextFollowupDate).toISOString(),
          'Call',
          `Follow-up from call disposition: ${callDisposition}`,
          null,
          user.id
        );
      }

      setCallModalLead(null);
      setCallNotes('');
      setNextFollowupDate('');
      await loadData();
    } catch (err: any) {
      setCallError(err?.message || 'Failed to log call.');
    } finally {
      setCallLogging(false);
    }
  };

  // Filter Pipeline
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    return leads.filter(lead => {
      // 1. Primary Section Scope
      if (activeView === 'visitors') {
        // Visitor View: Confirmed OTP visitors who have NOT progressed beyond visitor stage
        if (!isNewVisitorLead(lead)) {
          return false;
        }
        if (visitorDateFilter === 'today') {
          const vDate = lead.otp_verified_at || lead.created_at;
          if (!vDate || !isSameDay(new Date(vDate), now)) return false;
        }
      } else if (activeView === 'followups') {
        // Follow-ups View: Leads with pending follow-up tasks
        const pendingFollowups = (lead.followups || []).filter(f => f.status === 'Pending');
        if (pendingFollowups.length === 0) return false;

        if (followupSubTab === 'today') {
          const hasToday = pendingFollowups.some(f => isSameDay(new Date(f.followup_date), now));
          if (!hasToday) return false;
        } else if (followupSubTab === 'overdue') {
          const hasOverdue = pendingFollowups.some(f => {
            const fDate = new Date(f.followup_date);
            return fDate < now && !isSameDay(fDate, now);
          });
          if (!hasOverdue) return false;
        } else if (followupSubTab === 'callbacks') {
          const hasCallback = pendingFollowups.some(
            f => f.followup_type === 'Call' || f.followup_type.toLowerCase() === 'callback'
          );
          if (!hasCallback) return false;
        }
      }

      // 2. Global Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = getCandidateDisplayName(lead).toLowerCase().includes(q) ||
          `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(q);
        const matchesMobile = lead.mobile_number.includes(q);
        const matchesAltMobile = Boolean(lead.alternate_mobile_number?.includes(q));
        const matchesEmail = Boolean(lead.email?.toLowerCase().includes(q));
        const matchesDistrict = Boolean(lead.district?.toLowerCase().includes(q));
        const matchesId = lead.internal_candidate_id.toLowerCase().includes(q);
        const matchesTaluka = Boolean(lead.candidate_profile?.taluka?.toLowerCase().includes(q));
        const matchesAppTaluka = Boolean(lead.applications?.[0]?.preferred_location?.toLowerCase().includes(q));

        if (!matchesName && !matchesMobile && !matchesAltMobile && !matchesEmail && !matchesDistrict && !matchesId && !matchesTaluka && !matchesAppTaluka)
          return false;
      }

      // 3. Journey Stage Filter (All Leads View)
      if (activeView === 'all' && stageFilter !== 'All') {
        const currentStage = lead.current_journey_stage || 'OTP Verified';
        const isSubmitted = (lead.applications || []).some(a => a.status === 'submitted');
        const isDraft = (lead.applications || []).some(a => a.status === 'draft');
        const isProfileComplete = lead.candidate_profile?.profile_complete === true;

        switch (stageFilter) {
          case 'OTP Verified':
            if (currentStage !== 'OTP Verified' || isProfileComplete || isSubmitted || isDraft) return false;
            break;
          case 'Job Viewed':
            if (currentStage !== 'Job Viewed') return false;
            break;
          case 'Application Started':
            if (currentStage !== 'Application Started' && !isDraft) return false;
            break;
          case 'Profile Incomplete':
            if (isSubmitted || isProfileComplete || (currentStage !== 'Profile Incomplete' && currentStage !== 'Profile Started'))
              return false;
            break;
          case 'Profile Completed':
            if (!isProfileComplete && currentStage !== 'Profile Complete' && currentStage !== 'Profile Completed')
              return false;
            break;
          case 'Application Incomplete':
            if (isSubmitted || (!isDraft && currentStage !== 'Application Started' && currentStage !== 'Application Incomplete')) return false;
            break;
          case 'Application Submitted':
            if (!isSubmitted && currentStage !== 'Application Submitted') return false;
            break;
          default:
            break;
        }
      }

      // 4. Follow-up Filter
      if (followupFilter !== 'All') {
        const pending = (lead.followups || []).filter(f => f.status === 'Pending');
        switch (followupFilter) {
          case 'Due Today':
            if (!pending.some(f => isSameDay(new Date(f.followup_date), now))) return false;
            break;
          case 'Overdue':
            if (!pending.some(f => new Date(f.followup_date) < now && !isSameDay(new Date(f.followup_date), now)))
              return false;
            break;
          case 'Callbacks':
            if (!pending.some(f => f.followup_type === 'Call' || f.followup_type.toLowerCase() === 'callback'))
              return false;
            break;
          case 'No Follow-up':
            if (pending.length > 0) return false;
            break;
          default:
            break;
        }
      }

      // 5. Assigned Staff Filter
      if (staffFilter !== 'All') {
        if (staffFilter === 'Assigned To Me') {
          if (!user?.id || lead.lead_owner_id !== user.id) return false;
        } else if (staffFilter === 'Unassigned') {
          if (lead.lead_owner_id) return false;
        } else {
          if (lead.lead_owner_id !== staffFilter) return false;
        }
      }

      // 6. District Filter
      if (districtFilter !== 'All') {
        const matchLeadDistrict = lead.district?.toLowerCase() === districtFilter.toLowerCase();
        const matchAppDistrict = (lead.applications || []).some(
          a => a.preferred_district?.toLowerCase() === districtFilter.toLowerCase()
        );
        if (!matchLeadDistrict && !matchAppDistrict) return false;
      }

      // 7. Priority Filter
      if (priorityFilter !== 'All') {
        if (priorityFilter === 'High' && lead.priority !== 'High') return false;
        if (priorityFilter === 'Medium / Low' && lead.priority === 'High') return false;
      }

      return true;
    });
  }, [
    leads,
    activeView,
    followupSubTab,
    visitorDateFilter,
    searchTerm,
    stageFilter,
    followupFilter,
    staffFilter,
    districtFilter,
    priorityFilter,
    user?.id
  ]);

  // Stage Badge Visual Formatter
  const renderStageTag = (stage: string) => {
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
    if (stage === 'Application Submitted') {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (stage === 'Application Started' || stage === 'Application Incomplete') {
      colorClasses = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (stage === 'Profile Complete' || stage === 'Profile Completed') {
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
    } else if (stage === 'Profile Incomplete' || stage === 'Profile Started') {
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (stage === 'Job Viewed' || stage === 'Job Details Viewed') {
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
    } else if (stage === 'OTP Verified') {
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${colorClasses}`}>
        {stage}
      </span>
    );
  };

  // Scope count specific to active view
  const totalScopeCount = useMemo(() => {
    if (activeView === 'visitors') {
      const visitorLeads = leads.filter(isNewVisitorLead);
      if (visitorDateFilter === 'today') {
        const now = new Date();
        const isSameDay = (d1: Date, d2: Date) =>
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();
        return visitorLeads.filter(l => {
          const vDate = l.otp_verified_at || l.created_at;
          return vDate && isSameDay(new Date(vDate), now);
        }).length;
      }
      return visitorLeads.length;
    }
    if (activeView === 'followups') {
      return leads.reduce((acc, l) => acc + (l.followups || []).filter(f => f.status === 'Pending').length, 0);
    }
    return leads.length;
  }, [activeView, leads, visitorDateFilter]);

  // Counts for Visitor Sub-Tabs
  const visitorCounts = useMemo(() => {
    const allVisitors = leads.filter(isNewVisitorLead);
    const now = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    const todayVisitors = allVisitors.filter(l => {
      const vDate = l.otp_verified_at || l.created_at;
      return vDate && isSameDay(new Date(vDate), now);
    });
    return { all: allVisitors.length, today: todayVisitors.length };
  }, [leads]);

  // Section Header Data
  const sectionMeta = useMemo(() => {
    if (activeView === 'visitors') {
      return {
        title: 'Visitor Leads — OTP Verified',
        subtitle: 'Verified mobile visitors who have not yet started their candidate profile or job application.',
        countLabel: 'Visitors',
      };
    }
    if (activeView === 'followups') {
      return {
        title: 'Follow-up Management & Callbacks',
        subtitle: 'Active follow-up queue, scheduled candidate calls, and pending tasks due today or overdue.',
        countLabel: 'Tasks Due',
      };
    }
    return {
      title: 'Master Recruitment Leads',
      subtitle: 'Unified lead directory tracking verified identity, progression stages, and team outreach.',
      countLabel: 'Leads',
    };
  }, [activeView]);

  return (
    <div className="space-y-4">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/crm/dashboard"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all group"
              title="Return to CRM Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {sectionMeta.title}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            {sectionMeta.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors shadow-xs"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Filters</span>
            </button>
          )}

          {isSupervisor && unassignedCount > 0 && (
            <button
              onClick={handleAutoAssignUnassigned}
              disabled={autoAssigning || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
              title="Distribute unassigned leads among active staff using Hybrid Round-Robin"
            >
              <UserCheck className={`w-3.5 h-3.5 ${autoAssigning ? 'animate-spin' : ''}`} />
              <span>{autoAssigning ? 'Assigning...' : `Auto-Assign (${unassignedCount})`}</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors shadow-xs"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Auto-Assignment Notice ─────────────────────────────────── */}
      {autoAssignNotice && (
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border ${
            autoAssignNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {autoAssignNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{autoAssignNotice.text}</span>
          </div>
          <button
            onClick={() => setAutoAssignNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Visitor Sub-Tabs (Only in Visitors View) ─────────────── */}
      {activeView === 'visitors' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 'all', label: `All Visitors (${visitorCounts.all})` },
            { id: 'today', label: `Verified Today (${visitorCounts.today})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setVisitorDateFilter(tab.id as any);
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  if (tab.id === 'all') next.delete('date');
                  else next.set('date', tab.id);
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                visitorDateFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Follow-ups Sub-Tabs (Only in Follow-ups View) ─────────── */}
      {activeView === 'followups' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 'all', label: 'All Pending' },
            { id: 'today', label: 'Due Today' },
            { id: 'overdue', label: 'Overdue Alerts' },
            { id: 'callbacks', label: 'Callbacks' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFollowupSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                followupSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Compact Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* 1. Global Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, mobile, candidate ID, taluka..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Journey Stage (Hidden in Visitor view since visitor view is dedicated) */}
          {activeView === 'all' && (
            <div>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="w-full py-2 px-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-slate-700"
              >
                <option value="All">All Journey Stages</option>
                {JOURNEY_STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Follow-up Status (Hidden in follow-up view) */}
          {activeView === 'all' && (
            <div>
              <select
                value={followupFilter}
                onChange={e => setFollowupFilter(e.target.value)}
                className="w-full py-2 px-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-slate-700"
              >
                <option value="All">All Follow-ups</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue Alerts</option>
                <option value="Callbacks">Callbacks Requested</option>
                <option value="No Follow-up">No Follow-up Scheduled</option>
              </select>
            </div>
          )}

          {/* 4. Assigned Staff */}
          <div>
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="w-full py-2 px-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-slate-700"
            >
              <option value="All">All Staff</option>
              <option value="Assigned To Me">Assigned To Me</option>
              <option value="Unassigned">Unassigned Leads</option>
              {eligibleStaff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          {/* 5. District Filter */}
          {availableDistricts.length > 0 && activeView === 'all' && (
            <div>
              <select
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
                className="w-full py-2 px-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-slate-700"
              >
                <option value="All">All Districts</option>
                {availableDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-800 font-bold">{filteredLeads.length}</strong> {sectionMeta.countLabel.toLowerCase()}
            {totalScopeCount > 0 && totalScopeCount !== filteredLeads.length && (
              <span className="text-slate-400 ml-1">
                (Total in queue: {totalScopeCount})
              </span>
            )}
            {activeView === 'all' && totalScopeCount > 0 && totalScopeCount === filteredLeads.length && (
              <span className="text-slate-400 ml-1">
                (Total: {totalScopeCount})
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-medium text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading candidate data...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600 space-y-2">
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-1.5">
            <p className="text-sm font-semibold text-slate-700">No records found</p>
            <p className="text-xs text-slate-400">
              {activeView === 'visitors'
                ? 'All verified candidates have successfully progressed into candidate profiles or job applications.'
                : activeView === 'followups'
                ? 'No follow-up tasks match this filter. All scheduled actions are clear.'
                : 'No candidate leads match your active filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1050px] xl:min-w-[1200px]">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 min-w-[240px]">Candidate Identity</th>
                    <th className="px-3.5 py-3 min-w-[220px]">WhatsApp & Contact</th>
                    {activeView !== 'visitors' && (
                      <th className="px-3.5 py-3 min-w-[125px]">Journey Stage</th>
                    )}
                    {activeView === 'visitors' ? (
                      <th className="px-3.5 py-3 min-w-[160px]">OTP Verified At</th>
                    ) : (
                      <>
                        <th className="px-3.5 py-3 min-w-[170px]">Applied Job & Taluka</th>
                        <th className="px-3.5 py-3 min-w-[175px]">Registered / Verified</th>
                      </>
                    )}
                    <th className="px-3.5 py-3 min-w-[125px]">Assigned Staff</th>
                    {activeView === 'followups' ? (
                      <th className="px-3.5 py-3 min-w-[160px]">Follow-up Schedule</th>
                    ) : (
                      <th className="px-3.5 py-3 min-w-[125px]">Next Follow-up</th>
                    )}
                    <th className="px-3.5 py-3 min-w-[110px] text-right">Quick Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(lead => {
                    const displayName = getCandidateDisplayName(lead);
                    const hasRealName = Boolean(
                      lead.candidate_profile?.full_name?.trim() || lead.first_name?.trim()
                    );
                    const hasProfileRecord = Boolean(lead.candidate_profile && (lead.candidate_profile.id || lead.candidate_profile.full_name));
                    const isProfileComplete = lead.candidate_profile?.profile_complete === true;
                    const primaryApp = lead.applications?.[0];
                    const viewedJob = lead.interested_jobs?.[0];
                    const appliedTaluka = primaryApp?.preferred_location?.trim() || 'All Talukas';
                    const appliedDistrict = primaryApp?.preferred_district || lead.district || 'District';

                    const stage = lead.current_journey_stage || 'OTP Verified';
                    const nextFollowup = lead.next_followup;
                    const isOverdue = nextFollowup && new Date(nextFollowup.followup_date) < new Date();

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* 1. Candidate Identity */}
                        <td className="px-3.5 py-3 align-top whitespace-normal">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              hasRealName ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {hasRealName ? displayName.charAt(0).toUpperCase() : 'V'}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              {hasRealName ? (
                                <Link
                                  to={`/crm/leads/${lead.id}`}
                                  className="font-bold text-slate-900 text-xs hover:text-blue-600 block leading-tight truncate"
                                  title={displayName}
                                >
                                  {displayName}
                                </Link>
                              ) : (
                                <Link
                                  to={`/crm/leads/${lead.id}`}
                                  className="text-slate-500 italic font-semibold text-xs hover:text-blue-600 block leading-tight truncate"
                                >
                                  Visitor Lead (Name pending)
                                </Link>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  {lead.internal_candidate_id}
                                </span>
                                {hasProfileRecord ? (
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                    isProfileComplete
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    Visitor (No Profile)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. WhatsApp & Contact (Single-line nowrap phone display) */}
                        <td className="px-3.5 py-3 align-top whitespace-normal">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-20 shrink-0">WhatsApp:</span>
                              <a
                                href={`https://wa.me/91${lead.mobile_number}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold whitespace-nowrap"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-mono text-xs">{formatPhoneDisplay(lead.mobile_number)}</span>
                              </a>
                            </div>
                            {lead.alternate_mobile_number ? (
                              <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
                                <span className="font-bold uppercase tracking-wider text-slate-400 w-20 shrink-0">Alt Mobile:</span>
                                <span className="text-slate-700 font-medium font-mono">{formatPhoneDisplay(lead.alternate_mobile_number)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic whitespace-nowrap">
                                <span className="font-bold uppercase tracking-wider text-slate-400 w-20 shrink-0">Alt Mobile:</span>
                                <span>None provided</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Journey Stage Tag (Hidden in Visitor view) */}
                        {activeView !== 'visitors' && (
                          <td className="px-3.5 py-3 align-top">
                            <div className="space-y-1">
                              {renderStageTag(stage)}
                              <div className="text-[10px] text-slate-400">
                                Score: <strong className="text-slate-700">{lead.lead_score ?? 10}</strong>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* 4. Applied Job & Location OR Visitor OTP Timestamp */}
                        {activeView === 'visitors' ? (
                          <td className="px-3.5 py-3 align-top whitespace-normal">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 text-[11px] whitespace-nowrap">
                                {formatTimestampIST(lead.otp_verified_at || lead.created_at)}
                              </div>
                              {viewedJob ? (
                                <div className="text-[10px] text-purple-700 flex items-center gap-1 font-medium">
                                  <span className="text-[9px] font-bold uppercase bg-purple-100 text-purple-800 px-1 py-0.2 rounded shrink-0">Viewed</span>
                                  <span className="truncate max-w-[170px]">{viewedJob.job?.title || 'Job Opening'}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">
                                  Browsing Portal (No jobs viewed)
                                </div>
                              )}
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="px-3.5 py-3 align-top whitespace-normal">
                              {primaryApp ? (
                                <div className="space-y-0.5 max-w-[190px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded shrink-0">Applied</span>
                                    <span className="font-semibold text-slate-900 truncate" title={primaryApp.job_title}>
                                      {primaryApp.job_title}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                    <span>{appliedTaluka} • {appliedDistrict}</span>
                                  </div>
                                  {(lead.applications?.length || 0) > 1 && (
                                    <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 px-1 rounded font-medium">
                                      +{lead.applications!.length - 1} more application(s)
                                    </span>
                                  )}
                                </div>
                              ) : viewedJob ? (
                                <div className="space-y-0.5 max-w-[190px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase bg-purple-100 text-purple-800 px-1 py-0.2 rounded shrink-0">Viewed</span>
                                    <span className="font-semibold text-purple-900 truncate" title={viewedJob.job?.title || 'Job Opening'}>
                                      {viewedJob.job?.title || 'Job Opening'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-purple-700">
                                    Interest recorded • Not yet applied
                                  </div>
                                  {(lead.interested_jobs?.length || 0) > 1 && (
                                    <span className="inline-block text-[9px] bg-purple-50 text-purple-700 px-1 rounded font-medium">
                                      +{lead.interested_jobs!.length - 1} more position(s) viewed
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-slate-400 italic text-[11px]">
                                  Browsing Portal (No jobs viewed)
                                </div>
                              )}
                            </td>

                            {/* Registered On / OTP Verified At Timestamp Column */}
                            <td className="px-3.5 py-3 align-top whitespace-normal">
                              <div className="space-y-1">
                                {isNewVisitorLead(lead) ? (
                                  <div>
                                    <span className="text-[9px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                      OTP Verified At
                                    </span>
                                    <p className="font-semibold text-slate-800 text-[11px] whitespace-nowrap mt-0.5">
                                      {formatTimestampIST(lead.otp_verified_at || lead.created_at)}
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      Registered On
                                    </span>
                                    <p className="font-semibold text-slate-800 text-[11px] whitespace-nowrap mt-0.5">
                                      {formatTimestampIST(lead.created_at)}
                                    </p>
                                    {lead.otp_verified_at && lead.otp_verified_at !== lead.created_at && (
                                      <p className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                                        OTP: {formatTimestampIST(lead.otp_verified_at)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </>
                        )}

                        {/* 5. Assigned Staff */}
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <UserCheck className={`w-3 h-3 ${lead.lead_owner_id ? 'text-blue-600' : 'text-slate-300'}`} />
                              <span>{lead.owner?.full_name || 'Unassigned'}</span>
                            </div>
                            {isSupervisor && (
                              <button
                                onClick={() => {
                                  setReassignModalLead(lead);
                                  setSelectedStaffId(lead.lead_owner_id || '');
                                  setReassignReason('');
                                  setReassignError(null);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                {lead.lead_owner_id ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Follow-up / Status */}
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-0.5">
                            {nextFollowup ? (
                              <div className="flex items-center gap-1 font-semibold">
                                <Clock className={`w-3 h-3 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`} />
                                <span className={isOverdue ? 'text-red-700 font-bold' : 'text-slate-700'}>
                                  {new Date(nextFollowup.followup_date).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {isOverdue && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold uppercase">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No follow-up set</span>
                            )}
                            <div className="text-[10px] text-slate-500">
                              Last Call: <span className="font-medium text-slate-700">{lead.latest_call?.call_disposition || 'None'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 7. Quick Actions */}
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setCallModalLead(lead);
                                setCallNotes('');
                                setNextFollowupDate('');
                                setCallError(null);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Quick Log Call"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <a
                              href={`https://wa.me/91${lead.mobile_number}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessagesSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                            <Link
                              to={`/crm/leads/${lead.id}`}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 font-bold text-[11px] text-slate-700 transition-colors ml-0.5"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredLeads.map(lead => {
                const displayName = getCandidateDisplayName(lead);
                const hasRealName = Boolean(
                  lead.candidate_profile?.full_name?.trim() || lead.first_name?.trim()
                );
                const primaryApp = lead.applications?.[0];
                const viewedJob = lead.interested_jobs?.[0];
                const stage = lead.current_journey_stage || 'OTP Verified';
                const nextFollowup = lead.next_followup;
                const isOverdue = nextFollowup && new Date(nextFollowup.followup_date) < new Date();

                return (
                  <div key={lead.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/crm/leads/${lead.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 block"
                        >
                          {hasRealName ? displayName : 'Visitor Lead (Name pending)'}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1 rounded">
                            {lead.internal_candidate_id}
                          </span>
                          <span>•</span>
                          <a
                            href={`https://wa.me/91${lead.mobile_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-emerald-700 flex items-center gap-1 whitespace-nowrap"
                          >
                            <Phone className="w-3 h-3" />
                            <span className="font-mono">{formatPhoneDisplay(lead.mobile_number)}</span>
                          </a>
                        </div>
                        {lead.alternate_mobile_number && (
                          <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap font-mono">
                            Alt: {formatPhoneDisplay(lead.alternate_mobile_number)}
                          </div>
                        )}
                      </div>
                      <div>{renderStageTag(stage)}</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
                      {primaryApp ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded shrink-0">Applied</span>
                          <span className="truncate">{primaryApp.job_title}</span>
                        </div>
                      ) : viewedJob ? (
                        <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                          <span className="text-[9px] font-bold uppercase bg-purple-100 text-purple-800 px-1 py-0.2 rounded shrink-0">Viewed</span>
                          <span className="truncate">{viewedJob.job?.title || 'Job Opening'}</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">Browsing Portal (No jobs viewed)</div>
                      )}
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Staff: <strong className="text-slate-700">{lead.owner?.full_name || 'Unassigned'}</strong></span>
                        {nextFollowup && (
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600 font-medium'}>
                            {isOverdue ? 'Overdue' : 'Due'}: {new Date(nextFollowup.followup_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>{isNewVisitorLead(lead) ? 'OTP Verified At:' : 'Registered On:'}</span>
                        <span className="font-semibold text-slate-700">
                          {formatTimestampIST(isNewVisitorLead(lead) ? (lead.otp_verified_at || lead.created_at) : lead.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCallModalLead(lead);
                            setCallNotes('');
                            setNextFollowupDate('');
                            setCallError(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200"
                        >
                          Log Call
                        </button>
                        <a
                          href={`https://wa.me/91${lead.mobile_number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md"
                        >
                          WhatsApp
                        </a>
                      </div>
                      <Link
                        to={`/crm/leads/${lead.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                      >
                        View Record <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── REASSIGN LEAD MODAL ─────────────────────────────────────── */}
      {reassignModalLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Assign / Reassign Lead</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: {getCandidateDisplayName(reassignModalLead)} ({reassignModalLead.internal_candidate_id})
                </p>
              </div>
              <button
                onClick={() => setReassignModalLead(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reassignError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {reassignError}
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Staff Member *
                </label>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white"
                  required
                >
                  <option value="">Select staff telecaller / manager...</option>
                  {eligibleStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for Reassignment *
                </label>
                <textarea
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="State operational reason for transfer..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 h-20 resize-none bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignLoading}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {reassignLoading ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK LOG CALL MODAL ────────────────────────────────────── */}
      {callModalLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Quick Call Disposition</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calling: {getCandidateDisplayName(callModalLead)} ({callModalLead.mobile_number})
                </p>
              </div>
              <button
                onClick={() => setCallModalLead(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {callError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {callError}
              </div>
            )}

            <form onSubmit={handleCallSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={callStatus}
                    onChange={e => setCallStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50"
                  >
                    <option>Connected</option>
                    <option>No Answer</option>
                    <option>Busy</option>
                    <option>Wrong Number</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Outcome</label>
                  <select
                    value={callDisposition}
                    onChange={e => setCallDisposition(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50"
                  >
                    <option>Interested</option>
                    <option>Callback Requested</option>
                    <option>Not Interested</option>
                    <option>Documents Pending</option>
                    <option>Application Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Call Notes *</label>
                <textarea
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  required
                  placeholder="Record summary of discussion with candidate..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 h-20 resize-none bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Next Follow-up Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={e => setNextFollowupDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCallModalLead(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={callLogging}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {callLogging ? 'Saving...' : 'Save Call Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
