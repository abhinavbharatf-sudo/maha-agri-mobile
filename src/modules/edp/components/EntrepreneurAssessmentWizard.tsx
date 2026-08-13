/**
 * MAHA-AGRIDOOT — Entrepreneur Assessment Wizard (Final Question Bank Implementation)
 * Full 9-Section Question Bank + Conditional Modules A-F cleanly rendered within frozen Enterprise UI.
 * Deep Charcoal #0B1220, 56px Inputs & Buttons, 16px Radius, Filled Emerald Accent.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Share2,
  Calendar,
  Save,
  GraduationCap,
  Briefcase,
  Sprout,
  Tractor,
  Coins,
  BookOpen,
  FileText,
  ClipboardCheck,
  User,
  Bell,
  Menu as MenuIcon,
  CheckSquare,
  Square,
  AlertCircle,
  Building,
  CheckCircle2,
  Sparkles,
  Award,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  Search,
  ShieldCheck,
  X,
  QrCode,
  Copy,
  MapPin,
  Loader2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type {
  EntrepreneurAssessmentFormData,
  EducationalQualification,
  AgriLicenseType,
  OccupationType,
  BusinessCategory,
  ExperienceRange,
  BusinessStatus,
  AgriActivity,
  GovtSchemeType,
  DroneKnowledgeLevel,
  DroneLearnSource,
  EntrepreneurProgram,
  InvestmentCapacityRange,
  InvestmentSourceType,
  LoanType,
  GovtLoanScheme,
  CibilScoreRange,
  InfrastructureResource,
  InternalAdminAssessmentScores,
} from '../types/entrepreneurAssessment.types';
import {
  entrepreneurAssessmentService,
  INITIAL_ASSESSMENT_FORM_DATA,
  CONFIGURABLE_ELIGIBILITY_RULES,
} from '../services/entrepreneurAssessmentService';

interface EntrepreneurAssessmentWizardProps {
  initialCandidateName?: string;
  initialMobile?: string;
  initialDistrict?: string;
  initialTaluka?: string;
  initialVillage?: string;
  onBack?: () => void;
  onSubmitSuccess?: (candidateId: string, scores: InternalAdminAssessmentScores) => void;
  triggerToast?: (msg: string) => void;
}

export const EntrepreneurAssessmentWizard: React.FC<EntrepreneurAssessmentWizardProps> = ({
  initialCandidateName = 'Rahul Patil',
  initialMobile = '8765432109',
  initialDistrict = 'Nashik',
  initialTaluka = 'Niphad',
  initialVillage = 'Pimplas',
  onBack,
  onSubmitSuccess,
  triggerToast = (msg: string) => console.log(msg),
}) => {
  // FORM DATA STATE
  const [formData, setFormData] = useState<EntrepreneurAssessmentFormData>(() => {
    const draft = entrepreneurAssessmentService.getDraft();
    if (draft) {
      return {
        ...draft,
        fullName: initialCandidateName || draft.fullName,
        mobileNumber: initialMobile || draft.mobileNumber,
      };
    }
    return {
      ...INITIAL_ASSESSMENT_FORM_DATA,
      fullName: initialCandidateName || INITIAL_ASSESSMENT_FORM_DATA.fullName,
      mobileNumber: initialMobile || INITIAL_ASSESSMENT_FORM_DATA.mobileNumber,
    };
  });

  // STEP NAVIGATION STATE (1 to 8)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStageText, setSubmitStageText] = useState<string>('Submit Assessment');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validationHeaderChip, setValidationHeaderChip] = useState<string | null>(null);
  const [isVerifiedByCandidate, setIsVerifiedByCandidate] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{ candidateId: string; scores: InternalAdminAssessmentScores } | null>(null);

  // 8 ENTERPRISE SECTION MODULES (WITH VERBATIM CONTEXT DESCRIPTIONS - REQ 2)
  const SECTIONS = [
    { id: 1, title: '🎓 Education Profile', shortTitle: 'Education', icon: GraduationCap, description: 'Build your educational profile for personalized recommendations.' },
    { id: 2, title: '💼 Occupation Profile', shortTitle: 'Occupation', icon: Briefcase, description: 'Tell us about your current professional journey.' },
    { id: 3, title: '🌾 Agriculture Profile', shortTitle: 'Agriculture', icon: Sprout, description: 'Help us understand your farming background.' },
    { id: 4, title: '🚁 Drone Awareness', shortTitle: 'Drone', icon: Tractor, description: 'Assess your current understanding of Agri Drone Technology.' },
    { id: 5, title: '🎯 Program Selection', shortTitle: 'Programs', icon: BookOpen, description: 'Explore & select entrepreneurship programs tailored for you.' },
    { id: 6, title: '💰 Investment Capacity', shortTitle: 'Investment', icon: Coins, description: 'Evaluate your financial readiness for entrepreneurship.' },
    { id: 7, title: '🏦 Loan & Financial Profile', shortTitle: 'Financial', icon: FileText, description: 'This helps us recommend suitable funding & subsidy options.' },
    { id: 8, title: '📋 Review & Submit', shortTitle: 'Review', icon: ClipboardCheck, description: 'Verify your information before submission.' },
  ];

  // AGRI QUALIFICATIONS FOR LICENSE DISPLAY
  const AGRI_QUALIFICATIONS = [
    'Agri Polytechnic',
    'Diploma in Agriculture',
    'B.Sc Agriculture',
    'M.Sc Agriculture',
    'B.Tech Agriculture',
    'B.Tech Agricultural Engineering',
    'Veterinary',
  ];

  const hasAgriDegree = AGRI_QUALIFICATIONS.includes(formData.education.qualification);

  // AUTO-SAVE DRAFT EFFECT WITH FADE OUT AFTER 2 SECONDS (MOTION REQ 10)
  useEffect(() => {
    if (!isSubmitted) {
      setSaveStatus('saving');
      entrepreneurAssessmentService.saveDraft(formData);
      const savedTimer = setTimeout(() => {
        setSaveStatus('saved');
      }, 350);

      const fadeTimer = setTimeout(() => {
        setSaveStatus('idle');
      }, 2350);

      return () => {
        clearTimeout(savedTimer);
        clearTimeout(fadeTimer);
      };
    }
  }, [formData, isSubmitted]);

  // CALCULATE PROGRESS PERCENTAGE
  const progressPercentage = useMemo(() => {
    return Math.round((currentStep / 8) * 100);
  }, [currentStep]);

  // VALIDATION ERRORS STATE
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);

  const clearError = (fieldKey: string) => {
    setValidationErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  // UPDATE FORM SECTION WITH TARGETED FIELD ERROR CLEARING (UX REQ 5)
  const updateFormSection = <K extends keyof EntrepreneurAssessmentFormData>(
    section: K,
    updater: (prevSection: EntrepreneurAssessmentFormData[K]) => EntrepreneurAssessmentFormData[K],
    fieldKeyToClear?: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: updater(prev[section]),
    }));
    if (fieldKeyToClear) {
      clearError(fieldKeyToClear);
    }
  };

  // QUALIFICATIONS THAT RENDER AGRICULTURE LICENSES IN UI
  const AGRI_LICENSE_QUALIFICATIONS = [
    'Agri Polytechnic',
    'Diploma in Agriculture',
    'B.Sc Agriculture',
    'M.Sc Agriculture',
    'B.Tech Agriculture',
    'B.Tech Agricultural Engineering',
  ];

  // ============================================================================
  // V5.4 CENTRALIZED VALIDATION ENGINE & UNRENDERED FIELD GUARD
  // ============================================================================
  const validateStep = (step: number): boolean => {
    const rawErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.education.qualification) {
        rawErrors['qualification'] = 'Please select your Highest Educational Qualification.';
      } else if (formData.education.qualification === 'Other' && !formData.education.qualificationOther?.trim()) {
        rawErrors['qualificationOther'] = 'Please specify your qualification.';
      }

      if (formData.education.isStudent) {
        if (!formData.education.studentDetails?.collegeName?.trim()) {
          rawErrors['collegeName'] = 'Please enter College / University Name.';
        }
        if (!formData.education.studentDetails?.courseName?.trim()) {
          rawErrors['courseName'] = 'Please enter Course Name.';
        }
        if (!formData.education.studentDetails?.currentYear?.trim()) {
          rawErrors['currentYear'] = 'Please enter Current Year / Semester.';
        }
      }

      // ONLY validate agriLicenses if qualification renders agriLicenses in UI
      if (AGRI_LICENSE_QUALIFICATIONS.includes(formData.education.qualification)) {
        if (!formData.education.agriLicenses || formData.education.agriLicenses.length === 0) {
          rawErrors['agriLicenses'] = 'Please select at least one Agriculture License (or None).';
        }
      }
    }

    else if (step === 2) {
      if (!formData.occupation.occupation) {
        rawErrors['occupation'] = 'Please select your Current Occupation.';
      } else if (formData.occupation.occupation === 'Other' && !formData.occupation.occupationOther?.trim()) {
        rawErrors['occupationOther'] = 'Please specify your occupation.';
      }

      if (formData.occupation.occupation === 'Agriculture Professional') {
        if (!formData.occupation.agriProfCategory) {
          rawErrors['agriProfCategory'] = 'Please select your Agriculture Professional specialty.';
        } else if (formData.occupation.agriProfCategory === 'Other' && !formData.occupation.agriProfCategoryOther?.trim()) {
          rawErrors['agriProfCategoryOther'] = 'Please specify your specialty.';
        }
      }

      if (formData.occupation.occupation === 'Business Owner') {
        if (!formData.occupation.businessDetails?.businessName?.trim()) {
          rawErrors['businessName'] = 'Please enter Business Name.';
        }
        if (!formData.occupation.businessDetails?.category) {
          rawErrors['businessCategory'] = 'Please select Business Category.';
        } else if (formData.occupation.businessDetails?.category === 'Other' && !formData.occupation.businessDetails?.categoryOther?.trim()) {
          rawErrors['categoryOther'] = 'Please specify business category.';
        } else if (formData.occupation.businessDetails?.category === 'Agriculture') {
          if (!formData.occupation.businessDetails?.agriSubCategory) {
            rawErrors['agriSubCategory'] = 'Please select Agri Business Sub-Category.';
          } else if (formData.occupation.businessDetails?.agriSubCategory === 'Other' && !formData.occupation.businessDetails?.agriSubCategoryOther?.trim()) {
            rawErrors['agriSubCategoryOther'] = 'Please specify sub-category.';
          }
        }
        if (!formData.occupation.businessDetails?.experience) {
          rawErrors['businessExperience'] = 'Please select Business Experience.';
        }
        if (!formData.occupation.businessDetails?.status) {
          rawErrors['businessStatus'] = 'Please select Business Status.';
        }
      }
    }

    else if (step === 3) {
      if (formData.agriculture.isInvolvedInAgri) {
        if (!formData.agriculture.agriActivities || formData.agriculture.agriActivities.length === 0) {
          rawErrors['agriActivities'] = 'Please select at least one farming activity.';
        }
        if (!formData.agriculture.farmingExperience) {
          rawErrors['farmingExperience'] = 'Please select farming experience.';
        }
      }

      if (formData.agriculture.ownsAgriLand) {
        const landVal = parseFloat(formData.agriculture.landDetails?.totalLandArea || '0');
        if (!formData.agriculture.landDetails?.totalLandArea || isNaN(landVal) || landVal <= 0) {
          rawErrors['totalLandArea'] = 'Please enter Total Agricultural Land (must be > 0).';
        }
        if (!formData.agriculture.landUnit) {
          rawErrors['landUnit'] = 'Please select land measurement unit.';
        }
      }

      if (formData.agriculture.hasFarmerId) {
        if (!formData.agriculture.dontKnowFarmerId && !formData.agriculture.farmerIdNumber?.trim()) {
          rawErrors['farmerIdNumber'] = 'Please enter Farmer Registration Number or check "I Don\'t Know".';
        }
      }

      if (formData.agriculture.hasReceivedGovtBenefits) {
        if (!formData.agriculture.govtSchemesReceived || formData.agriculture.govtSchemesReceived.length === 0) {
          rawErrors['govtSchemesReceived'] = 'Please select at least one government scheme.';
        } else {
          if (formData.agriculture.govtSchemesReceived.includes('Other' as any) && !formData.agriculture.govtSchemeOther?.trim()) {
            rawErrors['govtSchemeOther'] = 'Please specify other scheme.';
          }
        }
      }

      if (formData.agriculture.isFpoMember) {
        if (!formData.agriculture.fpoName?.trim()) {
          rawErrors['fpoName'] = 'Please enter FPO Name.';
        }
        if (!formData.agriculture.fpoPosition) {
          rawErrors['fpoPosition'] = 'Please select Position in FPO.';
        } else if (formData.agriculture.fpoPosition === 'Other' && !formData.agriculture.fpoPositionOther?.trim()) {
          rawErrors['fpoPositionOther'] = 'Please specify FPO position.';
        }
        if (!formData.agriculture.fpoYearJoined) {
          rawErrors['fpoYearJoined'] = 'Please select Year Joined FPO.';
        }
        if (!formData.agriculture.fpoFarmersConnected?.trim()) {
          rawErrors['fpoFarmersConnected'] = 'Please enter Farmers Connected.';
        }
        if (!formData.agriculture.fpoVillageCoverage?.trim()) {
          rawErrors['fpoVillageCoverage'] = 'Please enter Village Coverage.';
        }
      }
    }

    else if (step === 4) {
      if (!formData.agriDrone.knowsAgriDrones) {
        rawErrors['knowsAgriDrones'] = 'Please select your drone awareness level.';
      }

      if (formData.agriDrone.attendedTraining) {
        if (!formData.agriDrone.trainingDetails?.instituteName?.trim()) {
          rawErrors['instituteName'] = 'Please enter Training Institute Name.';
        }
        if (!formData.agriDrone.trainingDetails?.trainingYear?.trim()) {
          rawErrors['trainingYear'] = 'Please enter Training Year.';
        }
      }

      if (formData.agriDrone.currentlyOwnsDrone) {
        if (!formData.agriDrone.ownedDroneDetails?.manufacturer) {
          rawErrors['droneManufacturer'] = 'Please select Drone Manufacturer.';
        } else if (formData.agriDrone.ownedDroneDetails?.manufacturer === 'Other' && !formData.agriDrone.ownedDroneDetails?.manufacturerOther?.trim()) {
          rawErrors['manufacturerOther'] = 'Please specify drone manufacturer.';
        }
        if (!formData.agriDrone.ownedDroneDetails?.model?.trim()) {
          rawErrors['droneModel'] = 'Please enter Drone Model.';
        }
        if (!formData.agriDrone.ownedDroneDetails?.capacity) {
          rawErrors['droneCapacity'] = 'Please select Drone Capacity.';
        }
        if (!formData.agriDrone.ownedDroneDetails?.category) {
          rawErrors['droneCategory'] = 'Please select Drone Category.';
        }
      } else if (formData.agriDrone.wantsToPurchaseDrone) {
        if (!formData.agriDrone.purchaseMethod) {
          rawErrors['purchaseMethod'] = 'Please select Purchase Funding Mode.';
        }
        if (!formData.agriDrone.purchaseTimeline) {
          rawErrors['purchaseTimeline'] = 'Please select Purchase Timeline.';
        }
      }
    }

    else if (step === 5) {
      if (!formData.entrepreneurInterest.selectedPrograms || formData.entrepreneurInterest.selectedPrograms.length === 0) {
        rawErrors['selectedPrograms'] = 'Please select at least one Entrepreneur Program of interest.';
      }

      if (formData.entrepreneurInterest.selectedPrograms.includes('Agri Drone Entrepreneur')) {
        const edp = formData.entrepreneurInterest.moduleADrone?.edpWorkshop;
        if (!edp?.canAttendWorkshop) {
          rawErrors['canAttendWorkshop'] = 'Please select HQ Workshop Attendance.';
        } else if (edp.canAttendWorkshop === 'No') {
          if (!edp.cannotAttendReason) {
            rawErrors['cannotAttendReason'] = 'Please select reason for not attending.';
          } else if (edp.cannotAttendReason === 'Other' && !edp.cannotAttendReasonOther?.trim()) {
            rawErrors['cannotAttendReasonOther'] = 'Please specify your reason.';
          }
        }

        if (!edp?.postTrainingPlan) {
          rawErrors['postTrainingPlan'] = 'Please select post-training business plan.';
        } else if (edp.postTrainingPlan === 'Other' && !edp.postTrainingPlanOther?.trim()) {
          rawErrors['postTrainingPlanOther'] = 'Please specify your post-training plan.';
        }

        if (!edp?.careerPathsInterest || edp.careerPathsInterest.length === 0) {
          rawErrors['careerPathsInterest'] = 'Please select at least one career path interest.';
        } else if (edp.careerPathsInterest.includes('Other') && !edp.careerPathsInterestOther?.trim()) {
          rawErrors['careerPathsInterestOther'] = 'Please specify other career path.';
        }

        if (!edp?.preferredBusinessModel) {
          rawErrors['preferredBusinessModel'] = 'Please select Preferred Business Model.';
        }

        if (!edp?.wantsMahaAgriAssistance) {
          rawErrors['wantsMahaAgriAssistance'] = 'Please select MAHA-AGRI Partnership interest.';
        } else if (edp.wantsMahaAgriAssistance === 'Yes') {
          if (!edp.mahaAgriWorkingModel) {
            rawErrors['mahaAgriWorkingModel'] = 'Please select Preferred Working Model.';
          }
        } else if (edp.wantsMahaAgriAssistance === 'No') {
          if (!edp.wantsIndependentBusiness) {
            rawErrors['wantsIndependentBusiness'] = 'Please select Independent Business intention.';
          } else if (edp.wantsIndependentBusiness === 'Yes' && !edp.independentBusinessTimeline) {
            rawErrors['independentBusinessTimeline'] = 'Please select launch timeline.';
          }
        }

        if (!edp?.villagesTargetToServe) {
          rawErrors['villagesTargetToServe'] = 'Please select target village coverage.';
        }

        if (!edp?.agreeToCompleteEdpBeforeOnboarding) {
          rawErrors['agreeToCompleteEdpBeforeOnboarding'] = 'EDP training agreement before onboarding is mandatory.';
        }
      }
    }

    else if (step === 6) {
      if (!formData.investment.capacity) {
        rawErrors['investmentCapacity'] = 'Please select Initial Investment Capacity.';
      }
      if (!formData.investment.source) {
        rawErrors['investmentSource'] = 'Please select Investment Source.';
      }
    }

    else if (step === 7) {
      if (formData.financial.hasRunningLoan && (!formData.financial.runningLoanTypes || formData.financial.runningLoanTypes.length === 0)) {
        rawErrors['runningLoanTypes'] = 'Please select at least one running loan type.';
      }
      if (!formData.financial.cibilScore) {
        rawErrors['cibilScore'] = 'Please select approximate CIBIL score range.';
      }
    }

    else if (step === 8) {
      if (!formData.declaration.isInformationTrue ||
          !formData.declaration.understandsNoGuarantee ||
          !formData.declaration.agreesToAssessmentProcess ||
          !isVerifiedByCandidate) {
        rawErrors['declaration'] = 'You must verify and agree to all declaration statements before final submission.';
      }
    }

    // =========================================================================
    // V5.4 UNRENDERED FIELD GUARD & UNIVERSAL MESSAGE STANDARDIZATION
    // =========================================================================
    const activeErrors: Record<string, string> = {};
    for (const [key] of Object.entries(rawErrors)) {
      const fieldId = `field-${key}`;
      const element = typeof document !== 'undefined' ? document.getElementById(fieldId) : null;
      if (element) {
        activeErrors[key] = 'This field is required.';
      } else {
        console.warn(
          `🔴 [MAHA-AGRIDOOT Developer Warning] Validation mapped to non-rendered field: "${key}" (Step ${step}). Automatically skipped to prevent blocking navigation.`
        );
      }
    }

    setValidationErrors(activeErrors);

    if (Object.keys(activeErrors).length > 0) {
      const firstErrorKey = Object.keys(activeErrors)[0];

      // Developer Console Trace & Debug Panel
      console.group(`===== MAHA-AGRIDOOT ENTERPRISE VALIDATION DEBUG (STEP ${step}) =====`);
      Object.entries(activeErrors).forEach(([k, err]) => {
        console.log(`[Field: ${k}] | Validation: FAIL | Scroll Trigger: YES | Focus Trigger: YES | Animation Trigger: YES | UI Render: YES | Error: "${err}"`);
      });
      console.groupEnd();

      setTimeout(() => {
        // Apply gentle 800ms attention pulse to all invalid fields (stops automatically after 800ms - REQ 2)
        Object.keys(activeErrors).forEach((key) => {
          const errEl = document.getElementById(`field-${key}`);
          if (errEl) {
            errEl.classList.add('animate-gentle-pulse-error');
            setTimeout(() => {
              errEl.classList.remove('animate-gentle-pulse-error');
            }, 800);
          }
        });

        const el = document.getElementById(`field-${firstErrorKey}`) || document.querySelector('.border-rose-500');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
            ? el
            : el.querySelector('input, select, textarea, button');
          if (focusable && typeof (focusable as HTMLElement).focus === 'function') {
            (focusable as HTMLElement).focus();
          }
        }
      }, 60);
      return false;
    }

    return true;
  };

  // Item 10: Validation Inspector Window Tool
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).validationInspector = () => {
        console.group(`🔍 MAHA-AGRIDOOT Validation Inspector (Step ${currentStep})`);
        console.log('Form State Data:', formData);
        console.log('Active Validation Errors:', validationErrors);

        const renderedFields = document.querySelectorAll('[id^="field-"]');
        console.log(`Found ${renderedFields.length} active fields rendered in DOM for Step ${currentStep}:`);
        renderedFields.forEach((node) => {
          const key = node.id.replace('field-', '');
          const hasError = !!validationErrors[key];
          console.log(`  ${hasError ? '✖' : '✔'} [${key}] -> ${hasError ? validationErrors[key] : 'Valid / OK'}`);
        });
        console.groupEnd();
      };
    }
  }, [currentStep, formData, validationErrors]);

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 8) {
        setSlideDirection('right');
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (currentStep === 8) {
        handleFinalSubmit();
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setSlideDirection('left');
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onBack) {
      onBack();
    }
  };

  const handleSaveDraftManual = () => {
    entrepreneurAssessmentService.saveDraft(formData);
    triggerToast('✓ Draft Saved Automatically');
  };

  const handleFinalSubmit = () => {
    if (!validateStep(8)) return;

    setIsSubmitting(true);
    setSubmitStageText('Submitting Application...');

    try {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const candidateId = `MAG-${year}-${randomNum}`;
      const scores = entrepreneurAssessmentService.calculateInternalAdminScores(formData);

      // 1. Persist submitted assessment to local storage / service engine
      entrepreneurAssessmentService.saveSubmittedAssessment(candidateId, formData, scores);

      // 2. Multi-stage realistic progress pipeline (REQ 19: Submitting -> Processing -> Verifying -> Success)
      setTimeout(() => {
        setSubmitStageText('Processing Verification...');
      }, 350);

      setTimeout(() => {
        setSubmitStageText('Verifying Details...');
      }, 700);

      setTimeout(() => {
        setSubmitStageText('Allocating EDP Batch...');
      }, 1050);

      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setSubmissionResult({ candidateId, scores });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (onSubmitSuccess) onSubmitSuccess(candidateId, scores);
      }, 1400);
    } catch (err) {
      console.error('🔴 Submission Pipeline Failure:', err);
      setIsSubmitting(false);
      setSubmitStageText('Submit Assessment');
      triggerToast('⚠️ Unable to submit your application. Please try again.');
    }
  };

  const currentSection = SECTIONS[currentStep - 1];

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      <div className="max-w-[420px] mx-auto min-h-screen bg-[#0B1220] flex flex-col relative shadow-2xl overflow-x-hidden border-x border-[#1F2937]/40">
        
        {/* ========================================================================= */}
        {/* V6 — FINAL EDP WORKSHOP REGISTRATION & SUCCESS EXPERIENCE DASHBOARD */}
        {/* ========================================================================= */}
        {isSubmitted && submissionResult ? (
          <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0B1220] text-slate-100 animate-in fade-in duration-300 relative space-y-5">
            
            {/* 1. SUCCESS HERO SECTION (EDP REGISTRATION TERMINOLOGY) */}
            <div className="text-center pt-2 space-y-3">
              <div className="relative inline-block">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-70 blur-md animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#059669] to-[#0D9488] border-4 border-white/20 p-2 mx-auto flex items-center justify-center shadow-2xl relative z-10 animate-bounce">
                  <CheckCircle2 className="w-11 h-11 text-white stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>EDP Registration Completed</span>
                </div>
                <h1 className="font-extrabold text-[24px] sm:text-[27px] text-white tracking-tight leading-tight">
                  Registration & Assessment Completed Successfully
                </h1>
              </div>
            </div>

            {/* 2. SUCCESS MESSAGE CARD */}
            <div className="p-4 bg-gradient-to-r from-[#059669]/20 via-[#0D9488]/15 to-[#111827] rounded-[18px] border border-[#059669]/40 space-y-2 text-left shadow-lg">
              <div className="flex items-center space-x-2">
                <Award className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <strong className="text-[12.5px] text-emerald-300 font-bold uppercase tracking-wide">MAHA-AGRI EDP – Agri Drone Program</strong>
              </div>
              <p className="text-[12.5px] text-slate-200 leading-relaxed font-normal">
                Thank you for registering for the <strong className="text-white font-semibold">MAHA-AGRI Entrepreneur Development Program (EDP – Agri Drone)</strong>. Your Entrepreneur Assessment has been completed successfully and securely recorded in the MAHA-AGRI Enterprise Assessment System. Our team will contact you regarding workshop scheduling and the next steps.
              </p>
            </div>

            {/* 3, 14, 15 & 17. OFFICIAL GOVERNMENT RECEIPT CARD WITH QR CODE & COPY ID */}
            <div className="p-4 sm:p-5 bg-[#111827] rounded-[20px] border border-[#1F2937] text-left space-y-3.5 shadow-xl">
              <div className="flex justify-between items-center border-b border-[#1F2937] pb-3">
                <div>
                  <span className="text-[10px] text-[#0D9488] font-extrabold uppercase tracking-widest block">Official Digital Acknowledgement</span>
                  <h3 className="font-bold text-[16px] text-white tracking-tight">Application Receipt</h3>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/60 rounded-full text-emerald-300 font-bold text-xs flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Submitted Successfully</span>
                </span>
              </div>

              {/* PROMINENT APPLICATION ID + COPY BUTTON */}
              <div className="p-3.5 bg-[#182234] rounded-xl border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[#94A3B8] text-[10px] block font-bold uppercase tracking-wider">Application ID</span>
                  <strong className="text-emerald-400 font-mono text-[18px] font-extrabold tracking-wide">{submissionResult.candidateId}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submissionResult.candidateId);
                    triggerToast('✓ Application ID Copied to Clipboard');
                  }}
                  className="px-3 py-1.5 bg-[#059669]/20 hover:bg-[#059669]/40 border border-[#059669] rounded-lg text-emerald-300 text-[12px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy ID</span>
                </button>
              </div>

              {/* RECEIPT DETAILS MATRIX */}
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Registration Date & Time</span>
                  <strong className="text-slate-300 font-mono text-[11px]">{new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Candidate Name</span>
                  <strong className="text-white font-semibold text-[12.5px]">{formData.fullName}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Mobile Number</span>
                  <strong className="text-white font-mono font-semibold text-[12.5px]">+91 {formData.mobileNumber}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">District & Taluka</span>
                  <strong className="text-white font-medium">{formData.district}, {formData.taluka}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Village</span>
                  <strong className="text-white font-medium">{formData.village}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Registration Mode</span>
                  <strong className="text-cyan-400 font-semibold text-[11px]">Staff Assisted Registration</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Application Status</span>
                  <strong className="text-emerald-400 font-semibold text-[11px]">Submitted Successfully</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Current Stage</span>
                  <strong className="text-amber-400 font-semibold text-[11px]">Awaiting Workshop Processing</strong>
                </div>
              </div>

              {/* QR VERIFICATION BOX */}
              <div className="p-3 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center space-x-3">
                <div className="w-13 h-13 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center shadow-md">
                  <QrCode className="w-10 h-10 text-slate-900" />
                </div>
                <div className="text-left space-y-0.5">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">Official QR Verification</span>
                  <p className="text-[10.5px] text-slate-300 leading-snug">
                    Scan to validate registration authenticity & track candidate EDP status in MAHA-AGRI System.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. WORKSHOP REGISTRATION SUMMARY */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-3 text-left shadow-lg">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Workshop Registration Summary</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Program</span>
                  <strong className="text-white font-semibold">EDP – Agri Drone</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Workshop Duration</span>
                  <strong className="text-emerald-400 font-bold">2 Days Practical EDP</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Preferred Training Location</span>
                  <strong className="text-white font-medium">{formData.district} District HQ</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Business Goal</span>
                  <strong className="text-white font-medium">{formData.entrepreneurInterest?.selectedPrograms?.[0] || 'Start Drone Spray Business'}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Preferred Funding</span>
                  <strong className="text-white font-medium">{formData.investment?.capacity || 'Up to ₹5 Lakh'} ({formData.investment?.source || 'Self / Loan'})</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-medium">Need Business Support</span>
                  <strong className="text-emerald-400 font-bold">Yes (Govt Facilitation)</strong>
                </div>
              </div>
            </div>

            {/* 18. CANDIDATE PROFILE SNAPSHOT */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-3 text-left shadow-lg">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>Entrepreneur Profile Snapshot</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Education</span>
                  <strong className="text-white">{formData.education?.qualification || 'Not Specified'}</strong>
                </div>
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Occupation</span>
                  <strong className="text-white">{formData.occupation?.occupation || 'Not Specified'}</strong>
                </div>
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Agri Background</span>
                  <strong className="text-emerald-400">{formData.agriculture?.isInvolvedInAgri ? 'Active Farming' : 'Non-Farming'}</strong>
                </div>
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Drone Awareness</span>
                  <strong className="text-white">{formData.agriDrone?.knowsAgriDrones === 'Yes' ? 'Aware & Trained' : 'Basic'}</strong>
                </div>
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Preferred Enterprise</span>
                  <strong className="text-white">{formData.entrepreneurInterest?.selectedPrograms?.[0] || 'Agri Drone Entrepreneur'}</strong>
                </div>
                <div className="p-2 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-slate-400 block text-[10px]">Working Area</span>
                  <strong className="text-white">{formData.taluka}, {formData.district}</strong>
                </div>
              </div>
            </div>

            {/* 5. ENTREPRENEUR PROFILE SUMMARY (CLEAN SUMMARY WITHOUT INTERNAL AI SCORES) */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-3 text-left">
              <div className="flex justify-between items-center border-b border-[#1F2937] pb-2">
                <div>
                  <span className="text-[10px] text-[#0D9488] font-bold uppercase tracking-widest block">Enterprise Verification</span>
                  <h4 className="font-bold text-[14px] text-white">Entrepreneur Profile Summary</h4>
                </div>
                <span className="px-2.5 py-0.5 bg-[#059669]/20 border border-[#059669] rounded-full text-emerald-300 font-semibold text-[11px]">
                  Verified Status
                </span>
              </div>

              <div className="space-y-2 text-[12px]">
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Government Scheme Mapping</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Completed</span>
                  </span>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Training Assessment</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Completed</span>
                  </span>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Business Profiling</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 6. BUSINESS RECOMMENDATION (WITHOUT EXPOSING MATCH PERCENTAGES) */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Business Recommendation Portfolio</span>
              </h4>
              <div className="space-y-2 text-[12.5px]">
                <div className="p-2.5 bg-[#182234] rounded-xl border border-emerald-500/40">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Primary Recommended Enterprise</span>
                  <strong className="text-white text-[13.5px] block">{formData.entrepreneurInterest?.selectedPrograms?.[0] || 'Agri Drone Entrepreneurship'}</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Secondary Suitable Enterprise</span>
                  <strong className="text-white text-[13px] block">MAHA-AGRI Krushi Seva Kendra</strong>
                </div>
                <div className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Additional Business Opportunity</span>
                  <strong className="text-white text-[13px] block">Soil Testing & Diagnostics Unit</strong>
                </div>
              </div>
            </div>

            {/* 7. POTENTIAL GOVERNMENT SCHEMES */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Potential Government Schemes</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {['MAHA-DBT Scheme', 'CMEGP Scheme', 'PMEGP Scheme', 'Mudra Loan', 'SMAM Scheme', 'PMFME Scheme'].map((sch) => (
                  <div key={sch} className="p-2 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{sch}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-[#94A3B8] italic pt-1 border-t border-[#1F2937]">
                * Final eligibility depends upon Government guidelines, departmental verification, and document validation.
              </p>
            </div>

            {/* 8. RECOMMENDED TRAINING (PRIORITY BADGES) */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>Recommended Capacity Building Training</span>
              </h4>
              <div className="space-y-2 text-[12px]">
                {[
                  { name: '2-Day Practical EDP Workshop', priority: 'Mandatory', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500' },
                  { name: 'DGCA Approved Remote Pilot Training (RPC)', priority: 'High Priority', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500' },
                  { name: 'Agri Business Management & Licensing', priority: 'Recommended', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500' },
                  { name: 'Financial Management & Subsidy Filings', priority: 'Recommended', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500' },
                ].map((tr) => (
                  <div key={tr.name} className="p-2.5 bg-[#182234] rounded-xl border border-[#1F2937] flex items-center justify-between">
                    <strong className="text-white text-[12.5px] block">{tr.name}</strong>
                    <span className={`px-2.5 py-0.5 font-bold text-[10px] rounded-md border ${tr.badgeColor}`}>
                      {tr.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 12. WORKSHOP BATCH ALLOCATION CARD */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <div className="flex justify-between items-center border-b border-[#1F2937] pb-2">
                <h4 className="font-bold text-[14px] text-white flex items-center space-x-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span>Workshop Batch Allocation</span>
                </h4>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500 rounded text-[10px] font-bold">
                  Pending Assignment
                </span>
              </div>
              <div className="p-3 bg-[#182234] rounded-xl border border-[#1F2937] space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Batch:</span>
                  <strong className="text-white">{formData.district} District EDP Batch 01 (Upcoming)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue:</span>
                  <strong className="text-white">District Agriculture Office / KVK</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reporting Time:</span>
                  <strong className="text-slate-300">09:30 AM</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinator Contact:</span>
                  <strong className="text-emerald-400">District EDP Desk</strong>
                </div>
              </div>
            </div>

            {/* 9. WORKSHOP JOURNEY TIMELINE */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <div className="flex justify-between items-center border-b border-[#1F2937] pb-2">
                <h4 className="font-bold text-[14px] text-white">🛣️ Workshop Journey</h4>
                <span className="text-[11px] text-cyan-400 font-semibold">Active Workflow</span>
              </div>
              <div className="space-y-2 text-[12px]">
                {[
                  { step: '1. Registration Completed', status: 'Completed ✓', done: true },
                  { step: '2. Assessment Completed', status: 'Completed ✓', done: true },
                  { step: '3. Workshop Batch Allocation', status: 'In Progress ⏳', active: true },
                  { step: '4. Workshop Confirmation', status: 'Upcoming' },
                  { step: '5. Workshop Attendance', status: 'Upcoming' },
                  { step: '6. Business Guidance', status: 'Upcoming' },
                  { step: '7. Government Scheme Assistance', status: 'Upcoming' },
                  { step: '8. Enterprise Launch Support', status: 'Final Goal 🎯' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      item.done
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : item.active
                        ? 'bg-[#182234] border-[#06B6D4] text-white shadow-lg ring-1 ring-[#06B6D4] animate-pulse'
                        : 'bg-[#182234]/50 border-[#1F2937] text-slate-400'
                    }`}
                  >
                    <span className="font-semibold">{item.step}</span>
                    <span className="font-bold text-[11px]">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 10. PROCESSING TIMELINE CARD (CONFIGURABLE) */}
            <div className="p-3 bg-[#182234] rounded-[16px] border border-[#1F2937] flex items-center justify-between text-[12.5px]">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">Expected Processing Time:</span>
              </div>
              <strong className="text-cyan-400 font-bold">{CONFIGURABLE_ELIGIBILITY_RULES.expectedProcessingTime || '3–7 Working Days'}</strong>
            </div>

            {/* 11. HELP & SUPPORT CARD */}
            <div className="p-4 bg-[#111827] rounded-[20px] border border-[#1F2937] space-y-2.5 text-left">
              <h4 className="font-bold text-[14px] text-white flex items-center space-x-2 border-b border-[#1F2937] pb-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Need Help & Assistance?</span>
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="tel:1800123456"
                  className="p-2.5 bg-[#182234] hover:bg-[#1F2937] rounded-xl border border-[#1F2937] text-center space-y-1 transition-all cursor-pointer block"
                >
                  <Phone className="w-4 h-4 text-emerald-400 mx-auto" />
                  <span className="text-[11px] text-white font-medium block">Call Officer</span>
                </a>
                <a
                  href={`https://wa.me/919822998877?text=MAHA-AGRI%20Registration%20Help%20${submissionResult.candidateId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-[#182234] hover:bg-[#1F2937] rounded-xl border border-[#1F2937] text-center space-y-1 transition-all cursor-pointer block"
                >
                  <MessageSquare className="w-4 h-4 text-teal-400 mx-auto" />
                  <span className="text-[11px] text-white font-medium block">WhatsApp</span>
                </a>
                <a
                  href="mailto:support@mahaagri.gov.in"
                  className="p-2.5 bg-[#182234] hover:bg-[#1F2937] rounded-xl border border-[#1F2937] text-center space-y-1 transition-all cursor-pointer block"
                >
                  <Mail className="w-4 h-4 text-cyan-400 mx-auto" />
                  <span className="text-[11px] text-white font-medium block">Email Support</span>
                </a>
              </div>
            </div>

            {/* 13. DOWNLOAD & SHARE BUTTONS */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const receiptText = `MAHA-AGRI OFFICIAL REGISTRATION RECEIPT\nApplication ID: ${submissionResult.candidateId}\nCandidate: ${formData.fullName}\nDistrict: ${formData.district}, Taluka: ${formData.taluka}\nProgram: EDP - Agri Drone\nDate: ${new Date().toLocaleString()}`;
                    const blob = new Blob([receiptText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MAHA_AGRI_REGISTRATION_RECEIPT_${submissionResult.candidateId}.txt`;
                    a.click();
                    if (triggerToast) triggerToast('✓ Downloaded Registration Receipt');
                  }}
                  className="h-[48px] px-3 bg-[#111827] hover:bg-[#182234] text-white font-medium text-[13px] rounded-xl border border-[#1F2937] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const json = entrepreneurAssessmentService.exportStructuredJson(submissionResult.candidateId, formData);
                    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MAHA_AGRI_ASSESSMENT_SUMMARY_${submissionResult.candidateId}.json`;
                    a.click();
                    if (triggerToast) triggerToast('✓ Downloaded Assessment Summary');
                  }}
                  className="h-[48px] px-3 bg-[#111827] hover:bg-[#182234] text-white font-medium text-[13px] rounded-xl border border-[#1F2937] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Download Summary</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'MAHA-AGRI Registration Receipt', text: `MAHA-AGRI Application ID: ${submissionResult.candidateId}` });
                    } else {
                      navigator.clipboard.writeText(submissionResult.candidateId);
                      if (triggerToast) triggerToast('✓ Application ID Copied to Clipboard');
                    }
                  }}
                  className="h-[48px] px-3 bg-[#111827] hover:bg-[#182234] text-white font-medium text-[13px] rounded-xl border border-[#1F2937] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Share Registration</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTrackModalOpen(true)}
                  className="h-[48px] px-3 bg-[#111827] hover:bg-[#182234] text-white font-medium text-[13px] rounded-xl border border-[#1F2937] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>Track Status</span>
                </button>
              </div>
            </div>

            {/* PRIMARY & SECONDARY ACTION CTAs (56px) */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsTrackModalOpen(true)}
                className="w-full h-[56px] min-h-[56px] bg-[#059669] hover:bg-[#047857] text-white font-bold text-[16px] rounded-[16px] shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Search className="w-5 h-5 text-white" />
                <span>Track Registration Status</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData(INITIAL_ASSESSMENT_FORM_DATA);
                    setCurrentStep(1);
                  }}
                  className="h-[48px] bg-[#182234] hover:bg-[#1F2937] text-slate-200 font-semibold text-[13.5px] rounded-[14px] border border-[#1F2937] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>Register Another</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onBack) onBack();
                    else {
                      setIsSubmitted(false);
                      setCurrentStep(1);
                    }
                  }}
                  className="h-[48px] bg-[#182234] hover:bg-[#1F2937] text-slate-200 font-semibold text-[14px] rounded-[14px] border border-[#1F2937] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>

            {/* 16. SECURITY & GOVERNANCE FOOTER */}
            <div className="p-3 bg-[#0B1220] border-t border-[#1F2937] text-center text-[11px] text-[#94A3B8] space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300">MAHA-AGRI Enterprise Assessment System</span>
              </div>
              <p className="leading-relaxed">
                This is a digitally generated acknowledgement issued by the MAHA-AGRI Enterprise Assessment System. Please preserve your Application ID for future communication.
              </p>
              <p className="text-slate-400 leading-relaxed text-[10.5px]">
                Status updates will be shared through SMS, WhatsApp, Email, and the MAHA-AGRI Candidate Portal.
              </p>
            </div>

            {/* APPLICATION TRACKING MODAL */}
            {isTrackModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-sm bg-[#111827] rounded-[24px] border border-[#1F2937] p-5 space-y-4 text-left shadow-2xl relative">
                  <div className="flex justify-between items-center border-b border-[#1F2937] pb-3">
                    <div>
                      <span className="text-[10px] text-[#0D9488] font-extrabold uppercase tracking-widest block">Live Application Tracker</span>
                      <h3 className="font-bold text-[16px] text-white">Tracking Details</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTrackModalOpen(false)}
                      className="p-1.5 bg-[#182234] hover:bg-[#1F2937] rounded-full text-slate-400 hover:text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3 bg-[#182234] rounded-xl border border-[#1F2937] space-y-1">
                    <span className="text-[11px] text-[#94A3B8]">Application ID</span>
                    <strong className="text-emerald-400 font-mono text-[15px] font-bold block">{submissionResult.candidateId}</strong>
                    <span className="text-[11px] text-slate-300 block">Candidate: <strong className="text-white">{formData.fullName}</strong></span>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Workflow Stages</span>
                    {[
                      { title: '1. Registration Completed', date: 'Just now', status: 'Completed ✓', done: true },
                      { title: '2. Assessment Completed', date: 'Completed', status: 'Completed ✓', done: true },
                      { title: '3. Workshop Batch Allocation', date: 'Estimated: 24-48 hrs', status: 'In Progress ⏳', active: true },
                      { title: '4. EDP Training Confirmation', date: 'Upcoming', status: 'Pending' },
                      { title: '5. Enterprise Launch Support', date: 'Upcoming', status: 'Pending' },
                    ].map((st, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          st.done
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : st.active
                            ? 'bg-[#182234] border-[#06B6D4] text-white ring-1 ring-[#06B6D4]'
                            : 'bg-[#182234]/40 border-[#1F2937] text-slate-400'
                        }`}
                      >
                        <div>
                          <strong className="block text-[12px]">{st.title}</strong>
                          <span className="text-[10px] text-slate-400">{st.date}</span>
                        </div>
                        <span className="font-semibold text-[11px]">{st.status}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTrackModalOpen(false)}
                    className="w-full h-[48px] bg-[#059669] text-white font-bold text-[14px] rounded-xl hover:bg-[#047857] transition-all"
                  >
                    Close Tracker
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* MINIMAL ENTERPRISE WIZARD HEADER (UX REQ 1, 3, 5) */}
            {/* ========================================================================= */}
            <div className="px-4 py-3.5 bg-[#0B1220] border-b border-[#1F2937]/40 space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#94A3B8]">
                <span>Step {currentStep} of 8</span>
                {saveStatus === 'saving' ? (
                  <span className="text-cyan-400 flex items-center space-x-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center space-x-1.5 transition-all duration-300">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>✓ Auto Saved</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-10 h-10 rounded-xl bg-[#182234] border border-[#1F2937] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-slate-600 transition-all cursor-pointer shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>

                <div>
                  <h2 className="font-extrabold text-[19px] text-white tracking-tight leading-tight flex items-center space-x-2">
                    <span>{SECTIONS[currentStep - 1].title}</span>
                  </h2>
                  <p className="text-[12px] text-[#94A3B8] font-normal leading-snug mt-0.5">
                    {SECTIONS[currentStep - 1].description}
                  </p>
                </div>
              </div>

              {/* DYNAMIC AMBER VALIDATION WARNING CHIP WITH REVIEW ACTION (ENTERPRISE UX REQ) */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="mt-2.5 px-3.5 h-[40px] min-h-[40px] bg-amber-500/15 border border-amber-500/40 rounded-[12px] flex items-center justify-between text-[#FDE68A] text-[13px] font-semibold animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {Object.keys(validationErrors).length === 1
                        ? '⚠ 1 Required Field Missing'
                        : `⚠ ${Object.keys(validationErrors).length} Required Fields Missing`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const firstErrorKey = Object.keys(validationErrors)[0];
                      if (firstErrorKey) {
                        const el = document.getElementById(`field-${firstErrorKey}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('animate-gentle-pulse-error');
                          setTimeout(() => el.classList.remove('animate-gentle-pulse-error'), 800);
                          const focusable = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
                            ? el
                            : el.querySelector('input, select, textarea, button');
                          if (focusable && typeof (focusable as HTMLElement).focus === 'function') {
                            (focusable as HTMLElement).focus();
                          }
                        }
                      }
                    }}
                    className="text-amber-400 hover:text-white font-bold text-[12px] flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* NUMBERED STEP PROGRESS INDICATOR (1-8 ONLY - UX REQ 1) */}
            {/* ========================================================================= */}
            <div className="px-4 py-3 bg-[#0B1220] border-b border-[#1F2937]/40">
              <div className="flex items-center justify-between max-w-md mx-auto">
                {SECTIONS.map((st, idx) => {
                  const isCurrent = currentStep === st.id;
                  const isCompleted = currentStep > st.id;

                  return (
                    <React.Fragment key={st.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(st.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[13px] transition-all cursor-pointer relative ${
                          isCurrent
                            ? 'bg-gradient-to-tr from-[#059669] to-[#06B6D4] text-white ring-2 ring-[#06B6D4]/60 shadow-md animate-pulse scale-105'
                            : isCompleted
                            ? 'bg-[#059669] text-white font-bold shadow-sm'
                            : 'bg-[#182234] text-[#94A3B8] border border-[#1F2937]'
                        }`}
                        aria-label={`Step ${st.id}`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : st.id}
                      </button>
                      {idx < 7 && (
                        <div className={`flex-1 h-[2px] mx-1 transition-all duration-300 ${isCompleted || isCurrent ? 'bg-[#059669]' : 'bg-[#1F2937]'}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* MAIN QUESTION BANK FORM PANEL WITH DIRECTIONAL STEP SLIDE (MOTION REQ 8) */}
            {/* ========================================================================= */}
            <main key={currentStep} className={`flex-1 p-4 space-y-5 text-base ${slideDirection === 'right' ? 'step-slide-right-enter' : 'step-slide-left-enter'}`}>

              {/* SECTION 1: EDUCATION PROFILE (IA REQ 2 & 7) */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: ACADEMIC QUALIFICATION */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span>Academic Qualification</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Select your highest completed or ongoing educational degree.</p>
                    </div>

                    <div className="space-y-2">
                      <label className={`font-medium text-[14px] block ${validationErrors['qualification'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Highest Educational Qualification <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-qualification"
                          value={formData.education.qualification}
                          onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, qualification: e.target.value as EducationalQualification }), 'qualification')}
                          onBlur={() => { if (!formData.education.qualification) setValidationErrors(prev => ({ ...prev, qualification: 'This field is required.' })); }}
                          aria-invalid={!!validationErrors['qualification']}
                          aria-describedby={validationErrors['qualification'] ? 'error-qualification' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['qualification'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          {[
                            '10th Pass',
                            '12th Pass',
                            'ITI',
                            'Diploma',
                            'Graduate',
                            'Post Graduate',
                            'Agri Polytechnic',
                            'Diploma in Agriculture',
                            'B.Sc Agriculture',
                            'M.Sc Agriculture',
                            'B.Tech Agriculture',
                            'B.Tech Agricultural Engineering',
                            'Veterinary',
                            'Other',
                          ].map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['qualification'] && (
                        <p id="error-qualification" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>This field is required.</span>
                        </p>
                      )}
                    </div>

                    {/* QUALIFICATION OTHER TEXT INPUT */}
                    {formData.education.qualification === 'Other' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className={`font-medium text-[13px] block ${validationErrors['qualificationOther'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Please Specify Qualification <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="field-qualificationOther"
                          type="text"
                          value={formData.education.qualificationOther || ''}
                          onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, qualificationOther: e.target.value }))}
                          placeholder="e.g. Diploma in Electronics"
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none ${
                            validationErrors['qualificationOther'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        />
                        {validationErrors['qualificationOther'] && (
                          <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['qualificationOther']}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <label className="font-medium text-[14px] text-slate-200 block">Are you currently a Student?</label>
                      <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateFormSection('education', (prev) => ({ ...prev, isStudent: true }))}
                          className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                            formData.education.isStudent ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormSection('education', (prev) => ({ ...prev, isStudent: false }))}
                          className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                            !formData.education.isStudent ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {formData.education.isStudent && (
                      <div className="p-3.5 bg-[#182234] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          <label className={`font-medium text-[13px] block ${validationErrors['collegeName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            College / University Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-collegeName"
                            type="text"
                            value={formData.education.studentDetails?.collegeName || ''}
                            onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, studentDetails: { ...prev.studentDetails, collegeName: e.target.value } as any }), 'collegeName')}
                            onBlur={() => { if (!formData.education.studentDetails?.collegeName?.trim()) setValidationErrors(prev => ({ ...prev, collegeName: 'This field is required.' })); }}
                            aria-invalid={!!validationErrors['collegeName']}
                            aria-describedby={validationErrors['collegeName'] ? 'error-collegeName' : undefined}
                            placeholder="e.g. MPKV Rahuri"
                            className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none input-focus-smooth ${
                              validationErrors['collegeName'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {validationErrors['collegeName'] && (
                            <p id="error-collegeName" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>This field is required.</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className={`font-medium text-[13px] block ${validationErrors['courseName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Course Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-courseName"
                            type="text"
                            value={formData.education.studentDetails?.courseName || ''}
                            onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, studentDetails: { ...prev.studentDetails, courseName: e.target.value } as any }), 'courseName')}
                            onBlur={() => { if (!formData.education.studentDetails?.courseName?.trim()) setValidationErrors(prev => ({ ...prev, courseName: 'This field is required.' })); }}
                            aria-invalid={!!validationErrors['courseName']}
                            aria-describedby={validationErrors['courseName'] ? 'error-courseName' : undefined}
                            placeholder="e.g. B.Sc Agriculture"
                            className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none input-focus-smooth ${
                              validationErrors['courseName'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {validationErrors['courseName'] && (
                            <p id="error-courseName" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>This field is required.</span>
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <label className={`font-medium text-[13px] block ${validationErrors['currentYear'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              Current Year <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id="field-currentYear"
                              type="text"
                              value={formData.education.studentDetails?.currentYear || ''}
                              onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, studentDetails: { ...prev.studentDetails, currentYear: e.target.value } as any }), 'currentYear')}
                              onBlur={() => { if (!formData.education.studentDetails?.currentYear?.trim()) setValidationErrors(prev => ({ ...prev, currentYear: 'This field is required.' })); }}
                              aria-invalid={!!validationErrors['currentYear']}
                              aria-describedby={validationErrors['currentYear'] ? 'error-currentYear' : undefined}
                              placeholder="e.g. 4th Year"
                              className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none input-focus-smooth ${
                                validationErrors['currentYear'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                              }`}
                            />
                            {validationErrors['currentYear'] && (
                              <p id="error-currentYear" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>This field is required.</span>
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-medium text-[13px] text-slate-300 block">Expected Passing Year</label>
                            <select
                              value={formData.education.studentDetails?.expectedPassingYear || '2025'}
                              onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, studentDetails: { ...prev.studentDetails, expectedPassingYear: e.target.value } as any }))}
                              className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                            >
                              {['2024', '2025', '2026', '2027', '2028', '2029'].map((yr) => (
                                <option key={yr} value={yr}>{yr}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: STATUTORY AGRICULTURE LICENSES */}
                  {AGRI_LICENSE_QUALIFICATIONS.includes(formData.education.qualification) && (
                    <div
                      id="field-agriLicenses"
                      className={`p-4 bg-[#111827] rounded-[18px] border space-y-3.5 shadow-md animate-in fade-in duration-200 transition-all ${
                        validationErrors['agriLicenses'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937]'
                      }`}
                    >
                      <div className="border-b border-[#1F2937] pb-2">
                        <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span>Statutory Agriculture Licenses</span>
                        </h3>
                        <p className="text-[11.5px] text-[#94A3B8]">Select all statutory inputs/dealership licenses currently possessed.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-2">
                          {[
                            'Fertilizer License',
                            'Seed License',
                            'Pesticide License',
                            'Bio-Fertilizer License',
                            'Plant Protection License',
                            'None',
                          ].map((lic) => {
                            const currentLicList = formData.education.agriLicenses || [];
                            const isSelected = currentLicList.includes(lic as AgriLicenseType);

                            return (
                              <div
                                key={lic}
                                onClick={() => {
                                  updateFormSection('education', (prev) => {
                                    const list = prev.agriLicenses || [];
                                    if (lic === 'None') {
                                      return { ...prev, agriLicenses: ['None'] };
                                    }
                                    const filtered = list.filter((l) => l !== 'None');
                                    return {
                                      ...prev,
                                      agriLicenses: isSelected ? filtered.filter((l) => l !== lic) : [...filtered, lic as AgriLicenseType],
                                    };
                                  }, 'agriLicenses');
                                }}
                                className={`p-3.5 rounded-[14px] border flex items-center space-x-3 cursor-pointer transition-all ${
                                  isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className="text-[15px] font-medium text-white">{lic}</span>
                              </div>
                            );
                          })}
                        </div>
                        {validationErrors['agriLicenses'] && (
                          <p id="error-agriLicenses" role="alert" className="text-[12px] text-rose-400 font-medium mt-2 flex items-center space-x-1.5 animate-in fade-in duration-180">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{validationErrors['agriLicenses']}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: CURRENT OCCUPATION (IA REQ 2 & 7) */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: PRIMARY OCCUPATION */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-teal-400" />
                        <span>Primary Occupation & Work Profile</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Select your current work status or primary livelihood activity.</p>
                    </div>

                    <div className="space-y-2">
                      <label className={`font-medium text-[15px] block ${validationErrors['occupation'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        What are you currently doing? <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-occupation"
                          value={formData.occupation.occupation}
                          onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, occupation: e.target.value as OccupationType }), 'occupation')}
                          onBlur={() => { if (!formData.occupation.occupation) setValidationErrors(prev => ({ ...prev, occupation: 'Please select your Current Occupation.' })); }}
                          aria-invalid={!!validationErrors['occupation']}
                          aria-describedby={validationErrors['occupation'] ? 'error-occupation' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['occupation'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          {[
                            'Student',
                            'Farmer',
                            'Private Employee',
                            'Government Employee',
                            'Business Owner',
                            'Self Employed',
                            'Agriculture Professional',
                            'Housewife',
                            'Unemployed',
                            'Other',
                          ]
                            .filter((occ) => formData.education.isStudent || occ !== 'Student')
                            .map((occ) => (
                              <option key={occ} value={occ}>{occ}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['occupation'] && (
                        <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['occupation']}</p>
                      )}
                    </div>

                    {/* AGRICULTURE PROFESSIONAL SUB-CATEGORY */}
                    {formData.occupation.occupation === 'Agriculture Professional' && (
                      <div className="p-3.5 bg-[#182234] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                        <label className="font-medium text-[13px] text-slate-300 block">
                          Agriculture Professional Specialty
                        </label>
                        <select
                          id="field-agriProfCategory"
                          value={formData.occupation.agriProfCategory || 'Agriculture Consultant'}
                          onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, agriProfCategory: e.target.value as any }))}
                          className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                        >
                          {['Agriculture Officer', 'Agriculture Consultant', 'Input Dealer', 'Agriculture Sales', 'Extension Worker', 'Research', 'NGO', 'Other'].map((sp) => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* IF EMPLOYEE */}
                    {(formData.occupation.occupation === 'Private Employee' || formData.occupation.occupation === 'Government Employee') && (
                      <div className="p-3.5 bg-[#182234] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Organization Name</label>
                          <input
                            type="text"
                            value={formData.occupation.employeeDetails?.organizationName || ''}
                            onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, employeeDetails: { ...prev.employeeDetails, organizationName: e.target.value } as any }))}
                            placeholder="e.g. Agri Tech Pvt Ltd"
                            className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Total Job Experience</label>
                          <select
                            value={formData.occupation.employeeDetails?.totalJobExperience || '1–3 Years'}
                            onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, employeeDetails: { ...prev.employeeDetails, totalJobExperience: e.target.value as ExperienceRange } as any }))}
                            className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="Less than 1 Year">Less than 1 Year</option>
                            <option value="1–3 Years">1–3 Years</option>
                            <option value="3–5 Years">3–5 Years</option>
                            <option value="5–10 Years">5–10 Years</option>
                            <option value="More than 10 Years">More than 10 Years</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: WORK & PAST BUSINESS EXPERIENCE */}
                  {formData.occupation.occupation !== 'Business Owner' && formData.occupation.occupation !== 'Self Employed' && (
                    <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                      <div className="border-b border-[#1F2937] pb-2">
                        <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-cyan-400" />
                          <span>Business Experience & History</span>
                        </h3>
                        <p className="text-[11.5px] text-[#94A3B8]">Details about past or current enterprise operations.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="font-medium text-[14px] text-slate-200 block">
                          Have you ever operated any business in the past or are you currently operating one?
                        </label>
                        <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => updateFormSection('occupation', (prev) => ({ ...prev, operatedPastBusiness: true }))}
                            className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                              formData.occupation.operatedPastBusiness ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFormSection('occupation', (prev) => ({ ...prev, operatedPastBusiness: false }))}
                            className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                              !formData.occupation.operatedPastBusiness ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            No
                          </button>
                        </div>

                        {formData.occupation.operatedPastBusiness && (
                          <div className="p-3.5 bg-[#182234] rounded-[16px] border border-[#1F2937] space-y-3 mt-2 animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                              <label className="font-medium text-[13px] text-slate-300 block">Business Type</label>
                              <input
                                type="text"
                                value={formData.occupation.pastBusinessDetails?.businessType || ''}
                                onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, pastBusinessDetails: { ...prev.pastBusinessDetails, businessType: e.target.value } as any }))}
                                placeholder="e.g. Retail Shop / Trading"
                                className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-medium text-[13px] text-slate-300 block">Years Operated</label>
                              <div className="relative">
                                <select
                                  value={formData.occupation.pastBusinessDetails?.yearsOperated || '1 Year'}
                                  onChange={(e) => updateFormSection('occupation', (prev) => ({ ...prev, pastBusinessDetails: { ...prev.pastBusinessDetails, yearsOperated: e.target.value } as any }))}
                                  className="w-full h-[50px] bg-[#111827] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none appearance-none cursor-pointer"
                                >
                                  {[
                                    'Less than 1 Year',
                                    '1 Year',
                                    '2 Years',
                                    '3 Years',
                                    '4 Years',
                                    '5 Years',
                                    '6–10 Years',
                                    '10+ Years',
                                  ].map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-3.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2 LIVE SUMMARY CARD (REQ 7) */}
                  <div className="p-3.5 bg-[#182234] rounded-[16px] border border-[#059669]/40 flex items-center justify-between text-[12px] text-slate-200 shadow-md">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>
                        <strong>Occupation Summary:</strong> {formData.occupation.occupation} | Past Business: <strong className="text-teal-300">{formData.occupation.operatedPastBusiness ? `Yes (${formData.occupation.pastBusinessDetails?.yearsOperated || 'Operated'})` : 'No'}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: AGRICULTURE PROFILE */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <label className="font-medium text-[15px] text-slate-200 block">Are you involved in Agriculture?</label>
                    <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, isInvolvedInAgri: true }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriculture.isInvolvedInAgri ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, isInvolvedInAgri: false }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriculture.isInvolvedInAgri ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.agriculture.isInvolvedInAgri && (
                    <div className="space-y-4 p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <label className="font-medium text-[13px] text-slate-300 block">Farming Activities Involved In</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'Own Farming',
                            'Family Farming',
                            'Organic Farming',
                            'Horticulture',
                            'Dairy',
                            'Goat Farming',
                            'Poultry',
                            'Fisheries',
                            'Nursery',
                            'Custom Hiring',
                            'Other',
                          ].map((act) => {
                            const actList = formData.agriculture.agriActivities || [];
                            const isSelected = actList.includes(act as AgriActivity);

                            return (
                              <div
                                key={act}
                                onClick={() => {
                                  updateFormSection('agriculture', (prev) => {
                                    const list = prev.agriActivities || [];
                                    return {
                                      ...prev,
                                      agriActivities: isSelected ? list.filter((a) => a !== act) : [...list, act as AgriActivity],
                                    };
                                  });
                                }}
                                className={`p-3 rounded-[12px] border flex items-center space-x-2.5 cursor-pointer transition-all ${
                                  isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-[13px] font-medium text-white">{act}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Farming Experience</label>
                        <select
                          value={formData.agriculture.farmingExperience || '3–5 Years'}
                          onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, farmingExperience: e.target.value as ExperienceRange }))}
                          className="w-full h-[50px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none cursor-pointer"
                        >
                          <option value="Less than 1 Year">Less than 1 Year</option>
                          <option value="1–3 Years">1–3 Years</option>
                          <option value="3–5 Years">3–5 Years</option>
                          <option value="5–10 Years">5–10 Years</option>
                          <option value="More than 10 Years">More than 10 Years</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="font-medium text-[15px] text-slate-200 block">Do you own Agricultural Land?</label>
                    <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, ownsAgriLand: true }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriculture.ownsAgriLand ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, ownsAgriLand: false }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriculture.ownsAgriLand ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.agriculture.ownsAgriLand && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      {/* LAND UNIT DROPDOWN */}
                      <div className="flex justify-between items-center pb-1">
                        <label className="font-medium text-[13px] text-slate-300">Land Measurement Unit</label>
                        <select
                          value={formData.agriculture.landUnit || 'Acre'}
                          onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, landUnit: e.target.value as 'Acre' | 'Hectare' }))}
                          className="h-[36px] bg-[#182234] border border-[#1F2937] rounded-[8px] px-3 text-emerald-400 font-semibold text-[13px] focus:outline-none"
                        >
                          <option value="Acre">Acres</option>
                          <option value="Hectare">Hectares</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Total Land</label>
                          <input
                            type="text"
                            value={formData.agriculture.landDetails?.totalLandArea || '4.50'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, landDetails: { ...prev.landDetails, totalLandArea: e.target.value } as any }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Irrigated</label>
                          <input
                            type="text"
                            value={formData.agriculture.landDetails?.irrigatedArea || '3.20'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, landDetails: { ...prev.landDetails, irrigatedArea: e.target.value } as any }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Rainfed</label>
                          <input
                            type="text"
                            value={formData.agriculture.landDetails?.rainfedArea || '1.30'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, landDetails: { ...prev.landDetails, rainfedArea: e.target.value } as any }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* LAND AREA REAL-TIME VALIDATION WARNING */}
                      {(() => {
                        const total = parseFloat(formData.agriculture.landDetails?.totalLandArea || '0');
                        const irr = parseFloat(formData.agriculture.landDetails?.irrigatedArea || '0');
                        const rain = parseFloat(formData.agriculture.landDetails?.rainfedArea || '0');

                        if (irr > total || (irr + rain) > total) {
                          return (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-300 text-[12px] font-medium flex items-center space-x-2">
                              <span>⚠️ Validation Alert: Irrigated + Rainfed area cannot exceed Total Land Area ({total} {formData.agriculture.landUnit || 'Acres'}).</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* FARMER ID & DON'T KNOW CHECKBOX */}
                  <div className="space-y-2">
                    <label className="font-medium text-[15px] text-slate-200 block">Do you have Farmer Registration / Farmer ID?</label>
                    <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, hasFarmerId: true }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriculture.hasFarmerId ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, hasFarmerId: false }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriculture.hasFarmerId ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.agriculture.hasFarmerId && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Farmer Registration Number</label>
                        <input
                          type="text"
                          disabled={formData.agriculture.dontKnowFarmerId}
                          value={formData.agriculture.farmerIdNumber || ''}
                          onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, farmerIdNumber: e.target.value }))}
                          placeholder={formData.agriculture.dontKnowFarmerId ? "ID Not Known" : "e.g. MH-WDA-2024-98765"}
                          className={`w-full h-[50px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white font-mono text-[15px] focus:border-[#059669] focus:outline-none ${formData.agriculture.dontKnowFarmerId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.agriculture.dontKnowFarmerId || false}
                          onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, dontKnowFarmerId: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-700 bg-[#0B1220] text-[#059669]"
                        />
                        <span className="text-[13px] text-slate-300">I don't know my Farmer ID</span>
                      </label>

                      {/* WOULD YOU LIKE MAHA AGRI TO HELP RETRIEVE FARMER ID */}
                      {formData.agriculture.dontKnowFarmerId && (
                        <div className="pt-2 border-t border-[#1F2937] space-y-1.5 animate-in fade-in duration-200">
                          <label className="font-medium text-[13px] text-slate-200 block">Would you like MAHA-AGRI to help you retrieve your Farmer ID?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[46px]">
                            <button
                              type="button"
                              onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, helpRetrieveFarmerId: true }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                formData.agriculture.helpRetrieveFarmerId ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, helpRetrieveFarmerId: false }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                !formData.agriculture.helpRetrieveFarmerId ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CONSOLIDATED GOVERNMENT SCHEMES */}
                  <div className="space-y-2">
                    <label className="font-medium text-[15px] text-slate-200 block">Have you received any Government Agriculture Scheme Benefits?</label>
                    <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, hasReceivedGovtBenefits: true }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriculture.hasReceivedGovtBenefits ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, hasReceivedGovtBenefits: false }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriculture.hasReceivedGovtBenefits ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.agriculture.hasReceivedGovtBenefits && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      <label className="font-medium text-[13px] text-slate-300 block">Select Schemes Received</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['PM-KISAN', 'MAHA-DBT', 'Solar Pump', 'Drip Irrigation', 'Farm Mechanization', 'Soil Health Card', 'Other'].map((sch) => {
                          const schList = formData.agriculture.govtSchemesReceived || [];
                          const isSelected = schList.includes(sch as GovtSchemeType);

                          return (
                            <div
                              key={sch}
                              onClick={() => {
                                updateFormSection('agriculture', (prev) => {
                                  const list = prev.govtSchemesReceived || [];
                                  return {
                                    ...prev,
                                    govtSchemesReceived: isSelected ? list.filter((s) => s !== sch) : [...list, sch as GovtSchemeType],
                                  };
                                });
                              }}
                              className={`p-3 rounded-[12px] border flex items-center space-x-2 cursor-pointer transition-all ${
                                isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-[13px] font-medium text-white">{sch}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* PM-KISAN STATUS */}
                      {formData.agriculture.govtSchemesReceived?.includes('PM-KISAN') && (
                        <div className="space-y-1.5 pt-2 border-t border-[#1F2937] animate-in fade-in duration-200">
                          <label className="font-medium text-[13px] text-slate-200 block">PM-KISAN Beneficiary Status</label>
                          <select
                            value={formData.agriculture.pmKisanStatus || 'Active'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, pmKisanStatus: e.target.value as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="Active">Active Beneficiary</option>
                            <option value="Stopped">Stopped / Paused</option>
                            <option value="Applied">Applied & Pending</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      )}

                      {/* GOVT SCHEME OTHER SPECIFY */}
                      {formData.agriculture.govtSchemesReceived?.includes('Other' as any) && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                          <label className="font-medium text-[12px] text-slate-300 block">Please Specify Other Scheme <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={formData.agriculture.govtSchemeOther || ''}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, govtSchemeOther: e.target.value }))}
                            placeholder="e.g. PoCRA Sub-Project"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXPANDED FPO DETAILS */}
                  <div className="space-y-2">
                    <label className="font-medium text-[15px] text-slate-200 block">Are you a member of any FPO (Farmer Producer Organization)?</label>
                    <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, isFpoMember: true }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriculture.isFpoMember ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriculture', (prev) => ({ ...prev, isFpoMember: false }))}
                        className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriculture.isFpoMember ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.agriculture.isFpoMember && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">FPO Name</label>
                        <input
                          type="text"
                          value={formData.agriculture.fpoName || ''}
                          onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoName: e.target.value }))}
                          placeholder="e.g. Wardha Farmer Producer Co. Ltd."
                          className="w-full h-[50px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[15px] focus:border-[#059669] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Position in FPO</label>
                          <select
                            value={formData.agriculture.fpoPosition || 'Farmer Member'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoPosition: e.target.value as any }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            {['Chairman', 'Vice Chairman', 'Director', 'Board Member', 'CEO', 'Accountant', 'Coordinator', 'Farmer Member', 'Promoter', 'Other'].map((pos) => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Year Joined FPO</label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoYearJoined || '2022'}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoYearJoined: e.target.value }))}
                            placeholder="e.g. 2022"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      </div>

                      {formData.agriculture.fpoPosition === 'Other' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="font-medium text-[12px] text-slate-300 block">Specify Position <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoPositionOther || ''}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoPositionOther: e.target.value }))}
                            placeholder="e.g. Technical Advisor"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Farmers Connected</label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoFarmersConnected || ''}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoFarmersConnected: e.target.value }))}
                            placeholder="e.g. 150"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Village Coverage</label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoVillageCoverage || ''}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoVillageCoverage: e.target.value }))}
                            placeholder="e.g. 5 Villages"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white font-mono text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: AGRI DRONE AWARENESS */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: KNOWS AGRI DRONES */}
                  <div
                    id="field-knowsAgriDrones"
                    className={`p-4 bg-[#111827] rounded-[16px] border space-y-2.5 transition-all ${
                      validationErrors['knowsAgriDrones']
                        ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/10'
                        : 'border-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className={`font-medium text-[15px] block ${validationErrors['knowsAgriDrones'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Do you know about Agricultural Drones? <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <div className="p-1 bg-[#182234] rounded-[14px] border border-[#1F2937] grid grid-cols-3 gap-1">
                      {['Yes', 'Somewhat', 'No'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, knowsAgriDrones: opt as DroneKnowledgeLevel }), 'knowsAgriDrones')}
                          className={`h-[46px] min-h-[46px] rounded-[10px] text-[14px] font-semibold transition-all cursor-pointer ${
                            formData.agriDrone.knowsAgriDrones === opt ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {validationErrors['knowsAgriDrones'] && (
                      <p id="error-knowsAgriDrones" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{validationErrors['knowsAgriDrones']}</span>
                      </p>
                    )}
                  </div>

                  {formData.agriDrone.knowsAgriDrones !== 'No' && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-2 animate-in fade-in duration-200">
                      <label className="font-medium text-[13px] text-slate-300 block">Where did you learn about Agri Drones?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'MAHA-AGRI',
                          'Agriculture Department',
                          'YouTube',
                          'Facebook',
                          'WhatsApp',
                          'Newspaper',
                          'TV',
                          'Friend / Relative',
                          'Farmer',
                          'Exhibition',
                          'Other',
                        ].map((src) => {
                          const srcList = formData.agriDrone.learnSources || [];
                          const isSelected = srcList.includes(src as DroneLearnSource);

                          return (
                            <div
                              key={src}
                              onClick={() => {
                                updateFormSection('agriDrone', (prev) => {
                                  const list = prev.learnSources || [];
                                  return {
                                    ...prev,
                                    learnSources: isSelected ? list.filter((s) => s !== src) : [...list, src as DroneLearnSource],
                                  };
                                });
                              }}
                              className={`p-3 rounded-[12px] border flex items-center space-x-2 cursor-pointer transition-all ${
                                isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-[13px] font-medium text-white">{src}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CARD 2: ATTENDED TRAINING */}
                  <div
                    id="field-attendedTraining"
                    className={`p-4 bg-[#111827] rounded-[16px] border space-y-2.5 transition-all ${
                      validationErrors['attendedTraining']
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-500/10 animate-shake-error animate-pulse-error'
                        : 'border-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-[15px] text-slate-200 block">Have you attended any Agri Drone Training?</label>
                      {validationErrors['attendedTraining'] && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-full shadow-sm animate-pulse">Required</span>
                      )}
                    </div>
                    <div className="p-1 bg-[#182234] rounded-[14px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, attendedTraining: true }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriDrone.attendedTraining ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, attendedTraining: false }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriDrone.attendedTraining ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {validationErrors['attendedTraining'] && (
                      <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in flex items-center space-x-1">
                        <span>⚠️</span> <span>{validationErrors['attendedTraining']}</span>
                      </p>
                    )}
                  </div>

                  {formData.agriDrone.attendedTraining && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className={`font-medium text-[13px] block ${validationErrors['instituteName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Training Institute Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="field-instituteName"
                          type="text"
                          value={formData.agriDrone.trainingDetails?.instituteName || ''}
                          onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, instituteName: e.target.value } as any }))}
                          placeholder="e.g. MPKV Rahuri / DGCA RPTO"
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none ${
                            validationErrors['instituteName'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        />
                        {validationErrors['instituteName'] && (
                          <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['instituteName']}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className={`font-medium text-[13px] block ${validationErrors['trainingYear'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Training Year <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-trainingYear"
                            type="text"
                            value={formData.agriDrone.trainingDetails?.trainingYear || '2024'}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, trainingYear: e.target.value } as any }))}
                            className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white text-[15px] focus:outline-none ${
                              validationErrors['trainingYear'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {validationErrors['trainingYear'] && (
                            <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['trainingYear']}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">DGCA Approved?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[50px]">
                            <button
                              type="button"
                              onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, isDgcaApproved: true } as any }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                formData.agriDrone.trainingDetails?.isDgcaApproved ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, isDgcaApproved: false } as any }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                !formData.agriDrone.trainingDetails?.isDgcaApproved ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD 3: HAS FLOWN DRONE */}
                  <div
                    id="field-hasFlownDrone"
                    className={`p-4 bg-[#111827] rounded-[16px] border space-y-2.5 transition-all ${
                      validationErrors['hasFlownDrone']
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-500/10 animate-shake-error animate-pulse-error'
                        : 'border-[#1F2937]'
                    }`}
                  >
                    <label className="font-medium text-[15px] text-slate-200 block">Have you ever flown a Drone?</label>
                    <div className="p-1 bg-[#182234] rounded-[14px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, hasFlownDrone: true }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriDrone.hasFlownDrone ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, hasFlownDrone: false }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriDrone.hasFlownDrone ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* CARD 4: CURRENTLY OWNS DRONE */}
                  <div
                    id="field-currentlyOwnsDrone"
                    className={`p-4 bg-[#111827] rounded-[16px] border space-y-2.5 transition-all ${
                      validationErrors['currentlyOwnsDrone']
                        ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-500/10 animate-shake-error animate-pulse-error'
                        : 'border-[#1F2937]'
                    }`}
                  >
                    <label className="font-medium text-[15px] text-slate-200 block">Do you currently own an Agricultural Drone?</label>
                    <div className="p-1 bg-[#182234] rounded-[14px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, currentlyOwnsDrone: true }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          formData.agriDrone.currentlyOwnsDrone ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, currentlyOwnsDrone: false }))}
                        className={`h-[46px] min-h-[46px] rounded-[10px] text-[15px] font-semibold transition-all cursor-pointer ${
                          !formData.agriDrone.currentlyOwnsDrone ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* IF CURRENTLY OWNS DRONE */}
                  {formData.agriDrone.currentlyOwnsDrone && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className={`font-medium text-[13px] block ${validationErrors['droneManufacturer'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Manufacturer <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="field-droneManufacturer"
                            value={formData.agriDrone.ownedDroneDetails?.manufacturer || 'IoTechWorld'}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, manufacturer: e.target.value as any } }))}
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-2 text-white text-[13px] focus:outline-none cursor-pointer ${
                              validationErrors['droneManufacturer'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          >
                            {[
                              'Garuda Aerospace',
                              'IoTechWorld',
                              'Marut Drones',
                              'General Aeronautics',
                              'Asteria Aerospace',
                              'Paras Aerospace',
                              'John Deere',
                              'DJI Agriculture',
                              'Other',
                            ].map((mf) => (
                              <option key={mf} value={mf}>{mf}</option>
                            ))}
                          </select>
                          {validationErrors['droneManufacturer'] && (
                            <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['droneManufacturer']}</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Drone Model</label>
                          <input
                            id="field-droneModel"
                            type="text"
                            value={formData.agriDrone.ownedDroneDetails?.model || ''}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, model: e.target.value } }))}
                            placeholder="e.g. AGRIBOT MX"
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                          />
                        </div>
                      </div>

                      {formData.agriDrone.ownedDroneDetails?.manufacturer === 'Other' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className={`font-medium text-[12px] block ${validationErrors['manufacturerOther'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Please Specify Manufacturer <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-manufacturerOther"
                            type="text"
                            value={formData.agriDrone.ownedDroneDetails?.manufacturerOther || ''}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, manufacturerOther: e.target.value } }))}
                            placeholder="Specify Manufacturer Name"
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3.5 text-white text-[14px] focus:outline-none ${
                              validationErrors['manufacturerOther'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {validationErrors['manufacturerOther'] && (
                            <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['manufacturerOther']}</p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Capacity</label>
                          <select
                            id="field-droneCapacity"
                            value={formData.agriDrone.ownedDroneDetails?.capacity || '10 Liters'}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, capacity: e.target.value } }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-2 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                          >
                            <option value="10 Liters">10 Liters</option>
                            <option value="16 Liters">16 Liters</option>
                            <option value="25 Liters">25 Liters</option>
                            <option value="30 Liters">30 Liters</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Category</label>
                          <select
                            id="field-droneCategory"
                            value={formData.agriDrone.ownedDroneDetails?.category || 'Small'}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, category: e.target.value } }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-2 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                          >
                            <option value="Micro">Micro (&lt;2kg)</option>
                            <option value="Small">Small (2-25kg)</option>
                            <option value="Medium">Medium (25-150kg)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Drone Condition</label>
                          <select
                            value={formData.agriDrone.ownedDroneDetails?.condition || 'Operational'}
                            onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, condition: e.target.value as any } }))}
                            className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-2 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                          >
                            <option value="Operational">Operational</option>
                            <option value="Repair Required">Repair Required</option>
                            <option value="Not Working">Not Working</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IF DOES NOT OWN DRONE -> PURCHASE INTENTION */}
                  {!formData.agriDrone.currentlyOwnsDrone && (
                    <div id="field-wantsToPurchaseDrone" className="space-y-3 p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="font-medium text-[14px] text-slate-200 block">Would you like to purchase an Agricultural Drone through MAHA-AGRI?</label>
                        <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[48px]">
                          <button
                            type="button"
                            onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, wantsToPurchaseDrone: true }))}
                            className={`rounded-[8px] text-[14px] font-semibold transition-all ${
                              formData.agriDrone.wantsToPurchaseDrone ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, wantsToPurchaseDrone: false }))}
                            className={`rounded-[8px] text-[14px] font-semibold transition-all ${
                              !formData.agriDrone.wantsToPurchaseDrone ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {formData.agriDrone.wantsToPurchaseDrone && (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1.5">
                            <label className={`font-medium text-[13px] block ${validationErrors['purchaseMethod'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              Preferred Purchase Method <span className="text-rose-500">*</span>
                            </label>
                            <select
                              id="field-purchaseMethod"
                              value={formData.agriDrone.purchaseMethod || 'MAHA-DBT Subsidy'}
                              onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, purchaseMethod: e.target.value as any }))}
                              className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3 text-white text-[14px] focus:outline-none cursor-pointer ${
                                validationErrors['purchaseMethod'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                              }`}
                            >
                              {['Full Cash Payment', 'Bank Loan', 'MAHA-DBT Subsidy', 'CMEGP Scheme', 'PMEGP Scheme', 'Mixed Finance', 'Not Decided'].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            {validationErrors['purchaseMethod'] && (
                              <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['purchaseMethod']}</p>
                            )}
                          </div>

                          {/* LOAN APPLIED STATUS */}
                          {formData.agriDrone.purchaseMethod === 'Bank Loan' && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <label className="font-medium text-[13px] text-slate-200 block">Have you already applied for a Bank Loan?</label>
                              <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[46px]">
                                <button
                                  type="button"
                                  onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, loanAppliedStatus: 'Yes' }))}
                                  className={`rounded-[8px] text-[13px] font-semibold transition-all ${formData.agriDrone.loanAppliedStatus === 'Yes' ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'}`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFormSection('agriDrone', (prev) => ({ ...prev, loanAppliedStatus: 'No' }))}
                                  className={`rounded-[8px] text-[13px] font-semibold transition-all ${formData.agriDrone.loanAppliedStatus === 'No' ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'}`}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          )}

                          {/* SCHEME APPLIED STATUS */}
                          {(formData.agriDrone.purchaseMethod === 'CMEGP Scheme' || formData.agriDrone.purchaseMethod === 'PMEGP Scheme') && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <label className="font-medium text-[13px] text-slate-200 block">Govt Subsidy Scheme Application Status</label>
                              <select
                                value={formData.agriDrone.schemeAppliedStatus || 'Planning to Apply'}
                                onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, schemeAppliedStatus: e.target.value as any }))}
                                className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                              >
                                <option value="Already Applied">Already Applied</option>
                                <option value="Planning to Apply">Planning to Apply</option>
                                <option value="No">Not Applied Yet</option>
                              </select>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className={`font-medium text-[13px] block ${validationErrors['purchaseTimeline'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              Expected Timeline <span className="text-rose-500">*</span>
                            </label>
                            <select
                              id="field-purchaseTimeline"
                              value={formData.agriDrone.purchaseTimeline || 'Within 3 Months'}
                              onChange={(e) => updateFormSection('agriDrone', (prev) => ({ ...prev, purchaseTimeline: e.target.value as any }))}
                              className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3 text-white text-[14px] focus:outline-none cursor-pointer ${
                                validationErrors['purchaseTimeline'] ? 'border-rose-500 ring-2 ring-rose-500/40' : 'border-[#1F2937] focus:border-[#059669]'
                              }`}
                            >
                              {['Immediately', 'Within 3 Months', 'Within 6 Months', 'Within 1 Year'].map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            {validationErrors['purchaseTimeline'] && (
                              <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['purchaseTimeline']}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: PROGRAM SELECTION & CONDITIONAL MODULES (IA REQ 2, 5, 6, 7) */}
              {currentStep === 5 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* CARD 1: CATEGORIZED PROGRAM SELECTION (REQ 5) */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span>Preferred Entrepreneurship Programs</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Select one or more programs you wish to register and receive EDP support for.</p>
                    </div>

                    <div
                      id="field-selectedPrograms"
                      className={`space-y-3 p-3 rounded-[16px] border transition-all ${
                        validationErrors['selectedPrograms'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-transparent'
                      }`}
                    >
                      {[
                        {
                          category: '🚁 Drone Enterprise Programs',
                          items: ['Agri Drone Entrepreneur', 'Drone Service Provider', 'Professional Drone Pilot'],
                        },
                        {
                          category: '🌾 Agri Business & Inputs',
                          items: ['MAHA-AGRI Krushi Seva Kendra', 'Soil Testing Entrepreneur', 'Agri Service Centre', 'Seed Business', 'Fertilizer Business', 'Pesticide Business', 'Bio-input Business', 'Nursery', 'Custom Hiring Centre', 'Farm Machinery Rental'],
                        },
                        {
                          category: '💻 Agri Technology & Allied Sector',
                          items: ['Agri Consultancy', 'Food Processing', 'Dairy', 'Goat Farming', 'Poultry', 'Fisheries', 'Organic Farming', 'FPO Entrepreneur', 'Other'],
                        },
                      ].map((catGroup) => (
                        <div key={catGroup.category} className="space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">{catGroup.category}</span>
                          <div className="space-y-1.5">
                            {catGroup.items.map((prog) => {
                              const selectedList = formData.entrepreneurInterest.selectedPrograms || [];
                              const isSelected = selectedList.includes(prog as EntrepreneurProgram);

                              return (
                                <div
                                  key={prog}
                                  onClick={() => {
                                    updateFormSection('entrepreneurInterest', (prev) => {
                                      const list = prev.selectedPrograms || [];
                                      return {
                                        ...prev,
                                        selectedPrograms: isSelected ? list.filter((p) => p !== prog) : [...list, prog as EntrepreneurProgram],
                                      };
                                    }, 'selectedPrograms');
                                  }}
                                  className={`p-3 rounded-[12px] border flex items-center space-x-3 cursor-pointer transition-all ${
                                    isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="text-[14px] font-medium text-white">{prog}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {validationErrors['selectedPrograms'] && (
                        <p id="error-selectedPrograms" role="alert" className="text-[12px] text-rose-400 font-medium mt-2 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['selectedPrograms']}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CONDITIONAL MODULE A: AGRI DRONE ENTERPRISE (REQ 6) */}
                  {formData.entrepreneurInterest.selectedPrograms.includes('Agri Drone Entrepreneur') && (
                    <div className="p-4 bg-[#111827] rounded-[18px] border-2 border-[#059669] space-y-4 shadow-xl animate-in fade-in duration-200">
                      <div className="border-b border-[#059669]/40 pb-2.5">
                        <h4 className="font-extrabold text-[15px] text-[#059669] uppercase tracking-wider flex items-center space-x-2">
                          <span>✈️ Dynamic Module A: Agri Drone Enterprise</span>
                        </h4>
                        <p className="text-[12px] text-slate-300 leading-snug mt-1">
                          Configure your Agri Drone business profile and EDP workshop preferences.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Drone Ownership Preference</label>
                        <select
                          value={formData.entrepreneurInterest.moduleADrone?.ownershipInterest || 'Own'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, ownershipInterest: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        >
                          <option value="Own">Own Purchase</option>
                          <option value="Lease">Leasing / Rental</option>
                          <option value="Franchise">Franchise Model</option>
                        </select>
                      </div>

                      {/* ========================================================================= */}
                      {/* V5.1 SUBSECTION: ENTREPRENEUR DEVELOPMENT PROGRAM (EDP) – AGRI DRONE */}
                      {/* ========================================================================= */}
                      <div className="pt-3 border-t border-[#1F2937] space-y-3.5">
                        <div>
                          <h5 className="font-bold text-[14px] text-emerald-400 flex items-center space-x-1.5">
                            <span>🎓 Entrepreneur Development Program (EDP) – Agri Drone</span>
                          </h5>
                          <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                            2-Day Practical Entrepreneurship & Business Development Workshop.
                          </p>
                        </div>

                        {/* 1. ATTENDANCE AT TALUKA / DISTRICT HQ */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Will you be able to attend the 2-Day EDP Workshop at the Taluka or District Headquarters?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                            {['Yes', 'No', 'Maybe'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, canAttendWorkshop: opt as any } } as any }))}
                                className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                                  formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* IF CANNOT ATTEND: REASON */}
                        {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop === 'No' && (
                          <div className="space-y-1.5 animate-in fade-in duration-200">
                            <label className="font-medium text-[13px] text-slate-300 block">Reason for Not Attending</label>
                            <select
                              value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReason || 'Distance'}
                              onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, cannotAttendReason: e.target.value as any } } as any }))}
                              className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                            >
                              {['Distance', 'Health', 'Job', 'Education', 'Family', 'Other'].map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReason === 'Other' && (
                              <input
                                type="text"
                                value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReasonOther || ''}
                                onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, cannotAttendReasonOther: e.target.value } } as any }))}
                                placeholder="Please Specify Reason"
                                className="w-full h-[44px] mt-1 bg-[#182234] border border-[#1F2937] rounded-[10px] px-3.5 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                              />
                            )}
                          </div>
                        )}

                        {/* 2. BUSINESS INTENTION AFTER WORKSHOP (MANDATORY) */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">
                            After successfully completing the EDP – Agri Drone Workshop, what would you like to do? <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan || 'Start My Own Agri Drone Spray Business'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, postTrainingPlan: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            {[
                              'Start My Own Agri Drone Spray Business',
                              'Work with MAHA-AGRI Drone Service Team',
                              'Become a Professional Drone Pilot',
                              'Start a Drone Rental Business',
                              'Become a Drone Service Partner',
                              'Work in a Drone Company',
                              'Still Exploring Opportunities',
                              'Other',
                            ].map((plan) => (
                              <option key={plan} value={plan}>{plan}</option>
                            ))}
                          </select>
                          {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan === 'Other' && (
                            <input
                              type="text"
                              value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlanOther || ''}
                              onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, postTrainingPlanOther: e.target.value } } as any }))}
                              placeholder="Please Specify Your Plan"
                              className="w-full h-[44px] mt-1 bg-[#182234] border border-[#1F2937] rounded-[10px] px-3.5 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                            />
                          )}
                        </div>

                        {/* 3. FUTURE CAREER INTEREST (MULTI SELECT) */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">After completing the EDP Workshop, which field would you like to work in?</label>
                          <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {[
                              'Agri Drone Spray Service Business',
                              'Professional Drone Pilot',
                              'Drone Repair & Maintenance',
                              'Drone Sales & Marketing',
                              'Drone Training & Demonstration',
                              'Drone Survey & GIS Mapping',
                              'Crop Health Monitoring',
                              'Seed Broadcasting',
                              'Fertilizer Broadcasting',
                              'Pesticide Spraying',
                              'Precision Agriculture',
                              'Government Drone Projects',
                              'Disaster Management Drone Operations',
                              'Agriculture Consultancy',
                              'Custom Hiring Centre',
                              'Drone Franchise',
                              'Other',
                            ].map((cp) => {
                              const cpList = formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.careerPathsInterest || ['Agri Drone Spray Service Business'];
                              const isSelected = cpList.includes(cp);

                              return (
                                <div
                                  key={cp}
                                  onClick={() => {
                                    updateFormSection('entrepreneurInterest', (prev) => {
                                      const currentEdp = prev.moduleADrone?.edpWorkshop || {};
                                      const currentList = currentEdp.careerPathsInterest || [];
                                      const newList = isSelected ? currentList.filter((c) => c !== cp) : [...currentList, cp];
                                      return {
                                        ...prev,
                                        moduleADrone: {
                                          ...prev.moduleADrone,
                                          edpWorkshop: { ...currentEdp, careerPathsInterest: newList },
                                        } as any,
                                      };
                                    });
                                  }}
                                  className={`p-2.5 rounded-[10px] border flex items-center space-x-2 cursor-pointer transition-all ${
                                    isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="text-[12px] font-medium text-white">{cp}</span>
                                </div>
                              );
                            })}
                          </div>
                          {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.careerPathsInterest?.includes('Other') && (
                            <input
                              type="text"
                              value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.careerPathsInterestOther || ''}
                              onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, careerPathsInterestOther: e.target.value } } as any }))}
                              placeholder="Please Specify Other Field"
                              className="w-full h-[44px] mt-1 bg-[#182234] border border-[#1F2937] rounded-[10px] px-3.5 text-white text-[13px] focus:border-[#059669] focus:outline-none"
                            />
                          )}
                        </div>

                        {/* 4. PREFERRED BUSINESS MODEL */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Preferred Business Model</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredBusinessModel || 'Individual Entrepreneur'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, preferredBusinessModel: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="Individual Entrepreneur">Individual Entrepreneur</option>
                            <option value="Partnership">Partnership</option>
                            <option value="FPO Based">FPO Based</option>
                            <option value="Franchise Model">Franchise Model</option>
                            <option value="Cooperative Model">Cooperative Model</option>
                          </select>
                        </div>

                        {/* 5. MAHA-AGRI BUSINESS PARTNERSHIP */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">After completing the EDP Workshop, would you like to work with MAHA-AGRI for Agri Drone Spray Services?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                            {['Yes', 'No', 'Maybe'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, wantsMahaAgriAssistance: opt as any } } as any }))}
                                className={`h-[42px] rounded-[8px] text-[12px] font-semibold transition-all ${
                                  formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsMahaAgriAssistance === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>

                          {/* IF YES: PREFERRED WORKING MODEL */}
                          {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsMahaAgriAssistance === 'Yes' && (
                            <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                              <label className="font-medium text-[13px] text-slate-300 block">Preferred Working Model</label>
                              <select
                                value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.mahaAgriWorkingModel || 'District Partner'}
                                onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, mahaAgriWorkingModel: e.target.value as any } } as any }))}
                                className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                              >
                                {['District Partner', 'Taluka Partner', 'Village Service Provider', 'Project Based', 'Seasonal Contract', 'Full Time', 'Part Time'].map((wm) => (
                                  <option key={wm} value={wm}>{wm}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* IF NO: INDEPENDENT BUSINESS & LAUNCH TIMELINE */}
                          {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsMahaAgriAssistance === 'No' && (
                            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                              <label className="font-medium text-[13px] text-slate-300 block">Would you like to establish your own independent Agri Drone Business?</label>
                              <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[42px]">
                                <button
                                  type="button"
                                  onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, wantsIndependentBusiness: 'Yes' } } as any }))}
                                  className={`rounded-[8px] text-[12px] font-semibold transition-all ${
                                    formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsIndependentBusiness === 'Yes' ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                                  }`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, wantsIndependentBusiness: 'No' } } as any }))}
                                  className={`rounded-[8px] text-[12px] font-semibold transition-all ${
                                    formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsIndependentBusiness === 'No' ? 'bg-[#059669] text-white' : 'text-[#94A3B8]'
                                  }`}
                                >
                                  No
                                </button>
                              </div>

                              {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsIndependentBusiness === 'Yes' && (
                                <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                                  <label className="font-medium text-[13px] text-slate-300 block">Expected Business Launch Timeline</label>
                                  <select
                                    value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.independentBusinessTimeline || 'Immediately'}
                                    onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, independentBusinessTimeline: e.target.value as any } } as any }))}
                                    className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                                  >
                                    {['Immediately', 'Within 3 Months', 'Within 6 Months', 'Within 1 Year', 'After Training Completion'].map((tl) => (
                                      <option key={tl} value={tl}>{tl}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 6. SERVICE COVERAGE */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">How many villages are you planning to serve initially?</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.villagesTargetToServe || '1–5'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, villagesTargetToServe: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="1–5">1–5</option>
                            <option value="6–10">6–10</option>
                            <option value="11–25">11–25</option>
                            <option value="26–50">26–50</option>
                            <option value="More than 50">More than 50</option>
                          </select>
                        </div>

                        {/* 7. MANDATORY AGREEMENT BEFORE ONBOARDING */}
                        <div className="space-y-1.5 p-3 bg-[#182234]/80 rounded-[14px] border border-emerald-500/30">
                          <label className="font-medium text-[13px] text-emerald-300 block">
                            Do you agree to complete the mandatory EDP training before project onboarding? <span className="text-rose-500">*</span>
                          </label>
                          <div className="p-1 bg-[#111827] rounded-[10px] border border-[#1F2937] grid grid-cols-2 gap-1 h-[44px]">
                            <button
                              type="button"
                              onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, agreeToCompleteEdpBeforeOnboarding: 'Yes' } } as any }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                (formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.agreeToCompleteEdpBeforeOnboarding || 'Yes') === 'Yes' ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8]'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, agreeToCompleteEdpBeforeOnboarding: 'No' } } as any }))}
                              className={`rounded-[8px] text-[13px] font-semibold transition-all ${
                                formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.agreeToCompleteEdpBeforeOnboarding === 'No' ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8]'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Purchase Funding Mode</label>
                        <select
                          value={formData.entrepreneurInterest.moduleADrone?.purchasePreference || 'Subsidized Scheme'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, purchasePreference: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        >
                          <option value="Subsidized Scheme">Subsidized Scheme</option>
                          <option value="Bank Loan">Bank Loan</option>
                          <option value="Outright Purchase">Outright Purchase</option>
                          <option value="Leasing">Leasing</option>
                        </select>
                      </div>

                      {/* ========================================================================= */}
                      {/* V5 SUBSECTION: ENTREPRENEUR DEVELOPMENT PROGRAM (EDP) – AGRI DRONE */}
                      {/* ========================================================================= */}
                      <div className="pt-3 border-t border-[#1F2937] space-y-3.5">
                        <div>
                          <h5 className="font-bold text-[14px] text-emerald-400 flex items-center space-x-1.5">
                            <span>🎓 Entrepreneur Development Program (EDP) – Agri Drone</span>
                          </h5>
                          <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                            This is a 2-Day Practical Entrepreneurship & Business Development Workshop.
                          </p>
                        </div>

                        {/* Q1: ATTEND WORKSHOP */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q1. Will you be able to attend the 2-Day EDP Workshop?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                            {['Yes', 'No', 'Maybe'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, canAttendWorkshop: opt as any } } as any }))}
                                className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                                  formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Q2: PREFERRED LOCATION */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q2. Preferred Training Location</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredTrainingLocation || 'Taluka HQ'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, preferredTrainingLocation: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="Taluka HQ">Taluka HQ</option>
                            <option value="District HQ">District HQ</option>
                            <option value="Online (Theory Only)">Online (Theory Only)</option>
                          </select>
                        </div>

                        {/* Q3: POST TRAINING PLAN */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q3. After completing the EDP Workshop, what do you plan to do?</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan || 'Start My Own Drone Spray Business'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, postTrainingPlan: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            {[
                              'Work with MAHA-AGRI Drone Service Team',
                              'Start My Own Drone Spray Business',
                              'Work as a Drone Pilot',
                              'Work as a Drone Technician',
                              'Join Existing Drone Company',
                              'Still Exploring Opportunities',
                            ].map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>

                        {/* Q4: CAREER PATHS INTEREST (MULTI SELECT) */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q4. Which career path interests you most?</label>
                          <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {[
                              'Agri Drone Spray Service',
                              'Drone Pilot',
                              'Drone Repair & Maintenance',
                              'Drone Sales',
                              'Drone Training',
                              'Drone Survey & Mapping',
                              'Precision Agriculture',
                              'Government Projects',
                              'Crop Health Monitoring',
                              'Seed Broadcasting',
                              'Fertilizer Broadcasting',
                              'Agriculture Consultancy',
                            ].map((cp) => {
                              const cpList = formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.careerPathsInterest || ['Agri Drone Spray Service'];
                              const isSelected = cpList.includes(cp);

                              return (
                                <div
                                  key={cp}
                                  onClick={() => {
                                    updateFormSection('entrepreneurInterest', (prev) => {
                                      const currentEdp = prev.moduleADrone?.edpWorkshop || {};
                                      const currentList = currentEdp.careerPathsInterest || [];
                                      const newList = isSelected ? currentList.filter((c) => c !== cp) : [...currentList, cp];
                                      return {
                                        ...prev,
                                        moduleADrone: {
                                          ...prev.moduleADrone,
                                          edpWorkshop: { ...currentEdp, careerPathsInterest: newList },
                                        } as any,
                                      };
                                    });
                                  }}
                                  className={`p-2.5 rounded-[10px] border flex items-center space-x-2 cursor-pointer transition-all ${
                                    isSelected ? 'bg-[#182234] border-[#059669] text-white' : 'bg-[#182234]/60 border-[#1F2937] text-[#94A3B8]'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="text-[12px] font-medium text-white">{cp}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Q5: VILLAGES TO SERVE */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q5. How many villages would you like to serve?</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.villagesTargetToServe || '5–10'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, villagesTargetToServe: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="1–5">1–5 Villages</option>
                            <option value="5–10">5–10 Villages</option>
                            <option value="10–25">10–25 Villages</option>
                            <option value="25+">25+ Villages</option>
                          </select>
                        </div>

                        {/* Q6: MAHA AGRI ASSISTANCE */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q6. Would you like MAHA-AGRI to assist you in starting your business?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                            {['Yes', 'No', 'Need More Information'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, wantsMahaAgriAssistance: opt as any } } as any }))}
                                className={`h-[42px] rounded-[8px] text-[12px] font-semibold transition-all ${
                                  formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsMahaAgriAssistance === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Q7: PREFERRED BUSINESS MODEL */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q7. Preferred Business Model</label>
                          <select
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredBusinessModel || 'Individual Entrepreneur'}
                            onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, preferredBusinessModel: e.target.value as any } } as any }))}
                            className="w-full h-[46px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                          >
                            <option value="Individual Entrepreneur">Individual Entrepreneur</option>
                            <option value="Partnership">Partnership</option>
                            <option value="FPO Based">FPO Based</option>
                            <option value="Franchise Model">Franchise Model</option>
                            <option value="Cooperative Model">Cooperative Model</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL MODULE B: KRUSHI SEVA KENDRA */}
                  {formData.entrepreneurInterest.selectedPrograms.includes('MAHA-AGRI Krushi Seva Kendra') && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#059669]/60 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-sm text-[#059669] uppercase tracking-wider">
                        🏬 Dynamic Module B: Krushi Seva Kendra
                      </h4>
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Shop Location Availability</label>
                        <select
                          value={formData.entrepreneurInterest.moduleBKrushiSeva?.shopAvailability || 'Owned'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleBKrushiSeva: { ...prev.moduleBKrushiSeva, shopAvailability: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        >
                          <option value="Owned">Owned Shop Space</option>
                          <option value="Rented">Rented Shop Space</option>
                          <option value="Will Acquire">Will Acquire Space</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL MODULE C: SOIL TESTING */}
                  {formData.entrepreneurInterest.selectedPrograms.includes('Soil Testing Entrepreneur') && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#059669]/60 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-sm text-[#059669] uppercase tracking-wider">
                        🧪 Dynamic Module C: Soil Testing Lab
                      </h4>
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Soil Testing Knowledge Level</label>
                        <select
                          value={formData.entrepreneurInterest.moduleCSoilTesting?.soilTestingKnowledge || 'Intermediate'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleCSoilTesting: { ...prev.moduleCSoilTesting, soilTestingKnowledge: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        >
                          <option value="Basic">Basic Understanding</option>
                          <option value="Intermediate">Intermediate Lab Skills</option>
                          <option value="Advanced">Advanced Chemist Level</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL MODULE D: INPUT BUSINESS */}
                  {(formData.entrepreneurInterest.selectedPrograms.includes('Seed Business') ||
                    formData.entrepreneurInterest.selectedPrograms.includes('Fertilizer Business') ||
                    formData.entrepreneurInterest.selectedPrograms.includes('Pesticide Business')) && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#059669]/60 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-sm text-[#059669] uppercase tracking-wider">
                        🌱 Dynamic Module D: Agri Input Dealer Business
                      </h4>
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Dealer / Sales Experience</label>
                        <select
                          value={formData.entrepreneurInterest.moduleDInputBusiness?.dealerExperienceYears || '1–3 Years'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleDInputBusiness: { ...prev.moduleDInputBusiness, dealerExperienceYears: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        >
                          <option value="Less than 1 Year">Less than 1 Year</option>
                          <option value="1–3 Years">1–3 Years</option>
                          <option value="3–5 Years">3–5 Years</option>
                          <option value="5–10 Years">5–10 Years</option>
                          <option value="More than 10 Years">More than 10 Years</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL MODULE E: FPO */}
                  {formData.entrepreneurInterest.selectedPrograms.includes('FPO Entrepreneur') && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#059669]/60 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-sm text-[#059669] uppercase tracking-wider">
                        👥 Dynamic Module E: FPO Enterprise Cluster
                      </h4>
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Connected Farmers Count</label>
                        <input
                          type="text"
                          value={formData.entrepreneurInterest.moduleEFpo?.farmersConnectedCount || '250 Farmers'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleEFpo: { ...prev.moduleEFpo, farmersConnectedCount: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL MODULE F: AGRI CONSULTANCY */}
                  {(formData.entrepreneurInterest.selectedPrograms.includes('Agri Consultancy') ||
                    formData.entrepreneurInterest.selectedPrograms.includes('Agri Service Centre')) && (
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#059669]/60 space-y-3 animate-in fade-in duration-200">
                      <h4 className="font-bold text-sm text-[#059669] uppercase tracking-wider">
                        💼 Dynamic Module F: Agri Consultancy & Advisory
                      </h4>
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Farmers Served / Client Base</label>
                        <input
                          type="text"
                          value={formData.entrepreneurInterest.moduleFAgriConsultancy?.farmersServedCount || '150+ Clients'}
                          onChange={(e) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleFAgriConsultancy: { ...prev.moduleFAgriConsultancy, farmersServedCount: e.target.value } as any }))}
                          className="w-full h-[48px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: INVESTMENT CAPACITY (IA REQ 2, 7, 13) */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: INVESTMENT & CAPITAL */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <span>Investment Capacity & Own Capital</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Capital range and primary source of initial investment.</p>
                    </div>

                    <div className="space-y-2">
                      <label className={`font-medium text-[15px] block ${validationErrors['investmentCapacity'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Initial Investment Capacity <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-investmentCapacity"
                          value={formData.investment.capacity}
                          onChange={(e) => updateFormSection('investment', (prev) => ({ ...prev, capacity: e.target.value as InvestmentCapacityRange }), 'investmentCapacity')}
                          onBlur={() => { if (!formData.investment.capacity) setValidationErrors(prev => ({ ...prev, investmentCapacity: 'Please select Initial Investment Capacity.' })); }}
                          aria-invalid={!!validationErrors['investmentCapacity']}
                          aria-describedby={validationErrors['investmentCapacity'] ? 'error-investmentCapacity' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['investmentCapacity'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          {[
                            'Up to ₹50,000',
                            'Up to ₹1 Lakh',
                            'Up to ₹2 Lakh',
                            'Up to ₹5 Lakh',
                            '₹5–10 Lakh',
                            'Above ₹10 Lakh',
                          ].map((cap) => (
                            <option key={cap} value={cap}>{cap}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['investmentCapacity'] && (
                        <p id="error-investmentCapacity" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['investmentCapacity']}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className={`font-medium text-[15px] block ${validationErrors['investmentSource'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Primary Investment Source <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-investmentSource"
                          value={formData.investment.source}
                          onChange={(e) => updateFormSection('investment', (prev) => ({ ...prev, source: e.target.value as InvestmentSourceType }), 'investmentSource')}
                          onBlur={() => { if (!formData.investment.source) setValidationErrors(prev => ({ ...prev, investmentSource: 'Please select Investment Source.' })); }}
                          aria-invalid={!!validationErrors['investmentSource']}
                          aria-describedby={validationErrors['investmentSource'] ? 'error-investmentSource' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['investmentSource'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          {['Self', 'Family', 'Loan', 'Investor', 'Other'].map((src) => (
                            <option key={src} value={src}>{src}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['investmentSource'] && (
                        <p id="error-investmentSource" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['investmentSource']}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: FUNDING PREFERENCE PRIORITIES (REQ 13) */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Funding Preference Priorities</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Select your Priority 1 and Priority 2 financing modes.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Priority 1 Funding Preference</label>
                        <select
                          value={formData.investment.fundingPriority1 || 'Government Subsidy Scheme (CMEGP / MAHA-DBT)'}
                          onChange={(e) => updateFormSection('investment', (prev) => ({ ...prev, fundingPriority1: e.target.value }))}
                          className="w-full h-[50px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                        >
                          <option value="Government Subsidy Scheme (CMEGP / MAHA-DBT)">Government Subsidy Scheme (CMEGP / MAHA-DBT)</option>
                          <option value="Bank Loan (Mudra / PMEGP)">Bank Loan (Mudra / PMEGP)</option>
                          <option value="Self Investment / Family Savings">Self Investment / Family Savings</option>
                          <option value="Private Investor / Angel Funding">Private Investor / Angel Funding</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Priority 2 Funding Preference</label>
                        <select
                          value={formData.investment.fundingPriority2 || 'Bank Loan (Mudra / PMEGP)'}
                          onChange={(e) => updateFormSection('investment', (prev) => ({ ...prev, fundingPriority2: e.target.value }))}
                          className="w-full h-[50px] bg-[#182234] border border-[#1F2937] rounded-[12px] px-3.5 text-white text-[14px] focus:border-[#059669] focus:outline-none cursor-pointer"
                        >
                          <option value="Bank Loan (Mudra / PMEGP)">Bank Loan (Mudra / PMEGP)</option>
                          <option value="Government Subsidy Scheme (CMEGP / MAHA-DBT)">Government Subsidy Scheme (CMEGP / MAHA-DBT)</option>
                          <option value="Self Investment / Family Savings">Self Investment / Family Savings</option>
                          <option value="Private Investor / Angel Funding">Private Investor / Angel Funding</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: LOAN & FINANCIAL PROFILE (IA REQ 2, 7, 11) */}
              {currentStep === 7 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: BANK ACCOUNT DETAILS (REQ 11) */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>Primary Bank Account Details</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Banking profile for direct benefit transfer and subsidy disbursement.</p>
                    </div>

                    <div className="space-y-2">
                      <label className={`font-medium text-[14px] block ${validationErrors['bankAccountType'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Select Primary Bank Account Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-bankAccountType"
                          value={formData.financial.bankAccountType || 'Savings Account'}
                          onChange={(e) => updateFormSection('financial', (prev) => ({ ...prev, bankAccountType: e.target.value as any }), 'bankAccountType')}
                          onBlur={() => { if (!formData.financial.bankAccountType) setValidationErrors(prev => ({ ...prev, bankAccountType: 'Please select Primary Bank Account Type.' })); }}
                          aria-invalid={!!validationErrors['bankAccountType']}
                          aria-describedby={validationErrors['bankAccountType'] ? 'error-bankAccountType' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['bankAccountType'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          <option value="Savings Account">Savings Account</option>
                          <option value="Current Account">Current Account</option>
                          <option value="Overdraft (OD) Account">Overdraft (OD) Account</option>
                          <option value="Business Account">Business Account</option>
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['bankAccountType'] && (
                        <p id="error-bankAccountType" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['bankAccountType']}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: EXISTING LOANS & CREDIT PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>Existing Loans & Credit Profile</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Financial liability and approximate credit rating.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium text-[14px] text-slate-200 block">Do you have any running loans?</label>
                      <div className="p-1 bg-[#182234] rounded-[16px] border border-[#1F2937] grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => updateFormSection('financial', (prev) => ({ ...prev, hasRunningLoan: true }))}
                          className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                            formData.financial.hasRunningLoan ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormSection('financial', (prev) => ({ ...prev, hasRunningLoan: false }))}
                          className={`h-[48px] min-h-[48px] rounded-[12px] text-[15px] font-semibold transition-all cursor-pointer ${
                            !formData.financial.hasRunningLoan ? 'bg-[#059669] text-white shadow-md' : 'text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {formData.financial.hasRunningLoan && (
                      <div
                        id="field-runningLoanTypes"
                        className={`p-3.5 bg-[#182234] rounded-[16px] border space-y-2 animate-in fade-in duration-200 transition-all ${
                          validationErrors['runningLoanTypes'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937]'
                        }`}
                      >
                        <label className={`font-medium text-[13px] block ${validationErrors['runningLoanTypes'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Running Loan Types <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Home', 'Vehicle', 'Education', 'Agriculture', 'Business', 'Gold', 'Personal', 'Other'].map((ln) => {
                            const lnList = formData.financial.runningLoanTypes || [];
                            const isSelected = lnList.includes(ln as LoanType);

                            return (
                              <div
                                key={ln}
                                onClick={() => {
                                  updateFormSection('financial', (prev) => {
                                    const list = prev.runningLoanTypes || [];
                                    return {
                                      ...prev,
                                      runningLoanTypes: isSelected ? list.filter((l) => l !== ln) : [...list, ln as LoanType],
                                    };
                                  }, 'runningLoanTypes');
                                }}
                                className={`p-3 rounded-[12px] border flex items-center space-x-2 cursor-pointer transition-all ${
                                  isSelected ? 'bg-[#111827] border-[#059669] text-white' : 'bg-[#111827]/60 border-[#1F2937] text-[#94A3B8]'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-[#059669] border-[#059669] text-white' : 'border-slate-600'}`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-[13px] font-medium text-white">{ln} Loan</span>
                              </div>
                            );
                          })}
                        </div>
                        {validationErrors['runningLoanTypes'] && (
                          <p id="error-runningLoanTypes" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{validationErrors['runningLoanTypes']}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className={`font-medium text-[14px] block ${validationErrors['cibilScore'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Approximate CIBIL Score <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="field-cibilScore"
                          value={formData.financial.cibilScore}
                          onChange={(e) => updateFormSection('financial', (prev) => ({ ...prev, cibilScore: e.target.value as CibilScoreRange }), 'cibilScore')}
                          onBlur={() => { if (!formData.financial.cibilScore) setValidationErrors(prev => ({ ...prev, cibilScore: 'Please select approximate CIBIL Score.' })); }}
                          aria-invalid={!!validationErrors['cibilScore']}
                          aria-describedby={validationErrors['cibilScore'] ? 'error-cibilScore' : undefined}
                          className={`w-full h-[56px] min-h-[56px] bg-[#182234] border rounded-[16px] px-4 text-white font-medium text-[16px] focus:outline-none appearance-none cursor-pointer input-focus-smooth ${
                            validationErrors['cibilScore'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        >
                          {[
                            'Below 600',
                            '600–650',
                            '650–700',
                            '700–750',
                            'Above 750',
                            'Don\'t Know',
                          ].map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 text-[#94A3B8] absolute right-4 top-4.5 pointer-events-none" />
                      </div>
                      {validationErrors['cibilScore'] && (
                        <p id="error-cibilScore" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['cibilScore']}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 8: INFRASTRUCTURE & COMPLETE ENTERPRISE REVIEW SCREEN */}
              {currentStep === 8 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* CARD 1: EDUCATION PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-[14px] text-white">1. Education Profile</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-emerald-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Qualification</span><strong className="text-white font-medium">{formData.education.qualification === 'Other' ? formData.education.qualificationOther : formData.education.qualification}</strong></div>
                      <div><span className="text-[#94A3B8] block">Currently Student?</span><strong className="text-white font-medium">{formData.education.isStudent ? `Yes (${formData.education.studentDetails?.courseName || 'Student'} - Year ${formData.education.studentDetails?.currentYear || ''}, Passing ${formData.education.studentDetails?.expectedPassingYear || ''})` : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Agri Licenses</span><strong className="text-emerald-400 font-medium">{formData.education.agriLicenses?.join(', ') || 'None'}</strong></div>
                    </div>
                  </div>

                  {/* CARD 2: CURRENT OCCUPATION */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-teal-400" />
                        <h4 className="font-bold text-[14px] text-white">2. Current Occupation</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-teal-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Occupation</span><strong className="text-white font-medium">{formData.occupation.occupation === 'Other' ? formData.occupation.occupationOther : formData.occupation.occupation}</strong></div>
                      {formData.occupation.occupation === 'Agriculture Professional' && (
                        <div><span className="text-[#94A3B8] block">Agri Specialty</span><strong className="text-emerald-400 font-medium">{formData.occupation.agriProfCategory === 'Other' ? formData.occupation.agriProfCategoryOther : formData.occupation.agriProfCategory}</strong></div>
                      )}
                      {formData.occupation.occupation === 'Business Owner' && (
                        <>
                          <div><span className="text-[#94A3B8] block">Business Name</span><strong className="text-white font-medium">{formData.occupation.businessDetails?.businessName}</strong></div>
                          <div><span className="text-[#94A3B8] block">Business Category</span><strong className="text-white font-medium">{formData.occupation.businessDetails?.category === 'Other' ? formData.occupation.businessDetails?.categoryOther : formData.occupation.businessDetails?.category}</strong></div>
                          {formData.occupation.businessDetails?.category === 'Agriculture' && (
                            <div><span className="text-[#94A3B8] block">Agri Sub-Category</span><strong className="text-emerald-400 font-medium">{formData.occupation.businessDetails?.agriSubCategory === 'Other' ? formData.occupation.businessDetails?.agriSubCategoryOther : formData.occupation.businessDetails?.agriSubCategory}</strong></div>
                          )}
                          <div><span className="text-[#94A3B8] block">Business Experience</span><strong className="text-white font-medium">{formData.occupation.businessDetails?.experience}</strong></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CARD 3: AGRICULTURE PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Sprout className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-[14px] text-white">3. Agriculture Profile</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-emerald-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Involved in Agri?</span><strong className="text-white font-medium">{formData.agriculture.isInvolvedInAgri ? `Yes (${formData.agriculture.agriActivities?.join(', ')})` : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Total Agricultural Land</span><strong className="text-white font-medium">{formData.agriculture.ownsAgriLand ? `${formData.agriculture.landDetails?.totalLandArea || 0} ${formData.agriculture.landUnit || 'Acre'}` : 'No Land'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Farmer Registration</span><strong className="text-white font-medium">{formData.agriculture.hasFarmerId ? (formData.agriculture.dontKnowFarmerId ? 'ID Not Known (Retrieval Assistance Requested)' : formData.agriculture.farmerIdNumber || 'Registered') : 'Not Registered'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Govt Schemes</span><strong className="text-emerald-400 font-medium">{formData.agriculture.hasReceivedGovtBenefits ? `${formData.agriculture.govtSchemesReceived?.join(', ')}${formData.agriculture.pmKisanStatus ? ` (PM-KISAN: ${formData.agriculture.pmKisanStatus})` : ''}` : 'None'}</strong></div>
                      <div><span className="text-[#94A3B8] block">FPO Membership</span><strong className="text-white font-medium">{formData.agriculture.isFpoMember ? `${formData.agriculture.fpoName || 'FPO'} (${formData.agriculture.fpoPosition}, Joined ${formData.agriculture.fpoYearJoined}, ${formData.agriculture.fpoFarmersConnected} Farmers)` : 'No'}</strong></div>
                    </div>
                  </div>

                  {/* CARD 4: AGRI DRONE AWARENESS & OWNERSHIP */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Tractor className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-[14px] text-white">4. Agri Drone Awareness & Ownership</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-cyan-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Knows Drones?</span><strong className="text-white font-medium">{formData.agriDrone.knowsAgriDrones}</strong></div>
                      <div><span className="text-[#94A3B8] block">Attended Training?</span><strong className="text-white font-medium">{formData.agriDrone.attendedTraining ? `${formData.agriDrone.trainingDetails?.instituteName} (${formData.agriDrone.trainingDetails?.trainingYear})` : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Possess RPC Certificate?</span><strong className="text-emerald-400 font-medium">{formData.agriDrone.hasRpc ? 'Yes (Certified Pilot)' : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Currently Owns Drone?</span><strong className="text-white font-medium">{formData.agriDrone.currentlyOwnsDrone ? `${formData.agriDrone.ownedDroneDetails?.manufacturer === 'Other' ? formData.agriDrone.ownedDroneDetails?.manufacturerOther : formData.agriDrone.ownedDroneDetails?.manufacturer} (${formData.agriDrone.ownedDroneDetails?.model || 'Drone'})` : 'No'}</strong></div>
                    </div>
                  </div>

                  {/* CARD 5: ENTREPRENEUR PROGRAMS & EDP RESPONSES */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-[#0D9488]" />
                        <h4 className="font-bold text-[14px] text-white">5. Selected Programs & EDP Responses</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-[#0D9488] hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Selected Programs ({formData.entrepreneurInterest.selectedPrograms.length})</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.entrepreneurInterest.selectedPrograms.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-[#182234] border border-[#1F2937] rounded-md text-[11px] text-emerald-300">{p}</span>
                          ))}
                        </div>
                      </div>
                      {formData.entrepreneurInterest.selectedPrograms.includes('Agri Drone Entrepreneur') && (
                        <div className="pt-2 border-t border-[#1F2937] space-y-1">
                          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">🎓 Agri Drone EDP Workshop Details</span>
                          <div className="grid grid-cols-2 gap-1 text-[12px] text-slate-300">
                            <div>HQ Attendance: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop}</strong></div>
                            <div>Post-Training Plan: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan}</strong></div>
                            <div>Business Model: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredBusinessModel}</strong></div>
                            <div>MAHA-AGRI Partnership: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.wantsMahaAgriAssistance}</strong></div>
                            <div>Village Coverage: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.villagesTargetToServe} Villages</strong></div>
                            <div>EDP Agreement: <strong className="text-emerald-400">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.agreeToCompleteEdpBeforeOnboarding || 'Yes'}</strong></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 6: INVESTMENT CAPACITY */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-[14px] text-white">6. Investment Capacity</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(6)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-emerald-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Investment Limit</span><strong className="text-white font-medium">{formData.investment.capacity}</strong></div>
                      <div><span className="text-[#94A3B8] block">Primary Source</span><strong className="text-white font-medium">{formData.investment.source}</strong></div>
                    </div>
                  </div>

                  {/* CARD 7: LOAN & FINANCIAL PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <h4 className="font-bold text-[14px] text-white">7. Financial Profile</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(7)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-teal-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Running Loans?</span><strong className="text-white font-medium">{formData.financial.hasRunningLoan ? (formData.financial.runningLoanTypes?.join(', ') || 'Yes') : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">CIBIL Score Range</span><strong className="text-emerald-400 font-medium">{formData.financial.cibilScore}</strong></div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* V3 ENTERPRISE DECISION SUPPORT SYSTEM (EDSS) SMART INSIGHTS DASHBOARD */}
                  {/* ========================================================================= */}
                  {(() => {
                    const report = entrepreneurAssessmentService.generateV3IntelligenceReport(formData);
                    return (
                      <div className="p-4 bg-gradient-to-b from-[#111827] to-[#0B1220] rounded-[20px] border border-[#059669]/50 space-y-4 shadow-2xl animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                          <div>
                            <span className="text-[11px] text-[#0D9488] font-bold uppercase tracking-wider block">Decision Support System</span>
                            <h3 className="font-extrabold text-[16px] text-white tracking-tight">AI Entrepreneur Insights</h3>
                          </div>
                          <div className="px-3 py-1 bg-[#059669]/20 border border-[#059669] rounded-full text-emerald-400 font-bold text-xs">
                            Score: {report.readinessScore}/100 ({report.readinessLevel})
                          </div>
                        </div>

                        {/* INTERVIEW RECOMMENDATION BANNER */}
                        <div className="p-3.5 bg-[#182234] border border-[#1F2937] rounded-[14px] space-y-1">
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-400">Action Recommendation:</span>
                            <strong className="text-emerald-400 font-bold">{report.interviewRecommendation.action}</strong>
                          </div>
                          <p className="text-[12px] text-slate-300 leading-relaxed">{report.interviewRecommendation.reasoning}</p>
                        </div>

                        {/* RECOMMENDED SCHEME */}
                        {report.recommendedSchemes[0] && (
                          <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[14px] space-y-1 text-[13px]">
                            <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider block">Recommended Govt Scheme</span>
                            <strong className="text-white block font-semibold">{report.recommendedSchemes[0].schemeName}</strong>
                            <p className="text-slate-300 text-[12px]">{report.recommendedSchemes[0].reason}</p>
                          </div>
                        )}

                        {/* 5-STEP ROADMAP PREVIEW */}
                        <div className="space-y-2 pt-1">
                          <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider block">Personalized 5-Step Roadmap</span>
                          <div className="space-y-1.5">
                            {report.personalizedRoadmap.slice(0, 3).map((st) => (
                              <div key={st.stepNumber} className="p-2.5 bg-[#182234] rounded-lg border border-[#1F2937] flex items-center justify-between text-[12px]">
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-full bg-[#059669] text-white font-bold flex items-center justify-center text-[10px]">{st.stepNumber}</span>
                                  <span className="text-white font-medium">{st.title}</span>
                                </div>
                                <span className="text-[#94A3B8] text-[11px]">{st.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* DECLARATION CHECKBOXES */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declaration.isInformationTrue}
                        onChange={(e) => updateFormSection('declaration', (prev) => ({ ...prev, isInformationTrue: e.target.checked }))}
                        className="rounded border-slate-700 bg-[#0B1220] text-[#059669] w-5 h-5 mt-0.5 cursor-pointer"
                      />
                      <span className="text-[#94A3B8] text-[13px] leading-relaxed">
                        I declare that the information provided is true and correct.
                      </span>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declaration.understandsNoGuarantee}
                        onChange={(e) => updateFormSection('declaration', (prev) => ({ ...prev, understandsNoGuarantee: e.target.checked }))}
                        className="rounded border-slate-700 bg-[#0B1220] text-[#059669] w-5 h-5 mt-0.5 cursor-pointer"
                      />
                      <span className="text-[#94A3B8] text-[13px] leading-relaxed">
                        Submission of this form does not guarantee selection.
                      </span>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declaration.agreesToAssessmentProcess}
                        onChange={(e) => updateFormSection('declaration', (prev) => ({ ...prev, agreesToAssessmentProcess: e.target.checked }))}
                        className="rounded border-slate-700 bg-[#0B1220] text-[#059669] w-5 h-5 mt-0.5 cursor-pointer"
                      />
                      <span className="text-[#94A3B8] text-[13px] leading-relaxed">
                        I agree to participate in assessment, interview, training and verification if shortlisted.
                      </span>
                    </label>

                    {/* MANDATORY VERIFICATION CHECKBOX */}
                    <div className="pt-2 border-t border-[#1F2937]">
                      <label className="flex items-start space-x-3 cursor-pointer p-2.5 bg-[#182234] rounded-xl border border-emerald-500/40">
                        <input
                          type="checkbox"
                          checked={isVerifiedByCandidate}
                          onChange={(e) => setIsVerifiedByCandidate(e.target.checked)}
                          className="rounded border-slate-700 bg-[#0B1220] text-[#059669] w-5 h-5 mt-0.5 cursor-pointer"
                        />
                        <span className="text-emerald-300 font-semibold text-[13px] leading-relaxed">
                          I have verified all information provided in this assessment to be true and accurate.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

            </main>

            {/* ========================================================================= */}
            {/* STICKY BOTTOM ACTION FOOTER (56px TOUCH TARGETS, FILLED EMERALD PRIMARY) */}
            {/* ========================================================================= */}
            <footer className="p-4 bg-[#0B1220] border-t border-[#1F2937]/50 flex items-center justify-between space-x-3 sticky bottom-0 z-40 backdrop-blur-md">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 h-[56px] min-h-[56px] bg-[#111827] hover:bg-[#182234] text-white font-medium text-[15px] rounded-[16px] border border-[#1F2937] hover:border-slate-600 transition-all duration-150 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4 text-[#94A3B8]" />
                  <span>Previous</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNextStep}
                disabled={isSubmitting || (currentStep === 8 && !isVerifiedByCandidate)}
                className={`group flex-1 h-[56px] min-h-[56px] font-semibold text-[16px] rounded-[16px] shadow-lg btn-micro-hover shimmer-sweep transition-all duration-150 cursor-pointer flex items-center justify-center space-x-2 ${
                  currentStep === 8 && !isVerifiedByCandidate
                    ? 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
                    : 'bg-[#059669] hover:bg-[#047857] text-white'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>{submitStageText}</span>
                  </div>
                ) : (
                  <>
                    <span>{currentStep === 8 ? 'Submit Assessment' : 'Next'}</span>
                    <span className="group-hover:translate-x-1.5 transition-transform duration-150 text-[18px]">→</span>
                  </>
                )}
              </button>
            </footer>
          </>
        )}

      </div>
    </div>
  );
};
