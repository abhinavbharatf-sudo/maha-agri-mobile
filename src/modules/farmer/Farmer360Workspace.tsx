// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// SPRINT-02: FARMER 360 OPERATIONS WORKSPACE
// Complete Operational Action Center for MAHA-AGRIDOOT, Taluka & District Officers
// ============================================================================

import React, { useState } from 'react';
import {
  Users, Activity, FlaskConical, Send, GraduationCap, DollarSign,
  Bell, FileText, Lock, TrendingUp, Compass, CheckCircle2, RefreshCw, Search,
  Award, Briefcase, ChevronRight, Phone, MapPin, Calendar, Clock,
  FileCheck, AlertCircle, PlayCircle, QrCode, Building2, Sparkles, Check,
  ChevronDown, ArrowUpRight, ArrowDownRight, Menu, Grid, Info, Filter,
  FileSpreadsheet, FileDown, Layers, Settings, ShieldAlert, BarChart3, PieChart,
  Server, Zap, AlertTriangle, UserCheck, Crosshair, Map, Download, CheckSquare,
  ArrowRight, ShieldCheck, Database, HardDrive, Cpu, Radio, Mail, Sliders, ChevronLeft,
  XCircle, CheckCircle, Clock3, AlertOctagon, Printer, MessageSquare, PhoneCall, Share2,
  PlusCircle, Upload, CreditCard, Shield, UserX
} from 'lucide-react';
import {
  EDSKpiCard,
  EDSDataGrid,
  EDSStatusBadge,
  EDSWorkflowStepper
} from '../../lib/design-system';

