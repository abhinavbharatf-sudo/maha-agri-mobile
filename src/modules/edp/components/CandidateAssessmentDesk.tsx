/**
 * MAHA-AGRI — Candidate Assessment Desk (Enterprise Evaluation & Decision Engine)
 * Rule-Based Assessment Review Layer with Read-Only System Recommendations, Confirmation Dialogs, Notification Queue Handoff & Audit Trail
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  Award,
  Sparkles,
  Users,
  Building2,
  FileCheck,
  ChevronRight,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  UserCheck,
  UserX,
  History,
  Plane,
  Store,
  FlaskConical,
  Sprout,
  Briefcase,
  Lock,
  Send,
  Laptop,
} from 'lucide-react';

import type {
  CandidateDeskRecord,
  CandidateDeskFilterState,
  AssessmentDecisionAuditLog,
  RecommendationCode,
  AssessmentLifecycleStatus,
  BatchRuleConfig,
} from '../types/candidateAssessmentDesk.types';

// DEMO MOCK DATA FOR CANDIDATE ASSESSMENT DESK
const INITIAL_CANDIDATE_DESK_RECORDS: CandidateDeskRecord[] = [
  {
    assessmentId: 'asm-101',
    candidateId: 'MAG-2026-X89F',
    fullName: 'Rahul Shantaram Patil',
    mobileNumber: '9822998877',
    district: 'Wardha',
    taluka: 'Wardha',
    village: 'PIMPRI',
    programType: 'Agri Drone Entrepreneur',
    versionNo: 1,

    highestQualification: 'B.Sc Agriculture',
    isAgriQualification: true,
    hasAgriLicense: true,

    candidateAssessmentScore: 88,
    agricultureBackgroundScore: 85,
    businessReadinessScore: 90,
    financialReadinessScore: 82,
    agriDroneReadinessScore: 95,

    programEligibility: {
      agriDrone: 'Eligible',
      krushiSevaKendra: 'Eligible',
      soilTesting: 'Eligible',
      inputBusiness: 'Eligible',
      fpoEntrepreneur: 'Conditional',
      agriConsultancy: 'Eligible',
    },

    recommendationCode: 'REC_HIGH',
    recommendationReason: 'Candidate possesses B.Sc Agriculture, 25 flying hours, RPC certificate and strong capital capacity.',
    generatedBy: 'MAHA-AGRI System Rule Engine v3.2',
    generatedAt: '2026-08-01 14:30:00',

    lifecycleStatus: 'ASSESSMENT_COMPLETED',
    submittedAt: '2026-08-01 14:25:00',
    auditTrail: [],
  },
  {
    assessmentId: 'asm-102',
    candidateId: 'MAG-2026-B412',
    fullName: 'Aniket Vijay Deshmukh',
    mobileNumber: '9422114433',
    district: 'Nagpur',
    taluka: 'Katol',
    village: 'MOHPA',
    programType: 'MAHA-AGRI Krushi Seva Kendra',
    versionNo: 1,

    highestQualification: 'Diploma in Agriculture',
    isAgriQualification: true,
    hasAgriLicense: false,

    candidateAssessmentScore: 68,
    agricultureBackgroundScore: 70,
    businessReadinessScore: 55,
    financialReadinessScore: 75,
    agriDroneReadinessScore: 40,

    programEligibility: {
      agriDrone: 'Conditional',
      krushiSevaKendra: 'Eligible',
      soilTesting: 'Conditional',
      inputBusiness: 'Eligible',
      fpoEntrepreneur: 'Conditional',
      agriConsultancy: 'Conditional',
    },

    recommendationCode: 'REC_LICENSE_REQUIRED',
    recommendationReason: 'Qualified diploma holder, but requires Agri Input Dealer License before final shop sanction.',
    generatedBy: 'MAHA-AGRI System Rule Engine v3.2',
    generatedAt: '2026-08-01 15:10:00',

    lifecycleStatus: 'ASSESSMENT_COMPLETED',
    submittedAt: '2026-08-01 15:00:00',
    auditTrail: [],
  },
  {
    assessmentId: 'asm-103',
    candidateId: 'MAG-2026-C990',
    fullName: 'Pooja Ramesh Sawant',
    mobileNumber: '9890223344',
    district: 'Amravati',
    taluka: 'Chandur Railway',
    village: 'BAGGI',
    programType: 'Soil Testing Entrepreneur',
    versionNo: 1,

    highestQualification: 'M.Sc Chemistry',
    isAgriQualification: false,
    hasAgriLicense: false,

    candidateAssessmentScore: 74,
    agricultureBackgroundScore: 50,
    businessReadinessScore: 80,
    financialReadinessScore: 85,
    agriDroneReadinessScore: 30,

    programEligibility: {
      agriDrone: 'Ineligible',
      krushiSevaKendra: 'Conditional',
      soilTesting: 'Eligible',
      inputBusiness: 'Conditional',
      fpoEntrepreneur: 'Conditional',
      agriConsultancy: 'Conditional',
    },

    recommendationCode: 'REC_MODERATE',
    recommendationReason: 'Excellent science background for soil laboratory testing; recommended for Soil Testing Cluster.',
    generatedBy: 'MAHA-AGRI System Rule Engine v3.2',
    generatedAt: '2026-08-01 16:00:00',

    lifecycleStatus: 'ASSESSMENT_COMPLETED',
    submittedAt: '2026-08-01 15:50:00',
    auditTrail: [],
  },
  {
    assessmentId: 'asm-104',
    candidateId: 'MAG-2026-D118',
    fullName: 'Ganesh Kisanrao Pawar',
    mobileNumber: '9766554411',
    district: 'Wardha',
    taluka: 'Hinganghat',
    village: 'WADNER',
    programType: 'Agri Drone Entrepreneur',
    versionNo: 1,

    highestQualification: '12th Pass',
    isAgriQualification: false,
    hasAgriLicense: false,

    candidateAssessmentScore: 42,
    agricultureBackgroundScore: 35,
    businessReadinessScore: 40,
    financialReadinessScore: 50,
    agriDroneReadinessScore: 30,

    programEligibility: {
      agriDrone: 'Conditional',
      krushiSevaKendra: 'Ineligible',
      soilTesting: 'Ineligible',
      inputBusiness: 'Ineligible',
      fpoEntrepreneur: 'Conditional',
      agriConsultancy: 'Ineligible',
    },

    recommendationCode: 'REC_TRAINING_REQUIRED',
    recommendationReason: 'Low initial technical score. Mandatory 15-day EDP foundation training required before DV.',
    generatedBy: 'MAHA-AGRI System Rule Engine v3.2',
    generatedAt: '2026-08-01 16:45:00',

    lifecycleStatus: 'ASSESSMENT_COMPLETED',
    submittedAt: '2026-08-01 16:30:00',
    auditTrail: [],
  },
];

interface CandidateAssessmentDeskProps {
  onBack?: () => void;
  triggerToast?: (msg: string) => void;
}

export const CandidateAssessmentDesk: React.FC<CandidateAssessmentDeskProps> = ({
  onBack,
  triggerToast = (msg: string) => console.log(msg),
}) => {
  const [records, setRecords] = useState<CandidateDeskRecord[]>(INITIAL_CANDIDATE_DESK_RECORDS);

  // FILTERS STATE
  const [filters, setFilters] = useState<CandidateDeskFilterState>({
    searchQuery: '',
    district: 'ALL',
    taluka: 'ALL',
    programType: 'ALL',
    scoreRange: 'ALL',
    lifecycleStatus: 'ALL',
  });

  // MODAL STATES
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDeskRecord | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const [decisionChoice, setDecisionChoice] = useState<'APPROVE_FOR_DV' | 'KEEP_UNDER_REVIEW' | 'REJECT_CANDIDATE'>('APPROVE_FOR_DV');
  const [rejectionReason, setRejectionReason] = useState('Low Assessment Score');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // RULE-BASED BATCH APPROVAL MODAL
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchRuleConfig, setBatchRuleConfig] = useState<BatchRuleConfig>({
    minScoreThreshold: 75,
    requireAgriQualification: false,
    requireLicenseIfApplicable: false,
    excludeLowCibil: true,
  });

  // FILTERED CANDIDATES COMPUTATION
  const filteredCandidates = useMemo(() => {
    return records.filter((rec) => {
      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesName = rec.fullName.toLowerCase().includes(q);
        const matchesMobile = rec.mobileNumber.includes(q);
        const matchesId = rec.candidateId.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesId) return false;
      }

      // District
      if (filters.district !== 'ALL' && rec.district !== filters.district) return false;

      // Program Type
      if (filters.programType !== 'ALL' && rec.programType !== filters.programType) return false;

      // Status
      if (filters.lifecycleStatus !== 'ALL' && rec.lifecycleStatus !== filters.lifecycleStatus) return false;

      // Score Range
      if (filters.scoreRange === 'HIGH' && rec.candidateAssessmentScore < 75) return false;
      if (filters.scoreRange === 'MODERATE' && (rec.candidateAssessmentScore < 50 || rec.candidateAssessmentScore >= 75)) return false;
      if (filters.scoreRange === 'LOW' && rec.candidateAssessmentScore >= 50) return false;

      return true;
    });
  }, [records, filters]);

  // STAGE 1: INITIATE DECISION -> OPENS CONFIRMATION DIALOG
  const handleInitiateDecision = () => {
    if (!selectedCandidate) return;
    if (decisionChoice === 'REJECT_CANDIDATE' && !rejectionReason) {
      triggerToast('⚠️ Please select a rejection reason before proceeding.');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  // STAGE 2: EXECUTE CONFIRMED DECISION
  const handleConfirmExecuteDecision = () => {
    if (!selectedCandidate) return;

    let newStatus: AssessmentLifecycleStatus = 'DV_PENDING';
    if (decisionChoice === 'KEEP_UNDER_REVIEW') newStatus = 'UNDER_REVIEW';
    if (decisionChoice === 'REJECT_CANDIDATE') newStatus = 'REJECTED';

    const newLogEntry: AssessmentDecisionAuditLog = {
      logId: `log-${Date.now()}`,
      assessmentId: selectedCandidate.assessmentId,
      candidateId: selectedCandidate.candidateId,
      officerId: 'OFF-MH-9021',
      officerName: 'District Agriculture Officer (Wardha)',
      decision: decisionChoice,
      previousStatus: selectedCandidate.lifecycleStatus,
      newStatus,
      rejectionReason: decisionChoice === 'REJECT_CANDIDATE' ? rejectionReason : undefined,
      remarks: officerRemarks || 'Decision officially logged via MAHA-AGRI Candidate Assessment Desk.',
      device: 'Desktop (Chrome 126.0 / Windows 11)',
      ipAddress: '10.240.18.92 (NIC Gov Network)',
      timestamp: new Date().toISOString(),
    };

    setRecords((prev) =>
      prev.map((r) => {
        if (r.assessmentId === selectedCandidate.assessmentId) {
          return {
            ...r,
            lifecycleStatus: newStatus,
            auditTrail: [newLogEntry, ...r.auditTrail],
          };
        }
        return r;
      })
    );

    setIsConfirmDialogOpen(false);
    setIsDecisionModalOpen(false);
    setOfficerRemarks('');

    // Trigger Notification Queue payload log
    console.log(`[NOTIFICATION QUEUE] Event payload created for Candidate ${selectedCandidate.candidateId}: Status -> ${newStatus}`);

    const actionText =
      decisionChoice === 'APPROVE_FOR_DV'
        ? '✅ Approved for Document Verification (DV_PENDING)'
        : decisionChoice === 'KEEP_UNDER_REVIEW'
        ? '⏳ Moved to Under Review'
        : '❌ Candidate Application Rejected';

    triggerToast(`⚡ Decision officially recorded & queued for notification: ${actionText}`);
  };

  // RULE-BASED BATCH APPROVAL EXECUTION
  const handleExecuteBatchApproval = () => {
    const eligibleForBatch = filteredCandidates.filter((r) => {
      if (r.lifecycleStatus === 'DV_PENDING' || r.lifecycleStatus === 'REJECTED') return false;
      if (r.candidateAssessmentScore < batchRuleConfig.minScoreThreshold) return false;
      if (batchRuleConfig.requireAgriQualification && !r.isAgriQualification) return false;
      if (batchRuleConfig.requireLicenseIfApplicable && !r.hasAgriLicense) return false;
      return true;
    });

    if (eligibleForBatch.length === 0) {
      triggerToast('⚠️ No candidate matches the batch approval rule criteria.');
      setIsBatchModalOpen(false);
      return;
    }

    const updatedIds = new Set(eligibleForBatch.map((e) => e.assessmentId));

    setRecords((prev) =>
      prev.map((r) => {
        if (updatedIds.has(r.assessmentId)) {
          const logEntry: AssessmentDecisionAuditLog = {
            logId: `batch-log-${Date.now()}-${r.assessmentId}`,
            assessmentId: r.assessmentId,
            candidateId: r.candidateId,
            officerId: 'OFF-MH-9021',
            officerName: 'District Agriculture Officer (Rule Engine)',
            decision: 'APPROVE_FOR_DV',
            previousStatus: r.lifecycleStatus,
            newStatus: 'DV_PENDING',
            remarks: `Rule-Based Batch Approval (Threshold >= ${batchRuleConfig.minScoreThreshold}).`,
            device: 'Desktop (Chrome / Windows)',
            ipAddress: '10.240.18.92 (NIC Gov Network)',
            timestamp: new Date().toISOString(),
          };
          return {
            ...r,
            lifecycleStatus: 'DV_PENDING',
            auditTrail: [logEntry, ...r.auditTrail],
          };
        }
        return r;
      })
    );

    setIsBatchModalOpen(false);
    triggerToast(`🎉 Rule-based Batch Approval complete! ${eligibleForBatch.length} candidate(s) moved to DV_PENDING.`);
  };

  const getRecommendationBadge = (code: RecommendationCode) => {
    switch (code) {
      case 'REC_HIGH':
        return { label: 'Highly Recommended', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'REC_MODERATE':
        return { label: 'Recommended', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'REC_TRAINING_REQUIRED':
        return { label: 'Training Required', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'REC_LICENSE_REQUIRED':
        return { label: 'Agri License Required', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'REC_FINANCIAL_REVIEW':
        return { label: 'Financial Audit Required', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'REC_REJECT':
        return { label: 'Ineligible Candidate', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  const getStatusBadge = (status: AssessmentLifecycleStatus) => {
    switch (status) {
      case 'ASSESSMENT_COMPLETED':
        return { label: 'Assessment Completed', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case 'UNDER_REVIEW':
        return { label: 'Under Review', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'DV_PENDING':
        return { label: 'Eligible for DV', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'REJECTED':
        return { label: 'Rejected', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      default:
        return { label: status, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 animate-in fade-in duration-200 text-xs">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg text-white tracking-tight">Candidate Assessment Desk</h2>
          </div>
          <p className="text-xs text-slate-400 font-normal mt-0.5">
            Enterprise Rule Engine Evaluation &amp; Document Verification Decision Gateway
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Rule-Based Batch Approve</span>
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Back to Catalog
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH & MULTI-FILTER CONTROL PANEL */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search Candidate Name, Mobile Number, or Candidate ID (e.g. MAG-2026)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* District Filter */}
            <select
              value={filters.district}
              onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL">All Districts</option>
              <option value="Wardha">Wardha</option>
              <option value="Nagpur">Nagpur</option>
              <option value="Amravati">Amravati</option>
            </select>

            {/* Score Range Filter */}
            <select
              value={filters.scoreRange}
              onChange={(e) => setFilters((prev) => ({ ...prev, scoreRange: e.target.value as any }))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL">All Score Ranges</option>
              <option value="HIGH">High Score (≥ 75)</option>
              <option value="MODERATE">Moderate (50–74)</option>
              <option value="LOW">Low Score (&lt; 50)</option>
            </select>

            {/* Lifecycle Status Filter */}
            <select
              value={filters.lifecycleStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, lifecycleStatus: e.target.value }))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSESSMENT_COMPLETED">Assessment Completed</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="DV_PENDING">Eligible for DV</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. CANDIDATES EVALUATION LIST / CARDS */}
      <div className="space-y-3">
        {filteredCandidates.length > 0 ? (
          filteredCandidates.map((cand) => {
            const recBadge = getRecommendationBadge(cand.recommendationCode);
            const statusBadge = getStatusBadge(cand.lifecycleStatus);

            return (
              <div
                key={cand.assessmentId}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-all shadow-md"
              >
                {/* TOP CANDIDATE IDENTIFIER STRIP */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center text-sm">
                      {cand.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">{cand.fullName}</h4>
                        <span className="font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                          {cand.candidateId} (v{cand.versionNo})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        📱 +91 {cand.mobileNumber} • 📍 {cand.village}, {cand.taluka}, {cand.district}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* READ-ONLY SYSTEM RECOMMENDATION BADGE WITH LOCK ICON */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${recBadge.bg}`} title="Read-Only System Rule Engine Recommendation">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{recBadge.label}</span>
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* 4 SCORE PILLARS BREAKDOWN */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Overall Assessment</span>
                    <span className="text-base font-black text-emerald-400 font-mono">{cand.candidateAssessmentScore} / 100</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Agri Background</span>
                    <span className="text-base font-black text-cyan-400 font-mono">{cand.agricultureBackgroundScore} / 100</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Business Readiness</span>
                    <span className="text-base font-black text-amber-400 font-mono">{cand.businessReadinessScore} / 100</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Financial Readiness</span>
                    <span className="text-base font-black text-purple-400 font-mono">{cand.financialReadinessScore} / 100</span>
                  </div>
                </div>

                {/* 5. PROGRAM-SPECIFIC ELIGIBILITY BADGES */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Program-Specific Eligibility Matrix
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(cand.programEligibility).map(([progKey, statusVal]) => {
                      const progNames: Record<string, string> = {
                        agriDrone: 'Agri Drone',
                        krushiSevaKendra: 'Krushi Seva Kendra',
                        soilTesting: 'Soil Testing',
                        inputBusiness: 'Input Dealership',
                        fpoEntrepreneur: 'FPO Entrepreneur',
                        agriConsultancy: 'Agri Consultancy',
                      };
                      const color =
                        statusVal === 'Eligible'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : statusVal === 'Conditional'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

                      return (
                        <span key={progKey} className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${color}`}>
                          {progNames[progKey] || progKey}: <strong>{statusVal}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* RECOMMENDATION REASON & DECISION ACTIONS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-300 flex-1">
                    <span className="text-slate-400 font-semibold flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>System Rule Engine Note: </span>
                    </span>
                    <span>{cand.recommendationReason}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {cand.auditTrail.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setIsHistoryDrawerOpen(true);
                        }}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl flex items-center space-x-1 border border-slate-700 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Audit Log ({cand.auditTrail.length})</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setIsDecisionModalOpen(true);
                      }}
                      className="py-1.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Take Decision</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-sm text-white">No Candidate Assessment Records Found</p>
            <p className="text-xs">Adjust your search query or clear filters to view candidates.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🏛️ SINGLE CANDIDATE DECISION PANEL MODAL */}
      {/* ========================================================================= */}
      {isDecisionModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Candidate Scrutiny &amp; Decision Panel</h3>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {selectedCandidate.fullName} ({selectedCandidate.candidateId})
                </span>
              </div>
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* READ-ONLY SYSTEM RECOMMENDATION HIGHLIGHT */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>System Recommendation (Read-Only)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRecommendationBadge(selectedCandidate.recommendationCode).bg}`}>
                  {getRecommendationBadge(selectedCandidate.recommendationCode).label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic">"{selectedCandidate.recommendationReason}"</p>
            </div>

            {/* DECISION SELECTION BUTTONS */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-300 block">Select Scrutiny Action *</label>

              <div className="space-y-2">
                <label
                  onClick={() => setDecisionChoice('APPROVE_FOR_DV')}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    decisionChoice === 'APPROVE_FOR_DV'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="block text-xs text-white">✅ Approve for Document Verification</strong>
                    <span className="text-[10.5px] text-slate-400">Moves status to DV_PENDING and queues candidate notification</span>
                  </div>
                </label>

                <label
                  onClick={() => setDecisionChoice('KEEP_UNDER_REVIEW')}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    decisionChoice === 'KEEP_UNDER_REVIEW'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <strong className="block text-xs text-white">⏳ Keep Under Review</strong>
                    <span className="text-[10.5px] text-slate-400">Moves status to UNDER_REVIEW for secondary panel inspection</span>
                  </div>
                </label>

                <label
                  onClick={() => setDecisionChoice('REJECT_CANDIDATE')}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    decisionChoice === 'REJECT_CANDIDATE'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <UserX className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <strong className="block text-xs text-white">❌ Reject Candidate</strong>
                    <span className="text-[10.5px] text-slate-400">Rejects application and specifies mandatory rejection reason</span>
                  </div>
                </label>
              </div>
            </div>

            {/* CONDITIONAL REJECTION REASON */}
            {decisionChoice === 'REJECT_CANDIDATE' && (
              <div className="space-y-1.5 text-xs animate-in fade-in duration-150">
                <label className="font-semibold text-slate-300 block">Select Rejection Reason *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Low Assessment Score">Low Assessment Score</option>
                  <option value="Ineligible Qualification">Ineligible Qualification</option>
                  <option value="Location Out of Service Area">Location Out of Service Area</option>
                  <option value="Incomplete Data">Incomplete Data</option>
                  <option value="Other Policy Reason">Other Policy Reason</option>
                </select>
              </div>
            )}

            {/* OFFICER REMARKS */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300 block">Officer Remarks / Audit Notes</label>
              <textarea
                value={officerRemarks}
                onChange={(e) => setOfficerRemarks(e.target.value)}
                placeholder="Enter official remarks for audit log..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            {/* MODAL ACTION BUTTONS */}
            <div className="flex space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateDecision}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl"
              >
                Review &amp; Confirm Decision ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ DECISION CONFIRMATION DIALOG (PREVENTS ACCIDENTAL CLICKS) */}
      {/* ========================================================================= */}
      {isConfirmDialogOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-base text-white">Confirm Official Administrative Decision</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are about to log an immutable decision for candidate <strong className="text-white">{selectedCandidate.fullName}</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left space-y-2 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate ID:</span>
                <span className="text-emerald-400 font-mono">{selectedCandidate.candidateId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Program:</span>
                <span className="text-white">{selectedCandidate.programType}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">Next Status:</span>
                <span className="text-emerald-300 font-bold uppercase font-mono">
                  {decisionChoice === 'APPROVE_FOR_DV' ? 'DV_PENDING' : decisionChoice === 'KEEP_UNDER_REVIEW' ? 'UNDER_REVIEW' : 'REJECTED'}
                </span>
              </div>
              {decisionChoice === 'REJECT_CANDIDATE' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Rejection Reason:</span>
                  <span className="text-rose-400">{rejectionReason}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmDialogOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExecuteDecision}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center justify-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm &amp; Log Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚡ RULE-BASED BATCH APPROVAL MODAL */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Rule-Based Batch Approval</h3>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Configure execution rules for batch-approving candidates to <strong className="text-emerald-400">DV_PENDING</strong>.
              </p>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Minimum Assessment Score Threshold</label>
                <input
                  type="number"
                  value={batchRuleConfig.minScoreThreshold}
                  onChange={(e) => setBatchRuleConfig((prev) => ({ ...prev, minScoreThreshold: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchRuleConfig.requireAgriQualification}
                    onChange={(e) => setBatchRuleConfig((prev) => ({ ...prev, requireAgriQualification: e.target.checked }))}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span className="text-slate-300 font-semibold">Require Agri Degree / Polytechnic</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchRuleConfig.requireLicenseIfApplicable}
                    onChange={(e) => setBatchRuleConfig((prev) => ({ ...prev, requireLicenseIfApplicable: e.target.checked }))}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span className="text-slate-300 font-semibold">Require Agri Business License (if applicable)</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBatchApproval}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl"
              >
                Execute Batch Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📜 IMMUTABLE AUDIT TRAIL DRAWER (DEVICE & IP LOGGING) */}
      {/* ========================================================================= */}
      {isHistoryDrawerOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-5 space-y-4 shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Immutable Decision History</h3>
              </div>
              <button onClick={() => setIsHistoryDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-semibold">CANDIDATE</span>
                <span className="font-bold text-sm text-white">{selectedCandidate.fullName}</span>
                <span className="text-emerald-400 font-mono block text-[11px]">{selectedCandidate.candidateId}</span>
              </div>

              <div className="space-y-2">
                {selectedCandidate.auditTrail.map((log) => (
                  <div key={log.logId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-mono text-emerald-400">{log.officerName}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-bold text-white text-xs">
                      Status Change: <span className="text-cyan-300">{log.previousStatus}</span> ➔ <span className="text-emerald-400">{log.newStatus}</span>
                    </div>
                    {log.remarks && <p className="text-[11px] text-slate-300 italic">"{log.remarks}"</p>}
                    <div className="pt-1 border-t border-slate-800/80 text-[9.5px] font-mono text-slate-500 flex justify-between">
                      <span>💻 {log.device}</span>
                      <span>🌐 IP: {log.ipAddress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
