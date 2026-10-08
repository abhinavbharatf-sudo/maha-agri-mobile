import { EntrepreneurAssessmentWizard } from '../edp/components/EntrepreneurAssessmentWizard';
import WizardSelect from './components/WizardSelect';
import { MAHARASHTRA_DISTRICTS, getTalukasForDistrict } from '../../data/maharashtraGeography';
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
  Menu, Bell, ChevronRight, ChevronLeft, Loader2, Tractor, Zap, UserCheck, Play, CheckCircle2, Clock, MapPin, MapPinned, Plus, Home, Search,
  ClipboardList, User, FileText, UserPlus, FlaskConical, GraduationCap, Plane,
  Camera, Mic, QrCode, ArrowLeft, Sun, Moon, Check, X, ShieldAlert, Sparkles, Filter,
  ShieldCheck, AlertTriangle, Users, Wallet, Settings, Activity, ArrowUpRight, Share2,
  Download, Eye, Smartphone, RefreshCw, Layers, Lock, Award, FileCheck2, Cpu, Grid,
  MoreVertical, Calendar, Phone, HelpCircle, LogOut, Send, CheckCircle, ChevronDown,
  Wifi, Battery, Cloud, MessageSquare, PhoneCall, AlertCircle, Bot, Monitor, Sliders,
  Building2, CreditCard, Award as Trophy, Globe, History, Radio, Palette, Type, HelpCircle as InfoIcon,
  WifiOff, Volume2, SlidersHorizontal, RotateCcw, AlertOctagon, CalendarDays, CheckCheck, XCircle
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
  | 'SOIL_TESTING'
  | 'DRONE_OPERATIONS'
  | 'NOTIFICATIONS';

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

  // SUB-TAB STATES FOR OPERATIONS, WORKSPACE, ACCOUNT & SYSTEM
  // Final Production Assigned Work Filter Tab
  const [assignedWorkTab, setAssignedWorkTab] = useState<'active' | 'upcoming' | 'priority' | 'overdue' | 'completed'>('active');
  const [expandedWorkSections, setExpandedWorkSections] = useState<Record<string, boolean>>({});
  
  const [farmerTab, setFarmerTab] = useState<'search' | 'add' | 'profile' | 'family' | 'land' | 'crop' | 'soil' | 'drone' | 'docs' | 'visits'>('search');
  const [soilTab, setSoilTab] = useState<'collect' | 'tracking' | 'pending' | 'submitted' | 'reports' | 'download' | 'card'>('collect');
  const [droneTab, setDroneTab] = useState<'booking' | 'assigned' | 'schedule' | 'history' | 'spray' | 'pilot' | 'completion' | 'images' | 'reports'>('assigned');
  const [edpTab, setEdpTab] = useState<'list' | 'register' | 'verification' | 'training' | 'progress' | 'cert'>('list');
  const [notificationTab, setNotificationTab] = useState<'all' | 'priority' | 'assignments' | 'alerts' | 'announcements' | 'updates' | 'read' | 'unread'>('all');
  const [profileSectionTab, setProfileSectionTab] = useState<'personal' | 'digital_id' | 'documents' | 'bank' | 'training' | 'security'>('personal');
  const [settingsSectionTab, setSettingsSectionTab] = useState<'app' | 'notifications' | 'privacy' | 'support' | 'about'>('app');

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

  // FARMER REGISTRATION WIZARD ENGINE STATES (INCREMENTAL CORRECTION SPEC)
  const [isRegWizardOpen, setIsRegWizardOpen] = useState(true);
  const [wizardSection, setWizardSection] = useState<number>(1);
  const [wizardSaveStatus, setWizardSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Entrepreneur wizard: opened AFTER Candidate Type Step 3 selects 'entrepreneur' or 'both'
  const [isEntrepreneurWizardOpen, setIsEntrepreneurWizardOpen] = useState(false);
  const [aadhaarDuplicateError, setAadhaarDuplicateError] = useState<any>(null);
  const [wizardErrorMsg, setWizardErrorMsg] = useState<string | null>(null);
  const [phase1SuccessId, setPhase1SuccessId] = useState<string | null>(null);
  const [isSubmittingPhase1, setIsSubmittingPhase1] = useState(false);
  const [isDeclarationConfirmed, setIsDeclarationConfirmed] = useState(false);
  const [isUnsavedExitDialogOpen, setIsUnsavedExitDialogOpen] = useState(false);
  
  // Gat Parcel Inputs
  const [parcelGatNoInput, setParcelGatNoInput] = useState('');
  const [parcelAreaInput, setParcelAreaInput] = useState('');
  const [parcelUnitInput, setParcelUnitInput] = useState<'Acre' | 'Hectare' | 'Guntha'>('Acre');

  const [isViewCompleteProfileModalOpen, setIsViewCompleteProfileModalOpen] = useState(false);
  const [profileResult, setProfileResult] = useState<any>(null);
  const fieldInputRefs = useRef<Record<string, any>>({});

  const IS_DEV = process.env.NODE_ENV !== 'production';

  const FARMER_WIZARD_SECTIONS = [
    { id: 1, title: 'Basic Details', icon: '🧑‍🌾' },
    { id: 2, title: 'Location Details', icon: '📍' },
    { id: 3, title: 'Candidate Type', icon: '🏷️' },
    { id: 4, title: 'Farmer & Land Profile', icon: '🌾' },
    { id: 5, title: 'Water, Electricity & Facilities / पाणी, वीज आणि सुविधा', icon: '⚡' },
    { id: 6, title: 'Required Services / आवश्यक सेवा', icon: '❤️' },
    { id: 7, title: 'Future Machinery & Investment / भविष्यातील यंत्रसामग्री व गुंतवणूक', icon: '🚜' },
    { id: 8, title: 'Government Schemes & Subsidy / शासकीय योजना व अनुदान', icon: '🏛️' },
    { id: 9, title: 'Major Farming Problems / शेतीतील प्रमुख अडचणी', icon: '⚠️' },
    { id: 10, title: 'Review & Submit Registration / पुनरावलोकन व नोंदणी', icon: '📝' }
  ];

  const [phase1FormData, setPhase1FormData] = useState<any>({
    // Step 1
    fullName: 'VIKAS PANBUDE',
    dob: '1995-05-12',
    age: 31,
    gender: 'Male',
    maritalStatus: 'Married',
    casteCategory: 'General / Open',
    farmerType: 'Individual Farmer',
    aadhaar: '981244108891',
    whatsappMobile: '8766443100',
    alternateMobile: '9822998877',
    email: 'vikas.panbude@maharashtra.gov.in',
    fatherHusbandName: '',
    motherName: '',

    // Step 2
    state: 'Maharashtra',
    district: 'Ratnagiri',
    taluka: 'Ratnagiri',
    village: 'PIMPRI',
    pinCode: '442001',
    residentialAddress: 'HOUSE NO. 142, MAIN GRAM PANCHAYAT ROAD, PIMPRI',
    farmSameAsResidential: 'Yes',
    farmDistrict: 'Wardha',
    farmTaluka: 'Wardha',
    farmVillage: 'PAVANAR',

    // Step 3
    primaryFarmingType: 'Crop Farming',
    farmingExperienceYears: 12,
    mainOccupation: 'Farming',
    totalLand: 3.5,
    landUnit: 'Acre',
    landOwnershipStatus: 'Own Land',
    surveyGatNumbers: ['45/1', '102/2A'],
    gatSurveyParcels: [
      { gatNumber: '45/1', area: '2.00', areaUnit: 'Acre' },
      { gatNumber: '102/2A', area: '1.50', areaUnit: 'Acre' }
    ],
    hasFarmerId: 'Yes',
    govtAgriStackFarmerId: 'MH-FAR-2026-8841',

    // Step 4
    mainCrops: ['Cotton', 'Wheat'],
    cropDetails: {
      Cotton: { season: 'Kharif', approxArea: '2.0 Acres' },
      Wheat: { season: 'Rabi', approxArea: '1.5 Acres' }
    },

    // Step 5
    waterSources: ['Borewell', 'Open Well'],
    irrigationSystems: ['Drip', 'Flood Irrigation'],
    farmElectricity: 'Yes',
    electricityConnectionType: 'Agricultural Electricity Connection',
    powerStatus: 'Regular / Available',
    solarRequirement: 'Need Information',
    solarRequirementType: 'Solar Agricultural Pump',
    machineryOwned: ['Tractor', 'Sprayer'],

    // Step 6
    requiredServices: ['Soil Testing', 'Drone Spraying'],
    servicePriorities: {
      'Soil Testing': 'Immediate',
      'Drone Spraying': 'This Season'
    },

    // Step 7
    futureMachinery: ['Rotavator'],
    futureIrrigation: ['Solar Pump'],
    futureInfrastructure: ['Warehouse/Godown'],
    futureAlliedAgri: ['Dairy'],

    // Step 8
    activeSchemesList: ['PM-Kisan', 'Crop Insurance'],
    activeSchemeOther: '',
    subsidyHelpNeeded: 'Need Information',
    subsidyHelpCategories: ['Farm Machinery', 'Solar Pump'],
    schemesReceived: ['PM-Kisan', 'Crop Insurance'],
    bankName: 'STATE BANK OF INDIA',
    bankAccountNumber: '39812441088',
    ifscCode: 'SBIN0000442',

    // Step 9
    mainProblemsList: ['Water', 'Pest / Disease', 'High Production Cost'],
    mainProblemOther: ''
  });

  const handlePrevWizardSection = () => {
    if (isEntrepreneurWizardOpen) {
      // Back from Entrepreneur Wizard → return to Candidate Type selection (Step 3)
      setIsEntrepreneurWizardOpen(false);
      setIsRegWizardOpen(true);
      setWizardSection(3);
      return;
    }
    if (wizardSection > 1) {
      setWizardSection(prev => (prev - 1) as any);
    } else {
      setIsRegWizardOpen(false);
      triggerToast('Exited Registration Wizard');
    }
  };

  const handleAttemptCloseWizard = () => {
    setIsUnsavedExitDialogOpen(true);
  };

  const updateFormField = (key: string, value: any) => {
    setPhase1FormData((prev: any) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev: any) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateCurrentStep = (section: number): boolean => {
    const errors: Record<string, string> = {};

    const isMarathiScript = (str: string) => /[\u0900-\u097F]/.test(str || '');

    if (section === 1) {
      if (!phase1FormData.fullName || !validateEnglishName(phase1FormData.fullName)) {
        errors.fullName = 'Full Name (3-60 letters) is required';
      }
      if (isMarathiScript(phase1FormData.fullName)) {
        errors.fullName = 'Full Name must be in English (Marathi script not allowed)';
      }
      if (!phase1FormData.dob) {
        errors.dob = 'Date of Birth is required';
      }
      if (!phase1FormData.gender) {
        errors.gender = 'Gender selection is required';
      }
      if (!phase1FormData.casteCategory) {
        errors.casteCategory = 'Caste Category is required';
      }
      if (!phase1FormData.aadhaar || !validateAadhaarNumber(phase1FormData.aadhaar)) {
        errors.aadhaar = 'Valid 12-digit Aadhaar number required';
      }
      if (!phase1FormData.alternateMobile || !validateAlternateMobile(phase1FormData.alternateMobile)) {
        errors.alternateMobile = 'Valid 10-digit alternate mobile required';
      }
    } else if (section === 2) {
      if (!phase1FormData.district) {
        errors.district = 'District is required';
      }
      if (!phase1FormData.taluka) {
        errors.taluka = 'Taluka is required';
      }
      if (!phase1FormData.village || !validateEnglishVillage(phase1FormData.village)) {
        errors.village = 'Valid village name (2-50 letters) required';
      }
      if (isMarathiScript(phase1FormData.village)) {
        errors.village = 'Village name must be in English (Marathi script not allowed)';
      }
      if (!phase1FormData.pinCode || !validatePinCode(phase1FormData.pinCode)) {
        errors.pinCode = 'Valid 6-digit PIN code required';
      }
      if (isMarathiScript(phase1FormData.residentialAddress)) {
        errors.residentialAddress = 'Residential Address must be in English (Marathi script not allowed)';
      }
    } else if (section === 3) {
      if (!phase1FormData.totalLand || phase1FormData.totalLand <= 0) {
        errors.totalLand = 'Total Land Area must be greater than 0';
      }
      if (phase1FormData.hasFarmerId === 'Yes') {
        if (!phase1FormData.govtAgriStackFarmerId || !phase1FormData.govtAgriStackFarmerId.trim()) {
          errors.govtAgriStackFarmerId = 'Farmer ID Number is required when Farmer ID is Yes';
        } else if (isMarathiScript(phase1FormData.govtAgriStackFarmerId)) {
          errors.govtAgriStackFarmerId = 'Farmer ID must be in English (Marathi script not allowed)';
        }
      }
    } else if (section === 4) {
      if (!phase1FormData.farmDistrict) {
        errors.farmDistrict = 'Farm District is required / शेतीचा जिल्हा निवडणे आवश्यक आहे';
      }
      if (!phase1FormData.farmTaluka) {
        errors.farmTaluka = 'Farm Taluka is required / शेतीचा तालुका निवडणे आवश्यक आहे';
      }
      if (!phase1FormData.farmVillage || !phase1FormData.farmVillage.trim()) {
        errors.farmVillage = 'Farm Village / Town is required / शेतीचे गाव / शहर आवश्यक आहे';
      } else if (isMarathiScript(phase1FormData.farmVillage)) {
        errors.farmVillage = 'Farm Village must be in English / शेतीचे गाव इंग्रजीत लिहा';
      }
      if (!phase1FormData.mainCrops || phase1FormData.mainCrops.length === 0) {
        errors.mainCrops = 'Please select at least one crop';
      }
    } else if (section === 5) {
      if (!phase1FormData.waterSources || phase1FormData.waterSources.length === 0) {
        errors.waterSources = 'Please select at least one water source / किमान एक पाण्याचा स्त्रोत निवडा';
      }
    } else if (section === 8) {
      if (!phase1FormData.activeSchemesList || phase1FormData.activeSchemesList.length === 0) {
        errors.activeSchemesList = 'Please select at least one option under Section A / विभाग अ मधील किमान एक पर्याय निवडा';
      }
      if (phase1FormData.activeSchemesList?.includes('Other')) {
        if (!phase1FormData.activeSchemeOther || !phase1FormData.activeSchemeOther.trim()) {
          errors.activeSchemeOther = 'Please specify the other scheme / इतर योजना नमूद करा';
        } else if (isMarathiScript(phase1FormData.activeSchemeOther)) {
          errors.activeSchemeOther = 'Specified scheme must be in English / योजनेचे नाव इंग्रजीत लिहा';
        }
      }
    } else if (section === 9) {
      if (!phase1FormData.mainProblemsList || phase1FormData.mainProblemsList.length === 0) {
        errors.mainProblemsList = 'Please select at least one major farming problem / किमान एक प्रमुख अडचण निवडा';
      }
      if (phase1FormData.mainProblemsList?.length > 3) {
        errors.mainProblemsList = 'Maximum 3 problems allowed / जास्तीत जास्त ३ अडचणी निवडता येतील';
      }
      if (phase1FormData.mainProblemsList?.includes('Other')) {
        if (!phase1FormData.mainProblemOther || !phase1FormData.mainProblemOther.trim()) {
          errors.mainProblemOther = 'Please specify the other problem / इतर अडचण नमूद करा';
        } else if (isMarathiScript(phase1FormData.mainProblemOther)) {
          errors.mainProblemOther = 'Specified problem must be in English / अडचणीचा तपशील इंग्रजीत लिहा';
        }
      }
    }

    setFieldErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const firstErrorMsg = errors[firstKey];
      triggerToast(`⚠️ ${firstErrorMsg}`);

      // AUTOMATIC CURSOR FOCUS & SMOOTH SCROLL TO INVALID FIELD
      setTimeout(() => {
        const targetElem = fieldInputRefs.current[firstKey] || document.getElementById(`field-input-${firstKey}`);
        if (targetElem) {
          if (typeof targetElem.focus === 'function') {
            targetElem.focus();
          }
          if (typeof targetElem.scrollIntoView === 'function') {
            targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 50);

      return false;
    }

    return true;
  };

  const toggleMultiSelect = (key: string, item: string) => {
    setPhase1FormData((prev: any) => {
      const list = prev[key] || [];
      const next = list.includes(item) ? list.filter((i: string) => i !== item) : [...list, item];
      
      let nextCropDetails = { ...prev.cropDetails };
      if (key === 'mainCrops') {
        if (!list.includes(item) && !nextCropDetails[item]) {
          nextCropDetails[item] = { season: 'Kharif', approxArea: '1.0 Acre' };
        }
      }
      return { ...prev, [key]: next, cropDetails: nextCropDetails };
    });
  };

  // STEP 8 MULTI-SELECT CHIP LOGIC WITH MUTUAL EXCLUSION (None & Don't Know)
  const toggleActiveScheme = (scheme: string) => {
    setPhase1FormData((prev: any) => {
      const list: string[] = prev.activeSchemesList || [];
      if (scheme === 'None') {
        return { ...prev, activeSchemesList: list.includes('None') ? [] : ['None'] };
      }
      if (scheme === "Don't Know") {
        return { ...prev, activeSchemesList: list.includes("Don't Know") ? [] : ["Don't Know"] };
      }
      // Specific scheme selected -> remove 'None' and "Don't Know"
      let next = list.filter(s => s !== 'None' && s !== "Don't Know");
      if (next.includes(scheme)) {
        next = next.filter(s => s !== scheme);
      } else {
        next.push(scheme);
      }
      return { ...prev, activeSchemesList: next };
    });
  };

  // STEP 9 MULTI-SELECT CHIP LOGIC WITH MAX 3 LIMIT
  const toggleMainProblem = (problem: string) => {
    setPhase1FormData((prev: any) => {
      const list: string[] = prev.mainProblemsList || [];
      if (list.includes(problem)) {
        return { ...prev, mainProblemsList: list.filter(p => p !== problem) };
      }
      if (list.length >= 3) {
        triggerToast('Maximum 3 problems allowed.');
        return prev;
      }
      return { ...prev, mainProblemsList: [...list, problem] };
    });
  };

  // GAT PARCEL ADD / REMOVE / CALCULATE TOTAL
  const addGatParcel = () => {
    if (!parcelGatNoInput.trim()) {
      triggerToast('Gat / Survey No. is required.');
      return;
    }
    if (/[\u0900-\u097F]/.test(parcelGatNoInput)) {
      triggerToast('⚠️ Gat No. must be in English (Marathi script not allowed).');
      return;
    }
    const areaNum = parseFloat(parcelAreaInput);
    if (isNaN(areaNum) || areaNum <= 0) {
      triggerToast('Valid positive area is required.');
      return;
    }
    const newParcel = {
      gatNumber: parcelGatNoInput.trim().toUpperCase(),
      area: areaNum.toFixed(2),
      areaUnit: parcelUnitInput
    };

    setPhase1FormData((prev: any) => {
      const parcels = prev.gatSurveyParcels || [];
      const updatedParcels = [...parcels, newParcel];
      const updatedGatNumbers = Array.from(new Set(updatedParcels.map(p => p.gatNumber)));
      return {
        ...prev,
        gatSurveyParcels: updatedParcels,
        surveyGatNumbers: updatedGatNumbers
      };
    });

    setParcelGatNoInput('');
    setParcelAreaInput('');
  };

  const removeGatParcel = (index: number) => {
    setPhase1FormData((prev: any) => {
      const parcels = prev.gatSurveyParcels || [];
      const updatedParcels = parcels.filter((_: any, i: number) => i !== index);
      const updatedGatNumbers = Array.from(new Set(updatedParcels.map((p: any) => p.gatNumber)));
      return {
        ...prev,
        gatSurveyParcels: updatedParcels,
        surveyGatNumbers: updatedGatNumbers
      };
    });
  };

  // CALCULATE NORMALIZED TOTAL LAND IN ACRES
  const calculateGatWiseTotalAcres = () => {
    const parcels = phase1FormData.gatSurveyParcels || [];
    let totalAcres = 0;
    parcels.forEach((p: any) => {
      const val = parseFloat(p.area) || 0;
      if (p.areaUnit === 'Acre') totalAcres += val;
      else if (p.areaUnit === 'Hectare') totalAcres += val * 2.47105;
      else if (p.areaUnit === 'Guntha') totalAcres += val * 0.025;
    });
    return totalAcres.toFixed(2);
  };

  const updateCropDetail = (crop: string, field: 'season' | 'approxArea', val: string) => {
    setPhase1FormData((prev: any) => ({
      ...prev,
      cropDetails: {
        ...prev.cropDetails,
        [crop]: {
          ...prev.cropDetails?.[crop],
          [field]: val
        }
      }
    }));
  };

  const removeCropDetail = (crop: string) => {
    setPhase1FormData((prev: any) => {
      const nextCrops = (prev.mainCrops || []).filter((c: string) => c !== crop);
      const nextDetails = { ...prev.cropDetails };
      delete nextDetails[crop];
      return { ...prev, mainCrops: nextCrops, cropDetails: nextDetails };
    });
  };

  const setServicePriority = (service: string, priority: 'Immediate' | 'This Season' | 'Future') => {
    setPhase1FormData((prev: any) => ({
      ...prev,
      servicePriorities: {
        ...prev.servicePriorities,
        [service]: priority
      }
    }));
  };

  const validateEnglishName = (name: string) => /^[A-Za-z\s.]{3,60}$/.test(name.trim());
  const validateAadhaarNumber = (aadhaar: string) => /^\d{12}$/.test(aadhaar.trim());
  const checkDuplicateAadhaar = (aadhaar: string, mobile: string) => ({ exists: false });
  const validateEnglishVillage = (v: string) => /^[A-Za-z\s]{2,50}$/.test(v.trim());
  const validatePinCode = (pin: string) => /^\d{6}$/.test(pin.trim());
  const validateAlternateMobile = (mob: string) => /^\d{10}$/.test(mob.trim());

  const validateSection1 = () => ({ isValid: true, error: null });
  const validateSection2 = () => ({ isValid: true, error: null });

  const handlePhase1Submit = async () => {
    setIsSubmittingPhase1(true);
    setTimeout(() => {
      setIsSubmittingPhase1(false);
      setIsRegWizardOpen(false);
      triggerToast('Farmer Registration Profile Created Successfully!');
    }, 1200);
  };

  const handleDevAutoFillFarmer = () => {
    triggerToast('Auto-filled Farmer Demo Profile');
  };

  const handleDevAutoFillEntrepreneur = () => {
    triggerToast('Auto-filled Entrepreneur Demo Profile');
  };

  const handleDevAutoFillBoth = () => {
    triggerToast('Auto-filled Both Demo Profile');
  };

  const generateRandomAadhaar = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const generateRandomMobile = () => '98' + Math.floor(10000000 + Math.random() * 90000000).toString();

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

        {/* ORGANIZED SIDEBAR MENU (FINAL FROZEN STRUCTURE) */}
        {isDrawerOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex">
            <div className={`w-72 h-full ${drawerBg} flex flex-col justify-between p-4 shadow-2xl animate-in slide-in-from-left duration-300 relative border-r z-50`}>
              
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* BRAND HEADER */}
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

                {/* TOP AREA: USER PHOTO, EMPLOYEE NAME, EMPLOYEE ID, DESIGNATION */}
                <div className="p-3 bg-gradient-to-r from-slate-900 to-emerald-950/40 rounded-2xl border border-slate-800 flex items-center space-x-3">
                  <img src={officer.avatar} alt="Officer" className="w-10 h-10 rounded-full object-cover border border-emerald-400 shadow-md shrink-0" />
                  <div>
                    <h3 className="font-black text-xs text-white leading-snug">{officer.name}</h3>
                    <span className="text-[9.5px] text-slate-300 font-semibold block">{officer.designation}</span>
                    <span className="text-[8.5px] font-mono text-emerald-400 font-bold block mt-0.5">ID: {officer.officerId}</span>
                  </div>
                </div>

                {/* MIDDLE AREA: GROUPED NAVIGATION IN EXACT ORDER */}
                <nav className="space-y-3 text-xs font-bold">
                  
                  {/* 🏠 HOME */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">🏠 HOME</span>
                    <button
                      onClick={() => { changeView('DASHBOARD'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DASHBOARD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Dashboard</span>
                    </button>
                  </div>

                  {/* 📂 OPERATIONS */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">📂 OPERATIONS</span>
                    
                    <button
                      onClick={() => { changeView('TODAYS_MISSION'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'TODAYS_MISSION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Assigned Work</span>
                    </button>

                    <button
                      onClick={() => { changeView('FARMER_REGISTRATION'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'FARMER_REGISTRATION' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Farmer Management</span>
                    </button>

                    <button
                      onClick={() => { changeView('SOIL_TESTING'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'SOIL_TESTING' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Soil Testing</span>
                    </button>

                    <button
                      onClick={() => { changeView('DRONE_OPERATIONS'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DRONE_OPERATIONS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <Plane className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Drone Operations</span>
                    </button>

                    <button
                      onClick={() => { changeView('MISSION_CONSOLE'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'MISSION_CONSOLE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>EDP-AGRI</span>
                    </button>
                  </div>

                  {/* 📂 WORKSPACE */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">📂 WORKSPACE</span>
                    
                    <button
                      onClick={() => { changeView('DAILY_ATTENDANCE'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'DAILY_ATTENDANCE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Attendance</span>
                    </button>

                    <button
                      onClick={() => { changeView('NOTIFICATIONS'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'NOTIFICATIONS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <Bell className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>Notifications</span>
                    </button>
                  </div>

                  {/* 📂 ACCOUNT */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">📂 ACCOUNT</span>
                    
                    <button
                      onClick={() => { changeView('PROFILE'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all ${activeMainView === 'PROFILE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <User className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>My Profile</span>
                    </button>
                  </div>

                  {/* 📂 SYSTEM */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 block">📂 SYSTEM</span>
                    
                    <button
                      onClick={() => { changeView('SETTINGS_APPEARANCE'); setIsDrawerOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${activeMainView === 'SETTINGS_APPEARANCE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                </nav>
              </div>

              {/* BOTTOM AREA: APP VERSION & SIGN OUT BUTTON FIXED AT BOTTOM */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                  <span>v2.4.0 (Final Frozen)</span>
                  <span className="text-emerald-400">{lastSyncTime}</span>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 border border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
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

                  {/* STEP 1: MOBILE NUMBER ENTRY */}
                  {regStep === 1 && (
                    <div className="flex space-x-2 pt-1 text-xs">
                      <input
                        type="tel"
                        maxLength={10}
                        value={regMobileNumber}
                        onChange={e => setRegMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit Mobile Number"
                        className={`flex-1 ${subCardBg} border rounded-xl px-3 py-2 font-mono font-bold ${textPrimary} focus:outline-none focus:border-emerald-500`}
                      />
                      <button
                        onClick={() => {
                          if (!regMobileNumber || regMobileNumber.length !== 10) {
                            triggerToast('⚠️ Please enter a valid 10-digit mobile number!');
                            return;
                          }
                          setRegStep(2);
                          setRegSuccessMsg(`✅ OTP sent to +91 ${regMobileNumber}`);
                          triggerToast('📱 OTP Dispatched to Mobile!');
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl transition-all shrink-0"
                      >
                        SEND OTP ➔
                      </button>
                    </div>
                  )}

                  {/* STEP 2: OTP VERIFICATION (TESTING BYPASS — ANY OTP ACCEPTED) */}
                  {regStep === 2 && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in">
                      <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 flex items-center space-x-2">
                        <span>📱</span>
                        <span>OTP sent to +91 {regMobileNumber}</span>
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="ml-auto text-slate-400 hover:text-white underline text-[10px] cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      <div className="flex space-x-2 text-xs">
                        <input
                          type="tel"
                          maxLength={6}
                          placeholder="Enter OTP"
                          className={`flex-1 ${subCardBg} border rounded-xl px-3 py-2.5 font-mono font-bold text-white text-lg tracking-[0.4em] text-center focus:outline-none focus:border-emerald-500`}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            e.target.value = val;
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                            const otp = input?.value || '';
                            if (!otp || otp.length < 4) {
                              triggerToast('⚠️ Please enter at least 4-digit OTP!');
                              return;
                            }
                            // TESTING BYPASS — any OTP accepted
                            setRegStep(3);
                            setRegSuccessMsg('✅ OTP Verified! Checking profile...');
                            triggerToast('✅ OTP Verified!');
                            setTimeout(() => {
                              setRegStep(4);
                              setRegSuccessMsg('✅ Profile found for +91 ' + regMobileNumber);
                            }, 800);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl transition-all shrink-0"
                        >
                          VERIFY OTP ✓
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium text-center">
                        🔓 Testing Mode: Any OTP will be accepted
                      </p>
                    </div>
                  )}

                  {/* STEP 4: PROFILE FOUND / NEW REGISTRATION */}
                  {regStep === 4 && (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-2.5 animate-in fade-in">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-emerald-300 text-xs flex items-center space-x-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span>Profile Verified!</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => { setRegStep(1); setRegSuccessMsg(null); }}
                          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        Mobile: <strong className="text-white font-bold">+91 {regMobileNumber}</strong> — Ready to Register New Candidate
                      </p>
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegWizardOpen(true);
                            setWizardSection(1);
                            setPhase1FormData((prev: any) => ({ ...prev, whatsappMobile: regMobileNumber }));
                          }}
                          className="flex-1 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                        >
                          <span>🧑‍🌾 New Registration ➔</span>
                        </button>
                      </div>
                    </div>
                  )}


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

          ) : null}

          {/* OTHER SUB-SCREENS */}
          
          {/* 1. ASSIGNED WORK (TODAYS_MISSION) */}
          {activeMainView === 'TODAYS_MISSION' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Today's Assigned Work</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                {[
                  { id: 'active', label: 'Active Tasks (4)' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'priority', label: 'High Priority (2)' },
                  { id: 'completed', label: 'Completed (12)' },
                  { id: 'overdue', label: 'Overdue (0)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAssignedWorkTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${assignedWorkTab === tab.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TASK CARDS LIST */}
              <div className="space-y-3">
                {[
                  {
                    id: 'TSK-2026-0891',
                    type: 'Soil Sample Collection',
                    farmer: 'Rameshwar Patil',
                    village: 'Pimpri, Wardha',
                    gps: '20.7453° N, 78.6022° E',
                    dueDate: '30 Jul 2026',
                    dueTime: '04:30 PM',
                    priority: 'HIGH',
                    status: 'IN_PROGRESS',
                    assignedBy: 'Block Ag. Officer'
                  },
                  {
                    id: 'TSK-2026-0892',
                    type: 'Agri-Drone Spraying Demo',
                    farmer: 'Suresh Deshmukh',
                    village: 'Seloo, Wardha',
                    gps: '20.8122° N, 78.7104° E',
                    dueDate: '30 Jul 2026',
                    dueTime: '06:00 PM',
                    priority: 'URGENT',
                    status: 'PENDING',
                    assignedBy: 'District Ag. Office'
                  }
                ].map(task => (
                  <div key={task.id} className={`p-4 ${cardBg} rounded-3xl border border-slate-800 shadow-lg space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                        {task.id}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${task.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                          {task.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className={`font-black text-sm ${textPrimary}`}>{task.type}</h4>
                      <p className={`text-xs ${textSecondary} font-semibold mt-0.5`}>Farmer: <span className="text-white font-bold">{task.farmer}</span> • {task.village}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">GPS LOCATION</span>
                        <span className="text-emerald-400 font-mono font-semibold flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{task.gps}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">DUE DATE & TIME</span>
                        <span className="text-slate-200 font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{task.dueDate} • {task.dueTime}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-medium">
                      Assigned By: <span className="text-slate-300 font-bold">{task.assignedBy}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button onClick={() => triggerToast(`Started work on ${task.id}`)} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10.5px] shadow-md flex items-center justify-center space-x-1">
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </button>
                      <button onClick={() => triggerToast(`Evidence upload opened for ${task.id}`)} className="py-2 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-bold rounded-xl text-[10.5px] border border-blue-500/30 flex items-center justify-center space-x-1">
                        <Camera className="w-3 h-3" />
                        <span>Evidence</span>
                      </button>
                      <button onClick={() => triggerToast(`Task ${task.id} marked complete`)} className="py-2 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl text-[10.5px] shadow-md flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Complete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. FARMER MANAGEMENT (FARMER_REGISTRATION) */}
          {activeMainView === 'FARMER_REGISTRATION' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Farmer Management</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'search', label: 'Search' },
                  { id: 'add', label: '+ Add Farmer' },
                  { id: 'profile', label: 'Profile' },
                  { id: 'family', label: 'Family' },
                  { id: 'land', label: '7/12 Land' },
                  { id: 'crop', label: 'Crop Details' },
                  { id: 'soil', label: 'Soil History' },
                  { id: 'drone', label: 'Drone Services' },
                  { id: 'docs', label: 'Documents' },
                  { id: 'visits', label: 'Visits' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFarmerTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${farmerTab === tab.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Farmer Name, Aadhaar, Mobile, or 7/12 Khata No..."
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* FARMER PROFILE CARD SAMPLE */}
              <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-3 shadow-xl`}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-center font-black text-emerald-400 text-base">
                    RP
                  </div>
                  <div>
                    <h4 className={`font-black text-sm ${textPrimary}`}>Rameshwar Tukaram Patil</h4>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold block">Agri-ID: MH-AGRI-2026-9812</span>
                    <span className="text-[10px] text-slate-400 block">Village: Pimpri, Taluka: Wardha</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block">MOBILE NUMBER</span>
                    <span className="text-white font-bold">+91 98223 45678</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block">LAND HOLDING</span>
                    <span className="text-emerald-400 font-bold">4.25 Hectares (7/12 Verified)</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button onClick={() => triggerToast('Farmer Profile Opened')} className="flex-1 py-2 bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md">
                    View Full Profile
                  </button>
                  <button onClick={() => triggerToast('Visit recorded for farmer')} className="py-2 px-4 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-700">
                    Record Visit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. SOIL TESTING (SOIL_TESTING) */}
          {activeMainView === 'SOIL_TESTING' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Soil Testing Engine</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'collect', label: '+ Collect Sample' },
                  { id: 'tracking', label: 'Tracking' },
                  { id: 'pending', label: 'Pending (8)' },
                  { id: 'submitted', label: 'Submitted (14)' },
                  { id: 'reports', label: 'Test Reports' },
                  { id: 'download', label: 'Download' },
                  { id: 'card', label: 'Soil Health Card' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSoilTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${soilTab === tab.id ? 'bg-purple-600 text-white border-purple-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SAMPLE ITEM SAMPLE */}
              <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-3 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/40">
                    STR-HNG-20260729-0011
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    LAB PROCESSING
                  </span>
                </div>

                <div>
                  <h4 className={`font-black text-sm ${textPrimary}`}>Farmer: Rameshwar Patil (Khata #442)</h4>
                  <p className="text-[10.5px] text-slate-400">Village: Hinganghat • Collected: 28 Jul 2026</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80 font-bold">
                  <div className="p-1 rounded-xl bg-purple-950/40 border border-purple-800/40">
                    <span className="text-slate-400 block text-[8px]">NITROGEN (N)</span>
                    <span className="text-purple-300">Medium (240 kg/ha)</span>
                  </div>
                  <div className="p-1 rounded-xl bg-purple-950/40 border border-purple-800/40">
                    <span className="text-slate-400 block text-[8px]">PHOSPHORUS (P)</span>
                    <span className="text-emerald-400">High (48 kg/ha)</span>
                  </div>
                  <div className="p-1 rounded-xl bg-purple-950/40 border border-purple-800/40">
                    <span className="text-slate-400 block text-[8px]">POTASSIUM (K)</span>
                    <span className="text-amber-300">Optimal (310 kg/ha)</span>
                  </div>
                </div>

                <button onClick={() => triggerToast('Soil Health Card Generated')} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center space-x-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Official Soil Health Card PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. DRONE OPERATIONS (DRONE_OPERATIONS) */}
          {activeMainView === 'DRONE_OPERATIONS' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Agri-Drone Operations</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'booking', label: 'Booking' },
                  { id: 'assigned', label: 'Assigned Jobs (3)' },
                  { id: 'schedule', label: 'Flight Schedule' },
                  { id: 'history', label: 'History' },
                  { id: 'spray', label: 'Spray Details' },
                  { id: 'pilot', label: 'Pilot Details' },
                  { id: 'completion', label: 'Completion' },
                  { id: 'images', label: 'Drone Images' },
                  { id: 'reports', label: 'Reports' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDroneTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${droneTab === tab.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* DRONE JOB SAMPLE */}
              <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-3 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40">
                    DRN-JOB-2026-042
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SCHEDULED • TODAY
                  </span>
                </div>

                <div>
                  <h4 className={`font-black text-sm ${textPrimary}`}>Nano-Urea Spraying Mission (10 Acres)</h4>
                  <p className="text-[10.5px] text-slate-400">DGCA Pilot: Vishal Deshmukh (Lic #DGCA-MH-882)</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block">FLIGHT ALTITUDE</span>
                    <span className="text-cyan-300 font-bold">15m (Auto-GeoFenced)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block">BATTERY &amp; SPRAY RATE</span>
                    <span className="text-emerald-400 font-bold">92% • 8 L/Acre</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => triggerToast('Telemetry stream connected')} className="flex-1 py-2 bg-cyan-600 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center space-x-1">
                    <Plane className="w-3.5 h-3.5" />
                    <span>Launch Live Telemetry</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. EDP-AGRI (MISSION_CONSOLE) */}
          {activeMainView === 'MISSION_CONSOLE' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>EDP-AGRI Entrepreneurship</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'list', label: 'Entrepreneurs (35)' },
                  { id: 'register', label: '+ New Registration' },
                  { id: 'verification', label: 'Verification' },
                  { id: 'training', label: 'Training' },
                  { id: 'progress', label: 'Progress' },
                  { id: 'cert', label: 'Certification' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setEdpTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${edpTab === tab.id ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* EDP CARD SAMPLE */}
              <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-3 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                    EDP-MH-2026-019
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    STAGE 14 / 17 • CERTIFIED
                  </span>
                </div>

                <div>
                  <h4 className={`font-black text-sm ${textPrimary}`}>Agri-Drone Enterprise Cohort #4</h4>
                  <p className="text-[10.5px] text-slate-400">Candidate: Ankita Shinde • B.Sc Agriculture</p>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full w-[82%]"></div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>Progress: 82% Completed</span>
                  <span className="text-emerald-400">Cert #EDP-8812</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. NOTIFICATIONS (NOTIFICATIONS) */}
          {activeMainView === 'NOTIFICATIONS' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Notification Center</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'all', label: 'All (12)' },
                  { id: 'priority', label: 'High Priority (3)' },
                  { id: 'assignments', label: 'Assignments' },
                  { id: 'alerts', label: 'System Alerts' },
                  { id: 'announcements', label: 'Announcements' },
                  { id: 'updates', label: 'Updates' },
                  { id: 'unread', label: 'Unread (4)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotificationTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${notificationTab === tab.id ? 'bg-orange-600 text-white border-orange-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* NOTIFICATION ITEMS LIST */}
              <div className="space-y-2">
                {[
                  { id: 1, title: 'New Mission Assigned: Soil Sample Batch', time: '10 mins ago', type: 'Assignment', unread: true },
                  { id: 2, title: 'GPS Geofence Verified: Wardha Field Hub', time: '1 hour ago', type: 'System Alert', unread: true },
                  { id: 3, title: 'State Subsidy Release Directive Published', time: '3 hours ago', type: 'Announcement', unread: false }
                ].map(item => (
                  <div key={item.id} className={`p-3.5 ${cardBg} rounded-2xl border ${item.unread ? 'border-orange-500/40 bg-orange-950/20' : 'border-slate-800'} flex items-start justify-between`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[8.5px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {item.type}
                        </span>
                        {item.unread && <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>}
                      </div>
                      <h4 className={`font-bold ${textPrimary}`}>{item.title}</h4>
                      <span className="text-[9.5px] text-slate-400 font-mono block">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. MY PROFILE (PROFILE) */}
          {activeMainView === 'PROFILE' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>My Enterprise Profile</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* SECTION TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'personal', label: 'Personal Info' },
                  { id: 'digital_id', label: 'Digital ID Card' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'bank', label: 'Bank Details' },
                  { id: 'training', label: 'Training & Certs' },
                  { id: 'security', label: 'Security' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileSectionTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${profileSectionTab === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* PROFILE HEADER CARD */}
              <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-3 shadow-xl`}>
                <div className="flex items-center space-x-3.5">
                  <img src={officer.avatar} alt="Officer" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md shrink-0" />
                  <div>
                    <h4 className={`font-black text-base ${textPrimary} leading-snug`}>{officer.name}</h4>
                    <p className={`text-xs ${textSecondary} font-semibold`}>{officer.designation}</p>
                    <span className="text-[10.5px] text-slate-300 font-medium block">{officer.districtTaluka}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">ID: {officer.officerId}</span>
                  </div>
                </div>
              </div>

              {/* PERSONAL INFO TAB */}
              {profileSectionTab === 'personal' && (
                <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-2.5`}>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider mb-2 flex items-center space-x-2`}>
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>Personal Information</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block font-bold">MOBILE NUMBER</span>
                      <span className="font-bold text-white">+91 98234 11200</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[9px] text-slate-500 block font-bold">OFFICIAL EMAIL</span>
                      <span className="font-bold text-white">vikas.p@maharashtra.gov.in</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DIGITAL ID TAB */}
              {profileSectionTab === 'digital_id' && (
                <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 text-center space-y-3`}>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider`}>Official Digital ID Card</h4>
                  <div className="w-40 h-40 border-2 border-emerald-400 rounded-2xl mx-auto flex items-center justify-center bg-slate-900 p-2">
                    <QrCode className="w-32 h-32 text-emerald-400" />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button onClick={() => triggerToast('Digital ID PDF Downloaded')} className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl">Download</button>
                    <button onClick={() => triggerToast('Digital ID Shared')} className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-700">Share</button>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {profileSectionTab === 'security' && (
                <div className={`p-4 ${cardBg} rounded-3xl border border-slate-800 space-y-2 text-slate-300`}>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider mb-2 flex items-center space-x-2`}>
                    <Lock className="w-4 h-4 text-rose-400" />
                    <span>Security &amp; Credentials</span>
                  </h4>
                  <div className="space-y-2">
                    <button onClick={() => triggerToast('Password Change Requested')} className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center font-bold">
                      <span>Change Password</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => triggerToast('MPIN Change Requested')} className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center font-bold">
                      <span>Change MPIN</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. SETTINGS (SETTINGS_APPEARANCE) */}
          {activeMainView === 'SETTINGS_APPEARANCE' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <button onClick={() => changeView('DASHBOARD')} className="p-1 text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className={`font-black text-base ${textPrimary}`}>Settings</h3>
                <span className="w-5 h-5"></span>
              </div>

              {/* SECTION TABS */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10.5px] font-bold">
                {[
                  { id: 'app', label: 'App Settings' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'privacy', label: 'Privacy' },
                  { id: 'support', label: 'Help & Support' },
                  { id: 'about', label: 'About' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsSectionTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${settingsSectionTab === tab.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* APP SETTINGS TAB */}
              {settingsSectionTab === 'app' && (
                <div className="space-y-3">
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
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUPPORT TAB */}
              {settingsSectionTab === 'support' && (
                <div className={`p-4 ${cardBg} rounded-3xl border space-y-3 text-slate-300`}>
                  <h4 className={`font-black text-xs ${textPrimary} uppercase tracking-wider flex items-center space-x-2`}>
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span>Help Centre &amp; Support</span>
                  </h4>
                  <p className="text-xs text-slate-400">MAHA-AGRIDOOT State Governance Helpline: 1800-120-8000</p>
                  <button onClick={() => triggerToast('Support Ticket Form Opened')} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl">
                    Raise Support Ticket
                  </button>
                </div>
              )}
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

{/* ========================================================================= */}
        {/* ENTERPRISE FULL-PAGE REGISTRATION WIZARD (FARMER vs ENTREPRENEUR) */}
        {/* ========================================================================= */}
        {/* ENTREPRENEUR ASSESSMENT WIZARD — opens when user selects Entrepreneur in Candidate Type step */}
        {isEntrepreneurWizardOpen && (
          <div className="fixed inset-0 z-[70] bg-[#0B1220] flex flex-col overflow-y-auto animate-in fade-in duration-200">
            <EntrepreneurAssessmentWizard
              initialCandidateName={phase1FormData.fullName || 'Rahul Patil'}
              initialMobile={phase1FormData.whatsappMobile || '8765432109'}
              initialDistrict={phase1FormData.district || 'Nashik'}
              initialTaluka={phase1FormData.taluka || 'Niphad'}
              initialVillage={phase1FormData.village || 'Pimplas'}
              onBack={() => {
                setIsEntrepreneurWizardOpen(false);
                setIsRegWizardOpen(true);
                setWizardSection(3);
              }}
              onSubmitSuccess={() => {
                setIsEntrepreneurWizardOpen(false);
                setIsRegWizardOpen(false);
                setWizardSection(1);
                setActiveMainView('DASHBOARD');
                setActiveBottomTab('home');
                triggerToast('🎉 Entrepreneur Assessment Profile Submitted Successfully!');
              }}
              triggerToast={triggerToast}
            />
          </div>
        )}

        {isRegWizardOpen && (
            <div className="fixed inset-0 z-[60] bg-[#0B1220] flex flex-col overflow-y-auto animate-in fade-in duration-200">
            
            {/* 1. TOP STICKY HEADER BAR matching prompt specifications */}
            <div className="bg-[#0B1324] border-b border-[#1E293B] px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
              <div className="max-w-[480px] mx-auto flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevWizardSection}
                  className="w-9 h-9 rounded-xl bg-[#182234] border border-[#2A3952] hover:bg-[#223046] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center flex-1 px-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider block uppercase">
                    STEP {wizardSection} OF 10
                  </span>
                  <h2 className="font-extrabold text-white text-base md:text-lg tracking-tight flex items-center justify-center space-x-1.5">
                    <span>{FARMER_WIZARD_SECTIONS.find(s => s.id === wizardSection)?.icon || '🧑‍🌾'}</span>
                    <span>{FARMER_WIZARD_SECTIONS.find(s => s.id === wizardSection)?.title || 'Farmer Basic Details'}</span>
                  </h2>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-bold">
                    {wizardSaveStatus === 'saving' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        <span className="hidden sm:inline">Auto Saved</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAttemptCloseWizard}
                    className="w-8 h-8 rounded-full bg-[#182234] border border-[#2A3952] hover:bg-[#223046] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Close Wizard"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. COMPACT MOBILE-FIRST STEPPER (5-NODE WINDOW) */}
            <div className="bg-[#0B1324] border-b border-[#1E293B] px-4 py-3 sticky top-[65px] z-20 shadow-md">
              <div className="max-w-[480px] mx-auto flex items-center justify-center space-x-2 md:space-x-3">
                {(() => {
                  let start = Math.max(1, wizardSection - 2);
                  if (start + 4 > 11) start = 7;
                  const visibleSteps = [start, start + 1, start + 2, start + 3, start + 4].filter(s => s <= 11);

                  return visibleSteps.map((stepNum, idx) => {
                    const isActive = wizardSection === stepNum;
                    const isCompleted = wizardSection > stepNum;
                    return (
                      <React.Fragment key={stepNum}>
                        <button
                          type="button"
                          onClick={() => {
                            if (stepNum <= wizardSection) setWizardSection(stepNum as any);
                          }}
                          className="flex items-center group cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                              isActive
                                ? 'bg-[#059669] text-white ring-4 ring-emerald-500/20 shadow-lg scale-105'
                                : isCompleted
                                ? 'bg-[#059669] text-white shadow-sm'
                                : 'bg-[#182234] border border-[#2A3952] text-slate-400'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                          </div>
                        </button>
                        {idx < visibleSteps.length - 1 && (
                          <div className={`w-6 md:w-8 h-[2px] rounded-full ${wizardSection > stepNum ? 'bg-[#059669]' : 'bg-[#1E293B]'}`} />
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 3. WIZARD MAIN FORM CONTAINER - Centered max-w-[480px] */}
            <div className="flex-1 max-w-[480px] mx-auto w-full p-4 space-y-4 pb-20">

              {/* STEP 1: PERSONAL & CONTACT INFORMATION (REMOVED FATHER/HUSBAND & MOTHER NAMES AS REQUESTED) */}
              {wizardSection === 1 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>🧑‍🌾</span>
                      <span>Personal &amp; Contact Information</span>
                    </h3>
                    <p className="text-xs text-slate-400">As printed on your Aadhaar card.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-200 block">Full Name (As Per Aadhaar) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      ref={el => (fieldInputRefs.current['fullName'] = el)} id="field-input-fullName"
                      value={phase1FormData.fullName}
                      onChange={e => updateFormField('fullName', e.target.value.toUpperCase())}
                      placeholder="VIKAS PANBUDE"
                      className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.fullName ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-bold text-white uppercase text-sm focus:border-emerald-500 focus:outline-none`}
                    />
                    {fieldErrors.fullName && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.fullName}</span></p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">Date of Birth <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        ref={el => (fieldInputRefs.current['dob'] = el)} id="field-input-dob"
                        value={phase1FormData.dob}
                        onChange={e => updateFormField('dob', e.target.value)}
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.dob ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-mono font-bold text-white text-sm focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.dob && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.dob}</span></p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-400 block">Age (Auto)</label>
                      <div className="w-full h-[52px] bg-[#182234] border border-[#233148] rounded-xl px-4 flex items-center font-mono font-bold text-emerald-400 text-sm">
                        {phase1FormData.age > 0 ? `${phase1FormData.age} Years` : '31 Years'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <WizardSelect
                      label="Gender" required
                      value={phase1FormData.gender}
                      onChange={v => updateFormField('gender', v)}
                      options={[
                        { value: 'Male', label: 'Male', icon: '👨' },
                        { value: 'Female', label: 'Female', icon: '👩' },
                        { value: 'Other', label: 'Other', icon: '🧑' },
                      ]}
                    />
                    <WizardSelect
                      label="Marital Status"
                      value={phase1FormData.maritalStatus || 'Married'}
                      onChange={v => updateFormField('maritalStatus', v)}
                      options={[
                        { value: 'Married', label: 'Married', icon: '💑' },
                        { value: 'Unmarried', label: 'Unmarried', icon: '👤' },
                        { value: 'Widowed / Other', label: 'Widowed / Other', icon: '🕊️' },
                      ]}
                    />
                  </div>


                  <WizardSelect
                    label="Caste Category" required
                    value={phase1FormData.casteCategory}
                    onChange={v => updateFormField('casteCategory', v)}
                    placeholder="Select Caste Category"
                    options={[
                      { value: 'General / Open', label: 'General / Open', icon: '🏛️' },
                      { value: 'OBC', label: 'OBC (Other Backward Class)', icon: '🟤' },
                      { value: 'SC', label: 'SC (Scheduled Caste)', icon: '🔵' },
                      { value: 'ST', label: 'ST (Scheduled Tribe)', icon: '🟢' },
                      { value: 'VJNT', label: 'VJNT', icon: '🟡' },
                      { value: 'SBC', label: 'SBC (Special Backward Class)', icon: '🟠' },
                      { value: 'EWS', label: 'EWS (Economically Weaker Section)', icon: '⚪' },
                    ]}
                  />


                  {/* CONTACT & IDENTITY SECTION */}
                  <div className="pt-2 space-y-3 border-t border-[#1E293B]">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-white text-sm flex items-center space-x-1.5">
                        <span>📞</span>
                        <span>Contact &amp; Identity</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Aadhaar and contact details (No document upload).</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">Aadhaar Number (12 Digits) <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        maxLength={12}
                        ref={el => (fieldInputRefs.current['aadhaar'] = el)} id="field-input-aadhaar"
                        value={phase1FormData.aadhaar}
                        onChange={e => updateFormField('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder="981244108891"
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.aadhaar ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-mono font-bold text-white text-base tracking-widest focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.aadhaar && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.aadhaar}</span></p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">WhatsApp Mobile</label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 flex items-center h-[52px] bg-[#182234] border border-[#233148] rounded-xl overflow-hidden">
                          <span className="px-3 font-bold text-slate-400 text-sm border-r border-[#233148] h-full flex items-center select-none shrink-0">+91</span>
                          <span className="flex-1 px-3 font-mono font-bold text-white text-sm">{phase1FormData.whatsappMobile}</span>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] mr-3 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Verified</span>
                          </span>
                        </div>
                        <button type="button" onClick={() => triggerToast('Mobile verification change modal')} className="h-[52px] px-4 text-emerald-400 hover:text-emerald-300 font-bold text-xs cursor-pointer shrink-0">
                          Change
                        </button>
                      </div>
                    </div>


                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">Alternate Mobile <span className="text-rose-500">*</span></label>
                      <div className={`flex items-center h-[52px] bg-[#182234] border ${fieldErrors.alternateMobile ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl overflow-hidden focus-within:border-emerald-500`}>
                        <span className="px-3 font-bold text-slate-400 text-sm border-r border-[#233148] h-full flex items-center select-none shrink-0">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          ref={el => (fieldInputRefs.current['alternateMobile'] = el)} id="field-input-alternateMobile"
                          value={phase1FormData.alternateMobile}
                          onChange={e => updateFormField('alternateMobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9822998877"
                          className="flex-1 h-full bg-transparent px-3 font-mono font-bold text-white text-sm focus:outline-none"
                        />
                      </div>
                      {fieldErrors.alternateMobile && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.alternateMobile}</span></p>}
                    </div>


                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-400 block">Email (Optional)</label>
                      <input
                        type="email"
                        value={phase1FormData.email}
                        onChange={e => updateFormField('email', e.target.value)}
                        placeholder="vikas.panbude@maharashtra.gov.in"
                        className="w-full h-[52px] bg-[#182234] border border-[#233148] rounded-xl px-4 font-medium text-white text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION DETAILS */}
              {wizardSection === 2 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>📍</span>
                      <span>Location Details</span>
                    </h3>
                    <p className="text-xs text-slate-400">Residential and farm location details in Maharashtra.</p>
                  </div>

                  <WizardSelect
                    label="State" required
                    value={phase1FormData.state}
                    onChange={v => updateFormField('state', v)}
                    options={[{ value: 'Maharashtra', label: 'Maharashtra', icon: '🗺️' }]}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <WizardSelect
                      label="District" required
                      value={phase1FormData.district}
                      onChange={v => {
                        updateFormField('district', v);
                        const talukas = getTalukasForDistrict(v);
                        if (talukas.length > 0 && !talukas.includes(phase1FormData.taluka)) {
                          updateFormField('taluka', talukas[0]);
                        }
                      }}
                      options={MAHARASHTRA_DISTRICTS.map(d => ({ value: d, label: d, icon: <MapPin className="w-4 h-4 text-rose-500 shrink-0" /> }))}
                      error={fieldErrors.district}
                      fieldRef={el => (fieldInputRefs.current['district'] = el)}
                      fieldId="field-input-district"
                    />

                    <WizardSelect
                      label="Taluka" required
                      value={phase1FormData.taluka}
                      onChange={v => updateFormField('taluka', v)}
                      options={getTalukasForDistrict(phase1FormData.district).map(t => ({ value: t, label: t, icon: '📌' }))}
                      error={fieldErrors.taluka}
                      fieldRef={el => (fieldInputRefs.current['taluka'] = el)}
                      fieldId="field-input-taluka"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">Village / Town <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        ref={el => (fieldInputRefs.current['village'] = el)} id="field-input-village"
                        value={phase1FormData.village}
                        onChange={e => updateFormField('village', e.target.value.toUpperCase())}
                        placeholder="PIMPRI"
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.village ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-bold text-white uppercase text-sm focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.village && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.village}</span></p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs text-slate-200 block">PIN Code <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        maxLength={6}
                        ref={el => (fieldInputRefs.current['pinCode'] = el)} id="field-input-pinCode"
                        value={phase1FormData.pinCode}
                        onChange={e => updateFormField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="442001"
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.pinCode ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-mono font-bold text-white text-sm focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.pinCode && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.pinCode}</span></p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-xs text-slate-200 block">Residential Address</label>
                    <textarea
                      rows={2}
                      ref={el => (fieldInputRefs.current['residentialAddress'] = el)} id="field-input-residentialAddress"
                      value={phase1FormData.residentialAddress || ''}
                      onChange={e => updateFormField('residentialAddress', e.target.value.toUpperCase())}
                      placeholder="HOUSE NO. 142, MAIN GRAM PANCHAYAT ROAD, PIMPRI"
                      className={`w-full p-3 bg-[#182234] border ${fieldErrors.residentialAddress ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl font-bold text-white uppercase text-xs focus:border-emerald-500 focus:outline-none resize-none`}
                    />
                    {fieldErrors.residentialAddress && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.residentialAddress}</span></p>}
                  </div>
                </div>
              )}

              {/* STEP 3: REGISTRATION TYPE & LAND PROFILE (MATCHING 1. BASIC -> 2. LOCATION -> 3. TYPE SCREENSHOT) */}
              {wizardSection === 3 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  {/* STEPPER BAR (1. BASIC -> 2. LOCATION -> 3. TYPE) MATCHING USER SCREENSHOT */}
                  <div className="bg-[#182234] border border-[#233148] rounded-xl p-2.5 flex items-center justify-between text-center text-xs font-extrabold">
                    <div className="flex-1 text-emerald-400 flex items-center justify-center space-x-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>1. Basic</span>
                    </div>
                    <div className="w-4 h-[2px] bg-emerald-500/50" />
                    <div className="flex-1 text-emerald-400 flex items-center justify-center space-x-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>2. Location</span>
                    </div>
                    <div className="w-4 h-[2px] bg-emerald-500/50" />
                    <div className="flex-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 py-1 rounded-lg">
                      <span>3. Type</span>
                    </div>
                  </div>

                  {/* SELECT REGISTRATION CATEGORY CARD MATCHING USER SCREENSHOT */}
                  <div className="p-4 bg-[#182234] border border-[#233148] rounded-2xl space-y-3 shadow-md">
                    <div className="space-y-1">
                      <label className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                        <span>Select Registration Category</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-xs text-slate-400">Choose candidate type to load the corresponding registration &amp; assessment form.</p>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        {
                          type: 'farmer',
                          title: 'Farmer Registration',
                          desc: 'Register as an agricultural crop farmer',
                          icon: '🧑‍🌾'
                        },
                        {
                          type: 'entrepreneur',
                          title: 'Agri Entrepreneur Registration',
                          desc: 'Register as an agri business or custom service provider',
                          icon: '🚜'
                        },
                        {
                          type: 'both',
                          title: 'Both (Farmer & Agri Entrepreneur)',
                          desc: 'Dual registration for farming and agri enterprise',
                          icon: '👥'
                        }
                      ].map(opt => {
                        const isSelected = phase1FormData.registrationType === opt.type;
                        return (
                          <div
                            key={opt.type}
                            onClick={() => {
                              updateFormField('registrationType', opt.type);
                              triggerToast(`Selected: ${opt.title}`);
                            }}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg ring-2 ring-emerald-500/20'
                                : 'bg-[#111827] border-[#233148] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-500 bg-transparent'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                                  <span>{opt.icon}</span>
                                  <span>{opt.title}</span>
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{opt.desc}</p>
                              </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: FARMER & LAND PROFILE */}
              {wizardSection === 4 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>🌾</span>
                      <span>Farmer &amp; Land Profile</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block">शेतकरी व जमीन प्रोफाइल</span>
                    <p className="text-xs text-slate-300 font-medium">Basic farming profile, land area &amp; Gat-wise parcel entry.</p>
                    <p className="text-[11px] text-slate-400">शेतीचा मूलभूत तपशील, जमीन क्षेत्रफळ व गटनिहाय जमीन नोंद.</p>
                  </div>

                  <WizardSelect
                    label={
                      <div>
                        <span className="font-bold text-xs text-slate-200 block leading-tight">Primary Farming Type</span>
                        <span className="text-[10px] text-slate-400 block font-normal leading-tight">मुख्य शेतीचा प्रकार</span>
                      </div>
                    }
                    value={phase1FormData.primaryFarmingType || 'Crop Farming'}
                    onChange={v => updateFormField('primaryFarmingType', v)}
                    options={[
                      { value: 'Crop Farming', label: 'Crop Farming', sublabel: 'पिकांची शेती', icon: '🌾' },
                      { value: 'Horticulture', label: 'Horticulture', sublabel: 'बागायती शेती / फळबाग', icon: '🍎' },
                      { value: 'Floriculture', label: 'Floriculture', sublabel: 'फूलशेती', icon: '🌸' },
                      { value: 'Mixed Farming', label: 'Mixed Farming', sublabel: 'मिश्र शेती', icon: '🌿' },
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">Experience (Years)</span>
                        <span className="text-[10px] text-slate-400 block font-normal leading-tight">शेतीचा अनुभव (वर्षे)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={phase1FormData.farmingExperienceYears}
                        onChange={e => updateFormField('farmingExperienceYears', parseInt(e.target.value) || 0)}
                        placeholder="12"
                        className="w-full h-[52px] bg-[#182234] border border-[#233148] rounded-xl px-4 font-mono font-bold text-white text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <WizardSelect
                      label={
                        <div>
                          <span className="font-bold text-xs text-slate-200 block leading-tight">Main Occupation</span>
                          <span className="text-[10px] text-slate-400 block font-normal leading-tight">मुख्य व्यवसाय</span>
                        </div>
                      }
                      value={phase1FormData.mainOccupation || 'Farming'}
                      onChange={v => updateFormField('mainOccupation', v)}
                      options={[
                        { value: 'Farming', label: 'Farming', sublabel: 'शेती', icon: '🧑‍🌾' },
                        { value: 'Agri Business', label: 'Agri Business', sublabel: 'कृषी व्यवसाय', icon: '🚜' },
                        { value: 'Service', label: 'Service', sublabel: 'नोकरी', icon: '💼' },
                        { value: 'Other', label: 'Other', sublabel: 'इतर', icon: '🔄' },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">Total Land Area <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-slate-400 block font-normal leading-tight">एकूण जमीन क्षेत्रफळ</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        ref={el => (fieldInputRefs.current['totalLand'] = el)} id="field-input-totalLand"
                        value={phase1FormData.totalLand}
                        onChange={e => updateFormField('totalLand', parseFloat(e.target.value) || 0)}
                        placeholder="3.5"
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.totalLand ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-mono font-bold text-white text-sm focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.totalLand && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.totalLand}</span></p>}
                    </div>
                    <WizardSelect
                      label={
                        <div>
                          <span className="font-bold text-xs text-slate-200 block leading-tight">Land Unit</span>
                          <span className="text-[10px] text-slate-400 block font-normal leading-tight">जमिनीचे एकक</span>
                        </div>
                      }
                      value={phase1FormData.landUnit || 'Acre'}
                      onChange={v => updateFormField('landUnit', v)}
                      options={[
                        { value: 'Acre', label: 'Acre', sublabel: 'एकर', icon: '📐' },
                        { value: 'Hectare', label: 'Hectare', sublabel: 'हेक्टर', icon: '📐' },
                        { value: 'Guntha', label: 'Guntha', sublabel: 'गुंठा', icon: '📐' },
                        { value: 'Bigha', label: 'Bigha', sublabel: 'बिघा', icon: '📐' },
                      ]}
                    />
                  </div>

                  <WizardSelect
                    label={
                      <div>
                        <span className="font-bold text-xs text-slate-200 block leading-tight">Land Ownership</span>
                        <span className="text-[10px] text-slate-400 block font-normal leading-tight">जमिनीचा मालकी हक्क</span>
                      </div>
                    }
                    value={phase1FormData.landOwnershipStatus || 'Own Land'}
                    onChange={v => updateFormField('landOwnershipStatus', v)}
                    options={[
                      { value: 'Own Land', label: 'Own Land', sublabel: 'स्वतःची जमीन', icon: '🏡' },
                      { value: 'Lease / Tenant Land', label: 'Lease / Tenant Land', sublabel: 'भाडेपट्टा / कुळ जमीन', icon: '📋' },
                      { value: 'Family Shared Land', label: 'Family Shared Land', sublabel: 'कौटुंबिक सामायिक जमीन', icon: '👨‍👩‍👧‍👦' },
                      { value: 'Other', label: 'Other', sublabel: 'इतर', icon: '🔄' },
                    ]}
                  />

                  {/* FARM LOCATION SECTION */}
                  <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                    <div className="border-b border-[#233148] pb-1.5">
                      <span className="font-bold text-xs text-white flex items-center leading-tight">
                        <span>Farm Location Details</span>
                        <span className="text-rose-500 ml-1 font-bold">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal leading-tight">शेतीचे ठिकाण तपशील</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <WizardSelect
                        label={
                          <div>
                            <span className="font-bold text-xs text-slate-200 block leading-tight">Farm District</span>
                            <span className="text-[10px] text-slate-400 block font-normal leading-tight">शेतीचा जिल्हा</span>
                          </div>
                        }
                        value={phase1FormData.farmDistrict || 'Wardha'}
                        onChange={v => {
                          updateFormField('farmDistrict', v);
                          const talukas = getTalukasForDistrict(v);
                          if (talukas.length > 0 && !talukas.includes(phase1FormData.farmTaluka)) {
                            updateFormField('farmTaluka', talukas[0]);
                          }
                        }}
                        options={MAHARASHTRA_DISTRICTS.map(d => ({ value: d, label: d, icon: <MapPin className="w-4 h-4 text-rose-500 shrink-0" /> }))}
                        error={fieldErrors.farmDistrict}
                        fieldRef={el => (fieldInputRefs.current['farmDistrict'] = el)}
                        fieldId="field-input-farmDistrict"
                      />
                      <WizardSelect
                        label={
                          <div>
                            <span className="font-bold text-xs text-slate-200 block leading-tight">Farm Taluka</span>
                            <span className="text-[10px] text-slate-400 block font-normal leading-tight">शेतीचा तालुका</span>
                          </div>
                        }
                        value={phase1FormData.farmTaluka || 'Wardha'}
                        onChange={v => updateFormField('farmTaluka', v)}
                        options={getTalukasForDistrict(phase1FormData.farmDistrict || 'Wardha').map(t => ({ value: t, label: t, icon: '📌' }))}
                        error={fieldErrors.farmTaluka}
                        fieldRef={el => (fieldInputRefs.current['farmTaluka'] = el)}
                        fieldId="field-input-farmTaluka"
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">Farm Village / Town</span>
                        <span className="text-[10px] text-slate-400 block font-normal leading-tight">शेतीचे गाव / शहर</span>
                      </label>
                      <input
                        type="text"
                        ref={el => (fieldInputRefs.current['farmVillage'] = el)} id="field-input-farmVillage"
                        value={phase1FormData.farmVillage || ''}
                        onChange={e => updateFormField('farmVillage', e.target.value.toUpperCase())}
                        placeholder="e.g. PAVANAR"
                        className={`w-full h-[52px] bg-[#182234] border ${fieldErrors.farmVillage ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-4 font-bold text-white uppercase text-sm focus:border-emerald-500 focus:outline-none`}
                      />
                      {fieldErrors.farmVillage && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.farmVillage}</span></p>}
                    </div>
                  </div>

                  {/* GAT / SURVEY PARCEL ENTRY SECTION */}
                  <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-white block leading-tight">Gat/Survey Parcel Entry</span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">गट/सर्वे जमीन नोंद</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono font-bold text-emerald-400 block leading-tight">
                          Gat-wise Total: {calculateGatWiseTotalAcres()} Acre
                        </span>
                        <span className="text-[10px] text-emerald-400/80 block leading-tight">
                          गटनिहाय एकूण: {calculateGatWiseTotalAcres()} एकर
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={parcelGatNoInput}
                          onChange={e => setParcelGatNoInput(e.target.value.toUpperCase())}
                          placeholder="Gat (45/1)"
                          className="w-full h-[44px] bg-[#111827] border border-[#2A3952] rounded-lg px-2.5 font-mono font-bold text-white text-xs uppercase focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={parcelAreaInput}
                          onChange={e => setParcelAreaInput(e.target.value)}
                          placeholder="Area"
                          className="w-full h-[44px] bg-[#111827] border border-[#2A3952] rounded-lg px-2 font-mono font-bold text-white text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <WizardSelect
                          value={parcelUnitInput}
                          onChange={v => setParcelUnitInput(v as any)}
                          small
                          options={[
                            { value: 'Acre', label: 'Acre', sublabel: 'एकर' },
                            { value: 'Hectare', label: 'Hectare', sublabel: 'हेक्टर' },
                            { value: 'Guntha', label: 'Guntha', sublabel: 'गुंठा' },
                          ]}
                        />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={addGatParcel}
                          className="w-full h-[44px] bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex flex-col items-center justify-center leading-none"
                        >
                          <span className="text-xs font-bold">+ Add</span>
                          <span className="text-[9px] opacity-85 font-normal">+ जोडा</span>
                        </button>
                      </div>
                    </div>

                    {/* COMPACT REMOVABLE PARCEL CARDS */}
                    {phase1FormData.gatSurveyParcels && phase1FormData.gatSurveyParcels.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {phase1FormData.gatSurveyParcels.map((parcel: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold"
                          >
                            <span>Gat {parcel.gatNumber} • {parcel.area} {parcel.areaUnit}</span>
                            <button type="button" onClick={() => removeGatParcel(idx)} className="text-emerald-400 hover:text-rose-400 font-bold cursor-pointer">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FARMER ID SECTION */}
                  <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                    <div>
                      <label className="font-bold text-xs text-white block leading-tight">Farmer ID Available?</label>
                      <span className="text-[10px] text-slate-400 font-normal block leading-tight">Farmer ID उपलब्ध आहे का?</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'Yes', labelEn: 'Yes', labelMr: 'होय' },
                        { key: 'No', labelEn: 'No', labelMr: 'नाही' },
                        { key: "Don't Know", labelEn: "Don't Know", labelMr: 'माहीत नाही' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateFormField('hasFarmerId', opt.key)}
                          className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center flex flex-col items-center justify-center leading-tight ${
                            phase1FormData.hasFarmerId === opt.key ? 'bg-[#059669] text-white shadow-md' : 'bg-[#111827] border border-[#2A3952] text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <span className="text-xs font-bold">{opt.labelEn}</span>
                          <span className="text-[10px] font-normal opacity-80">{opt.labelMr}</span>
                        </button>
                      ))}
                    </div>

                    {phase1FormData.hasFarmerId === 'Yes' && (
                      <div className="space-y-1 pt-1 animate-in fade-in">
                        <label className="block">
                          <span className="text-[11px] font-bold text-slate-300 block leading-tight">Farmer ID Number</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">Farmer ID क्रमांक</span>
                        </label>
                        <input
                          type="text"
                          ref={el => (fieldInputRefs.current['govtAgriStackFarmerId'] = el)} id="field-input-govtAgriStackFarmerId"
                          value={phase1FormData.govtAgriStackFarmerId || phase1FormData.farmerId || ''}
                          onChange={e => {
                            updateFormField('govtAgriStackFarmerId', e.target.value.toUpperCase());
                            updateFormField('farmerId', e.target.value.toUpperCase());
                          }}
                          placeholder="MH-FAR-2026-8841"
                          className={`w-full h-[44px] bg-[#111827] border ${fieldErrors.govtAgriStackFarmerId ? 'border-rose-500 bg-rose-950/30' : 'border-[#2A3952]'} rounded-lg px-3 font-mono font-bold text-white text-xs uppercase focus:border-emerald-500 focus:outline-none`}
                        />
                        {fieldErrors.govtAgriStackFarmerId && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.govtAgriStackFarmerId}</span></p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: WATER, ELECTRICITY & FACILITIES */}
              {wizardSection === 5 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>⚡</span>
                      <span>Water, Electricity &amp; Facilities</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block">पाणी, वीज आणि सुविधा</span>
                    <p className="text-xs text-slate-300 font-medium">Water sources, irrigation systems, power connection &amp; solar.</p>
                    <p className="text-[11px] text-slate-400">पाण्याचे स्त्रोत, सिंचन पद्धती, वीज कनेक्शन आणि सौर ऊर्जा.</p>
                  </div>

                  <div className="space-y-4">
                    {/* A. WATER SOURCES */}
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">A. Water Sources</span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">पाण्याचे स्त्रोत</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Borewell', labelEn: 'Borewell', labelMr: 'बोअरवेल' },
                          { value: 'Open Well', labelEn: 'Open Well', labelMr: 'विहीर' },
                          { value: 'Canal', labelEn: 'Canal', labelMr: 'कालवा' },
                          { value: 'River/Nala', labelEn: 'River/Nala', labelMr: 'नदी/नाला' },
                          { value: 'Farm Pond', labelEn: 'Farm Pond', labelMr: 'शेततळे' },
                          { value: 'Rainfed', labelEn: 'Rainfed', labelMr: 'पावसावर आधारित' },
                          { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                        ].map(src => {
                          const selected = phase1FormData.waterSources?.includes(src.value) ?? false;
                          return (
                            <button
                              key={src.value}
                              type="button"
                              onClick={() => toggleMultiSelect('waterSources', src.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{src.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{src.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* B. IRRIGATION SYSTEMS */}
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">B. Irrigation Systems</span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">सिंचन पद्धती</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Drip', labelEn: 'Drip', labelMr: 'ठिबक सिंचन' },
                          { value: 'Sprinkler', labelEn: 'Sprinkler', labelMr: 'तुषार सिंचन' },
                          { value: 'Flood Irrigation', labelEn: 'Flood Irrigation', labelMr: 'पाट पाणी' },
                          { value: 'No Irrigation', labelEn: 'No Irrigation', labelMr: 'सिंचन नाही' },
                          { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                        ].map(sys => {
                          const selected = phase1FormData.irrigationSystems?.includes(sys.value) ?? false;
                          return (
                            <button
                              key={sys.value}
                              type="button"
                              onClick={() => toggleMultiSelect('irrigationSystems', sys.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{sys.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{sys.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* C. ELECTRICITY AT FARM */}
                    <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                      <div>
                        <label className="font-bold text-xs text-white block leading-tight">C. Electricity at Farm</label>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">शेतामध्ये वीज कनेक्शन आहे का?</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'Yes', labelEn: 'Yes', labelMr: 'होय' },
                          { key: 'No', labelEn: 'No', labelMr: 'नाही' },
                          { key: "Don't Know", labelEn: "Don't Know", labelMr: 'माहीत नाही' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateFormField('farmElectricity', opt.key)}
                            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center flex flex-col items-center justify-center leading-tight ${
                              phase1FormData.farmElectricity === opt.key ? 'bg-[#059669] text-white shadow-md' : 'bg-[#111827] border border-[#2A3952] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.labelEn}</span>
                            <span className="text-[10px] font-normal opacity-80">{opt.labelMr}</span>
                          </button>
                        ))}
                      </div>

                      {phase1FormData.farmElectricity === 'Yes' && (
                        <div className="space-y-2 pt-1 animate-in fade-in">
                          <WizardSelect
                            label={
                              <div>
                                <span className="font-bold text-xs text-slate-200 block leading-tight">Electricity Connection Type</span>
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">वीज कनेक्शनचा प्रकार</span>
                              </div>
                            }
                            value={phase1FormData.electricityConnectionType || 'Agricultural Electricity Connection'}
                            onChange={v => updateFormField('electricityConnectionType', v)}
                            options={[
                              { value: 'Agricultural Electricity Connection', label: 'Agricultural Electricity', sublabel: 'कृषी वीज कनेक्शन', icon: '⚡' },
                              { value: 'Domestic Electricity Connection', label: 'Domestic Electricity', sublabel: 'घरगुती वीज कनेक्शन', icon: '🏠' },
                              { value: 'Other', label: 'Other', sublabel: 'इतर', icon: '🔄' },
                            ]}
                            small
                          />

                          <WizardSelect
                            label={
                              <div>
                                <span className="font-bold text-xs text-slate-200 block leading-tight">Connection Status</span>
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">वीज कनेक्शनची स्थिती</span>
                              </div>
                            }
                            value={phase1FormData.powerStatus || 'Regular / Available'}
                            onChange={v => updateFormField('powerStatus', v)}
                            options={[
                              { value: 'Regular / Available', label: 'Regular / Available', sublabel: 'नियमित / उपलब्ध', icon: '✅' },
                              { value: 'Irregular', label: 'Irregular', sublabel: 'अनियमित', icon: '⚠️' },
                              { value: 'Not Working', label: 'Not Working', sublabel: 'बंद / नादुरुस्त', icon: '❌' },
                              { value: 'Other', label: 'Other', sublabel: 'इतर', icon: '🔄' },
                            ]}
                            small
                          />
                        </div>
                      )}
                    </div>

                    {/* D. SOLAR PUMP REQUIREMENT */}
                    <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                      <div>
                        <label className="font-bold text-xs text-white block leading-tight">D. Solar Pump / Connection Requirement</label>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">तुम्हाला Solar Pump / Solar Connection ची आवश्यकता आहे का?</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'Yes', labelEn: 'Yes', labelMr: 'होय' },
                          { key: 'No', labelEn: 'No', labelMr: 'नाही' },
                          { key: 'Need Information', labelEn: 'Need Info', labelMr: 'माहिती हवी' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateFormField('solarRequirement', opt.key)}
                            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center flex flex-col items-center justify-center leading-tight ${
                              phase1FormData.solarRequirement === opt.key
                                ? opt.key === 'Need Information' ? 'bg-amber-600 text-white shadow-md' : 'bg-[#059669] text-white shadow-md'
                                : 'bg-[#111827] border border-[#2A3952] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.labelEn}</span>
                            <span className="text-[10px] font-normal opacity-80">{opt.labelMr}</span>
                          </button>
                        ))}
                      </div>

                      {phase1FormData.solarRequirement !== 'No' && (
                        <div className="pt-1 animate-in fade-in">
                          <WizardSelect
                            label={
                              <div>
                                <span className="font-bold text-xs text-slate-200 block leading-tight">Solar Requirement Type</span>
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">सोलर आवश्यकतेचा प्रकार</span>
                              </div>
                            }
                            value={phase1FormData.solarRequirementType || 'Solar Agricultural Pump'}
                            onChange={v => updateFormField('solarRequirementType', v)}
                            options={[
                              { value: 'Solar Agricultural Pump', label: 'Solar Agricultural Pump', sublabel: 'सौर कृषी पंप', icon: '☀️' },
                              { value: 'Solar Rooftop Connection', label: 'Solar Rooftop Connection', sublabel: 'सोलर रूफटॉप कनेक्शन', icon: '🏠' },
                              { value: 'Off-grid Solar System', label: 'Off-grid Solar System', sublabel: 'ऑफ-ग्रिड सोलर यंत्रणा', icon: '🔋' },
                            ]}
                            small
                          />
                        </div>
                      )}
                    </div>

                    {/* E. BASIC MACHINERY OWNED */}
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="font-bold text-xs text-slate-200 block leading-tight">E. Basic Machinery Already Owned</span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">स्वतःची कृषी यंत्रसामग्री</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Tractor', labelEn: 'Tractor', labelMr: 'ट्रॅक्टर' },
                          { value: 'Rotavator', labelEn: 'Rotavator', labelMr: 'रोटाव्हेटर' },
                          { value: 'Cultivator', labelEn: 'Cultivator', labelMr: 'कल्टीव्हेटर' },
                          { value: 'Sprayer', labelEn: 'Sprayer', labelMr: 'फवारणी यंत्र' },
                          { value: 'Pump', labelEn: 'Pump', labelMr: 'पाण्याचा पंप' },
                          { value: 'Power Tiller', labelEn: 'Power Tiller', labelMr: 'पॉवर टिलर' },
                          { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                          { value: 'None', labelEn: 'None', labelMr: 'काहीही नाही' },
                        ].map(mac => {
                          const selected = phase1FormData.machineryOwned?.includes(mac.value) ?? false;
                          return (
                            <button
                              key={mac.value}
                              type="button"
                              onClick={() => toggleMultiSelect('machineryOwned', mac.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{mac.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{mac.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: REQUIRED SERVICES */}
              {wizardSection === 6 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>❤️</span>
                      <span>Required Services</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block">आवश्यक सेवा</span>
                    <p className="text-xs text-slate-300 font-medium">Services needed currently or in the upcoming season.</p>
                    <p className="text-[11px] text-slate-400">शेतीसाठी तुम्हाला सध्या किंवा पुढील हंगामात कोणत्या सेवा आवश्यक आहेत?</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Soil Testing', labelEn: 'Soil Testing', labelMr: 'माती परीक्षण' },
                        { value: 'Crop Advisory', labelEn: 'Crop Advisory', labelMr: 'पीक सल्ला' },
                        { value: 'Pest/Disease Advisory', labelEn: 'Pest/Disease Advisory', labelMr: 'कीड-रोग सल्ला' },
                        { value: 'Drone Survey', labelEn: 'Drone Survey', labelMr: 'ड्रोन सर्व्हे' },
                        { value: 'Drone Spraying', labelEn: 'Drone Spraying', labelMr: 'ड्रोन फवारणी' },
                        { value: 'Farm Machinery Rental', labelEn: 'Machinery Rental', labelMr: 'यंत्रे भाड्याने' },
                        { value: 'Labour Service', labelEn: 'Labour Service', labelMr: 'मजूर सेवा' },
                        { value: 'Seed Supply', labelEn: 'Seed Supply', labelMr: 'बियाणे पुरवठा' },
                        { value: 'Fertilizer Supply', labelEn: 'Fertilizer Supply', labelMr: 'खत पुरवठा' },
                        { value: 'Crop Protection Products', labelEn: 'Crop Protection', labelMr: 'पीक संरक्षण औषधे' },
                        { value: 'Irrigation Assistance', labelEn: 'Irrigation Support', labelMr: 'सिंचन साहाय्य' },
                        { value: 'Solar Pump / Solar Assistance', labelEn: 'Solar Support', labelMr: 'सोलर साहाय्य' },
                        { value: 'Government Scheme Assistance', labelEn: 'Govt Schemes', labelMr: 'शासकीय योजना' },
                        { value: 'Subsidy Assistance', labelEn: 'Subsidy Help', labelMr: 'अनुदान साहाय्य' },
                        { value: 'Crop Insurance Assistance', labelEn: 'Crop Insurance', labelMr: 'पीक विमा साहाय्य' },
                        { value: 'KCC / Loan Assistance', labelEn: 'KCC / Loan', labelMr: 'कर्ज / केसीसी साहाय्य' },
                        { value: 'Market Linkage', labelEn: 'Market Linkage', labelMr: 'बाजारपेठ जोडणी' },
                        { value: 'Storage', labelEn: 'Storage', labelMr: 'साठवणूक' },
                        { value: 'Transport', labelEn: 'Transport', labelMr: 'वाहतूक' },
                        { value: 'Training', labelEn: 'Training', labelMr: 'शेती प्रशिक्षण' },
                        { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                      ].map(svc => {
                        const selected = phase1FormData.requiredServices?.includes(svc.value) ?? false;
                        return (
                          <button
                            key={svc.value}
                            type="button"
                            onClick={() => toggleMultiSelect('requiredServices', svc.value)}
                            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                              selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                            <div className="flex flex-col text-left leading-tight">
                              <span className="text-xs font-bold">{svc.labelEn}</span>
                              <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{svc.labelMr}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {phase1FormData.requiredServices && phase1FormData.requiredServices.length > 0 && (
                    <div className="pt-3 border-t border-[#1E293B] space-y-3">
                      <div>
                        <span className="font-mono text-[11px] font-black text-amber-300 uppercase tracking-wider block leading-tight">
                          SERVICE PRIORITY
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">सेवेचे प्राधान्य</span>
                      </div>
                      {phase1FormData.requiredServices.map((svc: string) => {
                        const currentPriority = phase1FormData.servicePriorities?.[svc] || 'Immediate';
                        return (
                          <div key={svc} className="p-3 bg-[#182234] border border-[#233148] rounded-xl flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{svc}</span>
                            <div className="flex space-x-1 text-[10px]">
                              {[
                                { value: 'Immediate', labelEn: 'Immediate', labelMr: 'त्वरित' },
                                { value: 'This Season', labelEn: 'This Season', labelMr: 'या हंगामात' },
                                { value: 'Future', labelEn: 'Future', labelMr: 'भविष्यात' },
                              ].map(p => (
                                <button
                                  key={p.value}
                                  type="button"
                                  onClick={() => setServicePriority(svc, p.value as any)}
                                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex flex-col items-center leading-tight ${
                                    currentPriority === p.value ? 'bg-[#059669] text-white shadow-sm' : 'bg-[#111827] text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <span className="font-bold text-[10px]">{p.labelEn}</span>
                                  <span className="text-[9px] opacity-80 font-normal">{p.labelMr}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 7: FUTURE MACHINERY & INVESTMENT */}
              {wizardSection === 7 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>🚜</span>
                      <span>Future Machinery &amp; Investment</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block">भविष्यातील यंत्रसामग्री व गुंतवणूक</span>
                    <p className="text-xs text-slate-300 font-medium">What tools/facilities do you need in the future?</p>
                    <p className="text-[11px] text-slate-400">भविष्यात तुम्हाला कोणती साधने/सुविधा हवी आहेत?</p>
                  </div>

                  <div className="space-y-4">
                    {/* MACHINERY */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="font-mono text-[11px] font-black text-amber-300 uppercase tracking-wider block leading-tight">
                          🚜 MACHINERY
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">यंत्रसामग्री</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Tractor', labelEn: 'Tractor', labelMr: 'ट्रॅक्टर' },
                          { value: 'Rotavator', labelEn: 'Rotavator', labelMr: 'रोटाव्हेटर' },
                          { value: 'Power Tiller', labelEn: 'Power Tiller', labelMr: 'पॉवर टिलर' },
                          { value: 'Seed Drill', labelEn: 'Seed Drill', labelMr: 'पेरणी यंत्र' },
                          { value: 'Planter', labelEn: 'Planter', labelMr: 'प्लांटर' },
                          { value: 'Sprayer', labelEn: 'Sprayer', labelMr: 'फवारणी यंत्र' },
                          { value: 'Harvester', labelEn: 'Harvester', labelMr: 'हार्वेस्टर' },
                        ].map(mac => {
                          const selected = phase1FormData.futureMachinery?.includes(mac.value) ?? false;
                          return (
                            <button
                              key={mac.value}
                              type="button"
                              onClick={() => toggleMultiSelect('futureMachinery', mac.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{mac.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{mac.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* IRRIGATION */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="font-mono text-[11px] font-black text-cyan-300 uppercase tracking-wider block leading-tight">
                          🛈 IRRIGATION
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">सिंचन साधने</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Drip', labelEn: 'Drip', labelMr: 'ठिबक सिंचन' },
                          { value: 'Sprinkler', labelEn: 'Sprinkler', labelMr: 'तुषार सिंचन' },
                          { value: 'Solar Pump', labelEn: 'Solar Pump', labelMr: 'सौर पंप' },
                          { value: 'Farm Pond', labelEn: 'Farm Pond', labelMr: 'शेततळे' },
                          { value: 'Pipeline', labelEn: 'Pipeline', labelMr: 'पाइपलाइन' },
                          { value: 'Pump Set', labelEn: 'Pump Set', labelMr: 'पंप संच' },
                        ].map(irr => {
                          const selected = phase1FormData.futureIrrigation?.includes(irr.value) ?? false;
                          return (
                            <button
                              key={irr.value}
                              type="button"
                              onClick={() => toggleMultiSelect('futureIrrigation', irr.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{irr.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{irr.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* INFRASTRUCTURE */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="font-mono text-[11px] font-black text-purple-300 uppercase tracking-wider block leading-tight">
                          🏢 INFRASTRUCTURE
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">पायाभूत सुविधा</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'Warehouse/Godown', labelEn: 'Warehouse', labelMr: 'गोदाम / साठवणूक' },
                          { value: 'Pack House', labelEn: 'Pack House', labelMr: 'पॅक हाऊस' },
                          { value: 'Cold Storage', labelEn: 'Cold Storage', labelMr: 'शीतगृह' },
                          { value: 'Grading/Sorting', labelEn: 'Grading/Sorting', labelMr: 'प्रतवारी केंद्र' },
                        ].map(inf => {
                          const selected = phase1FormData.futureInfrastructure?.includes(inf.value) ?? false;
                          return (
                            <button
                              key={inf.value}
                              type="button"
                              onClick={() => toggleMultiSelect('futureInfrastructure', inf.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{inf.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{inf.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ALLIED AGRICULTURE */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="font-mono text-[11px] font-black text-emerald-300 uppercase tracking-wider block leading-tight">
                          🐄 ALLIED AGRICULTURE
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">पूरक कृषी व्यवसाय</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'New Orchard', labelEn: 'New Orchard', labelMr: 'नवीन फळबाग' },
                          { value: 'Dairy', labelEn: 'Dairy', labelMr: 'दुग्ध व्यवसाय' },
                          { value: 'Goat Farming', labelEn: 'Goat Farming', labelMr: 'शेळीपालन' },
                          { value: 'Poultry', labelEn: 'Poultry', labelMr: 'कुक्कुटपालन' },
                          { value: 'Fishery', labelEn: 'Fishery', labelMr: 'मत्स्यव्यवसाय' },
                          { value: 'Beekeeping', labelEn: 'Beekeeping', labelMr: 'मधमाशी पालन' },
                          { value: 'Food Processing', labelEn: 'Food Processing', labelMr: 'अन्न प्रक्रिया' },
                        ].map(allied => {
                          const selected = phase1FormData.futureAlliedAgri?.includes(allied.value) ?? false;
                          return (
                            <button
                              key={allied.value}
                              type="button"
                              onClick={() => toggleMultiSelect('futureAlliedAgri', allied.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{allied.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{allied.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: GOVERNMENT SCHEMES & SUBSIDY */}
              {wizardSection === 8 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                      <span>🏛️</span>
                      <span>Government Schemes &amp; Subsidy</span>
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block">शासकीय योजना व अनुदान</span>
                    <p className="text-xs text-slate-300 font-medium">Government welfare benefits received &amp; assistance requirements.</p>
                    <p className="text-[11px] text-slate-400">शासकीय लाभ आणि आवश्यक अनुदान साहाय्य.</p>
                  </div>

                  <div className="space-y-4">
                    {/* SECTION A: GOVERNMENT BENEFITS RECEIVED */}
                    <div className="space-y-2">
                      <div>
                        <label className="font-bold text-xs text-white block leading-tight">
                          Section A – Government Benefits Received
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">विभाग अ – मिळालेले शासकीय लाभ</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'PM-Kisan', labelEn: 'PM-Kisan', labelMr: 'पीएम-किसान' },
                          { value: 'Namo Shetkari', labelEn: 'Namo Shetkari', labelMr: 'नमो शेतकरी' },
                          { value: 'MahaDBT', labelEn: 'MahaDBT', labelMr: 'महाडीबीटी' },
                          { value: 'KCC', labelEn: 'KCC', labelMr: 'केसीसी' },
                          { value: 'Crop Insurance', labelEn: 'Crop Insurance', labelMr: 'पीक विमा' },
                          { value: 'Soil Health Card', labelEn: 'Soil Health Card', labelMr: 'मृदा पत्रिका' },
                          { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                          { value: 'None', labelEn: 'None', labelMr: 'काहीही नाही' },
                          { value: "Don't Know", labelEn: "Don't Know", labelMr: 'माहीत नाही' },
                        ].map(scheme => {
                          const selected = phase1FormData.activeSchemesList?.includes(scheme.value) ?? false;
                          return (
                            <button
                              key={scheme.value}
                              type="button"
                              onClick={() => toggleActiveScheme(scheme.value)}
                              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-xs font-bold">{scheme.labelEn}</span>
                                <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{scheme.labelMr}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {phase1FormData.activeSchemesList?.includes('Other') && (
                        <div className="pt-1 animate-in fade-in">
                          <label className="block mb-1">
                            <span className="text-[11px] font-bold text-slate-300 block leading-tight">Specify Other Scheme</span>
                            <span className="text-[10px] text-slate-400 font-normal block leading-tight">इतर योजना नमूद करा</span>
                          </label>
                          <input
                            type="text"
                            ref={el => (fieldInputRefs.current['activeSchemeOther'] = el)} id="field-input-activeSchemeOther"
                            value={phase1FormData.activeSchemeOther || ''}
                            onChange={e => updateFormField('activeSchemeOther', e.target.value.toUpperCase())}
                            placeholder="SPECIFY OTHER SCHEME"
                            className={`w-full h-[44px] bg-[#182234] border ${fieldErrors.activeSchemeOther ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-3 font-bold text-white uppercase text-xs focus:border-emerald-500 focus:outline-none`}
                          />
                          {fieldErrors.activeSchemeOther && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.activeSchemeOther}</span></p>}
                        </div>
                      )}
                    </div>

                    {/* SECTION B: SCHEME / SUBSIDY ASSISTANCE REQUIRED? */}
                    <div className="p-3.5 bg-[#182234] border border-[#233148] rounded-xl space-y-3">
                      <div>
                        <label className="font-bold text-xs text-white block leading-tight">
                          Section B – Scheme / Subsidy Assistance Required?
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal block leading-tight">विभाग ब – योजना / अनुदान साहाय्य हवे आहे का?</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'Yes', labelEn: 'Yes', labelMr: 'होय' },
                          { key: 'No', labelEn: 'No', labelMr: 'नाही' },
                          { key: 'Need Information', labelEn: 'Need Info', labelMr: 'माहिती हवी' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateFormField('subsidyHelpNeeded', opt.key)}
                            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center flex flex-col items-center justify-center leading-tight ${
                              phase1FormData.subsidyHelpNeeded === opt.key
                                ? opt.key === 'Need Information' ? 'bg-amber-600 text-white shadow-md' : 'bg-[#059669] text-white shadow-md'
                                : 'bg-[#111827] border border-[#2A3952] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.labelEn}</span>
                            <span className="text-[10px] font-normal opacity-80">{opt.labelMr}</span>
                          </button>
                        ))}
                      </div>

                      {/* SECTION C: REQUIRED ASSISTANCE CATEGORIES */}
                      {(phase1FormData.subsidyHelpNeeded === 'Yes' || phase1FormData.subsidyHelpNeeded === 'Need Information') && (
                        <div className="space-y-2 pt-2 border-t border-[#1E293B] animate-in fade-in">
                          <div>
                            <label className="font-bold text-xs text-slate-200 block leading-tight">
                              Section C – Required Assistance Categories
                            </label>
                            <span className="text-[10px] text-slate-400 font-normal block leading-tight">विभाग क – आवश्यक अनुदानाचा प्रकार</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'Farm Machinery', labelEn: 'Farm Machinery', labelMr: 'कृषी यंत्रसामग्री' },
                              { value: 'Irrigation', labelEn: 'Irrigation', labelMr: 'सिंचन साधने' },
                              { value: 'Solar Pump', labelEn: 'Solar Pump', labelMr: 'सौर पंप' },
                              { value: 'Farm Pond', labelEn: 'Farm Pond', labelMr: 'शेततळे' },
                              { value: 'Orchard / Horticulture', labelEn: 'Orchard', labelMr: 'फळबाग' },
                              { value: 'Dairy', labelEn: 'Dairy', labelMr: 'दुग्ध व्यवसाय' },
                              { value: 'Goat Farming', labelEn: 'Goat Farming', labelMr: 'शेळीपालन' },
                              { value: 'Poultry', labelEn: 'Poultry', labelMr: 'कुक्कुटपालन' },
                              { value: 'Storage / Warehouse', labelEn: 'Storage', labelMr: 'साठवणूक गोदाम' },
                              { value: 'Food Processing', labelEn: 'Food Processing', labelMr: 'अन्न प्रक्रिया' },
                              { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                            ].map(cat => {
                              const selected = phase1FormData.subsidyHelpCategories?.includes(cat.value) ?? false;
                              return (
                                <button
                                  key={cat.value}
                                  type="button"
                                  onClick={() => toggleMultiSelect('subsidyHelpCategories', cat.value)}
                                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                                    selected ? 'bg-[#059669] text-white border-emerald-500 shadow-md' : 'bg-[#111827] border-[#2A3952] text-slate-300 hover:border-slate-500'
                                  }`}
                                >
                                  {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                                  <div className="flex flex-col text-left leading-tight">
                                    <span className="text-xs font-bold">{cat.labelEn}</span>
                                    <span className={`text-[10px] font-normal ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{cat.labelMr}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 9: MAJOR FARMING PROBLEMS */}
              {wizardSection === 9 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="space-y-1 pb-2 border-b border-[#1E293B]">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                          <span>⚠️</span>
                          <span>Major Farming Problems</span>
                        </h3>
                        <span className="text-xs text-emerald-400 font-bold block">शेतीतील प्रमुख अडचणी</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-full block">
                          {(phase1FormData.mainProblemsList || []).length} / 3 selected
                        </span>
                        <span className="text-[10px] text-amber-400/80 block mt-0.5 font-normal">जास्तीत जास्त ३ निवडा</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Select up to 3 major challenges faced during farming.</p>
                    <p className="text-[11px] text-slate-400">सध्या शेती करताना तुम्हाला कोणत्या प्रमुख अडचणी आहेत?</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Water', labelEn: 'Water', labelMr: 'पाणीटंचाई' },
                        { value: 'Electricity', labelEn: 'Electricity', labelMr: 'वीज समस्या' },
                        { value: 'Labour', labelEn: 'Labour', labelMr: 'मजूर टंचाई' },
                        { value: 'Machinery', labelEn: 'Machinery', labelMr: 'यंत्रसामग्री अभाव' },
                        { value: 'Seeds', labelEn: 'Seeds', labelMr: 'बियाणे समस्या' },
                        { value: 'Fertilizer / Inputs', labelEn: 'Fertilizer / Inputs', labelMr: 'खते व औषधे खर्च' },
                        { value: 'Pest / Disease', labelEn: 'Pest / Disease', labelMr: 'कीड व रोग' },
                        { value: 'High Production Cost', labelEn: 'Production Cost', labelMr: 'उत्पादनाचा खर्च' },
                        { value: 'Market Price', labelEn: 'Market Price', labelMr: 'हमीभाव / बाजारभाव' },
                        { value: 'Loan / Credit', labelEn: 'Loan / Credit', labelMr: 'कर्ज / पतपुरवठा' },
                        { value: 'Crop Insurance', labelEn: 'Crop Insurance', labelMr: 'पीक विमा अडचणी' },
                        { value: 'Government Scheme / Subsidy', labelEn: 'Govt Subsidy', labelMr: 'शासकीय योजना' },
                        { value: 'Storage', labelEn: 'Storage', labelMr: 'साठवणूक अभाव' },
                        { value: 'Transport', labelEn: 'Transport', labelMr: 'वाहतूक समस्या' },
                        { value: 'Technical Guidance', labelEn: 'Guidance', labelMr: 'मार्गदर्शन अभाव' },
                        { value: 'Other', labelEn: 'Other', labelMr: 'इतर' },
                      ].map(prob => {
                        const selected = phase1FormData.mainProblemsList?.includes(prob.value) ?? false;
                        return (
                          <button
                            key={prob.value}
                            type="button"
                            onClick={() => toggleMainProblem(prob.value)}
                            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                              selected ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-md' : 'bg-[#182234] border-[#233148] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {selected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                            <div className="flex flex-col text-left leading-tight">
                              <span className="text-xs font-bold">{prob.labelEn}</span>
                              <span className={`text-[10px] font-normal ${selected ? 'text-rose-200' : 'text-slate-400'}`}>{prob.labelMr}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {phase1FormData.mainProblemsList?.includes('Other') && (
                      <div className="pt-1 animate-in fade-in">
                        <label className="block mb-1">
                          <span className="text-xs font-bold text-slate-300 block leading-tight">Specify Other Problem</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">इतर अडचण नमूद करा</span>
                        </label>
                        <input
                          type="text"
                          ref={el => (fieldInputRefs.current['mainProblemOther'] = el)} id="field-input-mainProblemOther"
                          value={phase1FormData.mainProblemOther || ''}
                          onChange={e => updateFormField('mainProblemOther', e.target.value.toUpperCase())}
                          placeholder="ENTER DETAILS OF OTHER PROBLEM"
                          className={`w-full h-[44px] bg-[#182234] border ${fieldErrors.mainProblemOther ? 'border-rose-500 bg-rose-950/30' : 'border-[#233148]'} rounded-xl px-3 font-bold text-white uppercase text-xs focus:border-emerald-500 focus:outline-none`}
                        />
                        {fieldErrors.mainProblemOther && <p className="text-rose-400 text-xs font-bold pt-1 flex items-center space-x-1"><span>⚠️</span><span>{fieldErrors.mainProblemOther}</span></p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 10: REVIEW & SUBMIT REGISTRATION */}
              {wizardSection === 10 && (
                <div className="bg-[#131C2E] rounded-2xl border border-[#1E2A40] p-5 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="flex justify-between items-center pb-2 border-b border-[#1E293B]">
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
                        <span>📝</span>
                        <span>Review &amp; Submit Profile</span>
                      </h3>
                      <span className="text-xs text-emerald-400 font-bold block">पुनरावलोकन व नोंदणी</span>
                      <p className="text-xs text-slate-400">Verify all entered details before profile creation.</p>
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40">
                      Step 10 of 10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { step: 1, label: 'Step 1', titleEn: 'Basic Details', titleMr: 'मूलभूत माहिती' },
                      { step: 2, label: 'Step 2', titleEn: 'Location', titleMr: 'ठिकाण' },
                      { step: 3, label: 'Step 3', titleEn: 'Candidate Type', titleMr: 'नोंदणी प्रकार' },
                      { step: 4, label: 'Step 4', titleEn: 'Land Profile', titleMr: 'जमीन प्रोफाइल' },
                      { step: 5, label: 'Step 5', titleEn: 'Facilities', titleMr: 'पाणी व वीज सुविधा' },
                      { step: 6, label: 'Step 6', titleEn: 'Services Needed', titleMr: 'आवश्यक सेवा' },
                      { step: 7, label: 'Step 7', titleEn: 'Future Investment', titleMr: 'गुंतवणूक' },
                      { step: 8, label: 'Step 8', titleEn: 'Schemes & Subsidy', titleMr: 'योजना व अनुदान' },
                      { step: 9, label: 'Step 9', titleEn: 'Major Problems', titleMr: 'शेतीतील अडचणी' }
                    ].map(item => (
                      <div key={item.step} className="p-3 bg-[#182234] border border-[#233148] rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 block">{item.label}</span>
                          <span className="font-bold text-white text-xs block leading-tight">{item.titleEn}</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">{item.titleMr}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWizardSection(item.step)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 cursor-pointer shrink-0 ml-1"
                        >
                          <span>✏️</span>
                          <div className="flex flex-col text-left leading-none">
                            <span className="text-[10px] font-bold">Edit</span>
                            <span className="text-[9px] font-normal text-amber-300/80">बदला</span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* SUMMARY PREVIEW CARDS */}
                  <div className="space-y-2 text-xs pt-1">
                    {/* STEP 4 PREVIEW */}
                    <div className="p-3 bg-[#182234] border border-[#233148] rounded-xl space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <div>
                          <span className="block leading-tight">Land &amp; Parcels</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">जमीन व गट नोंद</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-mono block leading-tight">Total: {calculateGatWiseTotalAcres()} Acre</span>
                          <span className="text-[10px] text-emerald-400/80 block leading-tight">एकूण: {calculateGatWiseTotalAcres()} एकर</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono">
                        Parcels: {(phase1FormData.gatSurveyParcels || []).map((p: any) => `Gat ${p.gatNumber} (${p.area} ${p.areaUnit})`).join(', ') || 'None'}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Farmer ID: <strong className="text-white">{phase1FormData.hasFarmerId}</strong>
                        {phase1FormData.hasFarmerId === 'Yes' && <strong className="text-emerald-400 font-mono ml-1">({phase1FormData.govtAgriStackFarmerId || phase1FormData.farmerId})</strong>}
                      </p>
                    </div>

                    {/* STEP 8 PREVIEW */}
                    <div className="p-3 bg-[#182234] border border-[#233148] rounded-xl space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <div>
                          <span className="block leading-tight">Government Schemes &amp; Subsidy</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">शासकीय योजना व अनुदान</span>
                        </div>
                        <span className="text-emerald-400 font-bold">{phase1FormData.subsidyHelpNeeded || 'None'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Active Benefits: {(phase1FormData.activeSchemesList || []).join(', ') || 'None'}
                      </p>
                      {(phase1FormData.subsidyHelpCategories || []).length > 0 && (
                        <p className="text-[11px] text-slate-300">
                          Assistance Needed: {phase1FormData.subsidyHelpCategories.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* STEP 9 PREVIEW */}
                    <div className="p-3 bg-[#182234] border border-[#233148] rounded-xl space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <div>
                          <span className="block leading-tight">Major Farming Problems</span>
                          <span className="text-[10px] text-slate-400 font-normal block leading-tight">शेतीतील प्रमुख अडचणी</span>
                        </div>
                        <span className="text-rose-400 font-mono font-bold">{(phase1FormData.mainProblemsList || []).length} / 3</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Issues: {(phase1FormData.mainProblemsList || []).join(', ') || 'None'}
                        {phase1FormData.mainProblemOther && ` (${phase1FormData.mainProblemOther})`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. STICKY BOTTOM NAVIGATION BAR */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-[#0B1324]/95 border-t border-[#1E293B] backdrop-blur-md flex items-center space-x-3 z-30">
                <button
                  type="button"
                  onClick={handlePrevWizardSection}
                  className="h-[52px] px-6 bg-[#182234] hover:bg-[#223046] border border-[#2A3952] text-white font-bold rounded-2xl text-sm transition-all cursor-pointer flex items-center space-x-2 shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {wizardSection < 10 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (validateCurrentStep(wizardSection)) {
                        if (wizardSection === 3) {
                          const regType = phase1FormData.registrationType;
                          if (regType === 'entrepreneur') {
                            // Close farmer wizard, open entrepreneur wizard
                            setIsRegWizardOpen(false);
                            setIsEntrepreneurWizardOpen(true);
                            triggerToast('🚜 Opening Agri Entrepreneur Assessment Wizard...');
                            return;
                          }
                          if (regType === 'both') {
                            // Go to farmer wizard first, entrepreneur will open after submit
                            setWizardSection(4);
                            triggerToast('👥 Farmer form first, Entrepreneur form will follow.');
                            return;
                          }
                          // farmer → go to Step 4 Farmer Land Profile
                          setWizardSection(4);
                          return;
                        }
                        setWizardSection(prev => (prev + 1) as any);
                      }
                    }}
                    className="flex-1 h-[52px] bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-2xl text-base transition-all cursor-pointer shadow-lg shadow-emerald-900/30 text-center flex items-center justify-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePhase1Submit}
                    disabled={isSubmittingPhase1}
                    className="flex-1 h-[52px] bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-black rounded-2xl text-base transition-all cursor-pointer shadow-lg shadow-emerald-900/30 text-center flex items-center justify-center space-x-2"
                  >
                    {isSubmittingPhase1 ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm &amp; Create Profile</span>
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