export const Farmer360Workspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'CASES' | 'TIMELINE' | 'OFFICERS' | 'COMMUNICATION' | 'ANALYTICS' | 'AUDIT'>('OPERATIONS');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Dynamic State Arrays for Real-time State Updates without Page Reload
  const [tasks, setTasks] = useState([
    { id: 1, task: 'Collect Soil Sample ST-2026-000126', due: 'Today', priority: 'HIGH', officer: 'MAHA-AGRIDOOT Ajay Patil', action: 'Complete Intake' },
    { id: 2, task: 'Verify 7/12 Gat No. 142/1B Mutation', due: 'Tomorrow', priority: 'MEDIUM', officer: 'Taluka Coordinator P. Patil', action: 'Verify Document' },
    { id: 3, task: 'Schedule Drone Follow-up Inspection', due: '28 July 2026', priority: 'LOW', officer: 'Drone Entrepreneur Vikas Shinde', action: 'Schedule' },
  ]);
  const [soilTestCount, setSoilTestCount] = useState<number>(3);
  const [droneMissionCount, setDroneMissionCount] = useState<number>(2);

  // Sample Farmer Data
  const farmerData = {
    id: 'MH-FRM-2026-004821',
    name: 'Rahul Dnyaneshwar Patil',
    mobile: '+91 98220 14210',
    aadhaarMasked: 'XXXX-XXXX-4821',
    address: 'Seloo Village, Seloo Taluka, Wardha District (PIN: 442104)',
    category: 'Small & Marginal Farmer',
    healthScore: 94,
    riskScore: '12 / 100 (Low Risk)',
    inactiveDays: '2 Days',
    nextFollowup: '28 July 2026',
    lastVisit: '24 July 2026 (MAHA-AGRIDOOT Ajay Patil)',
    priority: 'NORMAL',
    landGat: 'Gat No. 142/1A (4.5 Hectares)',
  };

  const triggerAction = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Immediate React State Updates for BUG 1 Fix
  const handleCollectSoilSample = () => {
    const newId = `ST-2026-00${Math.floor(1000 + Math.random() * 9000)}`;
    const newTask = {
      id: Date.now(),
      task: `Collect Soil Sample ${newId}`,
      due: 'Today',
      priority: 'HIGH',
      officer: 'MAHA-AGRIDOOT Ajay Patil',
      action: 'Complete Intake'
    };
    setTasks(prev => [newTask, ...prev]);
    setSoilTestCount(prev => prev + 1);
    triggerAction(`Soil Sample Collection Request Created (${newId} - QR Code Sealed)`);
  };

  const handleBookDrone = () => {
    const newMissionId = `DRN-MH-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newTask = {
      id: Date.now(),
      task: `Agri Drone Mission ${newMissionId} (Nano Urea Spraying)`,
      due: 'Today',
      priority: 'HIGH',
      officer: 'Drone Entrepreneur Vikas Shinde',
      action: 'Start Mission'
    };
    setTasks(prev => [newTask, ...prev]);
    setDroneMissionCount(prev => prev + 1);
    triggerAction(`Agri Drone Mission ${newMissionId} Scheduled for 4.5 Ha`);
  };

  const handleTaskAction = (taskId: number, taskName: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    triggerAction(`Task '${taskName}' completed & verified!`);
  };

  return (
    <div className="space-y-5">
      {/* Action Toast Notification */}
      {notificationMsg && (
        <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-bounce">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-300 hover:text-white">✕</button>
        </div>
      )}

      {/* 1. TOP HEADER & OPERATIONAL QUICK ACTION TOOLBAR (< 3 CLICKS STANDARD) */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white font-black flex items-center justify-center text-lg shadow-sm border border-emerald-600">
            RP
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 leading-tight">{farmerData.name}</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                OPERATIONAL FARMER 360
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ID: <strong>{farmerData.id}</strong> • {farmerData.landGat} • {farmerData.address}
            </p>
          </div>
        </div>

        {/* 1-Click Operational Action Workspace Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCollectSoilSample} className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Collect Soil Sample</span>
          </button>
          <button onClick={handleBookDrone} className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">
            <Send className="w-3.5 h-3.5" />
            <span>Book Drone</span>
          </button>
          <button onClick={() => triggerAction('Razorpay Payment Link Dispatched to +91 98220 14210')} className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Collect Payment</span>
          </button>
          <button onClick={() => triggerAction('Soil Health Card Report Sent via WhatsApp')} className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Report</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL NAVIGATION TABS */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex overflow-x-auto space-x-2 text-xs font-bold">
        {[
          { id: 'OPERATIONS', label: 'Operational Dashboard' },
          { id: 'CASES', label: `Active Cases (${tasks.length + 3})` },
          { id: 'TIMELINE', label: 'Lifecycle Timeline' },
          { id: 'OFFICERS', label: 'Officer Assignment Matrix' },
          { id: 'COMMUNICATION', label: 'Communication Center' },
          { id: 'ANALYTICS', label: 'Comparative Analytics' },
          { id: 'AUDIT', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-700 text-white font-black shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. OPERATIONAL WORKSPACE TABS */}

      {/* PANEL 1 & 5 & 8: OPERATIONAL DASHBOARD */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-5">
          {/* Performance Indicators (Panel 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <EDSKpiCard title="Soil Tests Conducted" value={`${soilTestCount} Tests`} comparison="Last: 15/07/2026" achievementPct="100% SLA" icon={FlaskConical} sparkColor="#059669" />
            <EDSKpiCard title="Drone Missions" value={`${droneMissionCount} Missions`} comparison="9.0 Ha Sprayed" achievementPct="Nano Urea" icon={Send} sparkColor="#2563EB" />
            <EDSKpiCard title="Outstanding Amount" value="₹0.00" comparison="100% Settled" achievementPct="Paid" icon={DollarSign} sparkColor="#059669" />
            <EDSKpiCard title="Scheme Benefits" value="₹14,500" comparison="PM-KISAN + Drone" achievementPct="Disbursed" icon={Award} sparkColor="#7C3AED" />
            <EDSKpiCard title="Communication Log" value="18 Messages" comparison="12 SMS + 6 WhatsApp" achievementPct="Active" icon={MessageSquare} sparkColor="#D97706" />
            <EDSKpiCard title="Risk Index Score" value="12 / 100" comparison="Low Risk Farmer" achievementPct="Grade A1" icon={ShieldCheck} sparkColor="#0D9488" />
          </div>

          {/* Grid Layout: Pending Tasks (Panel 1) & Farmer Relationship Panel (Panel 8) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Panel 1: Pending Tasks Work Queue (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Pending Tasks Work Queue</span>
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  {tasks.length} ACTIONABLE TASKS
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 block">{t.task}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Assigned: {t.officer} • Due: {t.due}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        t.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>{t.priority}</span>
                      <button onClick={() => handleTaskAction(t.id, t.task)} className="bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded hover:bg-emerald-800">
                        {t.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 8: Farmer Relationship & Risk Panel (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <h3 className="font-black text-slate-900 text-sm flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Farmer Relationship & Risk Status</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">RISK SCORE</span>
                  <h4 className="text-base font-black text-emerald-900 mt-1">{farmerData.riskScore}</h4>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">INACTIVE DAYS</span>
                  <h4 className="text-base font-black text-blue-900 mt-1">{farmerData.inactiveDays}</h4>
                </div>
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">NEXT FOLLOW-UP</span>
                  <h4 className="text-xs font-black text-purple-900 mt-1">{farmerData.nextFollowup}</h4>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">LAST FIELD VISIT</span>
                  <h4 className="text-[11px] font-bold text-slate-900 mt-1">{farmerData.lastVisit}</h4>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Officer Contact Priority:</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                  NORMAL PRIORITY
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: ACTIVE CASES */}
      {activeTab === 'CASES' && (
        <div className="space-y-5">
          <EDSDataGrid
            title="Farmer Active Operational Cases"
            subtitle="Centralized case management for soil testing, drone missions, schemes, complaints & payments"
            columns={[
              { key: 'caseId', header: 'Case ID' },
              { key: 'type', header: 'Module / Case Type' },
              { key: 'subject', header: 'Subject' },
              { key: 'assignedOfficer', header: 'Assigned Officer' },
              { key: 'status', header: 'Status', render: (r: any) => <EDSStatusBadge status={r.status} /> },
              {
                key: 'action',
                header: 'Action',
                render: (r: any) => (
                  <button onClick={() => triggerAction(`Opened Case ${r.caseId}`)} className="text-emerald-700 font-bold hover:underline">
                    Manage Case
                  </button>
                )
              }
            ]}
            data={[
              { caseId: 'CASE-SOIL-2026-081', type: 'Soil Testing', subject: '12-Param Chemical Analysis (ST-2026-000125)', assignedOfficer: 'Soil Chemist V. Shinde', status: 'IN_PROGRESS' },
              { caseId: 'CASE-DRN-2026-042', type: 'Drone Mission', subject: 'Nano Urea Spraying (4.5 Ha)', assignedOfficer: 'Drone Entrepreneur Vikas Shinde', status: 'COMPLETED' },
              { caseId: 'CASE-SCH-2026-012', type: 'Scheme Application', subject: 'PM-KISAN Kharif Subsidy Benefit', assignedOfficer: 'Taluka Coordinator P. Patil', status: 'COMPLETED' },
              { caseId: 'CASE-PAY-2026-004', type: 'Payment Issue', subject: 'Razorpay UPI Receipt Verification', assignedOfficer: 'MAHA-AGRIDOOT Ajay Patil', status: 'COMPLETED' },
            ]}
          />
        </div>
      )}

      {/* PANEL 3: LIFECYCLE TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-black text-slate-900 text-sm">Farmer 360 Service Lifecycle Timeline</h3>
          <EDSWorkflowStepper
            steps={[
              { title: 'Registration & Aadhaar Link', time: '14 July 2026', status: 'COMPLETED', description: 'Registered by MAHA-AGRIDOOT Ajay Patil' },
              { title: '7/12 Land Parcel Verification', time: '14 July 2026', status: 'COMPLETED', description: 'Verified Gat No. 142/1A (4.5 Ha)' },
              { title: 'Soil Sample Collection', time: '15 July 2026', status: 'COMPLETED', description: 'Sample ST-2026-000125 collected' },
              { title: '12-Param Chemical Lab Testing', time: '16 July 2026', status: 'COMPLETED', description: 'Analyzed by Soil Chemist V. Shinde' },
              { title: 'Soil Health Card Recommendation', time: '16 July 2026', status: 'COMPLETED', description: 'Issued with NPK recommendations' },
              { title: 'Agri Drone Mission Execution', time: '18 July 2026', status: 'COMPLETED', description: 'Nano Urea sprayed by Vikas Shinde' },
              { title: 'Razorpay Fee Collection', time: '18 July 2026', status: 'COMPLETED', description: '₹500 Fee Collected & Receipt Issued' },
            ]}
          />
        </div>
      )}

      {/* PANEL 4: OFFICER ASSIGNMENT MATRIX */}
      {activeTab === 'OFFICERS' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2">
            Assigned Government & Field Officers Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { role: 'MAHA-AGRIDOOT', name: 'Ajay Patil', contact: '+91 98221 00123', status: 'Active (Field)' },
              { role: 'Taluka Coordinator', name: 'P. Patil', contact: '+91 98221 00456', status: 'Active' },
              { role: 'District Coordinator', name: 'R. Deshmukh', contact: '+91 98221 00789', status: 'Active' },
              { role: 'Soil Chemist', name: 'V. Shinde', contact: 'Wardha Soil Lab', status: 'Active' },
              { role: 'Drone Entrepreneur', name: 'Vikas Shinde', contact: 'Wardha Drones', status: 'Active' },
            ].map((o, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">{o.role}</span>
                <span className="font-black text-slate-900 block text-sm">{o.name}</span>
                <span className="text-slate-500 font-medium block">{o.contact}</span>
                <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PANEL 7: COMMUNICATION CENTER */}
      {activeTab === 'COMMUNICATION' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm">Farmer Communication History & Log</h3>
            <button onClick={() => triggerAction('SMS OTP Dispatched to +91 98220 14210')} className="bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              Send SMS Notification
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">WhatsApp: Soil Health Card PDF Delivered</span>
                <span className="text-[10px] text-emerald-700">Sent to +91 98220 14210 • 16 July 2026 14:20 IST</span>
              </div>
              <EDSStatusBadge status="COMPLETED" label="Delivered" />
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">SMS: Soil Sample Intake Confirmation</span>
                <span className="text-[10px] text-slate-500">Sent to +91 98220 14210 • 15 July 2026 09:45 IST</span>
              </div>
              <EDSStatusBadge status="COMPLETED" label="Delivered" />
            </div>
          </div>
        </div>
      )}

      {/* PANEL 9: COMPARATIVE ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2">
            Comparative Benchmark Analytics (Farmer vs Village vs District Avg)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">Soil Organic Carbon (%)</span>
              <div className="space-y-1 text-slate-700 font-semibold">
                <div className="flex justify-between"><span>Rahul Patil (Farmer):</span><strong className="text-emerald-700">0.65%</strong></div>
                <div className="flex justify-between"><span>Seloo Village Avg:</span><span>0.58%</span></div>
                <div className="flex justify-between"><span>Wardha District Avg:</span><span>0.54%</span></div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">Cotton Yield (Quintals / Acre)</span>
              <div className="space-y-1 text-slate-700 font-semibold">
                <div className="flex justify-between"><span>Rahul Patil (Farmer):</span><strong className="text-emerald-700">14.2 Q/Acre</strong></div>
                <div className="flex justify-between"><span>Seloo Village Avg:</span><span>12.5 Q/Acre</span></div>
                <div className="flex justify-between"><span>Wardha District Avg:</span><span>11.8 Q/Acre</span></div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">SLA Response Speed</span>
              <div className="space-y-1 text-slate-700 font-semibold">
                <div className="flex justify-between"><span>Farmer Requests:</span><strong className="text-emerald-700">24.5 hrs</strong></div>
                <div className="flex justify-between"><span>District SLA Benchmark:</span><span>48.0 hrs</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 10: AUDIT LOG */}
      {activeTab === 'AUDIT' && (
        <EDSDataGrid
          title="Farmer Operational Audit Trail Log (Panel 10)"
          subtitle="Complete immutable log: Who, When, What, Device, and GPS Coordinates"
          columns={[
            { key: 'timestamp', header: 'Timestamp' },
            { key: 'officer', header: 'Action Performed By' },
            { key: 'action', header: 'Action Description' },
            { key: 'device', header: 'Device & OS' },
            { key: 'gps', header: 'GPS Coordinates' }
          ]}
          data={[
            { timestamp: '18/07/2026 16:30:12', officer: 'Drone Entrepreneur Vikas Shinde', action: 'Completed Drone Spraying Mission #DRN-2026-0089', device: 'MAHA-AGRI Mobile App (Android 14)', gps: '20.8351° N, 78.7042° E' },
            { timestamp: '16/07/2026 14:15:04', officer: 'Soil Chemist V. Shinde', action: 'Signed 12-Param Chemical Analysis #ST-2026-000125', device: 'NABL Lab Workstation (Win 11)', gps: '20.8310° N, 78.7010° E' },
            { timestamp: '15/07/2026 09:30:22', officer: 'MAHA-AGRIDOOT Ajay Patil', action: 'Sample Intake & Razorpay UPI ₹500 Fee Collection', device: 'MAHA-AGRI Mobile POS (Android 13)', gps: '20.8352° N, 78.7040° E' },
          ]}
        />
      )}
    </div>
  );
};

export default Farmer360Workspace;
