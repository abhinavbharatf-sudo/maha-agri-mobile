/**
 * MAHA-AGRIDOOT World-Class Enterprise Mobile Operating System (`/maha-agri/agridoot`, `/agridoot`, `/field`)
 * COMPLETE ENTERPRISE ATTENDANCE MODULE INTEGRATED IN `DAILY_ATTENDANCE` VIEW:
 * 1. Today's Attendance Summary (Check-in, Check-out, Status, GPS Verification, Working Hours)
 * 2. Attendance History List (Date, Check-In, Check-Out, Hours, GPS Verified, Location)
 * 3. Monthly Calendar Breakdown (Present, Absent, Leave, Holiday, Half Day)
 * 4. Monthly Attendance Summary (Working Days, Present, Leave, Absent, Attendance %)
 * 5. Field Login History Logs (Login Time, GPS Status, Geofenced Location, Date)
 * Department of Agriculture, Government of Maharashtra
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Bell, ChevronRight, Play, CheckCircle2, Clock, MapPin, Plus, Home, Search,
  ClipboardList, User, FileText, UserPlus, FlaskConical, GraduationCap, Plane,
  Camera, Mic, QrCode, ArrowLeft, Sun, Moon, Check, X, ShieldAlert, Sparkles, Filter,
  ShieldCheck, AlertTriangle, Users, Wallet, Settings, Activity, ArrowUpRight, Share2,
  Download, Eye, Smartphone, RefreshCw, Layers, Lock, Award, FileCheck2, Cpu, Grid,
  MoreVertical, Calendar, Phone, HelpCircle, LogOut, Send, CheckCircle, ChevronDown,
  Wifi, Battery, Cloud, MessageSquare, PhoneCall, AlertCircle, Bot, Monitor, Sliders,
  Building2, CreditCard, Award as Trophy, Globe, History, Radio, Palette, Type, HelpCircle as InfoIcon,
  WifiOff, Volume2, SlidersHorizontal, RotateCcw, AlertOctagon, CalendarDays, CheckCheck, XCircle, TrendingUp
} from 'lucide-react';
import { generateUnifiedAgriId } from '../farmer/farmerRegistryService';
import { processFlightTelemetry } from '../drone/droneService';
import { disburseDbtGrant } from '../payments/paymentLedgerService';

type MainView =
  | 'DASHBOARD'
  | 'TODAYS_MISSION'
  | 'MISSION_CONSOLE'
  | 'DAILY_ATTENDANCE'
  | 'OPERATIONS_LIST'
  | 'PROFILE'
  | 'SETTINGS_APPEARANCE'
  | 'DIGITAL_ID_FULL'
  | 'QR_SCANNER'
  | 'VERIFICATION_RESULT'
  | 'DIGITAL_WALLET'
  | 'CREDENTIAL_DETAILS'
  | 'FARMER_REGISTRATION'
  | 'SOIL_TESTING';

type ThemeMode = 'dark' | 'light' | 'system';
type AccentColor = 'green' | 'blue' | 'gold';
type FontSize = 'small' | 'medium' | 'large';

export const MahaAgridootFieldApp: React.FC = () => {
  const navigate = useNavigate();

  // THEME ENGINE SYSTEM
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('maha_agridoot_theme') as ThemeMode) || 'dark';
  });

  const [accentColor, setAccentColor] = useState<AccentColor>('green');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [lang, setLang] = useState<'mr' | 'en'>('mr');
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    localStorage.setItem('maha_agridoot_theme', themeMode);
    if (themeMode === 'system') {
      const isSysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setActiveTheme(isSysDark ? 'dark' : 'light');
    } else {
      setActiveTheme(themeMode);
    }
  }, [themeMode]);

  const isDark = activeTheme === 'dark';

  // PRODUCTION ENGINE STATES
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(3);
  const [lastSyncTime, setLastSyncTime] = useState('Today • 10:25 PM');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<'internet' | 'gps' | 'server' | 'session' | null>(null);

  // DASHBOARD PERSONALIZATION ENGINE
  const [visibleWidgets, setVisibleWidgets] = useState({
    mission: true,
    target: true,
    assignment: true,
    verification: true,
    stats: true,
    followups: true,
    aiAssistant: true,
    timeline: true,
    quickActions: true,
    fieldStatus: true
  });
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false);

  // NAVIGATION & MODALS
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeMainView, setActiveMainView] = useState<MainView>('DASHBOARD');
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'tasks' | 'wallet' | 'profile'>('home');
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // ATTENDANCE TAB FILTER (Today, History, Calendar, Logins)
  const [attendanceTab, setAttendanceTab] = useState<'today' | 'history' | 'calendar' | 'logins'>('today');
  // HISTORY TAB — search & status filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');
  // CALENDAR — selected date detail
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(null);
  // TODAY TAB — expandable activity / session panels + timeline
  const [showActPanel, setShowActPanel] = useState(false);
  const [showSessPanel, setShowSessPanel] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);


  // REF FOR OVERFLOW MENU CLICK OUTSIDE
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);

  // OVERFLOW MENU AUTOMATIC CLOSE & KEYDOWN LISTENERS
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isContextMenuOpen &&
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(event.target as Node) &&
        overflowButtonRef.current &&
        !overflowButtonRef.current.contains(event.target as Node)
      ) {
        setIsContextMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isContextMenuOpen) {
        setIsContextMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isContextMenuOpen]);

  useEffect(() => {
    if (isDrawerOpen || isSpeedDialOpen || isPermissionsModalOpen || isNotificationCenterOpen || isPersonalizeOpen || isAiModalOpen || isBatteryModalOpen) {
      setIsContextMenuOpen(false);
    }
  }, [isDrawerOpen, isSpeedDialOpen, isPermissionsModalOpen, isNotificationCenterOpen, isPersonalizeOpen, isAiModalOpen, isBatteryModalOpen]);

  const changeView = (view: MainView) => {
    setIsContextMenuOpen(false);
    setActiveMainView(view);
  };

  // ADVANCED GLOBAL SEARCH & VOICE SEARCH
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  // WORKFLOW FORM STATES
  const [regMobileNumber, setRegMobileNumber] = useState('');
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // FIELD VISIT SESSION TIMER
  const [isVisitStarted, setIsVisitStarted] = useState(false);
  const [visitTimer, setVisitTimer] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isVisitStarted) {
      interval = setInterval(() => setVisitTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isVisitStarted]);

  const formatVisitTimer = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // OFFICER PROFILE DATA
  const officer = {
    name: lang === 'mr' ? 'विकास शिंदे' : 'Vikas Shinde',
    designation: lang === 'mr' ? 'महा-कृषिदूत अधिकारी' : 'MAHA-AGRIDOOT Officer',
    districtTaluka: 'Wardha District • Seloo Taluka',
    officerId: 'MH-DOT-0025',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    department: 'Department of Agriculture, Govt of Maharashtra',
    bank: 'State Bank of India • A/c ****4829 (DBT Verified)',
    emergencyContact: 'Wardha Disaster HQ: 1800-233-0002',
    attendanceCompliance: '92% (24/26 Days Present)',
    performanceRank: '#1 Field Officer Wardha District (52 Enrolled)'
  };

  // =========================================================================
  // ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗███████╗
  // ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██╔════╝
  // █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝██║███████╗█████╗
  // ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██║╚════██║██╔══╝
  // ███████╗██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║██║███████║███████╗
  //
  // MAHA-AGRIDOOT ENTERPRISE ATTENDANCE ENGINE v2.0
  // GPS Field Login Ledger is the SINGLE SOURCE OF TRUTH.
  // All attendance views are automatically derived — no duplicate data tables.
  // Future-ready for: Payroll, TA/DA, Incentives, Performance KPI, HRMS, Audit.
  // =========================================================================

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 1 ▸ TYPE DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────

  /** All possible attendance status values used across the engine */
  type AttendanceStatus =
    | 'Present'     // Full day, GPS verified, required activity met
    | 'Half Day'    // Partial hours or partial activity
    | 'Absent'      // No login, no leave, no holiday
    | 'Leave'       // CL / SL / EL — pre-approved
    | 'Official Tour'   // Outstation duty — approved
    | 'Training'    // Official training — approved
    | 'Holiday'     // Gazetted / government holiday
    | 'Weekly Off'; // Saturday / Sunday

  /** Expanded leave type catalog */
  type LeaveType =
    | 'CL'     // Casual Leave
    | 'SL'     // Sick Leave
    | 'EL'     // Earned Leave
    | 'OT'     // Official Tour
    | 'TR'     // Training
    | 'PH'     // Public / Gazetted Holiday
    | 'WO';    // Weekly Off

  /** Enterprise leave record — replaces the old plain dictionary */
  type LeaveRecord = {
    dateKey:   string;        // 'YYYY-MM-DD'
    dateLabel: string;        // Marathi display label
    leaveType: LeaveType;
    reason:    string;        // Human-readable reason for display
    approved:  boolean;       // Approved by reporting officer
    approvedBy?: string;      // Approver name (optional for display)
  };

  /** Validated field work activity types — configurable and expandable */
  type WorkActivityType =
    | 'FARMER_REGISTRATION'
    | 'SOIL_SAMPLE_COLLECTION'
    | 'SOIL_TESTING_VISIT'
    | 'EDP_CANDIDATE_VISIT'
    | 'DRONE_ACTIVITY'
    | 'FOLLOW_UP_VISIT'
    | 'SURVEY'
    | 'DOCUMENT_VERIFICATION'
    | 'FIELD_INSPECTION'
    | 'OFFICIAL_MISSION_TASK'
    | 'DBT_VERIFICATION'
    | 'BENEFICIARY_COUNSELLING'
    | 'INTER_DEPARTMENT_MEETING';

  /** One verified field work activity record attached to a GPS session */
  type WorkActivityRecord = {
    activityId:   string;
    activityType: WorkActivityType;
    label:        string;       // Human-readable activity label
    completedAt:  string;       // Time completed e.g. '10:15 AM'
    beneficiary?: string;       // Farmer / candidate name if applicable
    evidenceRef?: string;       // Document ID / photo ref for audit
  };

  /** Enriched GPS login session record — SINGLE SOURCE OF TRUTH */
  type GpsLoginRecord = {
    id:           number;
    dateKey:      string;        // 'YYYY-MM-DD' — primary grouping key
    dateLabel:    string;        // Marathi display label
    loginTime:    string;        // '08:45:12 AM'
    logoutTime:   string;        // '05:30:08 PM' | '' = active session
    gpsAccuracy:  string;        // '< 10m'
    gpsStatus:    string;        // 'ACTIVE (< 10m)'
    geofenceZone: string;        // Named geofence zone
    location:     string;        // Full address + coordinates
    activities:   WorkActivityRecord[];  // Verified work done during this session
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 2 ▸ CONFIGURABLE ATTENDANCE RULE ENGINE
  // All thresholds are declared here — never hardcoded in business logic.
  // Future config UI / remote config can override these values.
  // ─────────────────────────────────────────────────────────────────────────
  const ATTENDANCE_RULES = {
    /** Working hours required for full-day Present (minutes) */
    FULL_DAY_MINUTES:         8 * 60,    // 480 min = 8 hours

    /** Working hours for Half Day (minutes) — inclusive lower bound */
    HALF_DAY_MINUTES:         4 * 60,    // 240 min = 4 hours

    /** Grace time allowed after official start time (minutes) */
    GRACE_TIME_MINUTES:       15,

    /** Official field working hours — e.g. 09:00 AM to 05:30 PM */
    OFFICIAL_START:           '09:00 AM',
    OFFICIAL_END:             '05:30 PM',

    /**
     * Minimum verified work activities required for Present status when
     * working duration alone is insufficient (activity-based evidence rule).
     */
    MIN_ACTIVITIES_FOR_PRESENT:  2,
    MIN_ACTIVITIES_FOR_HALF_DAY: 1,

    /**
     * Maximum GPS geofence radius (metres) for a session to be considered
     * GPS-verified.  Sessions beyond this radius require manual approval.
     */
    MAX_GEOFENCE_RADIUS_METRES:  50,

    /**
     * Auto-checkout rule: if officer did not log out, assume checkout at
     * end of official working hours (OFFICIAL_END) for calculation purposes.
     */
    AUTO_CHECKOUT_ENABLED: true,
    AUTO_CHECKOUT_TIME:    '05:30 PM',

    /**
     * Weekly off days (0 = Sunday, 6 = Saturday).
     * Configurable for departments with different weekly-off schedules.
     */
    WEEKLY_OFF_DAYS: [0] as number[],    // Sunday only; add 6 for Sat-Sun

    /**
     * Configurable list of approved field work activity types.
     * Add any new activity type here to make it count toward attendance.
     */
    APPROVED_ACTIVITY_TYPES: [
      'FARMER_REGISTRATION',
      'SOIL_SAMPLE_COLLECTION',
      'SOIL_TESTING_VISIT',
      'EDP_CANDIDATE_VISIT',
      'DRONE_ACTIVITY',
      'FOLLOW_UP_VISIT',
      'SURVEY',
      'DOCUMENT_VERIFICATION',
      'FIELD_INSPECTION',
      'OFFICIAL_MISSION_TASK',
      'DBT_VERIFICATION',
      'BENEFICIARY_COUNSELLING',
      'INTER_DEPARTMENT_MEETING'
    ] as WorkActivityType[]
  } as const;

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 3 ▸ LEAVE MANAGEMENT — Enterprise Leave Ledger
  // Replaces the temporary approvedLeaves plain dictionary.
  // ─────────────────────────────────────────────────────────────────────────
  const leaveLedger: LeaveRecord[] = [
    {
      dateKey:   '2026-07-23',
      dateLabel: '23 जुलै 2026',
      leaveType: 'CL',
      reason:    'Approved Casual Leave',
      approved:  true,
      approvedBy: 'District Agriculture Officer'
    },
    {
      dateKey:   '2026-07-20',
      dateLabel: '20 जुलै 2026',
      leaveType: 'WO',
      reason:    'Weekly Off (Sunday)',
      approved:  true
    },
    {
      dateKey:   '2026-07-13',
      dateLabel: '13 जुलै 2026',
      leaveType: 'WO',
      reason:    'Weekly Off (Sunday)',
      approved:  true
    },
    {
      dateKey:   '2026-07-06',
      dateLabel: '06 जुलै 2026',
      leaveType: 'WO',
      reason:    'Weekly Off (Sunday)',
      approved:  true
    }
  ];

  /** Quick lookup map: dateKey → LeaveRecord (O(1) access in engine) */
  const leaveMap = useMemo<Record<string, LeaveRecord>>(() => {
    const map: Record<string, LeaveRecord> = {};
    leaveLedger.forEach(l => { map[l.dateKey] = l; });
    return map;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 4 ▸ GPS FIELD LOGIN LEDGER — SINGLE SOURCE OF TRUTH
  // Activities array embeds verified field work evidence per session.
  // ─────────────────────────────────────────────────────────────────────────
  const gpsLoginLedger: GpsLoginRecord[] = [
    {
      id: 1, dateKey: '2026-07-27', dateLabel: '27 जुलै 2026',
      loginTime: '08:45:12 AM', logoutTime: '05:30:08 PM',
      gpsAccuracy: '< 10m', gpsStatus: 'ACTIVE (< 10m)',
      geofenceZone: 'Wardha Agri Hub',
      location: 'Wardha Agri Hub (Lat 20.7409, Long 78.5991)',
      activities: [
        { activityId: 'ACT-0701', activityType: 'FARMER_REGISTRATION',     label: 'Farmer Registration',     completedAt: '10:15 AM', beneficiary: 'Rajesh Patil',   evidenceRef: 'REG-2026-0701' },
        { activityId: 'ACT-0702', activityType: 'SOIL_SAMPLE_COLLECTION',  label: 'Soil Sample Collection',  completedAt: '09:42 AM', beneficiary: 'Hingni Village',  evidenceRef: 'SS-27-07-268'  },
        { activityId: 'ACT-0703', activityType: 'EDP_CANDIDATE_VISIT',     label: 'EDP Counselling',         completedAt: '09:05 AM', beneficiary: 'Sunil Shende',   evidenceRef: 'EDP-2026-055'  }
      ]
    },
    {
      id: 2, dateKey: '2026-07-26', dateLabel: '26 जुलै 2026',
      loginTime: '08:50:04 AM', logoutTime: '05:40:22 PM',
      gpsAccuracy: '< 14m', gpsStatus: 'ACTIVE (< 14m)',
      geofenceZone: 'Hingni Village',
      location: 'Hingni Field Office (Lat 20.6842, Long 78.5401)',
      activities: [
        { activityId: 'ACT-0601', activityType: 'FIELD_INSPECTION',        label: 'Field Inspection',        completedAt: '10:30 AM', beneficiary: 'Hingni Cluster',  evidenceRef: 'FI-2026-0601' },
        { activityId: 'ACT-0602', activityType: 'FOLLOW_UP_VISIT',         label: 'Follow-up Visit',         completedAt: '02:00 PM', beneficiary: 'Meena Gawande',   evidenceRef: 'FV-2026-0602' }
      ]
    },
    {
      id: 3, dateKey: '2026-07-25', dateLabel: '25 जुलै 2026',
      loginTime: '09:00:22 AM', logoutTime: '01:30:14 PM',
      gpsAccuracy: '< 12m', gpsStatus: 'ACTIVE (< 12m)',
      geofenceZone: 'Pavanar Cluster',
      location: 'Pavanar Cluster Hub (Lat 20.7105, Long 78.5780)',
      activities: [
        { activityId: 'ACT-0501', activityType: 'DOCUMENT_VERIFICATION',   label: 'Document Verification',   completedAt: '10:00 AM', beneficiary: 'Anita Kale',     evidenceRef: 'DV-2026-0501' }
      ]
    },
    {
      id: 4, dateKey: '2026-07-24', dateLabel: '24 जुलै 2026',
      loginTime: '08:40:19 AM', logoutTime: '05:30:45 PM',
      gpsAccuracy: '< 8m', gpsStatus: 'ACTIVE (< 8m)',
      geofenceZone: 'Wardha HQ',
      location: 'District Coordinator HQ (Lat 20.7500, Long 78.6100)',
      activities: [
        { activityId: 'ACT-0401', activityType: 'OFFICIAL_MISSION_TASK',   label: 'Mission Briefing',        completedAt: '09:30 AM', evidenceRef: 'MIS-2026-0401' },
        { activityId: 'ACT-0402', activityType: 'DBT_VERIFICATION',        label: 'DBT Grant Verification',  completedAt: '11:00 AM', beneficiary: 'Prakash Bhosle', evidenceRef: 'DBT-2026-0402' },
        { activityId: 'ACT-0403', activityType: 'SURVEY',                  label: 'Village Survey',          completedAt: '02:30 PM', beneficiary: 'Seloo Ward 4',   evidenceRef: 'SRV-2026-0403' }
      ]
    },
    {
      id: 5, dateKey: '2026-07-22', dateLabel: '22 जुलै 2026',
      loginTime: '08:45:33 AM', logoutTime: '05:25:01 PM',
      gpsAccuracy: '< 11m', gpsStatus: 'ACTIVE (< 11m)',
      geofenceZone: 'Seloo Tehsil',
      location: 'Seloo Tehsil Office (Lat 20.6990, Long 78.5640)',
      activities: [
        { activityId: 'ACT-0301', activityType: 'BENEFICIARY_COUNSELLING', label: 'Beneficiary Counselling',  completedAt: '10:00 AM', beneficiary: 'Ramesh Jadhav',  evidenceRef: 'BC-2026-0301' },
        { activityId: 'ACT-0302', activityType: 'FARMER_REGISTRATION',     label: 'Farmer Registration',     completedAt: '01:15 PM', beneficiary: 'Savita Nimkar',  evidenceRef: 'REG-2026-0302' }
      ]
    },
    {
      id: 6, dateKey: '2026-07-21', dateLabel: '21 जुलै 2026',
      loginTime: '08:38:50 AM', logoutTime: '05:32:10 PM',
      gpsAccuracy: '< 9m', gpsStatus: 'ACTIVE (< 9m)',
      geofenceZone: 'Sevagram Hub',
      location: 'Sevagram Agri Centre (Lat 20.6800, Long 78.5620)',
      activities: [
        { activityId: 'ACT-0201', activityType: 'SOIL_TESTING_VISIT',      label: 'Soil Testing Visit',      completedAt: '09:50 AM', evidenceRef: 'ST-2026-0201' },
        { activityId: 'ACT-0202', activityType: 'EDP_CANDIDATE_VISIT',     label: 'EDP Candidate Visit',     completedAt: '02:00 PM', beneficiary: 'Arjun Kolhe',    evidenceRef: 'EDP-2026-0202' }
      ]
    },
    {
      id: 7, dateKey: '2026-07-19', dateLabel: '19 जुलै 2026',
      loginTime: '08:55:07 AM', logoutTime: '05:28:43 PM',
      gpsAccuracy: '< 13m', gpsStatus: 'ACTIVE (< 13m)',
      geofenceZone: 'Wardha Agri Hub',
      location: 'Wardha Agri Hub (Lat 20.7409, Long 78.5991)',
      activities: [
        { activityId: 'ACT-0101', activityType: 'DRONE_ACTIVITY',          label: 'Drone Field Survey',      completedAt: '10:30 AM', evidenceRef: 'DRN-2026-0101' },
        { activityId: 'ACT-0102', activityType: 'INTER_DEPARTMENT_MEETING',label: 'Inter-Dept Coordination', completedAt: '03:00 PM', evidenceRef: 'MTG-2026-0102' }
      ]
    },
    {
      id: 8, dateKey: '2026-07-18', dateLabel: '18 जुलै 2026',
      loginTime: '08:42:00 AM', logoutTime: '05:35:00 PM',
      gpsAccuracy: '< 10m', gpsStatus: 'ACTIVE (< 10m)',
      geofenceZone: 'Hingni Village',
      location: 'Hingni Field Office (Lat 20.6842, Long 78.5401)',
      activities: [
        { activityId: 'ACT-0001', activityType: 'FARMER_REGISTRATION',     label: 'Farmer Registration',     completedAt: '09:30 AM', beneficiary: 'Santosh More',   evidenceRef: 'REG-2026-0001' },
        { activityId: 'ACT-0002', activityType: 'FIELD_INSPECTION',        label: 'Field Inspection',        completedAt: '11:45 AM', beneficiary: 'Hingni Plot 12',  evidenceRef: 'FI-2026-0002'  },
        { activityId: 'ACT-0003', activityType: 'FOLLOW_UP_VISIT',         label: 'Follow-up Visit',         completedAt: '03:30 PM', beneficiary: 'Lata Deshmukh',  evidenceRef: 'FV-2026-0003'  }
      ]
    },
    {
      id: 9, dateKey: '2026-07-17', dateLabel: '17 जुलै 2026',
      loginTime: '09:05:11 AM', logoutTime: '05:20:00 PM',
      gpsAccuracy: '< 15m', gpsStatus: 'ACTIVE (< 15m)',
      geofenceZone: 'Pavanar Cluster',
      location: 'Pavanar Cluster Hub (Lat 20.7105, Long 78.5780)',
      activities: [
        { activityId: 'ACT-0901', activityType: 'SOIL_SAMPLE_COLLECTION',  label: 'Soil Sample Collection',  completedAt: '10:00 AM', beneficiary: 'Pavanar Block A', evidenceRef: 'SS-17-07-901'  },
        { activityId: 'ACT-0902', activityType: 'SURVEY',                  label: 'Crop Survey',             completedAt: '02:15 PM', beneficiary: 'Pavanar Block B', evidenceRef: 'SRV-2026-0902' }
      ]
    },
    {
      id: 10, dateKey: '2026-07-16', dateLabel: '16 जुलै 2026',
      loginTime: '08:48:30 AM', logoutTime: '05:30:00 PM',
      gpsAccuracy: '< 10m', gpsStatus: 'ACTIVE (< 10m)',
      geofenceZone: 'Wardha HQ',
      location: 'District Coordinator HQ (Lat 20.7500, Long 78.6100)',
      activities: [
        { activityId: 'ACT-0801', activityType: 'OFFICIAL_MISSION_TASK',   label: 'Quarterly Review Meeting',completedAt: '10:30 AM', evidenceRef: 'MIS-2026-0801' },
        { activityId: 'ACT-0802', activityType: 'DBT_VERIFICATION',        label: 'DBT Grant Audit',         completedAt: '02:00 PM', evidenceRef: 'DBT-2026-0802' }
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 5 ▸ COMPUTATION UTILITIES
  // Pure functions — no side effects, safe for useMemo / future unit tests.
  // ─────────────────────────────────────────────────────────────────────────

  /** Parse '08:45:12 AM' / '08:45 AM' → total minutes since midnight */
  const parseTimeToMinutes = (t: string): number => {
    if (!t || t === '—' || t.includes('Active')) return 0;
    const parts = t.trim().split(' ');
    const meridiem = parts[1] ?? 'AM';
    const [hStr, mStr] = (parts[0] ?? '0:0').split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr ?? '0', 10);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  /** Format total minutes → '8h 45m' display string */
  const formatMinutesToHours = (mins: number): string => {
    const h = Math.floor(Math.abs(mins) / 60);
    const m = Math.abs(mins) % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  /**
   * Count verified work activities in a session that appear in the
   * configurable approved activity types list.
   */
  const countApprovedActivities = (activities: WorkActivityRecord[]): number =>
    activities.filter(a =>
      (ATTENDANCE_RULES.APPROVED_ACTIVITY_TYPES as readonly string[]).includes(a.activityType)
    ).length;

  /**
   * ENTERPRISE STATUS DERIVATION FUNCTION
   * Parameters: workingMins, activityCount, dateKey, leaveMap
   * Returns: AttendanceStatus
   *
   * Decision matrix:
   *   1. Leave / Holiday / Weekly Off  → from leaveMap (highest priority)
   *   2. No GPS login at all           → Absent (unless covered above)
   *   3. GPS + Duration ≥ FULL_DAY     → Present
   *   4. GPS + Duration ≥ HALF_DAY
   *        OR  activities ≥ MIN_FOR_PRESENT  → Present (activity override)
   *   5. GPS + Duration < HALF_DAY
   *        AND activities ≥ MIN_FOR_HALF_DAY → Half Day
   *   6. All else                      → Absent
   */
  const deriveAttendanceStatus = (
    workingMins: number,
    activityCount: number,
    dateKey: string,
    leaveMapRef: Record<string, LeaveRecord>
  ): AttendanceStatus => {
    // Priority 1: Leave ledger entry (Leave / Tour / Training / Holiday / WO)
    const leaveEntry = leaveMapRef[dateKey];
    if (leaveEntry) {
      if (leaveEntry.leaveType === 'WO') return 'Weekly Off';
      if (leaveEntry.leaveType === 'PH') return 'Holiday';
      if (leaveEntry.leaveType === 'OT') return 'Official Tour';
      if (leaveEntry.leaveType === 'TR') return 'Training';
      return 'Leave';
    }

    // Priority 2: No GPS login → Absent
    if (workingMins === 0 && activityCount === 0) return 'Absent';

    // Priority 3: Full day by duration
    if (workingMins >= ATTENDANCE_RULES.FULL_DAY_MINUTES) return 'Present';

    // Priority 4: Activity-evidence override → Present
    if (activityCount >= ATTENDANCE_RULES.MIN_ACTIVITIES_FOR_PRESENT &&
        workingMins >= ATTENDANCE_RULES.HALF_DAY_MINUTES) return 'Present';

    // Priority 5: Half day by duration OR single activity evidence
    if (workingMins >= ATTENDANCE_RULES.HALF_DAY_MINUTES ||
        activityCount >= ATTENDANCE_RULES.MIN_ACTIVITIES_FOR_HALF_DAY) return 'Half Day';

    // Fallthrough: Absent
    return 'Absent';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 6 ▸ DERIVED VIEWS (all useMemo — zero duplicate data)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ATTENDANCE HISTORY
   * Grouped by dateKey. Each day: first-login = check-in, last-logout = check-out.
   * Leave ledger entries with no GPS login are injected automatically.
   */
  const attendanceHistoryList = useMemo(() => {
    // Group GPS sessions by date
    const byDate: Record<string, GpsLoginRecord[]> = {};
    gpsLoginLedger.forEach(rec => {
      if (!byDate[rec.dateKey]) byDate[rec.dateKey] = [];
      byDate[rec.dateKey].push(rec);
    });

    // Build a row per GPS-day
    const rows = Object.keys(byDate)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => {
        const recs        = byDate[dateKey];
        const firstLogin  = recs[0];
        const lastRecord  = recs[recs.length - 1];

        const checkIn  = firstLogin.loginTime;
        // Auto-checkout rule: if no logout recorded, use AUTO_CHECKOUT_TIME
        const rawOut   = lastRecord.logoutTime ||
          (ATTENDANCE_RULES.AUTO_CHECKOUT_ENABLED ? ATTENDANCE_RULES.AUTO_CHECKOUT_TIME : '');
        const checkOut = rawOut || '—';

        const inMins   = parseTimeToMinutes(checkIn);
        const outMins  = parseTimeToMinutes(checkOut);
        const workMins = checkOut !== '—' ? Math.max(0, outMins - inMins) : 0;

        // Total approved activities across all sessions for this day
        const totalActivities = recs.reduce((sum, r) => sum + countApprovedActivities(r.activities), 0);

        const status = deriveAttendanceStatus(workMins, totalActivities, dateKey, leaveMap);

        return {
          date:          firstLogin.dateLabel,
          dateKey,
          checkIn,
          checkOut:      lastRecord.logoutTime ? lastRecord.logoutTime : '—',
          hours:         workMins > 0 ? formatMinutesToHours(workMins) : '(Active)',
          workingMins:   workMins,
          status,
          activityCount: totalActivities,
          gps:           'Verified',
          location:      firstLogin.geofenceZone
        };
      });

    // Inject leave-ledger days that have no GPS login (leaves, holidays, WOs)
    leaveLedger.forEach(leave => {
      const exists = rows.find(r => r.dateKey === leave.dateKey);
      if (!exists) {
        const status = deriveAttendanceStatus(0, 0, leave.dateKey, leaveMap);
        rows.push({
          date: leave.dateLabel, dateKey: leave.dateKey,
          checkIn: '—', checkOut: '—', hours: '0h 00m', workingMins: 0,
          status, activityCount: 0, gps: 'N/A', location: leave.reason
        });
      }
    });

    return rows.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [leaveMap]);

  /**
   * TODAY'S ATTENDANCE SUMMARY
   * Derived from GPS sessions for TODAY_KEY + leave ledger.
   * '2026-07-27' is treated as today for demo purposes.
   */
  const TODAY_KEY = '2026-07-27';

  const todayAttendance = useMemo(() => {
    const todayRecs = gpsLoginLedger.filter(r => r.dateKey === TODAY_KEY);

    // Check leave ledger first
    if (!todayRecs.length) {
      const leaveEntry = leaveMap[TODAY_KEY];
      if (leaveEntry) {
        return { checkIn: '—', checkOut: '—', status: leaveEntry.reason.toUpperCase(), gpsVerified: 'Leave Day', workingHours: '0h 00m' };
      }
      return { checkIn: '—', checkOut: '—', status: 'NOT CHECKED IN', gpsVerified: 'No GPS Login Today', workingHours: '0h 00m' };
    }

    const first  = todayRecs[0];
    const last   = todayRecs[todayRecs.length - 1];
    const checkIn  = first.loginTime;
    const checkOut = last.logoutTime || '(Active)';

    const inMins    = parseTimeToMinutes(checkIn);
    const outMins   = last.logoutTime ? parseTimeToMinutes(last.logoutTime) : 0;
    const worked    = last.logoutTime ? Math.max(0, outMins - inMins) : 0;

    const totalActivities = todayRecs.reduce((s, r) => s + countApprovedActivities(r.activities), 0);
    const status  = deriveAttendanceStatus(worked, totalActivities, TODAY_KEY, leaveMap);
    const wHours  = last.logoutTime ? formatMinutesToHours(worked) : '(Active Session)';

    return {
      checkIn,
      checkOut,
      status: status.toUpperCase(),
      gpsVerified: `Geofenced • ${first.geofenceZone} (${first.gpsAccuracy})`,
      workingHours: wHours
    };
  }, [leaveMap]);

  /**
   * MONTHLY ATTENDANCE SUMMARY
   * Calculated from attendanceHistoryList — no separate counters.
   * Payroll-compatible: tracks half-days as 0.5 working days.
   */
  const monthlySummary = useMemo(() => {
    const WORKING_DAYS_JULY_2026 = 26; // Excl. 4 Sundays + 1 national holiday

    const present  = attendanceHistoryList.filter(r => r.status === 'Present').length;
    const halfDay  = attendanceHistoryList.filter(r => r.status === 'Half Day').length;
    const leave    = attendanceHistoryList.filter(r =>
      r.status === 'Leave' || r.status === 'Official Tour' || r.status === 'Training'
    ).length;
    const weeklyOff = attendanceHistoryList.filter(r => r.status === 'Weekly Off' || r.status === 'Holiday').length;
    const absent   = WORKING_DAYS_JULY_2026 - present - halfDay - leave;

    // Payroll-equivalent working days (half-day counts as 0.5)
    const effectiveWorkDays = present + halfDay * 0.5;
    const pct = (effectiveWorkDays / WORKING_DAYS_JULY_2026 * 100).toFixed(1) + '%';

    return {
      workingDays: WORKING_DAYS_JULY_2026,
      present,
      halfDay,
      leave,
      weeklyOff,
      absent:      Math.max(0, absent),
      percentage:  pct,
      // Payroll-ready fields (consumed by future Payroll / TA-DA modules)
      effectiveWorkDays,
      totalActivities: attendanceHistoryList.reduce((s, r) => s + r.activityCount, 0)
    };
  }, [attendanceHistoryList]);

  /**
   * GPS LOGIN HISTORY — Raw audit log for the "GPS Logins" tab.
   * This is the immutable field audit trail consumed by compliance/HRMS.
   */
  const fieldLoginHistoryList = useMemo(() =>
    [...gpsLoginLedger].sort((a, b) => b.id - a.id).map(r => ({
      id:          r.id,
      date:        r.dateLabel,
      dateKey:     r.dateKey,
      time:        r.loginTime,
      logoutTime:  r.logoutTime,
      gpsStatus:   r.gpsStatus,
      location:    r.location,
      activityCount: countApprovedActivities(r.activities)
    })),
  []);


  // =========================================================================
  // ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗███████╗
  //
  // MAHA-AGRIDOOT ENTERPRISE ATTENDANCE ENGINE v2.1
  // Attendance Adjustment & Audit Enhancement
  //
  // NEW LAYERS:
  //   7  — RBAC Role Model & Permission Matrix
  //   8  — Attendance Source Registry
  //   9  — Attendance Confidence Score Engine
  //  10  — Attendance Adjustment Ledger (immutable correction workflow)
  //  11  — Immutable Audit Log
  //  12  — Expanded Payroll / HRMS Report
  // =========================================================================

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 7 ▸ RBAC — Role-Based Access Control
  // Hierarchical approval model: DC < State < Super (one-way override only)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * System roles in ascending hierarchy.
   * A higher-indexed role can override a lower-indexed role's decision;
   * the reverse is NOT permitted (enforced by canOverride() below).
   */
  type SystemRole =
    | 'FIELD_OFFICER'       // Idx 0 — submit requests only
    | 'TALUKA_COORDINATOR'  // Idx 1 — review + forward, cannot approve
    | 'DISTRICT_COORDINATOR'// Idx 2 — Approve / Reject / Return
    | 'STATE_ADMIN'         // Idx 3 — Full rights + override DC decisions
    | 'SUPER_ADMIN';        // Idx 4 — Full control + override all, complete audit

  const ROLE_HIERARCHY: Record<SystemRole, number> = {
    FIELD_OFFICER:        0,
    TALUKA_COORDINATOR:   1,
    DISTRICT_COORDINATOR: 2,
    STATE_ADMIN:          3,
    SUPER_ADMIN:          4
  };

  type RbacPermission =
    | 'SUBMIT_ADJUSTMENT_REQUEST'
    | 'REVIEW_ADJUSTMENT_REQUEST'
    | 'FORWARD_ADJUSTMENT_REQUEST'
    | 'APPROVE_ADJUSTMENT'
    | 'REJECT_ADJUSTMENT'
    | 'RETURN_FOR_CLARIFICATION'
    | 'OVERRIDE_ADJUSTMENT'     // Only STATE_ADMIN / SUPER_ADMIN
    | 'VIEW_AUDIT_LOG'
    | 'EXPORT_ATTENDANCE_REPORT'
    | 'VIEW_CONFIDENCE_SCORE'
    | 'MANAGE_LEAVE_LEDGER'
    | 'CONFIGURE_ATTENDANCE_RULES';

  /** Permission matrix — every role's allowed actions */
  const RBAC_PERMISSIONS: Record<SystemRole, RbacPermission[]> = {
    FIELD_OFFICER: [
      'SUBMIT_ADJUSTMENT_REQUEST'
    ],
    TALUKA_COORDINATOR: [
      'SUBMIT_ADJUSTMENT_REQUEST',
      'REVIEW_ADJUSTMENT_REQUEST',
      'FORWARD_ADJUSTMENT_REQUEST',
      'VIEW_AUDIT_LOG'
    ],
    DISTRICT_COORDINATOR: [
      'SUBMIT_ADJUSTMENT_REQUEST',
      'REVIEW_ADJUSTMENT_REQUEST',
      'FORWARD_ADJUSTMENT_REQUEST',
      'APPROVE_ADJUSTMENT',
      'REJECT_ADJUSTMENT',
      'RETURN_FOR_CLARIFICATION',
      'VIEW_AUDIT_LOG',
      'EXPORT_ATTENDANCE_REPORT',
      'VIEW_CONFIDENCE_SCORE'
    ],
    STATE_ADMIN: [
      'SUBMIT_ADJUSTMENT_REQUEST',
      'REVIEW_ADJUSTMENT_REQUEST',
      'FORWARD_ADJUSTMENT_REQUEST',
      'APPROVE_ADJUSTMENT',
      'REJECT_ADJUSTMENT',
      'RETURN_FOR_CLARIFICATION',
      'OVERRIDE_ADJUSTMENT',        // Can override DC decisions
      'VIEW_AUDIT_LOG',
      'EXPORT_ATTENDANCE_REPORT',
      'VIEW_CONFIDENCE_SCORE',
      'MANAGE_LEAVE_LEDGER'
    ],
    SUPER_ADMIN: [
      'SUBMIT_ADJUSTMENT_REQUEST',
      'REVIEW_ADJUSTMENT_REQUEST',
      'FORWARD_ADJUSTMENT_REQUEST',
      'APPROVE_ADJUSTMENT',
      'REJECT_ADJUSTMENT',
      'RETURN_FOR_CLARIFICATION',
      'OVERRIDE_ADJUSTMENT',        // Can override ALL decisions
      'VIEW_AUDIT_LOG',
      'EXPORT_ATTENDANCE_REPORT',
      'VIEW_CONFIDENCE_SCORE',
      'MANAGE_LEAVE_LEDGER',
      'CONFIGURE_ATTENDANCE_RULES'
    ]
  };

  /**
   * HIERARCHICAL OVERRIDE CHECK
   * A role may override another's decision ONLY if its hierarchy index is strictly
   * higher. DC cannot override STATE_ADMIN or SUPER_ADMIN decisions.
   */
  const canOverride = (actorRole: SystemRole, targetRole: SystemRole): boolean =>
    ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];

  const hasPermission = (role: SystemRole, permission: RbacPermission): boolean =>
    RBAC_PERMISSIONS[role].includes(permission);

  // Active session role (Field Officer by default; promoted on login)
  const CURRENT_USER_ROLE: SystemRole = 'FIELD_OFFICER';
  const CURRENT_USER_ID   = 'MH-DOT-0025';
  const CURRENT_USER_NAME = 'Vikas Shinde';

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 8 ▸ ATTENDANCE SOURCE REGISTRY
  // Every attendance record tracks how it was created — for full auditability.
  // ─────────────────────────────────────────────────────────────────────────

  type AttendanceSource =
    | 'GPS_LOGIN'        // Created from GPS field login
    | 'AUTO_GENERATED'   // System generated (e.g., Weekend / Holiday)
    | 'MANUAL_APPROVED'  // Created via approved Adjustment Request
    | 'OFFICIAL_TOUR'    // Official outstation duty
    | 'TRAINING'         // Approved training
    | 'LEAVE'            // Approved leave
    | 'HOLIDAY'          // Gazetted holiday
    | 'WEEKLY_OFF'       // Weekly off day
    | 'SYSTEM_GENERATED' // Payroll / HRMS integration generated
    | 'OFFLINE_SYNC';    // Synced from offline device after connectivity restored

  /** Map AttendanceStatus to its most likely source for audit display */
  const deriveAttendanceSource = (
    status: AttendanceStatus,
    hasGpsLogin: boolean,
    isAdjusted: boolean
  ): AttendanceSource => {
    if (isAdjusted) return 'MANUAL_APPROVED';
    if (status === 'Weekly Off')   return 'WEEKLY_OFF';
    if (status === 'Holiday')      return 'HOLIDAY';
    if (status === 'Leave')        return 'LEAVE';
    if (status === 'Official Tour') return 'OFFICIAL_TOUR';
    if (status === 'Training')     return 'TRAINING';
    if (hasGpsLogin)               return 'GPS_LOGIN';
    return 'AUTO_GENERATED';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 9 ▸ ATTENDANCE CONFIDENCE SCORE ENGINE
  //
  // Factors (weighted):
  //   GPS Verified          — 25 pts
  //   GeoFence < 20m        — 20 pts  (partial credit if < 50m)
  //   Working Duration      — 25 pts  (proportional to FULL_DAY_MINUTES)
  //   Verified Activities   — 20 pts  (proportional to MIN_ACTIVITIES_FOR_PRESENT)
  //   Device Validated      — 5  pts  (stub — always true for registered devices)
  //   Offline Sync Valid    — 5  pts  (stub — true if sync timestamp < 24h)
  //
  //  Total: 100 pts
  // ─────────────────────────────────────────────────────────────────────────

  type ConfidenceScore = {
    total:      number;   // 0–100
    gps:        number;   // 0–25
    geofence:   number;   // 0–20
    duration:   number;   // 0–25
    activities: number;   // 0–20
    device:     number;   // 0–5
    offlineSync:number;   // 0–5
    grade:      'A' | 'B' | 'C' | 'D' | 'F';
  };

  const computeConfidenceScore = (
    gpsAccuracyStr: string,   // '< 10m'
    workingMins:    number,
    activityCount:  number,
    hasGpsLogin:    boolean
  ): ConfidenceScore => {
    // GPS presence (25 pts)
    const gps = hasGpsLogin ? 25 : 0;

    // GeoFence accuracy (20 pts — full if <20m, partial if 20–50m, 0 if >50m)
    const accuracyM = parseInt((gpsAccuracyStr.match(/\d+/) ?? ['999'])[0], 10);
    const geofence = accuracyM < 20 ? 20 : accuracyM < 50 ? 10 : 0;

    // Working duration (25 pts — proportional)
    const durationRatio = Math.min(1, workingMins / ATTENDANCE_RULES.FULL_DAY_MINUTES);
    const duration = Math.round(durationRatio * 25);

    // Verified activities (20 pts — proportional, max at MIN_ACTIVITIES_FOR_PRESENT)
    const actRatio = Math.min(1, activityCount / ATTENDANCE_RULES.MIN_ACTIVITIES_FOR_PRESENT);
    const activities = Math.round(actRatio * 20);

    // Device validation stub (5 pts — production: compare device fingerprint)
    const device = hasGpsLogin ? 5 : 0;

    // Offline sync stub (5 pts — production: check sync_timestamp delta)
    const offlineSync = hasGpsLogin ? 5 : 0;

    const total = gps + geofence + duration + activities + device + offlineSync;
    const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
      total >= 90 ? 'A' :
      total >= 75 ? 'B' :
      total >= 60 ? 'C' :
      total >= 40 ? 'D' : 'F';

    return { total, gps, geofence, duration, activities, device, offlineSync, grade };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 10 ▸ ATTENDANCE ADJUSTMENT LEDGER
  //
  // Immutable correction workflow — original records are NEVER modified.
  // An approved Adjustment changes only the computed business view.
  // Rejection reason and complete audit trail are preserved permanently.
  //
  // RBAC:  Field Officer → submit only
  //        Taluka Coord  → review + forward
  //        District Coord→ Approve / Reject / Return
  //        State Admin   → Full rights + override DC decision
  //        Super Admin   → Full control + override all
  // ─────────────────────────────────────────────────────────────────────────

  type AdjustmentStatus =
    | 'PENDING'           // Submitted, awaiting review
    | 'UNDER_REVIEW'      // Being reviewed by Taluka/DC
    | 'FORWARDED'         // Forwarded to higher authority
    | 'APPROVED'          // Approved — overrides computed status
    | 'REJECTED'          // Rejected with reason
    | 'RETURNED'          // Returned for clarification
    | 'OVERRIDDEN';       // Overridden by higher authority

  type AdjustmentRecord = {
    adjustmentId:      string;       // 'ADJ-YYYY-NNNN'
    attendanceDate:    string;       // dateKey 'YYYY-MM-DD'
    employeeId:        string;
    employeeName:      string;
    originalStatus:    AttendanceStatus;
    requestedStatus:   AttendanceStatus;
    reason:            string;
    supportingDocRef?: string;       // Document ID or file ref
    requestedBy:       string;
    requestedByRole:   SystemRole;
    requestedAt:       string;       // ISO timestamp
    approvalStatus:    AdjustmentStatus;
    reviewedBy?:       string;
    reviewedByRole?:   SystemRole;
    reviewedAt?:       string;
    approvedBy?:       string;
    approvedByRole?:   SystemRole;
    approvedAt?:       string;
    rejectedBy?:       string;
    rejectedByRole?:   SystemRole;
    rejectedAt?:       string;
    rejectionReason?:  string;
    overriddenBy?:     string;
    overriddenByRole?: SystemRole;
    overriddenAt?:     string;
    overrideReason?:   string;
    systemRemarks:     string;
  };

  /**
   * ADJUSTMENT LEDGER
   * Production: these records come from backend API.
   * Original attendance is never mutated — only this ledger is updated.
   */
  const adjustmentLedger: AdjustmentRecord[] = [
    {
      adjustmentId:    'ADJ-2026-0001',
      attendanceDate:  '2026-07-25',
      employeeId:      'MH-DOT-0025',
      employeeName:    'Vikas Shinde',
      originalStatus:  'Half Day',
      requestedStatus: 'Present',
      reason:          'GPS signal lost due to tunnel area. Field inspection completed for full day. Evidence: 2 field photographs + supervisor confirmation.',
      supportingDocRef:'DOC-2026-0725-FI',
      requestedBy:     'Vikas Shinde',
      requestedByRole: 'FIELD_OFFICER',
      requestedAt:     '2026-07-25T18:30:00+05:30',
      approvalStatus:  'APPROVED',
      reviewedBy:      'Rahul Desai',
      reviewedByRole:  'TALUKA_COORDINATOR',
      reviewedAt:      '2026-07-26T09:15:00+05:30',
      approvedBy:      'Dr. Priya Meshram',
      approvedByRole:  'DISTRICT_COORDINATOR',
      approvedAt:      '2026-07-26T11:30:00+05:30',
      systemRemarks:   'GPS accuracy < 50m in tunnel zone. Field evidence accepted. Status upgraded to Present.'
    },
    {
      adjustmentId:    'ADJ-2026-0002',
      attendanceDate:  '2026-07-20',
      employeeId:      'MH-DOT-0025',
      employeeName:    'Vikas Shinde',
      originalStatus:  'Weekly Off',
      requestedStatus: 'Present',
      reason:          'Emergency field deployment — flood assessment in Hingni cluster on weekly off day.',
      requestedBy:     'Vikas Shinde',
      requestedByRole: 'FIELD_OFFICER',
      requestedAt:     '2026-07-20T20:00:00+05:30',
      approvalStatus:  'PENDING',
      systemRemarks:   'Awaiting District Coordinator review.'
    },
    {
      adjustmentId:    'ADJ-2026-0003',
      attendanceDate:  '2026-07-15',
      employeeId:      'MH-DOT-0025',
      employeeName:    'Vikas Shinde',
      originalStatus:  'Absent',
      requestedStatus: 'Leave',
      reason:          'Medical emergency — hospitalisation. Sick leave application submitted.',
      supportingDocRef:'SL-DOC-0715-2026',
      requestedBy:     'Vikas Shinde',
      requestedByRole: 'FIELD_OFFICER',
      requestedAt:     '2026-07-17T10:00:00+05:30',
      approvalStatus:  'REJECTED',
      reviewedBy:      'Rahul Desai',
      reviewedByRole:  'TALUKA_COORDINATOR',
      reviewedAt:      '2026-07-18T09:00:00+05:30',
      rejectedBy:      'Dr. Priya Meshram',
      rejectedByRole:  'DISTRICT_COORDINATOR',
      rejectedAt:      '2026-07-18T14:00:00+05:30',
      rejectionReason: 'Medical certificate not attached. Please resubmit with valid medical document.',
      systemRemarks:   'Resubmission allowed within 7 days with supporting documents.'
    }
  ];

  /**
   * Quick lookup: dateKey → approved adjustment (only APPROVED status matters
   * for status override; PENDING/REJECTED do not affect computed attendance).
   */
  const approvedAdjustmentMap = useMemo<Record<string, AdjustmentRecord>>(() => {
    const map: Record<string, AdjustmentRecord> = {};
    adjustmentLedger
      .filter(a => a.approvalStatus === 'APPROVED' || a.approvalStatus === 'OVERRIDDEN')
      .forEach(a => { map[a.attendanceDate] = a; });
    return map;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 11 ▸ IMMUTABLE AUDIT LOG
  //
  // Every attendance action creates an immutable record.
  // Records can never be deleted or modified — append-only.
  // Production: persisted to append-only database table / blockchain hash.
  // ─────────────────────────────────────────────────────────────────────────

  type AuditAction =
    | 'ATTENDANCE_CREATED'
    | 'ADJUSTMENT_SUBMITTED'
    | 'ADJUSTMENT_REVIEWED'
    | 'ADJUSTMENT_FORWARDED'
    | 'ADJUSTMENT_APPROVED'
    | 'ADJUSTMENT_REJECTED'
    | 'ADJUSTMENT_RETURNED'
    | 'ADJUSTMENT_OVERRIDDEN'
    | 'GPS_LOGIN_RECORDED'
    | 'GPS_LOGOUT_RECORDED'
    | 'OFFLINE_SYNC_COMPLETED'
    | 'LEAVE_APPLIED'
    | 'LEAVE_APPROVED'
    | 'REPORT_EXPORTED';

  type AuditLogEntry = {
    auditId:       string;         // 'AUD-YYYY-NNNN'
    action:        AuditAction;
    entityType:    'ATTENDANCE' | 'ADJUSTMENT' | 'LEAVE' | 'GPS_SESSION' | 'REPORT';
    entityId:      string;         // dateKey or adjustmentId or GPS session id
    performedBy:   string;
    performedByRole: SystemRole;
    performedAt:   string;         // ISO timestamp
    ipAddress:     string;         // Production: from HTTP header
    deviceId:      string;         // Production: device fingerprint
    location:      string;         // Production: GPS at time of action
    reason?:       string;
    previousValue?: string;        // JSON-serialised prior state
    newValue?:      string;        // JSON-serialised new state
    immutable:     true;           // Design marker — records cannot be changed
  };

  /**
   * AUDIT LOG
   * Production: stored in an append-only table, signed with server HMAC.
   * Immutability enforced at DB level (no UPDATE/DELETE permissions on this table).
   */
  const auditLog: AuditLogEntry[] = [
    {
      auditId: 'AUD-2026-0001', action: 'GPS_LOGIN_RECORDED',
      entityType: 'GPS_SESSION', entityId: 'GPS-1',
      performedBy: 'Vikas Shinde', performedByRole: 'FIELD_OFFICER',
      performedAt: '2026-07-27T08:45:12+05:30',
      ipAddress: '10.14.22.45', deviceId: 'DEV-MH0025-A1',
      location: 'Wardha Agri Hub (20.7409, 78.5991)',
      newValue: JSON.stringify({ loginTime: '08:45:12 AM', gpsAccuracy: '< 10m' }),
      immutable: true
    },
    {
      auditId: 'AUD-2026-0002', action: 'ADJUSTMENT_SUBMITTED',
      entityType: 'ADJUSTMENT', entityId: 'ADJ-2026-0001',
      performedBy: 'Vikas Shinde', performedByRole: 'FIELD_OFFICER',
      performedAt: '2026-07-25T18:30:00+05:30',
      ipAddress: '10.14.22.45', deviceId: 'DEV-MH0025-A1',
      location: 'Pavanar Cluster Hub (20.7105, 78.5780)',
      reason: 'GPS signal lost. Full day work completed.',
      previousValue: JSON.stringify({ status: 'Half Day' }),
      newValue:      JSON.stringify({ requestedStatus: 'Present' }),
      immutable: true
    },
    {
      auditId: 'AUD-2026-0003', action: 'ADJUSTMENT_APPROVED',
      entityType: 'ADJUSTMENT', entityId: 'ADJ-2026-0001',
      performedBy: 'Dr. Priya Meshram', performedByRole: 'DISTRICT_COORDINATOR',
      performedAt: '2026-07-26T11:30:00+05:30',
      ipAddress: '10.14.10.02', deviceId: 'DEV-DC-WARDHA-01',
      location: 'District Coordinator HQ, Wardha',
      reason: 'GPS tunnel exception. Evidence verified.',
      previousValue: JSON.stringify({ status: 'Half Day' }),
      newValue:      JSON.stringify({ status: 'Present', source: 'MANUAL_APPROVED' }),
      immutable: true
    },
    {
      auditId: 'AUD-2026-0004', action: 'ADJUSTMENT_REJECTED',
      entityType: 'ADJUSTMENT', entityId: 'ADJ-2026-0003',
      performedBy: 'Dr. Priya Meshram', performedByRole: 'DISTRICT_COORDINATOR',
      performedAt: '2026-07-18T14:00:00+05:30',
      ipAddress: '10.14.10.02', deviceId: 'DEV-DC-WARDHA-01',
      location: 'District Coordinator HQ, Wardha',
      reason: 'Medical certificate not attached.',
      previousValue: JSON.stringify({ status: 'Absent' }),
      newValue:      JSON.stringify({ adjustmentStatus: 'REJECTED' }),
      immutable: true
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 12 ▸ ENRICHED ATTENDANCE HISTORY WITH ALL v2.1 FEATURES
  //
  // Extends attendanceHistoryList to add:
  //   • source (AttendanceSource)
  //   • confidenceScore (ConfidenceScore)
  //   • isAdjusted (boolean)
  //   • adjustmentRef (AdjustmentRecord | null)
  //   • effectiveStatus (applies approved adjustments over computed status)
  //   • payroll-ready extra fields
  // ─────────────────────────────────────────────────────────────────────────

  const enrichedAttendanceHistory = useMemo(() => {
    return attendanceHistoryList.map(row => {
      const hasGpsLogin = row.gps === 'Verified';
      const adjustment  = approvedAdjustmentMap[row.dateKey] ?? null;
      const isAdjusted  = !!adjustment;

      // Effective status: approved adjustment overrides computed status
      const effectiveStatus: AttendanceStatus = isAdjusted
        ? adjustment!.requestedStatus
        : (row.status as AttendanceStatus);

      const source = deriveAttendanceSource(effectiveStatus, hasGpsLogin, isAdjusted);

      // GPS accuracy string from ledger (for confidence score)
      const gpsSession = gpsLoginLedger.find(g => g.dateKey === row.dateKey);
      const gpsAccStr  = gpsSession?.gpsAccuracy ?? '> 50m';

      const confidence = computeConfidenceScore(
        gpsAccStr,
        row.workingMins,
        row.activityCount,
        hasGpsLogin
      );

      // Late login: > GRACE_TIME past OFFICIAL_START
      const officialStartMins = parseTimeToMinutes(ATTENDANCE_RULES.OFFICIAL_START);
      const graceEnd          = officialStartMins + ATTENDANCE_RULES.GRACE_TIME_MINUTES;
      const loginMins         = parseTimeToMinutes(row.checkIn);
      const isLateLogin       = hasGpsLogin && loginMins > graceEnd;

      // Early logout: checked out before OFFICIAL_END
      const officialEndMins  = parseTimeToMinutes(ATTENDANCE_RULES.OFFICIAL_END);
      const logoutMins       = parseTimeToMinutes(row.checkOut);
      const isEarlyLogout    = hasGpsLogin && row.checkOut !== '—' && logoutMins < officialEndMins;

      // Overtime: worked beyond official end (> FULL_DAY_MINUTES)
      const overtimeMins = Math.max(0, row.workingMins - ATTENDANCE_RULES.FULL_DAY_MINUTES);

      return {
        ...row,
        effectiveStatus,
        source,
        confidence,
        isAdjusted,
        adjustmentRef:   adjustment,
        isLateLogin,
        isEarlyLogout,
        overtimeMins,
        overtimeHours:   overtimeMins > 0 ? formatMinutesToHours(overtimeMins) : '0h 00m'
      };
    });
  }, [attendanceHistoryList, approvedAdjustmentMap]);

  // ─────────────────────────────────────────────────────────────────────────
  // LAYER 12B ▸ EXPANDED PAYROLL / HRMS REPORT
  //
  // All fields auto-calculated from enrichedAttendanceHistory.
  // Ready for consumption by Payroll, TA/DA, Incentives, KPI, HRMS modules.
  // ─────────────────────────────────────────────────────────────────────────

  const payrollReport = useMemo(() => {
    const h = enrichedAttendanceHistory;

    const effectivePresent     = h.filter(r => r.effectiveStatus === 'Present').length;
    const effectiveHalfDay     = h.filter(r => r.effectiveStatus === 'Half Day').length;
    const effectiveLeave       = h.filter(r => r.effectiveStatus === 'Leave').length;
    const effectiveAbsent      = h.filter(r => r.effectiveStatus === 'Absent').length;
    const effectiveHoliday     = h.filter(r => r.effectiveStatus === 'Holiday').length;
    const effectiveWeeklyOff   = h.filter(r => r.effectiveStatus === 'Weekly Off').length;
    const effectiveOfficialTour= h.filter(r => r.effectiveStatus === 'Official Tour').length;
    const effectiveTraining    = h.filter(r => r.effectiveStatus === 'Training').length;

    const totalWorkingMins  = h.reduce((s, r) => s + r.workingMins, 0);
    const totalOvertimeMins = h.reduce((s, r) => s + r.overtimeMins, 0);
    const totalActivities   = h.reduce((s, r) => s + r.activityCount, 0);
    const lateLoginCount    = h.filter(r => r.isLateLogin).length;
    const earlyLogoutCount  = h.filter(r => r.isEarlyLogout).length;
    const adjustedDays      = h.filter(r => r.isAdjusted).length;

    const WORKING_DAYS      = monthlySummary.workingDays;
    const effectiveWorkDays = effectivePresent + effectiveHalfDay * 0.5;
    const compliancePct     = (effectiveWorkDays / WORKING_DAYS * 100).toFixed(1) + '%';
    const avgConfidence     = h.length > 0
      ? Math.round(h.reduce((s, r) => s + r.confidence.total, 0) / h.length)
      : 0;

    return {
      // Payroll fields
      effectiveWorkingDays:  effectiveWorkDays,
      totalWorkingHours:     formatMinutesToHours(totalWorkingMins),
      overtimeHours:         formatMinutesToHours(totalOvertimeMins),
      effectivePresent,
      effectiveHalfDay,
      effectiveLeave,
      effectiveAbsent,
      effectiveHoliday,
      effectiveWeeklyOff,
      effectiveOfficialTour,
      effectiveTraining,
      // Performance KPI fields
      totalActivities,
      lateLoginCount,
      earlyLogoutCount,
      adjustedDays,
      attendanceCompliancePct: compliancePct,
      avgConfidenceScore:      avgConfidence,
      avgConfidenceGrade: (
        avgConfidence >= 90 ? 'A+' :
        avgConfidence >= 80 ? 'A'  :
        avgConfidence >= 75 ? 'B+' :
        avgConfidence >= 65 ? 'B'  :
        avgConfidence >= 60 ? 'C'  :
        avgConfidence >= 40 ? 'D'  : 'F'
      ) as string,
      // Payroll Eligible Days = Present (full) + 0.5*HalfDay + OfficialTour + Training (govt policy)
      payrollEligibleDays: +(effectivePresent + effectiveHalfDay * 0.5 + effectiveOfficialTour + effectiveTraining).toFixed(1),
      // Audit fields
      auditLogCount:           auditLog.length,
      pendingAdjustments:      adjustmentLedger.filter(a => a.approvalStatus === 'PENDING').length,
      approvedAdjustments:     adjustmentLedger.filter(a => a.approvalStatus === 'APPROVED').length,
      rejectedAdjustments:     adjustmentLedger.filter(a => a.approvalStatus === 'REJECTED').length,
      // Current user RBAC context
      currentUserRole:         CURRENT_USER_ROLE,
      canApproveAdjustments:   hasPermission(CURRENT_USER_ROLE, 'APPROVE_ADJUSTMENT'),
      canViewAuditLog:         hasPermission(CURRENT_USER_ROLE, 'VIEW_AUDIT_LOG'),
      canViewConfidenceScore:  hasPermission(CURRENT_USER_ROLE, 'VIEW_CONFIDENCE_SCORE')
    };
  }, [enrichedAttendanceHistory, monthlySummary]);


  const rawFollowUpsList = [
    { id: 1, name: 'Rajesh Patil', initials: 'RP', avatarBg: 'bg-emerald-600 text-white', village: 'Hingni', type: 'Farmer', status: 'Training Pending', time: '10:30 AM', badgeColor: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 2, name: 'Sunil Shende', initials: 'SS', avatarBg: 'bg-blue-600 text-white', village: 'Pavanar', type: 'EDP Candidate', status: 'Documents Pending', time: '11:15 AM', badgeColor: isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 3, name: 'Anita Kale', initials: 'AK', avatarBg: 'bg-purple-600 text-white', village: 'Sevagram', type: 'Entrepreneur', status: 'Loan Verification', time: '12:00 PM', badgeColor: isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 4, name: 'Prakash Bhosle', initials: 'PB', avatarBg: 'bg-emerald-600 text-white', village: 'Hingni', type: 'Farmer', status: 'Soil Sample Pending', time: '01:30 PM', badgeColor: isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 5, name: 'Meena Gawande', initials: 'MG', avatarBg: 'bg-amber-600 text-white', village: 'Pavanar', type: 'Farmer', status: 'Follow-up Call', time: '03:00 PM', badgeColor: isDark ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-teal-100 text-teal-800 border-teal-300' }
  ];

  const followUpsList = useMemo(() => {
    if (!headerSearchQuery.trim()) return rawFollowUpsList;
    const q = headerSearchQuery.toLowerCase();
    return rawFollowUpsList.filter(
      item => item.name.toLowerCase().includes(q) || item.village.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    );
  }, [headerSearchQuery]);

  const activitiesTimeline = [
    { time: '10:15 AM', title: 'Profile Registered', subtitle: 'Rajesh Patil • Farmer', icon: <UserPlus className="w-4 h-4 text-white" />, iconBg: 'bg-blue-600' },
    { time: '09:42 AM', title: 'Soil Sample Collected', subtitle: 'Sample ID: SS-27-07-268', icon: <FlaskConical className="w-4 h-4 text-white" />, iconBg: 'bg-emerald-600' },
    { time: '09:05 AM', title: 'EDP Counselling Completed', subtitle: 'Sunil Shende • EDP Candidate', icon: <GraduationCap className="w-4 h-4 text-white" />, iconBg: 'bg-purple-600' },
    { time: '08:30 AM', title: 'Document Uploaded', subtitle: 'Aadhaar Card Verified', icon: <FileText className="w-4 h-4 text-white" />, iconBg: 'bg-orange-600' },
    { time: '08:10 AM', title: 'Field Visit Started', subtitle: 'Hingni Village • Ward No. 3', icon: <MapPin className="w-4 h-4 text-white" />, iconBg: 'bg-rose-600' }
  ];

  const notificationsList = [
    { id: 1, title: 'Drone Workshop Schedule Updated', category: 'High Priority', time: 'Today, 09:30 AM', read: false },
    { id: 2, title: 'Hingni Soil Test Results Approved', category: 'Assignment', time: 'Today, 08:15 AM', read: false },
    { id: 3, title: 'DMS Verification Hash Signed', category: 'System', time: 'Yesterday, 04:30 PM', read: true },
    { id: 4, title: 'DBT Grant Disbursement Dispatched', category: 'Reminder', time: 'This Week, Monday', read: true }
  ];

  const themeBg = isDark ? 'bg-[#070A11] text-slate-100' : 'bg-[#F1F5F9] text-slate-900';
  const frameBg = isDark ? 'bg-[#090E17] border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
  const cardBg = isDark ? 'bg-[#0B111E] border-slate-800/80 shadow-md' : 'bg-white border-slate-200/90 shadow-sm';
  const subCardBg = isDark ? 'bg-[#111827] border-slate-800' : 'bg-slate-50 border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const topNavBg = isDark ? 'bg-[#0B111E]/95 border-slate-800/80' : 'bg-white/95 border-slate-200/80';
  const drawerBg = isDark ? 'bg-[#090E17] text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200 shadow-2xl';

  return (
    <div className={`min-h-screen ${themeBg} font-sans antialiased flex flex-col justify-between selection:bg-emerald-600 selection:text-white transition-colors duration-300 relative`}>

      {toastMessage && (
        <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 animate-in slide-in-from-top duration-300">
          <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl font-black text-xs flex items-center space-x-2 border-2 border-white">
            <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {errorModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-sm ${cardBg} border border-rose-500/50 rounded-3xl p-5 space-y-4 text-center text-xs animate-in zoom-in-95 duration-200`}>
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-black text-white text-sm">
                {errorModal === 'internet' && 'No Internet Connection'}
                {errorModal === 'gps' && 'GPS Location Disabled'}
                {errorModal === 'server' && 'Server Connection Error (503)'}
                {errorModal === 'session' && 'Session Expired (Please Re-login)'}
              </h4>
              <p className="text-slate-400 text-[11px] mt-1">
                {errorModal === 'internet' && 'Your device is offline. Field records will queue locally until network returns.'}
                {errorModal === 'gps' && 'Location services are required for geotagging soil samples and geo-attendance.'}
                {errorModal === 'server' && 'Unable to sync with MAHA-AGRI Central Server. Please try again shortly.'}
                {errorModal === 'session' && 'Your security session has timed out. Re-authenticate to access documents.'}
              </p>
            </div>

            <div className="flex space-x-2">
              <button onClick={() => setErrorModal(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl">Dismiss</button>
              <button
                onClick={() => {
                  setErrorModal(null);
                  triggerToast('Retrying network connection...');
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white font-black rounded-xl"
              >
                Retry ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 ENTERPRISE MOBILE FRAME CONTAINER (390dp / 412dp PORTRAIT) */}
      <div className={`w-full max-w-[420px] mx-auto min-h-screen flex flex-col justify-between relative ${frameBg} border-x pb-20 overflow-hidden transition-colors duration-300`}>

        {/* TOP HEADER */}
        <header className={`sticky top-0 z-40 ${topNavBg} backdrop-blur-xl px-3.5 py-2.5 border-b space-y-2 shadow-sm transition-colors duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsContextMenuOpen(false);
                  setIsDrawerOpen(true);
                }}
                className={`p-1.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'}`}
                title="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1">
                <span className={`font-black text-xs tracking-tight ${textPrimary}`}>MAHA-AGRIDOOT</span>
                <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.2 rounded border border-emerald-500/30">MH</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setIsContextMenuOpen(false);
                  setIsAiModalOpen(true);
                }}
                className="p-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 hover:bg-purple-600/30"
                title="AI Advisory Bot"
              >
                <Bot className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsContextMenuOpen(false);
                  setIsNotificationCenterOpen(true);
                }}
                className={`relative p-1.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 text-white font-black text-[8px] rounded-full flex items-center justify-center border-2 border-slate-900">
                  4
                </span>
              </button>

              <button
                onClick={() => changeView('PROFILE')}
                className="w-7 h-7 rounded-xl overflow-hidden border border-emerald-500/40 shadow-sm"
              >
                <img src={officer.avatar} alt="Vikas" className="w-full h-full object-cover" />
              </button>

              <button
                ref={overflowButtonRef}
                onClick={() => setIsContextMenuOpen(prev => !prev)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isContextMenuOpen
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title="Quick Actions Menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className={`flex-1 flex items-center ${subCardBg} border rounded-xl px-2.5 py-1 space-x-2`}>
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={headerSearchQuery}
                onChange={e => setHeaderSearchQuery(e.target.value)}
                placeholder="Search Farmers, Soil Samples, IDs, Villages..."
                className={`w-full bg-transparent text-xs ${textPrimary} focus:outline-none placeholder-slate-500 font-medium`}
              />
              {headerSearchQuery && (
                <button onClick={() => setHeaderSearchQuery('')} className="p-0.5 text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setIsVoiceListening(true);
                setTimeout(() => {
                  setIsVoiceListening(false);
                  setHeaderSearchQuery('हिंगणी गाव');
                  triggerToast('🎙️ Voice Query Matched: हिंगणी गाव');
                }, 2000);
              }}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                isVoiceListening
                  ? 'bg-rose-600 text-white animate-pulse border-rose-500'
                  : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
              }`}
              title="Voice Search Marathi"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[9px] font-extrabold border-t border-slate-800/40 pt-1.5">
            <span className="text-emerald-400 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>🔒 256-Bit Encrypted</span>
            </span>

            <button
              onClick={() => {
                setIsOffline(!isOffline);
                if (!isOffline) setErrorModal('internet');
                else triggerToast('📡 Connection Restored. Online Mode Active.');
              }}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border ${
                isOffline ? 'bg-amber-950/60 text-amber-300 border-amber-600' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
              }`}
            >
              {isOffline ? <WifiOff className="w-3 h-3 text-amber-400" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
              <span>{isOffline ? `OFFLINE (${pendingSyncCount} Queue)` : '📡 ONLINE'}</span>
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                triggerToast('Syncing offline queue to central database...');
                setTimeout(() => {
                  setIsLoading(false);
                  setPendingSyncCount(0);
                  setLastSyncTime('Today • 10:25 PM');
                  triggerToast('✅ Database Synced Successfully!');
                }, 1500);
              }}
              className="text-blue-400 hover:underline flex items-center space-x-1"
            >
              <Cloud className="w-3 h-3 text-blue-400" />
              <span>Sync Now ({lastSyncTime})</span>
            </button>
          </div>
        </header>

        {/* ORGANIZED SIDEBAR MENU */}
        {isDrawerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex">
            <div className={`w-72 h-full ${drawerBg} flex flex-col justify-between p-4 shadow-2xl animate-in slide-in-from-left duration-300 relative border-r z-50`}>
              
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-500 p-0.5 shadow-md">
                      <div className="w-full h-full bg-[#090E17] rounded-[10px] flex items-center justify-center font-black text-white text-xs">
                        म
                      </div>
                    </div>
                    <div>
                      <h2 className="font-black text-xs text-white tracking-tight leading-tight">MAHA-AGRI</h2>
                      <p className="text-[10px] text-emerald-400 font-bold">MAHA-AGRIDOOT</p>
                    </div>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-gradient-to-r from-slate-900 to-emerald-950/40 rounded-2xl border border-slate-800 flex items-center space-x-3">
                  <img src={officer.avatar} alt="Officer" className="w-10 h-10 rounded-full object-cover border border-emerald-400 shadow-md shrink-0" />
                  <div>
                    <h3 className="font-black text-xs text-white leading-snug">{officer.name}</h3>
                    <span className="text-[9.5px] text-slate-300 font-semibold block">{officer.designation}</span>
                    <span className="text-[8.5px] text-slate-400 block">{officer.districtTaluka}</span>
                    <span className="text-[8.5px] font-mono text-emerald-400">ID: {officer.officerId}</span>
                  </div>
                </div>

                <nav className="space-y-3 text-xs font-bold">
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">MAIN</span>
                    <button onClick={() => { changeView('DASHBOARD'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DASHBOARD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Dashboard</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">OPERATIONS</span>
                    <button onClick={() => { changeView('TODAYS_MISSION'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'TODAYS_MISSION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Today's Mission</span>
                    </button>

                    <button onClick={() => { changeView('FARMER_REGISTRATION'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'FARMER_REGISTRATION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Farmer Registry</span>
                    </button>

                    <button onClick={() => { changeView('SOIL_TESTING'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'SOIL_TESTING' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Soil Testing</span>
                    </button>

                    <button onClick={() => { changeView('MISSION_CONSOLE'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'MISSION_CONSOLE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>EDP</span>
                    </button>

                    <button onClick={() => { changeView('OPERATIONS_LIST'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'OPERATIONS_LIST' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <Plane className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Drone</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">WORKSPACE</span>
                    <button onClick={() => { changeView('DAILY_ATTENDANCE'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DAILY_ATTENDANCE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Attendance</span>
                    </button>

                    <button onClick={() => { changeView('DIGITAL_WALLET'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DIGITAL_WALLET' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Documents</span>
                    </button>

                    <button onClick={() => { changeView('DIGITAL_WALLET'); setIsDrawerOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DIGITAL_WALLET' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Wallet</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">SYSTEM</span>
                    <button onClick={() => { setIsPermissionsModalOpen(true); setIsDrawerOpen(false); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-all">
                      <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Permissions</span>
                    </button>

                    <button onClick={() => { changeView('SETTINGS_APPEARANCE'); setIsDrawerOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${activeMainView === 'SETTINGS_APPEARANCE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <div className="flex items-center space-x-3">
                        <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                </nav>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                  <span>v2.4.0</span>
                  <span className="text-emerald-400">{lastSyncTime}</span>
                </div>

                <button onClick={() => navigate('/login')} className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 border border-rose-500/30">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            <div className="flex-1" onClick={() => setIsDrawerOpen(false)}></div>
          </div>
        )}

        {/* 3-DOT OVERFLOW MENU */}
        {isContextMenuOpen && (
          <div
            ref={overflowMenuRef}
            className="absolute top-14 right-3 z-50 w-56 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl p-2 space-y-1 text-xs font-bold text-slate-300 animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 800);
                triggerToast('Screen data refreshed cleanly');
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white flex items-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Refresh Screen Data</span>
            </button>

            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                setIsPermissionsModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white flex items-center space-x-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permissions Dashboard</span>
            </button>

            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                setLang(lang === 'mr' ? 'en' : 'mr');
                triggerToast(`Language: ${lang === 'mr' ? 'English' : 'मराठी'}`);
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white flex items-center space-x-2"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>Language ({lang === 'mr' ? 'मराठी ➔ EN' : 'EN ➔ मराठी'})</span>
            </button>

            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                triggerToast('📞 Helpline: 1800-233-0002');
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white flex items-center space-x-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Help &amp; Helpline</span>
            </button>

            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                navigate('/login');
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white flex items-center space-x-2 text-rose-400"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE - DASHBOARD & ATTENDANCE MAIN VIEWS */}
        {/* ========================================================================= */}
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-slate-800/60 rounded-2xl"></div>
              <div className="h-40 bg-slate-800/60 rounded-3xl"></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-20 bg-slate-800/60 rounded-2xl"></div>
                <div className="h-20 bg-slate-800/60 rounded-2xl"></div>
              </div>
              <div className="h-48 bg-slate-800/60 rounded-3xl"></div>
            </div>
          ) : activeMainView === 'DASHBOARD' ? (
            <div className="space-y-4">
              
              {/* GREETING BAR + STATUS CHIPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
                      <img src={officer.avatar} alt="Vikas" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <div>
                      <h2 className={`font-black text-base ${textPrimary} flex items-center`}>
                        {officer.name} ☀️
                      </h2>
                      <p className={`text-xs ${textSecondary} font-semibold mt-0.5`}>
                        {officer.districtTaluka}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${textSecondary}`}>27 जुलै 2026</span>
                </div>

                {/* STATUS CHIPS */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[9.5px] font-bold py-1">
                  <span className={`px-2 py-1 rounded-full border flex items-center space-x-1 ${isDark ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <Sun className="w-3 h-3 text-amber-400" /> <span>28°C Sunny</span>
                  </span>

                  <button onClick={() => changeView('DAILY_ATTENDANCE')} className={`px-2 py-1 rounded-full border flex items-center space-x-1 ${isDark ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    <MapPin className="w-3 h-3 text-emerald-400" /> <span>GPS &lt; 15m</span>
                  </button>

                  <button onClick={() => setIsBatteryModalOpen(true)} className={`px-2 py-1 rounded-full border flex items-center space-x-1 ${isDark ? 'bg-teal-950/40 text-teal-300 border-teal-800/40 hover:border-teal-500' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    <Battery className="w-3 h-3 text-teal-400" /> <span>Battery 86%</span>
                  </button>

                  <span className={`px-2 py-1 rounded-full border flex items-center space-x-1 ${isDark ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    <Wifi className="w-3 h-3 text-blue-400" /> <span>Online</span>
                  </span>
                </div>
              </div>

              {/* 1. TODAY'S MISSION HERO BANNER */}
              {visibleWidgets.mission && (
                <div className="bg-gradient-to-r from-blue-950 via-[#0B1A30] to-[#06382B] border border-blue-500/30 p-4 md:p-5 rounded-3xl shadow-xl space-y-3 relative overflow-hidden transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-widest text-blue-300 uppercase bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                      TODAY'S MISSION ⭐⭐⭐⭐⭐
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300">Wardha Hub</span>
                  </div>

                  <div>
                    <h3 className="font-black text-base md:text-lg text-white tracking-tight">EDP – AGRI DRONE WORKSHOP</h3>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">State Agri-Drone Entrepreneurship Training &amp; Certification Drive</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-300">Mission Progress</span>
                      <span className="text-emerald-400 font-mono">28 / 35 Candidates (80%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
                      <div className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full w-[80%] transition-all duration-500"></div>
                    </div>
                  </div>

                  <button
                    onClick={() => changeView('TODAYS_MISSION')}
                    className="w-full py-2.5 bg-white text-slate-950 font-black rounded-2xl text-xs shadow-md hover:bg-slate-100 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>View Mission Details</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 2. TODAY'S TARGET CARD */}
              {visibleWidgets.target && (
                <div onClick={() => changeView('TODAYS_MISSION')} className={`p-4 ${cardBg} border rounded-3xl shadow-xl flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all`}>
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs text-slate-400 uppercase tracking-wider block">Today's Target</span>
                    <div className={`text-2xl font-black ${textPrimary} font-mono`}>35 Candidates</div>
                    <div className="text-xs text-emerald-500 dark:text-emerald-400 font-bold">Achieved: 28 | Remaining: 7</div>
                  </div>

                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-700 dark:text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-emerald-400" strokeDasharray="80, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="absolute text-xs font-black text-emerald-400">80%</span>
                  </div>
                </div>
              )}

              {/* 3. TODAY'S FIELD ASSIGNMENT CARD */}
              {visibleWidgets.assignment && (
                <div className="bg-gradient-to-br from-[#0B1A30] via-[#082820] to-[#090E17] border border-emerald-500/40 rounded-3xl p-4 md:p-5 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="font-black text-xs text-white uppercase tracking-wider">TODAY'S FIELD ASSIGNMENT</span>
                    </div>
                    <span className="bg-rose-500/20 text-rose-300 font-extrabold text-[9px] px-2 py-0.5 rounded border border-rose-500/30">Priority: High</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Village / Area</span>
                      <strong className="text-white text-sm">Hingni (Ward No. 3)</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Time Window</span>
                      <strong className="text-amber-400 font-mono text-sm">09:00 AM – 05:00 PM</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned By</span>
                      <strong className="text-slate-200">District Coordinator</strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Distance from Location</span>
                      <strong className="text-emerald-400 font-mono text-sm">12.4 km</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    {isVisitStarted && (
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                        Visit Timer: {formatVisitTimer(visitTimer)}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setIsVisitStarted(!isVisitStarted);
                        triggerToast(isVisitStarted ? 'Visit Completed & Logged!' : '▶ Field Visit Started!');
                      }}
                      className={`ml-auto px-4 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center space-x-2 transition-all ${
                        isVisitStarted
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isVisitStarted ? 'STOP FIELD VISIT' : 'START FIELD VISIT'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. PROFILE VERIFICATION WORKFLOW */}
              {visibleWidgets.verification && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h4 className={`font-black text-xs ${textPrimary}`}>PROFILE VERIFICATION &amp; REGISTRATION</h4>
                    </div>
                    <span className={`text-[10px] ${textSecondary}`}>Step {regStep} of 4</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold py-1">
                    <div className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${regStep >= 1 ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      <Smartphone className="w-4 h-4" />
                      <span>Enter Number</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${regStep >= 2 ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      <Lock className="w-4 h-4" />
                      <span>OTP Verify</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${regStep >= 3 ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      <User className="w-4 h-4" />
                      <span>Check Profile</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${regStep >= 4 ? 'bg-amber-600/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                      <CheckCircle className="w-4 h-4" />
                      <span>Continue</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1 text-xs">
                    <input
                      type="tel"
                      maxLength={10}
                      value={regMobileNumber}
                      onChange={e => setRegMobileNumber(e.target.value)}
                      placeholder="Enter 10-digit Mobile Number"
                      className={`flex-1 ${subCardBg} border rounded-xl px-3 py-2 font-mono font-bold ${textPrimary} focus:outline-none focus:border-emerald-500`}
                    />
                    <button
                      onClick={() => {
                        if (!regMobileNumber) return;
                        setRegStep(2);
                        setRegSuccessMsg(`✅ OTP sent to +91 ${regMobileNumber}. Profile Verification Active.`);
                        triggerToast('OTP Dispatched to Mobile!');
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      VERIFY &amp; CONTINUE ➔
                    </button>
                  </div>

                  {regSuccessMsg && (
                    <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold">
                      {regSuccessMsg}
                    </div>
                  )}
                </div>
              )}

              {/* 5. QUICK STATISTICS GRID */}
              {visibleWidgets.stats && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div onClick={() => changeView('MISSION_CONSOLE')} className={`p-3.5 ${cardBg} rounded-2xl space-y-1 border cursor-pointer hover:border-orange-500 transition-all`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${textSecondary}`}>Pending Today</span>
                      <Clock className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className={`font-black text-xl font-mono ${textPrimary}`}>12</span>
                      <span className="text-[10px] font-bold text-orange-400">Profiles ➔</span>
                    </div>
                  </div>

                  <div onClick={() => changeView('MISSION_CONSOLE')} className={`p-3.5 ${cardBg} rounded-2xl space-y-1 border cursor-pointer hover:border-emerald-500 transition-all`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${textSecondary}`}>Completed Today</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className={`font-black text-xl font-mono ${textPrimary}`}>8</span>
                      <span className="text-[10px] font-bold text-emerald-400">Profiles ➔</span>
                    </div>
                  </div>

                  <div onClick={() => changeView('MISSION_CONSOLE')} className={`p-3.5 ${cardBg} rounded-2xl space-y-1 border cursor-pointer hover:border-blue-500 transition-all`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${textSecondary}`}>Follow-up</span>
                      <ClipboardList className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className={`font-black text-xl font-mono ${textPrimary}`}>5</span>
                      <span className="text-[10px] font-bold text-blue-400">Profiles ➔</span>
                    </div>
                  </div>

                  <div onClick={() => changeView('MISSION_CONSOLE')} className={`p-3.5 ${cardBg} rounded-2xl space-y-1 border cursor-pointer hover:border-rose-500 transition-all`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${textSecondary}`}>High Priority</span>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className={`font-black text-xl font-mono ${textPrimary}`}>2</span>
                      <span className="text-[10px] font-bold text-rose-400">Profiles ➔</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. TODAY'S FOLLOW-UP LIST */}
              {visibleWidgets.followups && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <h4 className={`font-black text-xs ${textPrimary}`}>TODAY'S FOLLOW-UPS</h4>
                    <button onClick={() => changeView('MISSION_CONSOLE')} className="text-xs font-bold text-emerald-500 dark:text-emerald-400 hover:underline">View All ➔</button>
                  </div>

                  {followUpsList.length === 0 ? (
                    <div className="py-6 text-center text-xs space-y-2">
                      <ClipboardList className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-slate-400 font-bold">No Follow-ups Found for Search "{headerSearchQuery}"</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {followUpsList.map(item => (
                        <div key={item.id} onClick={() => changeView('MISSION_CONSOLE')} className={`p-2.5 ${subCardBg} rounded-xl border flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all`}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-full ${item.avatarBg} flex items-center justify-center font-black text-xs shadow-md border border-white/20 shrink-0`}>
                              {item.initials}
                            </div>
                            <div>
                              <h5 className={`font-bold ${textPrimary}`}>{item.name}</h5>
                              <p className={`text-[10px] ${textSecondary}`}>{item.village} • {item.type}</p>
                            </div>
                          </div>

                          <div className="text-right flex items-center space-x-2">
                            <div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border block ${item.badgeColor}`}>{item.status}</span>
                              <span className={`text-[9px] ${textSecondary} font-mono block mt-0.5`}>{item.time}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7. AI ASSISTANT CARD */}
              {visibleWidgets.aiAssistant && (
                <div onClick={() => setIsAiModalOpen(true)} className="bg-gradient-to-r from-purple-950/80 via-[#190C28] to-[#0F172A] border border-purple-500/40 p-4 rounded-3xl shadow-xl space-y-2 cursor-pointer hover:border-purple-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-purple-300 font-black text-xs">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span>🤖 AI ASSISTANT SUGGESTION</span>
                    </div>
                    <span className="bg-rose-500/20 text-rose-300 font-extrabold text-[9px] px-2 py-0.5 rounded border border-rose-500/30">Priority: High</span>
                  </div>

                  <p className="text-xs text-white font-bold leading-relaxed">
                    आज ५ Follow-up Pending आहेत. Hingni गावात प्रथम भेट द्या.
                  </p>
                  <p className="text-[10.5px] text-purple-200">
                    Tap to launch interactive Marathi voice advisory ➔
                  </p>
                </div>
              )}

              {/* 8. RECENT ACTIVITIES TIMELINE */}
              {visibleWidgets.timeline && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <h4 className={`font-black text-xs ${textPrimary}`}>RECENT ACTIVITIES TIMELINE</h4>
                    <button onClick={() => changeView('MISSION_CONSOLE')} className="text-xs font-bold text-emerald-500 dark:text-emerald-400 hover:underline">View All ➔</button>
                  </div>

                  <div className="space-y-3 text-xs relative pl-1">
                    {activitiesTimeline.map((act, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${act.iconBg} flex items-center justify-center shrink-0 shadow-md`}>
                          {act.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h5 className={`font-bold ${textPrimary}`}>{act.title}</h5>
                            <span className={`text-[9.5px] ${textSecondary} font-mono`}>{act.time}</span>
                          </div>
                          <p className={`text-[10.5px] ${textSecondary}`}>{act.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. QUICK ACTIONS 3x3 GRID */}
              {visibleWidgets.quickActions && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <h4 className={`font-black text-xs ${textPrimary}`}>QUICK ACTIONS</h4>

                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-bold">
                    <button onClick={() => changeView('FARMER_REGISTRATION')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-emerald-500 transition-all`}>
                      <UserPlus className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-[10px]">Register Farmer</span>
                    </button>

                    <button onClick={() => changeView('SOIL_TESTING')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-purple-500 transition-all`}>
                      <FlaskConical className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                      <span className="text-[10px]">Collect Soil</span>
                    </button>

                    <button onClick={() => changeView('QR_SCANNER')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-blue-500 transition-all`}>
                      <QrCode className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      <span className="text-[10px]">Scan QR</span>
                    </button>

                    <button onClick={() => changeView('DAILY_ATTENDANCE')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-teal-500 transition-all`}>
                      <CheckCircle className="w-5 h-5 text-teal-500 dark:text-teal-400" />
                      <span className="text-[10px]">Attendance</span>
                    </button>

                    <button onClick={() => changeView('DAILY_ATTENDANCE')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-rose-500 transition-all`}>
                      <MapPin className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                      <span className="text-[10px]">GPS</span>
                    </button>

                    <button onClick={() => changeView('OPERATIONS_LIST')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-cyan-500 transition-all`}>
                      <Plane className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                      <span className="text-[10px]">Drone Demo</span>
                    </button>

                    <button onClick={() => changeView('DIGITAL_WALLET')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-amber-500 transition-all`}>
                      <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                      <span className="text-[10px]">Documents</span>
                    </button>

                    <button onClick={() => triggerToast('📞 Dialing Coordinator hotline: 1800-233-0002')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-green-500 transition-all`}>
                      <PhoneCall className="w-5 h-5 text-green-500 dark:text-green-400" />
                      <span className="text-[10px]">Call</span>
                    </button>

                    <button onClick={() => triggerToast('🚨 Emergency SOS Dispatched to Wardha Control Room!')} className={`p-3 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-rose-600 transition-all`}>
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <span className="text-[10px]">Emergency</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 10. FIELD STATUS BAR */}
              {visibleWidgets.fieldStatus && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <h4 className={`font-black text-xs ${textPrimary}`}>FIELD STATUS</h4>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                      <MapPin className="w-4 h-4 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                      <span className={`text-[9px] ${textSecondary} block uppercase`}>GPS</span>
                      <strong className="text-emerald-500 dark:text-emerald-400 text-[11px]">Active</strong>
                    </div>

                    <div onClick={() => setIsBatteryModalOpen(true)} className={`p-2.5 ${subCardBg} rounded-2xl border cursor-pointer hover:border-teal-500`}>
                      <Battery className="w-4 h-4 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                      <span className={`text-[9px] ${textSecondary} block uppercase`}>Battery</span>
                      <strong className={`${textPrimary} text-[11px]`}>86%</strong>
                    </div>

                    <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                      <Wifi className="w-4 h-4 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                      <span className={`text-[9px] ${textSecondary} block uppercase`}>Internet</span>
                      <strong className="text-emerald-500 dark:text-emerald-400 text-[11px]">Online</strong>
                    </div>

                    <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                      <Cloud className="w-4 h-4 mx-auto text-emerald-500 dark:text-emerald-400 mb-1" />
                      <span className={`text-[9px] ${textSecondary} block uppercase`}>Sync Status</span>
                      <strong className="text-emerald-500 dark:text-emerald-400 text-[11px]">Completed</strong>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : activeMainView === 'DAILY_ATTENDANCE' ? (
            /* ========================================================================= */
            /* ENTERPRISE ATTENDANCE MANAGEMENT MODULE — v2.1                           */
            /* ========================================================================= */
            <div className="space-y-4 text-xs">

              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Attendance Management</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* Sub-Tab Filter Navigation */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl font-bold text-[10px] text-center">
                <button onClick={() => setAttendanceTab('today')} className={`py-2 rounded-xl transition-all ${attendanceTab === 'today' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Today</button>
                <button onClick={() => setAttendanceTab('history')} className={`py-2 rounded-xl transition-all ${attendanceTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>History</button>
                <button onClick={() => setAttendanceTab('calendar')} className={`py-2 rounded-xl transition-all ${attendanceTab === 'calendar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Calendar</button>
                <button onClick={() => setAttendanceTab('logins')} className={`py-2 rounded-xl transition-all ${attendanceTab === 'logins' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>GPS Logins</button>
              </div>

              {/* ─── TAB 1: TODAY'S ATTENDANCE SUMMARY ─── */}
              {attendanceTab === 'today' && (() => {
                // Derive today's enriched record
                const todayEnriched  = enrichedAttendanceHistory.find(r => r.dateKey === TODAY_KEY);
                const todayGpsRecs   = gpsLoginLedger.filter(r => r.dateKey === TODAY_KEY);
                const totalActs      = todayGpsRecs.reduce((s, r) => s + countApprovedActivities(r.activities), 0);
                const conf           = todayEnriched?.confidence ?? computeConfidenceScore(
                  todayGpsRecs[0]?.gpsAccuracy ?? '> 50m',
                  todayEnriched?.workingMins ?? 0, totalActs,
                  todayGpsRecs.length > 0
                );
                const todayAdjust    = todayEnriched?.adjustmentRef ?? null;
                const attDate        = new Date('2026-07-27');
                const attDayLabel    = attDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                const attWeekday     = attDate.toLocaleDateString('en-IN', { weekday: 'long' });
                // Enterprise ATT-ID: ATT-EMP{num}-{YYYYMMDD}
                const empNum         = officer.officerId.replace(/[^0-9]/g, '').padStart(5, '0');
                const attId          = `ATT-EMP${empNum}-${TODAY_KEY.replace(/-/g, '')}`;
                const requiredHours  = `${Math.floor(ATTENDANCE_RULES.FULL_DAY_MINUTES / 60)}h Required`;
                const sourceLabel    = todayEnriched?.source?.replace(/_/g, ' ') ?? 'GPS LOGIN';
                // Compliance grade from avgConfidence + compliancePct
                const compPct        = parseFloat(payrollReport.attendanceCompliancePct);
                const compGrade      = compPct >= 95 && conf.total >= 90 ? 'A+' : compPct >= 90 ? 'A' : compPct >= 80 ? 'B+' : compPct >= 75 ? 'B' : compPct >= 60 ? 'C' : 'D';
                // All activities across today's sessions (flattened)
                const todayAllActivities = todayGpsRecs.flatMap(r => r.activities ?? []);
                // Status badge colour
                const statusColour: Record<string, string> = {
                  PRESENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  'HALF DAY': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                  LEAVE: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                  TRAINING: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                  'OFFICIAL TOUR': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                  ABSENT: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                  HOLIDAY: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                  'WEEKLY OFF': 'bg-slate-700/40 text-slate-400 border-slate-600/30',
                };
                const statusKey = todayAttendance.status.toUpperCase();
                const badgeCls  = statusColour[statusKey] ?? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                return (
                  <div className="space-y-3">
                    {/* Main Summary Card */}
                    <div className="bg-gradient-to-br from-emerald-950/80 via-[#0B1E19] to-[#08121E] border border-emerald-500/40 rounded-3xl p-4 md:p-5 shadow-xl space-y-3">

                      {/* Card Header */}
                      <div className="flex justify-between items-start border-b border-emerald-500/20 pb-2.5">
                        <div>
                          <span className="font-black text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>TODAY'S ATTENDANCE SUMMARY</span>
                          </span>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5">{attId}</p>
                        </div>
                        <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded border ${badgeCls}`}>
                          {todayAttendance.status}
                        </span>
                      </div>

                      {/* Date + Weekday */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Attendance Date</span>
                          <strong className="text-white text-xs font-mono">{attDayLabel}</strong>
                          <span className="text-[9px] text-slate-400 block">{attWeekday}</span>
                        </div>
                        {/* Source badge */}
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Source</span>
                          <span className="text-[9.5px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">{sourceLabel}</span>
                        </div>
                      </div>

                      {/* Check-In / Check-Out */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Check-In Time</span>
                          <strong className="text-emerald-400 font-mono text-sm">{todayAttendance.checkIn}</strong>
                        </div>
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                          <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Check-Out Time</span>
                          <strong className="text-amber-400 font-mono text-sm">{todayAttendance.checkOut}</strong>
                        </div>
                      </div>

                      {/* Location Section */}
                      <div className={`p-3 ${subCardBg} rounded-2xl border space-y-0.5`}>
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Location Verified</span>
                        <p className="text-xs text-white font-bold flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{todayGpsRecs[0]?.geofenceZone ?? '—'}</span>
                        </p>
                        <p className="text-[9px] text-slate-400">{todayGpsRecs[0]?.gpsAccuracy ?? ''} • GeoFence Verified</p>
                      </div>

                      {/* Working Hours + Required */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border col-span-1`}>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Working Hours</span>
                          <strong className="text-white font-mono text-xs">{todayAttendance.workingHours}</strong>
                          <span className="text-[9px] text-slate-500 block">/ {requiredHours}</span>
                        </div>
                        {/* Tappable Activities panel */}
                        <button onClick={() => setShowActPanel(p => !p)} className={`p-2.5 ${subCardBg} rounded-2xl border text-left`}>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Activities</span>
                          <strong className="text-emerald-400 font-mono text-base">{totalActs}</strong>
                          <span className="text-[9px] text-emerald-500 block">{showActPanel ? 'Hide ▲' : 'View ▼'}</span>
                        </button>
                        {/* Tappable Sessions panel */}
                        <button onClick={() => setShowSessPanel(p => !p)} className={`p-2.5 ${subCardBg} rounded-2xl border text-left`}>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">GPS Sessions</span>
                          <strong className="text-blue-400 font-mono text-base">{todayGpsRecs.length}</strong>
                          <span className="text-[9px] text-blue-500 block">{showSessPanel ? 'Hide ▲' : 'View ▼'}</span>
                        </button>
                      </div>

                      {/* Activities Expandable Panel */}
                      {showActPanel && (
                        <div className={`p-3 ${subCardBg} rounded-2xl border space-y-1.5`}>
                          <span className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block border-b border-slate-700 pb-1">Verified Activities — {attDayLabel}</span>
                          {todayAllActivities.length === 0 ? (
                            <p className="text-[9px] text-slate-500">No activities recorded today.</p>
                          ) : (
                            todayAllActivities.map((act, i) => (
                              <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800 last:border-0">
                                <span className="text-[9.5px] text-slate-200 flex items-center gap-1.5">
                                  <span className="text-emerald-400">✓</span>
                                  {act.type?.replace(/_/g, ' ') ?? 'Activity'}
                                </span>
                                <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${
                                  act.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                  act.status === 'PENDING'  ? 'bg-amber-500/20  text-amber-300'  : 'bg-slate-700 text-slate-400'
                                }`}>{act.status ?? 'DONE'}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Sessions Expandable Panel */}
                      {showSessPanel && (
                        <div className={`p-3 ${subCardBg} rounded-2xl border space-y-2`}>
                          <span className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider block border-b border-slate-700 pb-1">GPS Sessions — {attDayLabel}</span>
                          {todayGpsRecs.map((sess, i) => {
                            const sessMins = Math.max(0, sess.workingMinutes ?? 0);
                            return (
                              <div key={i} className="space-y-0.5 pb-2 border-b border-slate-800 last:border-0">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9.5px] font-bold text-white">Session {i + 1}</span>
                                  <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{sess.gpsStatus}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-slate-300 font-mono">
                                  <span>🕐 Login: {sess.loginTime}</span>
                                  <span>🕖 Logout: {sess.logoutTime ?? '—'}</span>
                                  <span>⏱ Duration: {sessMins}m</span>
                                  <span>📍 {sess.geofenceZone ?? sess.location}</span>
                                  <span className="col-span-2 text-[8.5px] text-slate-400">GeoFence: {sess.gpsAccuracy ?? '—'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Attendance Verified (field-friendly) + breakdown for audit */}
                      <div className={`p-3 ${subCardBg} rounded-2xl border`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <div>
                            <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Attendance Verified</span>
                            <span className="text-[8.5px] text-slate-500">Verification Score</span>
                          </div>
                          <span className={`font-black text-sm ${conf.total >= 90 ? 'text-emerald-400' : conf.total >= 75 ? 'text-amber-400' : conf.total >= 60 ? 'text-orange-400' : 'text-rose-400'}`}>{conf.total}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${conf.total >= 90 ? 'bg-emerald-500' : conf.total >= 75 ? 'bg-amber-400' : 'bg-orange-500'}`} style={{ width: `${conf.total}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-2 text-[8.5px] text-slate-500 font-mono text-center">
                          <span>GPS {conf.gps}/25</span>
                          <span>GeoF {conf.geofence}/20</span>
                          <span>Dur {conf.duration}/25</span>
                          <span>Acts {conf.activities}/20</span>
                          <span>Dev {conf.device}/5</span>
                          <span>Sync {conf.offlineSync}/5</span>
                        </div>
                      </div>

                      {/* Summary Strip */}
                      <div className="p-2 bg-emerald-900/30 border border-emerald-500/20 rounded-2xl text-[9.5px] font-bold text-emerald-300 text-center tracking-wide">
                        {todayAttendance.status} • GPS Verified • {todayAttendance.workingHours} • {totalActs} Activities • Compliance: {compGrade}
                      </div>

                      {/* Last Sync */}
                      <div className="flex justify-between items-center text-[9px] text-slate-400 px-1">
                        <span>Last Synced: <strong className="text-white">10:25 PM</strong></span>
                        <span>Audit ID: <strong className="text-white font-mono">{attId}</strong></span>
                      </div>

                      {/* Manual Adjustment Indicator — only shown if day has approved adjustment */}
                      {todayAdjust && todayAdjust.approvalStatus === 'APPROVED' && (
                        <div className="p-2.5 bg-blue-950/50 border border-blue-500/30 rounded-2xl space-y-0.5">
                          <span className="text-[9.5px] font-black text-blue-300 uppercase">✅ Manual Adjustment Approved</span>
                          <p className="text-[9px] text-slate-400">Approved by <strong className="text-white">{todayAdjust.approvedBy}</strong> ({todayAdjust.approvedByRole?.replace(/_/g, ' ')})</p>
                          <p className="text-[9px] text-slate-500 font-mono">{todayAdjust.adjustmentId} • {todayAdjust.approvedAt?.slice(0, 10)}</p>
                        </div>
                      )}

                      {/* Re-verify button */}
                      <div className="flex justify-between items-center pt-1">
                        <button onClick={() => triggerToast('✅ Attendance Check-in Geotagged at Wardha Hub!')} className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md">
                          RE-VERIFY GPS ATTENDANCE
                        </button>
                      </div>
                    </div>

                    {/* ── ATTENDANCE ALERTS ── shown only when alerts exist */}
                    {(() => {
                      const alerts: { icon: string; text: string; color: string }[] = [];
                      // GPS accuracy warning
                      if (todayGpsRecs.some(r => r.gpsAccuracy?.includes('> 50') || r.gpsAccuracy?.includes('50m')))
                        alerts.push({ icon: '📡', text: 'GPS accuracy below threshold — verification may be impacted.', color: 'text-amber-300' });
                      // Missing checkout
                      if (todayGpsRecs.some(r => !r.logoutTime || r.logoutTime === ''))
                        alerts.push({ icon: '🔔', text: 'Missing check-out — auto-checkout applied as per attendance rules.', color: 'text-amber-300' });
                      // Pending adjustment
                      const pendingAdj = adjustmentLedger.filter(a => a.attendanceDate === TODAY_KEY && a.approvalStatus === 'PENDING');
                      if (pendingAdj.length > 0)
                        alerts.push({ icon: '⏳', text: `Manual adjustment pending approval — Ref: ${pendingAdj[0].adjustmentId}`, color: 'text-blue-300' });
                      // Low verification score
                      if (conf.total < 70)
                        alerts.push({ icon: '⚠️', text: `Low verification score (${conf.total}%) — field activities may need additional evidence.`, color: 'text-orange-300' });
                      // No activities recorded
                      if (totalActs === 0)
                        alerts.push({ icon: '📋', text: 'No verified activities recorded for today.', color: 'text-rose-300' });
                      if (alerts.length === 0) return null;
                      return (
                        <div className={`p-3 ${cardBg} rounded-3xl border border-amber-500/20 space-y-2`}>
                          <span className="text-[9.5px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">⚠ Operational Alerts</span>
                          <div className="space-y-1.5">
                            {alerts.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 px-2 py-1.5 bg-amber-950/30 border border-amber-500/15 rounded-xl">
                                <span className="text-[10px] shrink-0 mt-0.5">{a.icon}</span>
                                <span className={`text-[9px] leading-relaxed ${a.color}`}>{a.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── ATTENDANCE TIMELINE ── collapsible */}
                    {(() => {
                      // Build timeline events from today's GPS records + activities
                      type TEvent = { time: string; event: string; status: string; location?: string; icon: string; color: string };
                      const events: TEvent[] = [];
                      todayGpsRecs.forEach((sess, si) => {
                        // GPS Login event
                        events.push({
                          time: sess.loginTime, event: `GPS Login — Session ${si + 1}`,
                          status: sess.gpsStatus, location: sess.geofenceZone,
                          icon: '📍', color: 'text-emerald-400'
                        });
                        // Activities within session (sorted by completedAt)
                        const sortedActs = [...(sess.activities ?? [])].sort((a, b) => {
                          const toMins = (t: string) => {
                            const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                            if (!m) return 0;
                            let h = parseInt(m[1]), min = parseInt(m[2]);
                            if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
                            if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
                            return h * 60 + min;
                          };
                          return toMins(a.completedAt) - toMins(b.completedAt);
                        });
                        sortedActs.forEach(act => {
                          events.push({
                            time: act.completedAt, event: act.label,
                            status: 'Completed', location: act.beneficiary ?? sess.geofenceZone,
                            icon: '✅', color: 'text-blue-300'
                          });
                        });
                        // GPS Logout event
                        if (sess.logoutTime)
                          events.push({
                            time: sess.logoutTime, event: `GPS Logout — Session ${si + 1}`,
                            status: 'Verified', location: sess.geofenceZone,
                            icon: '🔒', color: 'text-slate-400'
                          });
                      });
                      // Sort all events by time
                      const toMins = (t: string) => {
                        const m = t.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i);
                        if (!m) return 0;
                        let h = parseInt(m[1]), min = parseInt(m[2]);
                        if (m[4].toUpperCase() === 'PM' && h !== 12) h += 12;
                        if (m[4].toUpperCase() === 'AM' && h === 12) h = 0;
                        return h * 60 + min;
                      };
                      events.sort((a, b) => toMins(a.time) - toMins(b.time));
                      return (
                        <div className={`p-3 ${cardBg} rounded-3xl border space-y-2`}>
                          {/* Header — tappable */}
                          <button onClick={() => setShowTimeline(p => !p)} className="w-full flex justify-between items-center">
                            <span className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              🕐 Attendance Timeline
                            </span>
                            <span className="text-[9px] font-bold text-slate-500">
                              {events.length} events {showTimeline ? '▲' : '▼'}
                            </span>
                          </button>
                          {showTimeline && (
                            <div className="relative ml-2 space-y-0 border-l border-slate-700 pl-3">
                              {events.map((ev, i) => (
                                <div key={i} className="relative pb-2 last:pb-0">
                                  {/* Dot on the line */}
                                  <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-slate-600 border border-slate-500" />
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <span className={`text-[9.5px] font-bold ${ev.color} flex items-center gap-1`}>
                                        <span>{ev.icon}</span>{ev.event}
                                      </span>
                                      {ev.location && <p className="text-[8.5px] text-slate-400 mt-0.5">📍 {ev.location}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-[9px] font-mono text-slate-300 block">{ev.time}</span>
                                      <span className="text-[8px] text-slate-500">{ev.status}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── ATTENDANCE REMARKS ── system-generated */}
                    {(() => {
                      const remarks: { text: string; type: 'system' | 'admin' }[] = [];
                      // Auto-generate from engine state
                      if (conf.total >= 90) remarks.push({ text: 'GPS verification successful. All attendance criteria met.', type: 'system' });
                      if (totalActs >= ATTENDANCE_RULES.MIN_ACTIVITIES_FOR_PRESENT)
                        remarks.push({ text: `All ${totalActs} assigned field activities verified and completed.`, type: 'system' });
                      if (todayAttendance.status === 'Present')
                        remarks.push({ text: 'Attendance status: Present — Full day credit applied.', type: 'system' });
                      if (todayAdjust?.approvalStatus === 'APPROVED')
                        remarks.push({ text: `Attendance adjusted and approved by ${todayAdjust.approvedBy}. Original record preserved.`, type: 'admin' });
                      const lateRec = todayGpsRecs.find(r => {
                        const m = r.loginTime.match(/(\d+):(\d+)/); if (!m) return false;
                        let h = parseInt(m[1]); const min = parseInt(m[2]);
                        if (r.loginTime.includes('PM') && h !== 12) h += 12;
                        return h * 60 + min > 9 * 60 + ATTENDANCE_RULES.GRACE_TIME_MINUTES;
                      });
                      if (lateRec) remarks.push({ text: `Late login recorded at ${lateRec.loginTime}. Grace period of ${ATTENDANCE_RULES.GRACE_TIME_MINUTES} minutes considered.`, type: 'system' });
                      if (remarks.length === 0) return null;
                      return (
                        <div className={`p-3 ${cardBg} rounded-3xl border space-y-2`}>
                          <span className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">📝 Attendance Remarks</span>
                          <div className="space-y-1.5">
                            {remarks.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 px-2 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-xl">
                                <span className={`text-[8px] font-black px-1 py-0.5 rounded shrink-0 mt-0.5 ${
                                  r.type === 'admin' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-400'
                                }`}>{r.type === 'admin' ? 'ADMIN' : 'SYS'}</span>
                                <span className="text-[9px] text-slate-300 leading-relaxed">{r.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Monthly Summary Card */}
                    <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                      <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider flex items-center space-x-2`}>
                        <CalendarDays className="w-4 h-4 text-blue-400" />
                        <span>MONTHLY ATTENDANCE SUMMARY (JULY 2026)</span>
                      </h4>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Working Days</span>
                          <strong className="text-white font-mono text-base">{monthlySummary.workingDays}</strong>
                        </div>
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                          <span className="text-[9px] text-emerald-400 uppercase font-bold block">Present</span>
                          <strong className="text-emerald-400 font-mono text-base">{monthlySummary.present}</strong>
                        </div>
                        <div className={`p-2.5 ${subCardBg} rounded-2xl border`}>
                          <span className="text-[9px] text-amber-400 uppercase font-bold block">Leave / Absent</span>
                          <strong className="text-amber-400 font-mono text-base">{monthlySummary.leave + monthlySummary.absent}</strong>
                        </div>
                      </div>

                      {/* Payroll Summary */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Payroll Summary</span>
                        {[
                          { label: 'Effective Working Days',  value: `${payrollReport.effectiveWorkingDays} days` },
                          { label: 'Payroll Eligible Days',   value: `${payrollReport.payrollEligibleDays} days` },
                          { label: 'Total Working Hours',     value: payrollReport.totalWorkingHours },
                          { label: 'Overtime Hours',          value: payrollReport.overtimeHours },
                          { label: 'Compliance %',            value: payrollReport.attendanceCompliancePct },
                          { label: 'Avg Verification Score',  value: `${payrollReport.avgConfidenceScore}% (${payrollReport.avgConfidenceGrade})` },
                        ].map(row => (
                          <div key={row.label} className={`flex justify-between items-center px-3 py-1.5 ${subCardBg} rounded-xl border`}>
                            <span className="text-[9.5px] text-slate-400">{row.label}</span>
                            <strong className="text-white font-mono text-[10px]">{row.value}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex justify-between items-center">
                        <span className="font-bold text-white text-xs">Attendance Compliance Percentage</span>
                        <strong className="text-emerald-400 font-mono text-lg">{monthlySummary.percentage}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── TAB 2: ATTENDANCE HISTORY ─── */}
              {attendanceTab === 'history' && (() => {
                const STATUS_OPTIONS = ['All', 'Present', 'Half Day', 'Leave', 'Official Tour', 'Training', 'Holiday', 'Weekly Off', 'Absent'];
                const filtered = enrichedAttendanceHistory.filter(item => {
                  const matchStatus = historyStatusFilter === 'All' || item.effectiveStatus === historyStatusFilter;
                  const matchSearch = !historySearch.trim() || item.date.toLowerCase().includes(historySearch.toLowerCase()) || item.dateKey.includes(historySearch);
                  return matchStatus && matchSearch;
                });
                const statusBadge = (status: string) => {
                  if (status === 'Present')      return 'bg-emerald-500/20 text-emerald-400';
                  if (status === 'Half Day')     return 'bg-amber-500/20 text-amber-300';
                  if (status === 'Leave')        return 'bg-blue-500/20 text-blue-300';
                  if (status === 'Official Tour')return 'bg-orange-500/20 text-orange-300';
                  if (status === 'Training')     return 'bg-purple-500/20 text-purple-300';
                  if (status === 'Holiday')      return 'bg-slate-500/20 text-slate-300';
                  if (status === 'Weekly Off')   return 'bg-slate-700/40 text-slate-400';
                  return 'bg-rose-500/20 text-rose-400';
                };
                return (
                  <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                    <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider`}>ATTENDANCE HISTORY</h4>

                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Search by date (e.g. 27 July or 2026-07-27)"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      className={`w-full px-3 py-2 ${subCardBg} border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/60`}
                    />

                    {/* Status Filter Pills */}
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => setHistoryStatusFilter(s)}
                          className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${historyStatusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-400 border-slate-700 hover:border-emerald-500'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Result count */}
                    <p className="text-[9px] text-slate-400 font-bold">{filtered.length} record{filtered.length !== 1 ? 's' : ''} {historyStatusFilter !== 'All' ? `· ${historyStatusFilter}` : ''}</p>

                    <div className="space-y-2 text-xs">
                      {filtered.length === 0 && (
                        <p className="text-center text-slate-500 py-4 text-[10px]">No records found.</p>
                      )}
                      {filtered.map((item, idx) => {
                        const hEmpNum = officer.officerId.replace(/[^0-9]/g, '').padStart(5, '0');
                        const hAttId  = `ATT-EMP${hEmpNum}-${item.dateKey.replace(/-/g, '')}`;
                        return (
                          <div key={idx} className={`p-3 ${subCardBg} rounded-2xl border space-y-1.5`}>
                            {/* Row header */}
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-bold text-white">{item.date}</span>
                                {item.isAdjusted && (
                                  <span className="ml-1.5 text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">Adjusted</span>
                                )}
                              </div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${statusBadge(item.effectiveStatus)}`}>
                                {item.effectiveStatus}
                              </span>
                            </div>

                            {/* ATT-ID row */}
                            <p className="text-[8.5px] font-mono text-slate-500">{hAttId}</p>

                            {/* Times */}
                            <div className="grid grid-cols-3 gap-2 text-[10.5px] text-slate-300 font-mono">
                              <div><span className="text-slate-500 block text-[9px]">IN:</span><strong>{item.checkIn}</strong></div>
                              <div><span className="text-slate-500 block text-[9px]">OUT:</span><strong>{item.checkOut}</strong></div>
                              <div><span className="text-slate-500 block text-[9px]">HOURS:</span><strong>{item.hours}</strong></div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-800">
                              <span>📍 {item.location}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">{item.activityCount} Acts</span>
                                <span className={`font-bold ${item.confidence.total >= 90 ? 'text-emerald-400' : item.confidence.total >= 75 ? 'text-amber-400' : 'text-orange-400'}`}>Verified: {item.confidence.total}%</span>
                              </div>
                            </div>

                            {/* Adjustment authority — shown only when adjusted */}
                            {item.isAdjusted && item.adjustmentRef && (
                              <div className="text-[8.5px] text-blue-300 bg-blue-950/40 border border-blue-500/20 rounded-xl px-2 py-1">
                                🔧 Approved by <strong className="text-white">{item.adjustmentRef.approvedBy}</strong>
                                {' '}({item.adjustmentRef.approvedByRole?.replace(/_/g, ' ')})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ─── TAB 3: MONTHLY CALENDAR VIEW ─── */}
              {attendanceTab === 'calendar' && (() => {
                const calDetailDay = calendarSelectedDay
                  ? enrichedAttendanceHistory.find(r => r.dateKey === `2026-07-${String(calendarSelectedDay).padStart(2,'0')}`)
                  : null;
                return (
                  <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <h4 className={`font-black text-xs ${textPrimary}`}>JULY 2026 CALENDAR VIEW</h4>
                      <span className="text-[10px] font-bold text-emerald-400">{monthlySummary.percentage} Present</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-slate-400 py-1">
                      <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const dateKey  = `2026-07-${String(day).padStart(2, '0')}`;
                        const record   = enrichedAttendanceHistory.find(r => r.dateKey === dateKey);
                        const effStatus = record?.effectiveStatus;
                        const isSelected = calendarSelectedDay === day;

                        const cellCls: Record<string, string> = {
                          'Present':      'bg-emerald-950/40 border-emerald-700 text-emerald-300',
                          'Half Day':     'bg-amber-950/50 border-amber-600 text-amber-300',
                          'Leave':        'bg-blue-950/50 border-blue-600 text-blue-300',
                          'Official Tour':'bg-orange-950/50 border-orange-600 text-orange-300',
                          'Training':     'bg-purple-950/50 border-purple-600 text-purple-300',
                          'Holiday':      'bg-slate-700/40 border-slate-600 text-slate-300',
                          'Weekly Off':   'bg-slate-900 border-slate-800 text-slate-500',
                          'Absent':       'bg-rose-950/40 border-rose-700 text-rose-300',
                        };
                        const shortLabel: Record<string, string> = {
                          'Present': 'P', 'Half Day': 'H', 'Leave': 'L', 'Official Tour': 'OT',
                          'Training': 'TR', 'Holiday': 'HOL', 'Weekly Off': 'SUN', 'Absent': 'A'
                        };
                        const bg = effStatus ? (cellCls[effStatus] ?? 'bg-slate-800 border-slate-700 text-slate-400') : 'bg-slate-900 border-slate-800 text-slate-600';

                        return (
                          <div
                            key={day}
                            onClick={() => setCalendarSelectedDay(isSelected ? null : day)}
                            className={`p-1.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${bg} ${isSelected ? 'ring-2 ring-white/40' : ''}`}
                          >
                            <span>{day}</span>
                            <span className="text-[7px] mt-0.5">{effStatus ? (shortLabel[effStatus] ?? '?') : '—'}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Day Detail */}
                    {calendarSelectedDay && (
                      <div className={`p-3 ${subCardBg} rounded-2xl border space-y-1.5 border-emerald-500/30`}>
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white text-[10.5px]">{calDetailDay?.date ?? `${calendarSelectedDay} July 2026`}</span>
                          <span className="text-[9px] font-black text-emerald-300">{calDetailDay?.effectiveStatus ?? '—'}</span>
                        </div>
                        {(() => {
                          if (!calDetailDay) return <p className="text-[9px] text-slate-500">No GPS login record for this day.</p>;
                          const cEmpNum = officer.officerId.replace(/[^0-9]/g, '').padStart(5, '0');
                          const cAttId  = `ATT-EMP${cEmpNum}-${calDetailDay.dateKey.replace(/-/g, '')}`;
                          const cSrc    = calDetailDay.source?.replace(/_/g, ' ') ?? 'GPS LOGIN';
                          const cAdj    = calDetailDay.isAdjusted && calDetailDay.adjustmentRef;
                          return (
                            <div className="space-y-1 text-[9px] text-slate-300">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-slate-500">{cAttId}</span>
                                <span className="text-emerald-400 font-bold">{cSrc}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <span>⏱ {calDetailDay.hours}</span>
                                <span>✅ {calDetailDay.activityCount} Activities</span>
                                <span>🛰 {calDetailDay.checkIn} → {calDetailDay.checkOut}</span>
                                <span>📊 Verified: {calDetailDay.confidence.total}%</span>
                                <span className="col-span-2">📍 {calDetailDay.location}</span>
                              </div>
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8.5px] font-bold ${
                                cAdj ? 'bg-blue-950/40 border border-blue-500/20 text-blue-300' : 'bg-slate-800/60 border border-slate-700 text-slate-500'
                              }`}>
                                {cAdj
                                  ? <>🔧 Adjusted — Approved by <strong className="text-white ml-0.5">{calDetailDay.adjustmentRef!.approvedBy}</strong></>
                                  : '✔ No Adjustment'}
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    )}

                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-[9px] font-bold pt-2 border-t border-slate-800">
                      <span className="text-emerald-400">🟢 Present ({monthlySummary.present})</span>
                      <span className="text-amber-400">🟡 Half Day ({monthlySummary.halfDay ?? 0})</span>
                      <span className="text-blue-400">🔵 Leave ({monthlySummary.leave})</span>
                      <span className="text-rose-400">🔴 Absent ({monthlySummary.absent})</span>
                      <span className="text-slate-400">⚪ Weekly Off ({monthlySummary.weeklyOff})</span>
                    </div>
                  </div>
                );
              })()}

              {/* ─── TAB 4: FIELD LOGIN HISTORY ─── */}
              {attendanceTab === 'logins' && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                  <div className="flex justify-between items-center">
                    <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider`}>FIELD LOGIN HISTORY LOGS</h4>
                    <span className="text-[9px] text-slate-400 font-mono">{fieldLoginHistoryList.length} sessions</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {fieldLoginHistoryList.map(log => (
                      <div key={log.id} className={`p-3 ${subCardBg} rounded-2xl border space-y-1`}>
                        <div className="flex justify-between">
                          <span className="font-bold text-white">{log.date}</span>
                          <span className="font-mono text-emerald-400 text-[10.5px]">{log.time}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-300">{log.location}</p>
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block">
                            GPS: {log.gpsStatus}
                          </span>
                          {log.activityCount > 0 && (
                            <span className="text-[9px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                              {log.activityCount} Activities
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          ) : activeMainView === 'PROFILE' ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>My Enterprise Profile</h3>
                <span className="w-5 h-5"></span>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                <div className="flex items-center space-x-3.5">
                  <img src={officer.avatar} alt="Vikas" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md shrink-0" />
                  <div>
                    <h4 className={`font-black text-base ${textPrimary} leading-snug`}>{officer.name}</h4>
                    <p className={`text-xs ${textSecondary} font-semibold`}>{officer.designation}</p>
                    <span className="text-[10.5px] text-slate-300 font-medium block">{officer.districtTaluka}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">ID: {officer.officerId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold pt-1">
                  <button onClick={() => changeView('DIGITAL_ID_FULL')} className="py-2 bg-emerald-600 text-white rounded-xl shadow-md">
                    🪪 Digital ID Card
                  </button>
                  <button onClick={() => changeView('DIGITAL_WALLET')} className="py-2 bg-blue-600 text-white rounded-xl shadow-md">
                    💳 Digital Wallet
                  </button>
                </div>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-2`}>
                <h4 className={`font-black text-xs ${textPrimary} flex items-center space-x-2`}>
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>ORGANIZATION DETAILS</span>
                </h4>
                <p className={`text-xs ${textSecondary}`}>{officer.department}</p>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-2`}>
                <h4 className={`font-black text-xs ${textPrimary} flex items-center space-x-2`}>
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>BANK DETAILS &amp; DBT VERIFICATION</span>
                </h4>
                <p className={`text-xs ${textSecondary}`}>{officer.bank}</p>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-2`}>
                <h4 className={`font-black text-xs ${textPrimary} flex items-center space-x-2`}>
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>ATTENDANCE &amp; COMPLIANCE SUMMARY</span>
                </h4>
                <p className="text-xs text-emerald-400 font-bold">{officer.attendanceCompliance}</p>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-2`}>
                <h4 className={`font-black text-xs ${textPrimary} flex items-center space-x-2`}>
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>PERFORMANCE &amp; ACHIEVEMENTS</span>
                </h4>
                <p className="text-xs text-amber-300 font-bold">{officer.performanceRank}</p>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-2`}>
                <h4 className={`font-black text-xs ${textPrimary} flex items-center space-x-2`}>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>EMERGENCY CONTACTS &amp; HELPLINE</span>
                </h4>
                <p className={`text-xs ${textSecondary}`}>{officer.emergencyContact}</p>
              </div>
            </div>
          ) : activeMainView === 'SETTINGS_APPEARANCE' ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Settings</h3>
                <span className="w-5 h-5"></span>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-3`}>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider flex items-center space-x-2`}>
                    <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                    <span>DASHBOARD PERSONALIZATION</span>
                  </h4>
                  <button
                    onClick={() => setIsPersonalizeOpen(true)}
                    className="px-3 py-1 bg-blue-600 text-white font-black text-[10px] rounded-lg"
                  >
                    Configure Cards ➔
                  </button>
                </div>
                <p className={`text-xs ${textSecondary}`}>
                  Customize widget visibility, hide/show dashboard cards, and restore default layout.
                </p>
              </div>

              <div className={`p-4 ${cardBg} rounded-3xl border space-y-4`}>
                <div>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider mb-2`}>THEME MODE</h4>
                  <div className="space-y-2">
                    <label onClick={() => setThemeMode('dark')} className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${themeMode === 'dark' ? 'bg-emerald-950/40 border-emerald-500' : subCardBg}`}>
                      <div className="flex items-center space-x-2 font-bold text-white"><Moon className="w-4 h-4 text-amber-300" /><span>🌙 Dark Mode (Default)</span></div>
                      <Radio className={`w-4 h-4 ${themeMode === 'dark' ? 'text-emerald-400' : 'text-slate-600'}`} />
                    </label>

                    <label onClick={() => setThemeMode('light')} className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${themeMode === 'light' ? 'bg-emerald-50 border-emerald-500' : subCardBg}`}>
                      <div className="flex items-center space-x-2 font-bold text-slate-900"><Sun className="w-4 h-4 text-amber-500" /><span>☀️ Light Mode</span></div>
                      <Radio className={`w-4 h-4 ${themeMode === 'light' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    </label>

                    <label onClick={() => setThemeMode('system')} className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${themeMode === 'system' ? 'bg-blue-950/40 border-blue-500' : subCardBg}`}>
                      <div className="flex items-center space-x-2 font-bold text-blue-300"><Monitor className="w-4 h-4" /><span>⚙️ System Default</span></div>
                      <Radio className={`w-4 h-4 ${themeMode === 'system' ? 'text-blue-400' : 'text-slate-600'}`} />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider mb-2 flex items-center space-x-2`}>
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <span>ACCENT COLOR THEME</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-bold">
                    <button onClick={() => setAccentColor('green')} className={`p-2.5 rounded-xl border ${accentColor === 'green' ? 'bg-emerald-600 text-white border-emerald-400' : subCardBg}`}>
                      🟢 Green Accent
                    </button>
                    <button onClick={() => setAccentColor('blue')} className={`p-2.5 rounded-xl border ${accentColor === 'blue' ? 'bg-blue-600 text-white border-blue-400' : subCardBg}`}>
                      🔵 Blue Accent
                    </button>
                    <button onClick={() => setAccentColor('gold')} className={`p-2.5 rounded-xl border ${accentColor === 'gold' ? 'bg-amber-600 text-white border-amber-400' : subCardBg}`}>
                      🟡 State Gold
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider mb-2 flex items-center space-x-2`}>
                    <Type className="w-4 h-4 text-blue-400" />
                    <span>FONT SIZE ACCESSIBILITY</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-bold">
                    <button onClick={() => setFontSize('small')} className={`p-2 rounded-xl border ${fontSize === 'small' ? 'bg-blue-600 text-white' : subCardBg}`}>
                      Small (Enterprise)
                    </button>
                    <button onClick={() => setFontSize('medium')} className={`p-2 rounded-xl border ${fontSize === 'medium' ? 'bg-blue-600 text-white' : subCardBg}`}>
                      Medium (Default)
                    </button>
                    <button onClick={() => setFontSize('large')} className={`p-2 rounded-xl border ${fontSize === 'large' ? 'bg-blue-600 text-white' : subCardBg}`}>
                      Large (Accessible)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* OTHER SUB-SCREENS */}
          {activeMainView === 'TODAYS_MISSION' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Today's Mission</h3>
                <span className="w-5 h-5"></span>
              </div>
              <div className="bg-gradient-to-r from-blue-950 via-[#0B1A30] to-[#06382B] border border-blue-500/30 p-4 rounded-3xl space-y-2">
                <h4 className="font-black text-white text-base">EDP – AGRI DRONE WORKSHOP</h4>
                <p className="text-slate-300">State Agri-Drone Entrepreneurship Training &amp; Certification Drive</p>
              </div>
            </div>
          )}

          {activeMainView === 'DIGITAL_WALLET' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className={`font-black text-base ${textPrimary}`}>Digital Wallet &amp; Documents</h3>
              </div>
              <div className="space-y-2">
                <div className={`p-3.5 ${cardBg} rounded-2xl border flex items-center justify-between`}>
                  <div>
                    <h4 className={`font-black ${textPrimary}`}>Digital PVC ID Card</h4>
                    <span className={`text-[10px] ${textSecondary}`}>Verified • Valid 31 Mar 2028</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded">Active</span>
                </div>
                <div className={`p-3.5 ${cardBg} rounded-2xl border flex items-center justify-between`}>
                  <div>
                    <h4 className={`font-black ${textPrimary}`}>Appointment Letter</h4>
                    <span className={`text-[10px] ${textSecondary}`}>Dept of Agri • Issued 01 Apr 2025</span>
                  </div>
                  <span className="bg-blue-500/20 text-blue-400 font-bold text-[9px] px-2 py-0.5 rounded">Verified</span>
                </div>
                <div className={`p-3.5 ${cardBg} rounded-2xl border flex items-center justify-between`}>
                  <div>
                    <h4 className={`font-black ${textPrimary}`}>Drone Training Certificate</h4>
                    <span className={`text-[10px] ${textSecondary}`}>Cert No: MH-DRONE-8839</span>
                  </div>
                  <span className="bg-purple-500/20 text-purple-400 font-bold text-[9px] px-2 py-0.5 rounded">Certified</span>
                </div>
              </div>
            </div>
          )}

          {activeMainView === 'QR_SCANNER' && (
            <div className="space-y-6 text-xs text-center py-6">
              <div className="relative w-64 h-64 border-2 border-emerald-400 rounded-3xl p-4 mx-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-md shadow-2xl">
                <QrCode className="w-44 h-44 text-white animate-pulse" />
              </div>
              <button onClick={() => changeView('DASHBOARD')} className="px-6 py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs">
                Done Scanning
              </button>
            </div>
          )}

        </main>

        {/* DASHBOARD PERSONALIZATION MODAL */}
        {isPersonalizeOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`w-full max-w-sm ${cardBg} border rounded-3xl p-5 space-y-4 text-xs`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-black text-white text-sm flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span>Personalize Dashboard Cards</span>
                </h4>
                <button onClick={() => setIsPersonalizeOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 text-slate-300 max-h-60 overflow-y-auto pr-1">
                {Object.entries(visibleWidgets).map(([key, val]) => (
                  <label key={key} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <span className="capitalize font-bold text-white">{key.replace(/([A-Z])/g, ' $1')} Card</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={() => setVisibleWidgets(prev => ({ ...prev, [key]: !val }))}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </label>
                ))}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setVisibleWidgets({
                      mission: true, target: true, assignment: true, verification: true,
                      stats: true, followups: true, aiAssistant: true, timeline: true,
                      quickActions: true, fieldStatus: true
                    });
                    triggerToast('Restored Default Dashboard Layout');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl flex items-center justify-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default</span>
                </button>
                <button onClick={() => setIsPersonalizeOpen(false)} className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl">
                  Save Customization
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PERMISSIONS MANAGER MODAL */}
        {isPermissionsModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`w-full max-w-sm ${cardBg} border rounded-3xl p-5 space-y-4 text-xs`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-black text-white text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Permissions Manager</span>
                </h4>
                <button onClick={() => setIsPermissionsModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center space-x-2"><Camera className="w-4 h-4 text-blue-400" /><span>Camera</span></span>
                  <span className="text-emerald-400 font-bold">Granted</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center space-x-2"><MapPin className="w-4 h-4 text-rose-400" /><span>Location (GPS)</span></span>
                  <span className="text-emerald-400 font-bold">Granted</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center space-x-2"><Mic className="w-4 h-4 text-purple-400" /><span>Microphone</span></span>
                  <span className="text-emerald-400 font-bold">Granted</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="flex items-center space-x-2"><Bell className="w-4 h-4 text-amber-400" /><span>Notifications</span></span>
                  <span className="text-emerald-400 font-bold">Granted</span>
                </div>
              </div>

              <button onClick={() => setIsPermissionsModalOpen(false)} className="w-full py-2.5 bg-emerald-500 text-slate-950 font-black rounded-xl">
                Close Permissions
              </button>
            </div>
          </div>
        )}

        {/* CATEGORIZED NOTIFICATION CENTER MODAL */}
        {isNotificationCenterOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end justify-center p-0">
            <div className={`w-full ${drawerBg} rounded-t-3xl p-5 shadow-2xl space-y-4 border-t z-50`}>
              <div className="w-12 h-1 bg-slate-400/40 rounded-full mx-auto"></div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-black text-sm text-white">Notification Center</h4>
                <button onClick={() => setIsNotificationCenterOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 text-xs">
                {notificationsList.map(n => (
                  <div key={n.id} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="flex justify-between">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded">{n.category}</span>
                      <span className="text-slate-400 font-mono text-[9px]">{n.time}</span>
                    </div>
                    <h5 className="font-bold text-white text-xs">{n.title}</h5>
                  </div>
                ))}
              </div>

              <button onClick={() => setIsNotificationCenterOpen(false)} className="w-full py-2.5 bg-slate-800 text-slate-300 font-black rounded-xl">
                Close Center
              </button>
            </div>
          </div>
        )}

        {/* FLOATING SPEED DIAL MENU */}
        {isSpeedDialOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end justify-center p-0">
            <div className={`w-full ${drawerBg} rounded-t-3xl p-5 shadow-2xl space-y-4 border-t z-50 animate-in slide-in-from-bottom duration-200`}>
              <div className="w-12 h-1 bg-slate-400/40 rounded-full mx-auto"></div>
              <div className="text-center font-black text-sm text-white border-b border-slate-800 pb-2">⚡ SPEED DIAL ACTION MENU</div>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-extrabold">
                <button onClick={() => { setIsSpeedDialOpen(false); changeView('FARMER_REGISTRATION'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-emerald-500`}>
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>Register Farmer</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('FARMER_REGISTRATION'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-blue-500`}>
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Register Candidate</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('SOIL_TESTING'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-purple-500`}>
                  <FlaskConical className="w-5 h-5 text-purple-400" />
                  <span>Collect Soil</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('DAILY_ATTENDANCE'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-teal-500`}>
                  <CheckCircle className="w-5 h-5 text-teal-400" />
                  <span>Attendance</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('DAILY_ATTENDANCE'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-rose-500`}>
                  <MapPin className="w-5 h-5 text-rose-400" />
                  <span>GPS Check-in</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('QR_SCANNER'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-amber-500`}>
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span>Scan QR</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); changeView('OPERATIONS_LIST'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-cyan-500`}>
                  <Plane className="w-5 h-5 text-cyan-400" />
                  <span>Drone Demo</span>
                </button>

                <button onClick={() => { setIsSpeedDialOpen(false); triggerToast('🚨 Emergency Dispatched to HQ'); }} className={`p-2.5 ${subCardBg} border rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-rose-600`}>
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Emergency</span>
                </button>
              </div>

              <button onClick={() => setIsSpeedDialOpen(false)} className="w-full py-3 bg-slate-800 text-slate-300 font-extrabold rounded-2xl text-xs uppercase tracking-wider">
                CLOSE SPEED DIAL
              </button>
            </div>
          </div>
        )}

        {/* BATTERY MODAL */}
        {isBatteryModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`w-full max-w-sm ${cardBg} border rounded-3xl p-5 space-y-3 text-xs`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-black text-white text-sm flex items-center space-x-2">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  <span>Device Battery &amp; Health</span>
                </h4>
                <button onClick={() => setIsBatteryModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between"><span>Battery Level:</span><strong className="text-emerald-400">86% (Discharging)</strong></div>
                <div className="flex justify-between"><span>Location Accuracy:</span><strong className="text-white">&lt; 15 Meters GPS</strong></div>
                <div className="flex justify-between"><span>Offline Sync Queue:</span><strong className="text-white">0 Pending Records</strong></div>
              </div>

              <button onClick={() => setIsBatteryModalOpen(false)} className="w-full py-2 bg-emerald-500 text-slate-950 font-black rounded-xl">
                Close Status
              </button>
            </div>
          </div>
        )}

        {/* AI ADVISORY MODAL */}
        {isAiModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`w-full max-w-sm ${cardBg} border border-purple-500/40 rounded-3xl p-5 space-y-3 text-xs`}>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="font-black text-purple-300 text-sm flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>Marathi AI Voice Assistant</span>
                </h4>
                <button onClick={() => setIsAiModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-white font-bold">
                "आज हिंगणी गावातील ५ शेतकरी फॉलो-अप प्रलंबित आहेत. प्रथम तेथे भेट दिल्यास वेळेची बचत होईल."
              </p>

              <button onClick={() => setIsAiModalOpen(false)} className="w-full py-2 bg-purple-600 text-white font-black rounded-xl">
                Start Route Navigation
              </button>
            </div>
          </div>
        )}
        </main>

        {/* BOTTOM NAVIGATION BAR */}
        <div className={`fixed bottom-0 left-0 right-0 z-40 ${topNavBg} backdrop-blur-xl border-t px-4 py-2 transition-colors duration-300`}>
          <div className="max-w-[420px] mx-auto flex items-center justify-between text-[10px] font-extrabold">
            <button
              onClick={() => { changeView('DASHBOARD'); setActiveBottomTab('home'); }}
              className={`flex flex-col items-center space-y-0.5 ${activeBottomTab === 'home' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => { changeView('MISSION_CONSOLE'); setActiveBottomTab('tasks'); }}
              className={`flex flex-col items-center space-y-0.5 ${activeBottomTab === 'tasks' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Tasks</span>
            </button>

            <button
              onClick={() => {
                setIsContextMenuOpen(false);
                setIsSpeedDialOpen(true);
              }}
              className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-950/50 -mt-6 hover:scale-105 transition-all border-2 border-slate-900"
              title="Speed Dial Menu"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={() => { changeView('DIGITAL_WALLET'); setActiveBottomTab('wallet'); }}
              className={`flex flex-col items-center space-y-0.5 ${activeBottomTab === 'wallet' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </button>

            <button
              onClick={() => { changeView('PROFILE'); setActiveBottomTab('profile'); }}
              className={`flex flex-col items-center space-y-0.5 ${activeBottomTab === 'profile' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
