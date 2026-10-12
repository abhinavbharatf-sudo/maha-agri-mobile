/**
 * MAHA-AGRIDOOT — Entrepreneur Assessment Wizard (Final Question Bank Implementation)
 * Full 9-Section Question Bank + Conditional Modules A-F cleanly rendered within frozen Enterprise UI.
 * Deep Charcoal #0B1220, 56px Inputs & Buttons, 16px Radius, Filled Emerald Accent.
 */

import React, { useState, useEffect, useMemo } from 'react';
import WizardSelect from '../../agridoot/components/WizardSelect';
import { MAHARASHTRA_DISTRICTS, getTalukasForDistrict } from '../../../data/maharashtraGeography';
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
  Home,
  Bell,
  Menu as MenuIcon,
  CheckSquare,
  Square,
  AlertCircle,
  Building,
  CheckCircle2,
  Sparkles,
  Award,
  CreditCard,
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
} from '../services/entrepreneurAssessmentService';
import {
  edpPaymentService,
  EDP_STANDARD_TRAINING_FEE_INR,
  PENDING_PAYMENT_ORDER_KEY,
} from '../services/edpPaymentService';

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

  // STEP NAVIGATION STATE (1 to 9)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [isEditingFromReview, setIsEditingFromReview] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStageText, setSubmitStageText] = useState<string>('Submit Assessment');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validationHeaderChip, setValidationHeaderChip] = useState<string | null>(null);
  const [isVerifiedByCandidate, setIsVerifiedByCandidate] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{ candidateId: string; scores: InternalAdminAssessmentScores } | null>(null);
  
  // EDP TRAINING FEE PAYMENT STATE (STEP 9)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'PAID' | 'FAILED'>('IDLE');
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleNavigateHome = () => {
    setIsSubmitted(false);
    setCurrentStep(1);

    if (onSubmitSuccess && submissionResult) {
      onSubmitSuccess(submissionResult.candidateId, submissionResult.scores);
    } else if (onBack) {
      onBack();
    }
  };

  // Check for Cashfree Return URL / pending order status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('order_id') || urlParams.get('orderId');
    const candidateIdFromUrl = urlParams.get('candidate_id') || urlParams.get('candidateId');

    let pendingOrder: any = null;
    try {
      const rawPending = sessionStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
      if (rawPending) {
        pendingOrder = JSON.parse(rawPending);
      }
    } catch (e) {
      // ignore
    }

    const targetOrderId = orderIdFromUrl || pendingOrder?.orderId;
    const targetCandidateId = candidateIdFromUrl || pendingOrder?.candidateId || submissionResult?.candidateId;

    if (targetOrderId && paymentStatus !== 'PAID') {
      setCurrentStep(9);
      setIsSubmitted(true);
      if (targetCandidateId && !submissionResult) {
        setSubmissionResult({
          candidateId: targetCandidateId,
          scores: { totalScore: 85, recommendation: 'APPROVED' } as any,
        });
      }

      setIsPaymentProcessing(true);
      setPaymentError(null);

      edpPaymentService.verifyOrderStatus(targetOrderId, targetCandidateId).then((result) => {
        setIsPaymentProcessing(false);
        if (result.isPaid) {
          setPaymentStatus('PAID');
          setPaymentTransactionId(result.paymentId || `CF_${targetOrderId}`);
          try {
            sessionStorage.removeItem(PENDING_PAYMENT_ORDER_KEY);
          } catch (e) {}
          if (triggerToast) {
            triggerToast('🎉 Payment Verified! ₹2,068 received successfully.');
          }
        } else {
          setPaymentStatus('FAILED');
          setPaymentError(result.message || 'Payment was not completed or was cancelled. You may retry below.');
        }

        // Clean query params from URL without reload
        try {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {}
      });
    }
  }, []);

  const handlePayEdpFee = async () => {
    const candidateId = submissionResult?.candidateId || 'MAHA-AGRI-EDP-84729103';
    setIsPaymentProcessing(true);
    setPaymentError(null);

    await edpPaymentService.initiatePaymentWorkflow({
      candidateId,
      candidateName: formData.fullName || initialCandidateName || 'EDP Candidate',
      mobileNumber: formData.mobileNumber || initialMobile || '9999999999',
      email: formData.email,
      district: formData.district || initialDistrict,
      taluka: formData.taluka || initialTaluka,
      amount: EDP_STANDARD_TRAINING_FEE_INR,
      onSuccess: (paymentId) => {
        setIsPaymentProcessing(false);
        setPaymentStatus('PAID');
        setPaymentTransactionId(paymentId);
        if (triggerToast) {
          triggerToast(`🎉 Payment Verified! Transaction ID: ${paymentId}`);
        }
      },
      onError: (errMsg) => {
        setIsPaymentProcessing(false);
        setPaymentStatus('FAILED');
        setPaymentError(errMsg);
      },
      onDismiss: () => {
        setIsPaymentProcessing(false);
      },
    });
  };

  const handleEditStep = (stepNumber: number) => {
    setIsEditingFromReview(true);
    setSlideDirection('left');
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gat Parcel Inputs State (Farmer Registration alignment)
  const [parcelGatNoInput, setParcelGatNoInput] = useState('');
  const [parcelAreaInput, setParcelAreaInput] = useState('');
  const [parcelUnitInput, setParcelUnitInput] = useState<'Acre' | 'Hectare' | 'Guntha'>('Acre');

  // Gat Parcel Add / Remove functions (Farmer Registration Gat entry)
  const addGatParcel = () => {
    if (!parcelGatNoInput.trim()) {
      triggerToast('⚠️ Gat / Survey No. is required.');
      return;
    }
    if (/[\u0900-\u097F]/.test(parcelGatNoInput)) {
      triggerToast('⚠️ Gat No. must be in English (Marathi script not allowed).');
      return;
    }
    const gatNo = parcelGatNoInput.trim().toUpperCase();
    const newParcel = {
      gatNumber: gatNo,
      area: '',
      areaUnit: 'Acre' as const,
    };

    updateFormSection('agriculture', (prev) => {
      const currentParcels = prev.landDetails?.gatSurveyParcels || [];
      const updatedParcels = [...currentParcels, newParcel];
      const updatedGatNumbers = Array.from(new Set(updatedParcels.map((p) => p.gatNumber)));
      return {
        ...prev,
        landDetails: {
          ...prev.landDetails,
          gatSurveyParcels: updatedParcels,
          surveyGatNumbers: updatedGatNumbers,
          gatSurveyNumber: updatedGatNumbers.join(', '),
        } as any,
      };
    });

    setParcelGatNoInput('');
  };

  const removeGatParcel = (index: number) => {
    updateFormSection('agriculture', (prev) => {
      const currentParcels = prev.landDetails?.gatSurveyParcels || [];
      const updatedParcels = currentParcels.filter((_, i) => i !== index);
      const updatedGatNumbers = Array.from(new Set(updatedParcels.map((p) => p.gatNumber)));
      return {
        ...prev,
        landDetails: {
          ...prev.landDetails,
          gatSurveyParcels: updatedParcels,
          surveyGatNumbers: updatedGatNumbers,
          gatSurveyNumber: updatedGatNumbers.join(', '),
        } as any,
      };
    });
  };

  const calculateGatWiseTotalAcres = () => {
    const parcels = formData.agriculture.landDetails?.gatSurveyParcels || [];
    let totalAcres = 0;
    parcels.forEach((p: any) => {
      const val = parseFloat(p.area) || 0;
      if (p.areaUnit === 'Acre') totalAcres += val;
      else if (p.areaUnit === 'Hectare') totalAcres += val * 2.47105;
      else if (p.areaUnit === 'Guntha') totalAcres += val * 0.025;
    });
    return totalAcres.toFixed(2);
  };

  // 9 ENTERPRISE SECTION MODULES (WITH VERBATIM CONTEXT DESCRIPTIONS)
  const SECTIONS = [
    { id: 1, title: '🎓 Education Profile', shortTitle: 'Education', icon: GraduationCap, description: 'Build your educational profile for personalized recommendations.' },
    { id: 2, title: '💼 Occupation Profile', shortTitle: 'Occupation', icon: Briefcase, description: 'Tell us about your current professional journey.' },
    { id: 3, title: '🌾 Agriculture Profile', shortTitle: 'Agriculture', icon: Sprout, description: 'Help us understand your farming background.' },
    { id: 4, title: '🚁 Drone Awareness', shortTitle: 'Drone', icon: Tractor, description: 'Assess your current understanding of Agri Drone Technology.' },
    { id: 5, title: '🎯 Program Selection', shortTitle: 'Programs', icon: BookOpen, description: 'Explore & select entrepreneurship programs tailored for you.' },
    { id: 6, title: '💰 Investment Capacity', shortTitle: 'Investment', icon: Coins, description: 'Evaluate your financial readiness for entrepreneurship.' },
    { id: 7, title: '🏦 Loan & Financial Profile', shortTitle: 'Financial', icon: FileText, description: 'This helps us recommend suitable funding & subsidy options.' },
    { id: 8, title: '📋 Review & Submit', shortTitle: 'Review', icon: ClipboardCheck, description: 'Verify your information before submission.' },
    { id: 9, title: '✅ Application Submitted Successfully', shortTitle: 'Submitted', icon: CheckCircle2, description: 'Your application has been successfully submitted.' },
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

  const AGRI_LICENSE_QUALIFICATIONS = [
    'Agri Polytechnic',
    'Diploma in Agriculture',
    'B.Sc Agriculture',
    'M.Sc Agriculture',
    'B.Tech Agriculture',
    'B.Tech Agricultural Engineering',
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
    return Math.round((currentStep / SECTIONS.length) * 100);
  }, [currentStep, SECTIONS.length]);

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

  // ============================================================================
  // V5.4 CENTRALIZED VALIDATION ENGINE & UNRENDERED FIELD GUARD
  // ============================================================================
  const validateStep = (step: number): boolean => {
    const rawErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.education.qualification) {
        rawErrors['qualification'] = 'Please select your Highest Educational Qualification.';
      } else if (formData.education.qualification === 'Other') {
        const isMarathiScript = (str: string) => /[\u0900-\u097F]/.test(str || '');
        if (!formData.education.qualificationOther?.trim()) {
          rawErrors['qualificationOther'] = 'Please specify your qualification.';
        } else if (isMarathiScript(formData.education.qualificationOther)) {
          rawErrors['qualificationOther'] = 'Qualification must be in CAPITAL English / शिक्षण इंग्रजीत CAPITAL मध्ये लिहा.';
        }
      }

      if (formData.education.isStudent) {
        const isMarathiScript = (str: string) => /[\u0900-\u097F]/.test(str || '');
        const is10th = formData.education.qualification === '10th Pass';
        const is12th = formData.education.qualification === '12th Pass';
        const isAgriCourse = [
          'Agri Polytechnic',
          'Diploma in Agriculture',
          'B.Sc Agriculture',
          'M.Sc Agriculture',
          'B.Tech Agriculture',
          'B.Tech Agricultural Engineering',
        ].includes(formData.education.qualification);

        if (!formData.education.studentDetails?.collegeName?.trim()) {
          rawErrors['collegeName'] = 'Please enter College / University Name.';
        } else if (isMarathiScript(formData.education.studentDetails?.collegeName)) {
          rawErrors['collegeName'] = 'College / University Name must be in CAPITAL English / कॉलेजचे नाव इंग्रजीत CAPITAL मध्ये लिहा.';
        }

        // Course Name validation (Hidden for 10th Pass & Agri courses)
        if (!is10th && !isAgriCourse) {
          if (!formData.education.studentDetails?.courseName?.trim()) {
            rawErrors['courseName'] = 'Please select or enter Course Name.';
          } else if (is12th && formData.education.studentDetails?.courseName === 'Other') {
            if (!formData.education.studentDetails?.courseNameOther?.trim()) {
              rawErrors['courseNameOther'] = 'Please specify your Course Name.';
            } else if (isMarathiScript(formData.education.studentDetails?.courseNameOther)) {
              rawErrors['courseNameOther'] = 'Course Name must be in CAPITAL English / कोर्सचे नाव इंग्रजीत CAPITAL मध्ये लिहा.';
            }
          } else if (!is12th) {
            if (isMarathiScript(formData.education.studentDetails?.courseName)) {
              rawErrors['courseName'] = 'Course Name must be in CAPITAL English / कोर्सचे नाव इंग्रजीत CAPITAL मध्ये लिहा.';
            }
          }
        }

        // Current Year validation (Hidden for 10th Pass & 12th Pass)
        if (!is10th && !is12th) {
          if (!formData.education.studentDetails?.currentYear?.trim()) {
            rawErrors['currentYear'] = 'Please select Current Year.';
          }
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
        const agriCat = formData.occupation.agriProfCategory || 'Agriculture Consultant';
        if (!agriCat) {
          rawErrors['agriProfCategory'] = 'Please select your Agriculture Professional specialty.';
        } else if (agriCat === 'Other' && !formData.occupation.agriProfCategoryOther?.trim()) {
          rawErrors['agriProfCategoryOther'] = 'Please specify your specialty.';
        }
      }

      if (formData.occupation.operatedPastBusiness) {
        const pBizType = formData.occupation.pastBusinessDetails?.businessType || '';
        if (!pBizType.trim()) {
          rawErrors['pastBusinessType'] = 'Please enter Business Type.';
        } else if (/[\u0900-\u097F]/.test(pBizType)) {
          rawErrors['pastBusinessType'] = 'Business Type must be in CAPITAL English (Marathi script not allowed).';
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
        const villageVal = formData.agriculture.landDetails?.farmVillage || formData.village || '';
        if (!villageVal?.trim()) {
          rawErrors['farmVillage'] = 'Farm Village / Town is required.';
        } else if (/[\u0900-\u097F]/.test(villageVal)) {
          rawErrors['farmVillage'] = 'Farm Village / Town must be in CAPITAL English (Marathi script not allowed).';
        }
      }

      if (formData.agriculture.hasFarmerId) {
        if (!formData.agriculture.dontKnowFarmerId) {
          const fId = formData.agriculture.farmerIdNumber || '';
          if (!fId.trim()) {
            rawErrors['farmerIdNumber'] = 'Please enter Farmer Registration Number or check "I Don\'t Know".';
          } else if (/[\u0900-\u097F]/.test(fId)) {
            rawErrors['farmerIdNumber'] = 'Farmer Registration Number must be in CAPITAL English (Marathi script not allowed).';
          }
        }
      }

      if (formData.agriculture.hasReceivedGovtBenefits) {
        if (!formData.agriculture.govtSchemesReceived || formData.agriculture.govtSchemesReceived.length === 0) {
          rawErrors['govtSchemesReceived'] = 'Please select at least one government scheme.';
        } else {
          if (formData.agriculture.govtSchemesReceived.includes('Other' as any)) {
            const schOther = formData.agriculture.govtSchemeOther || '';
            if (!schOther.trim()) {
              rawErrors['govtSchemeOther'] = 'Please specify other scheme.';
            } else if (/[\u0900-\u097F]/.test(schOther)) {
              rawErrors['govtSchemeOther'] = 'Scheme Name must be in CAPITAL English (Marathi script not allowed).';
            }
          }
        }
      }

      if (formData.agriculture.isFpoMember) {
        const fName = formData.agriculture.fpoName || '';
        if (!fName.trim()) {
          rawErrors['fpoName'] = 'Please enter FPO Name.';
        } else if (/[\u0900-\u097F]/.test(fName)) {
          rawErrors['fpoName'] = 'FPO Name must be in CAPITAL English (Marathi script not allowed).';
        }

        if (!formData.agriculture.fpoPosition) {
          rawErrors['fpoPosition'] = 'Please select Position in FPO.';
        } else if (formData.agriculture.fpoPosition === 'Other') {
          const posOther = formData.agriculture.fpoPositionOther || '';
          if (!posOther.trim()) {
            rawErrors['fpoPositionOther'] = 'Please specify FPO position.';
          } else if (/[\u0900-\u097F]/.test(posOther)) {
            rawErrors['fpoPositionOther'] = 'Position must be in CAPITAL English (Marathi script not allowed).';
          }
        }

        if (!formData.agriculture.fpoYearJoined) {
          rawErrors['fpoYearJoined'] = 'Please select Year Joined FPO.';
        }

        const fConn = formData.agriculture.fpoFarmersConnected || '';
        if (fConn && /[\u0900-\u097F]/.test(fConn)) {
          rawErrors['fpoFarmersConnected'] = 'Farmers Connected must contain English digits only.';
        }

        const vCov = formData.agriculture.fpoVillageCoverage || '';
        if (vCov && /[\u0900-\u097F]/.test(vCov)) {
          rawErrors['fpoVillageCoverage'] = 'Village Coverage must be in CAPITAL English / Digits.';
        }
      }
    }

    else if (step === 4) {
      if (!formData.agriDrone.knowsAgriDrones) {
        rawErrors['knowsAgriDrones'] = 'Please select your drone awareness level.';
      }

      if (formData.agriDrone.attendedTraining) {
        const instName = formData.agriDrone.trainingDetails?.instituteName || '';
        if (!instName.trim()) {
          rawErrors['instituteName'] = 'Please enter Training Institute Name.';
        } else if (/[\u0900-\u097F]/.test(instName)) {
          rawErrors['instituteName'] = 'Institute Name must be in CAPITAL English (Marathi script not allowed).';
        }
        if (!formData.agriDrone.trainingDetails?.trainingYear) {
          rawErrors['trainingYear'] = 'Please select Training Year.';
        }
      }
      if (formData.agriDrone.currentlyOwnsDrone) {
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

      if (formData.entrepreneurInterest.selectedPrograms.includes('Agri Drone Entrepreneur') || formData.entrepreneurInterest.selectedPrograms.includes('Professional Drone Pilot')) {
        const edp = formData.entrepreneurInterest.moduleADrone?.edpWorkshop;
        const canAttend = edp?.canAttendWorkshop || 'Yes';
        const postPlan = edp?.postTrainingPlan || 'Start My Own Agri Drone Spraying Business';
        const agree = edp?.agreeToCompleteEdpBeforeOnboarding || 'Yes';

        if (canAttend === 'No') {
          if (!edp?.cannotAttendReason) {
            rawErrors['cannotAttendReason'] = 'Please select reason for not attending.';
          } else if (edp.cannotAttendReason === 'Other' && !edp.cannotAttendReasonOther?.trim()) {
            rawErrors['cannotAttendReasonOther'] = 'Please specify your reason.';
          }
        }

        if (!postPlan) {
          rawErrors['postTrainingPlan'] = 'Please select post-training business plan.';
        } else if (postPlan === 'Other' && !edp?.postTrainingPlanOther?.trim()) {
          rawErrors['postTrainingPlanOther'] = 'Please specify your post-training plan.';
        }

        if (!agree) {
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
      if (!isVerifiedByCandidate) {
        rawErrors['declaration'] = 'You must verify and agree to all declaration statements before final submission.';
      }
    }

    // =========================================================================
    // V5.4 UNRENDERED FIELD GUARD & UNIVERSAL MESSAGE STANDARDIZATION
    // =========================================================================
    const activeErrors: Record<string, string> = {};
    for (const [key, msg] of Object.entries(rawErrors)) {
      const domEl = typeof document !== 'undefined' ? document.getElementById(`field-${key}`) : null;
      if (domEl || key === 'qualification' || key === 'occupation' || key === 'declaration' || key === 'agriActivities' || key === 'selectedPrograms') {
        activeErrors[key] = msg || 'This field is required.';
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
      };
    }
  }, [currentStep, formData, validationErrors]);

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (isEditingFromReview && currentStep < 8) {
        setIsEditingFromReview(false);
        setSlideDirection('right');
        setCurrentStep(8);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (currentStep < 8) {
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
    if (isSubmitting) return;

    if (isVerifiedByCandidate) {
      updateFormSection('declaration', (prev) => ({
        ...prev,
        isInformationTrue: true,
        understandsNoGuarantee: true,
        agreesToAssessmentProcess: true,
      }));
    }

    if (!isVerifiedByCandidate) {
      triggerToast('⚠️ Please check the verification checkbox to submit.');
      setCurrentStep(8);
      return;
    }

    setIsSubmitting(true);
    setSubmitStageText('Submitting Application...');

    try {
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      const candidateId = `MAHA-AGRI-EDP-${randomNum}`;
      const scores = entrepreneurAssessmentService.calculateInternalAdminScores(formData);

      // 1. Persist submitted assessment to local storage / service engine
      entrepreneurAssessmentService.saveSubmittedAssessment(candidateId, formData, scores);

      // 1B. Authoritative candidate synchronization with government backend for payment linkage
      edpPaymentService.syncAssessmentCandidate({
        candidateId,
        fullName: formData.fullName || initialCandidateName || 'Entrepreneur Candidate',
        mobileNumber: formData.mobileNumber || initialMobile || '9999999999',
        districtId: formData.district || initialDistrict || 'Wardha',
        talukaId: formData.taluka || initialTaluka || 'Wardha',
      }).catch((err) => console.warn('Candidate sync deferred:', err));

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
        setCurrentStep(9);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        {/* MINIMAL ENTERPRISE WIZARD HEADER */}
        {/* ========================================================================= */}
        <div className="px-4 py-3.5 bg-[#0B1220] border-b border-[#1F2937]/40 space-y-2.5">
          <div className="flex items-center justify-between text-[12px] font-semibold text-[#94A3B8]">
            <span>Step {currentStep} of {SECTIONS.length}</span>
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
              onClick={() => {
                if (currentStep === 9) {
                  if (onBack) onBack();
                  else {
                    setIsSubmitted(false);
                    setCurrentStep(1);
                  }
                } else {
                  handlePrevStep();
                }
              }}
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
        </div>

        {/* ========================================================================= */}
        {/* NUMBERED STEP PROGRESS INDICATOR (1-9) */}
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
                    onClick={() => {
                      if (st.id === 9 && !isSubmitted) {
                        triggerToast('⚠️ Please complete Step 8 and submit your application first.');
                        return;
                      }
                      setCurrentStep(st.id);
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[11px] transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'bg-gradient-to-tr from-[#059669] to-[#06B6D4] text-white ring-2 ring-[#06B6D4]/60 shadow-md animate-pulse scale-105'
                        : isCompleted
                        ? 'bg-[#059669] text-white font-bold shadow-sm'
                        : 'bg-[#182234] text-[#94A3B8] border border-[#1F2937]'
                    }`}
                    aria-label={`Step ${st.id}`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : st.id}
                  </button>
                  {idx < 8 && (
                    <div className={`flex-1 h-[2px] mx-0.5 transition-all duration-300 ${isCompleted || isCurrent ? 'bg-[#059669]' : 'bg-[#1F2937]'}`}></div>
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
                        <WizardSelect
                          fieldId="field-qualification"
                          value={formData.education.qualification}
                          onChange={(v) => updateFormSection('education', (prev) => ({ ...prev, qualification: v as EducationalQualification }), 'qualification')}
                          error={validationErrors['qualification']}
                          placeholder="Select Educational Qualification"
                          options={[
                            { value: '10th Pass', label: '10th Pass', icon: '📜' },
                            { value: '12th Pass', label: '12th Pass', icon: '📜' },
                            { value: 'ITI', label: 'ITI', icon: '🛠️' },
                            { value: 'Diploma', label: 'Diploma', icon: '🎓' },
                            { value: 'Graduate', label: 'Graduate', icon: '🎓' },
                            { value: 'Post Graduate', label: 'Post Graduate', icon: '🎓' },
                            { value: 'Agri Polytechnic', label: 'Agri Polytechnic', icon: '🌱' },
                            { value: 'Diploma in Agriculture', label: 'Diploma in Agriculture', icon: '🌱' },
                            { value: 'B.Sc Agriculture', label: 'B.Sc Agriculture', icon: '🌾' },
                            { value: 'M.Sc Agriculture', label: 'M.Sc Agriculture', icon: '🌾' },
                            { value: 'B.Tech Agriculture', label: 'B.Tech Agriculture', icon: '🚜' },
                            { value: 'B.Tech Agricultural Engineering', label: 'B.Tech Agricultural Engineering', icon: '🚜' },
                            { value: 'Veterinary', label: 'Veterinary', icon: '🐄' },
                            { value: 'Other', label: 'Other', icon: '🔄' },
                          ]}
                        />
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
                          onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, qualificationOther: e.target.value.toUpperCase() }), 'qualificationOther')}
                          onBlur={() => {
                            const val = formData.education.qualificationOther || '';
                            if (!val.trim()) setValidationErrors(prev => ({ ...prev, qualificationOther: 'Please specify your qualification.' }));
                            else if (/[\u0900-\u097F]/.test(val)) setValidationErrors(prev => ({ ...prev, qualificationOther: 'Qualification must be in CAPITAL English / शिक्षण इंग्रजीत CAPITAL मध्ये लिहा.' }));
                          }}
                          placeholder="e.g. DIPLOMA IN ELECTRONICS"
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase text-[15px] focus:outline-none ${
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
                        {/* 1. College / University Name (Uppercase & English-only validation) */}
                        <div className="space-y-1.5">
                          <label className={`font-medium text-[13px] block ${validationErrors['collegeName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            College / University Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-collegeName"
                            type="text"
                            value={formData.education.studentDetails?.collegeName || ''}
                            onChange={(e) => updateFormSection('education', (prev) => ({ ...prev, studentDetails: { ...prev.studentDetails, collegeName: e.target.value.toUpperCase() } as any }), 'collegeName')}
                            onBlur={() => {
                              const val = formData.education.studentDetails?.collegeName || '';
                              if (!val.trim()) setValidationErrors(prev => ({ ...prev, collegeName: 'This field is required.' }));
                              else if (/[\u0900-\u097F]/.test(val)) setValidationErrors(prev => ({ ...prev, collegeName: 'College / University Name must be in CAPITAL English / कॉलेजचे नाव इंग्रजीत CAPITAL मध्ये लिहा.' }));
                            }}
                            aria-invalid={!!validationErrors['collegeName']}
                            aria-describedby={validationErrors['collegeName'] ? 'error-collegeName' : undefined}
                            placeholder="e.g. MPKV RAHURI"
                            className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white uppercase text-[15px] focus:outline-none input-focus-smooth ${
                              validationErrors['collegeName'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {validationErrors['collegeName'] && (
                            <p id="error-collegeName" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{validationErrors['collegeName']}</span>
                            </p>
                          )}
                        </div>

                        {/* 2. Course Name (Hidden for 10th Pass & Agriculture courses) */}
                        {!['10th Pass', 'Agri Polytechnic', 'Diploma in Agriculture', 'B.Sc Agriculture', 'M.Sc Agriculture', 'B.Tech Agriculture', 'B.Tech Agricultural Engineering'].includes(formData.education.qualification) && (
                          <div className="space-y-2">
                            {formData.education.qualification === '12th Pass' ? (
                              <div className="space-y-1.5">
                                <label className={`font-medium text-[13px] block ${validationErrors['courseName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                  Course Name <span className="text-rose-500">*</span>
                                </label>
                                <WizardSelect
                                  fieldId="field-courseName"
                                  value={formData.education.studentDetails?.courseName || ''}
                                  onChange={(v) => updateFormSection('education', (prev) => ({
                                    ...prev,
                                    studentDetails: { ...prev.studentDetails, courseName: v } as any
                                  }), 'courseName')}
                                  error={validationErrors['courseName']}
                                  placeholder="Select Stream / Course"
                                  options={[
                                    { value: 'Arts', label: 'Arts', icon: '🎨' },
                                    { value: 'Commerce', label: 'Commerce', icon: '📊' },
                                    { value: 'Science', label: 'Science', icon: '🔬' },
                                    { value: 'Other', label: 'Other', icon: '🔄' },
                                  ]}
                                  small
                                />

                                {formData.education.studentDetails?.courseName === 'Other' && (
                                  <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                                    <label className={`font-medium text-[13px] block ${validationErrors['courseNameOther'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                      Please Specify Course Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      id="field-courseNameOther"
                                      type="text"
                                      value={formData.education.studentDetails?.courseNameOther || ''}
                                      onChange={(e) => updateFormSection('education', (prev) => ({
                                        ...prev,
                                        studentDetails: { ...prev.studentDetails, courseNameOther: e.target.value.toUpperCase() } as any
                                      }), 'courseNameOther')}
                                      onBlur={() => {
                                        const val = formData.education.studentDetails?.courseNameOther || '';
                                        if (!val.trim()) setValidationErrors(prev => ({ ...prev, courseNameOther: 'This field is required.' }));
                                        else if (/[\u0900-\u097F]/.test(val)) setValidationErrors(prev => ({ ...prev, courseNameOther: 'Course Name must be in CAPITAL English / कोर्सचे नाव इंग्रजीत CAPITAL मध्ये लिहा.' }));
                                      }}
                                      placeholder="e.g. VOCATIONAL"
                                      className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white uppercase text-[15px] focus:outline-none input-focus-smooth ${
                                        validationErrors['courseNameOther'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                                      }`}
                                    />
                                    {validationErrors['courseNameOther'] && (
                                      <p id="error-courseNameOther" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>{validationErrors['courseNameOther']}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label className={`font-medium text-[13px] block ${validationErrors['courseName'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                  Course Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id="field-courseName"
                                  type="text"
                                  value={formData.education.studentDetails?.courseName || ''}
                                  onChange={(e) => updateFormSection('education', (prev) => ({
                                    ...prev,
                                    studentDetails: { ...prev.studentDetails, courseName: e.target.value.toUpperCase() } as any
                                  }), 'courseName')}
                                  onBlur={() => {
                                    const val = formData.education.studentDetails?.courseName || '';
                                    if (!val.trim()) setValidationErrors(prev => ({ ...prev, courseName: 'This field is required.' }));
                                    else if (/[\u0900-\u097F]/.test(val)) setValidationErrors(prev => ({ ...prev, courseName: 'Course Name must be in CAPITAL English / कोर्सचे नाव इंग्रजीत CAPITAL मध्ये लिहा.' }));
                                  }}
                                  aria-invalid={!!validationErrors['courseName']}
                                  aria-describedby={validationErrors['courseName'] ? 'error-courseName' : undefined}
                                  placeholder="e.g. B.A. / B.COM"
                                  className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white uppercase text-[15px] focus:outline-none input-focus-smooth ${
                                    validationErrors['courseName'] ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30' : 'border-[#1F2937] focus:border-[#059669]'
                                  }`}
                                />
                                {validationErrors['courseName'] && (
                                  <p id="error-courseName" role="alert" className="text-[12px] font-medium text-rose-400 mt-[6px] flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-1 duration-180">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>{validationErrors['courseName']}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Current Year / Expected Passing Year */}
                        {['10th Pass', '12th Pass'].includes(formData.education.qualification) ? (
                          <div className="space-y-1.5">
                            <label className="font-medium text-[13px] text-slate-300 block">
                              Expected Passing Year <span className="text-rose-500">*</span>
                            </label>
                            <WizardSelect
                              fieldId="field-expectedPassingYear"
                              value={formData.education.studentDetails?.expectedPassingYear || '2025'}
                              onChange={(v) => updateFormSection('education', (prev) => ({
                                ...prev,
                                studentDetails: { ...prev.studentDetails, expectedPassingYear: v } as any
                              }))}
                              options={[
                                { value: '2024', label: '2024', icon: '📅' },
                                { value: '2025', label: '2025', icon: '📅' },
                                { value: '2026', label: '2026', icon: '📅' },
                                { value: '2027', label: '2027', icon: '📅' },
                                { value: '2028', label: '2028', icon: '📅' },
                                { value: '2029', label: '2029', icon: '📅' },
                                { value: '2030', label: '2030', icon: '📅' },
                              ]}
                              small
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <label className={`font-medium text-[13px] block ${validationErrors['currentYear'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                Current Year <span className="text-rose-500">*</span>
                              </label>
                              <WizardSelect
                                fieldId="field-currentYear"
                                value={formData.education.studentDetails?.currentYear || ''}
                                onChange={(v) => updateFormSection('education', (prev) => ({
                                  ...prev,
                                  studentDetails: { ...prev.studentDetails, currentYear: v } as any
                                }), 'currentYear')}
                                error={validationErrors['currentYear']}
                                placeholder="Select Current Year"
                                options={[
                                  { value: '1st Year', label: '1st Year', icon: '1️⃣' },
                                  { value: '2nd Year', label: '2nd Year', icon: '2️⃣' },
                                  { value: '3rd Year', label: '3rd Year', icon: '3️⃣' },
                                  { value: '4th Year', label: '4th Year', icon: '4️⃣' },
                                  { value: 'Final Year / Internship', label: 'Final Year / Internship', icon: '🎓' },
                                ]}
                                small
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-medium text-[13px] text-slate-[#94A3B8] block">Expected Passing Year</label>
                              <WizardSelect
                                fieldId="field-expectedPassingYear"
                                value={formData.education.studentDetails?.expectedPassingYear || '2025'}
                                onChange={(v) => updateFormSection('education', (prev) => ({
                                  ...prev,
                                  studentDetails: { ...prev.studentDetails, expectedPassingYear: v } as any
                                }))}
                                options={[
                                  { value: '2024', label: '2024', icon: '📅' },
                                  { value: '2025', label: '2025', icon: '📅' },
                                  { value: '2026', label: '2026', icon: '📅' },
                                  { value: '2027', label: '2027', icon: '📅' },
                                  { value: '2028', label: '2028', icon: '📅' },
                                  { value: '2029', label: '2029', icon: '📅' },
                                  { value: '2030', label: '2030', icon: '📅' },
                                ]}
                                small
                              />
                            </div>
                          </div>
                        )}
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
                      <WizardSelect
                        fieldId="field-occupation"
                        value={formData.occupation.occupation}
                        onChange={(v) => updateFormSection('occupation', (prev) => ({ ...prev, occupation: v as OccupationType }), 'occupation')}
                        error={validationErrors['occupation']}
                        options={[
                          { value: 'Student', label: 'Student', icon: '🎓' },
                          { value: 'Farmer', label: 'Farmer', icon: '🧑‍🌾' },
                          { value: 'Private Employee', label: 'Private Employee', icon: '💼' },
                          { value: 'Government Employee', label: 'Government Employee', icon: '🏛️' },
                          { value: 'Business Owner', label: 'Business Owner', icon: '🏢' },
                          { value: 'Self Employed', label: 'Self Employed', icon: '🛠️' },
                          { value: 'Agriculture Professional', label: 'Agriculture Professional', icon: '🌱' },
                          { value: 'Housewife', label: 'Housewife', icon: '🏡' },
                          { value: 'Unemployed', label: 'Unemployed', icon: '⏳' },
                          { value: 'Other', label: 'Other', icon: '🔄' },
                        ].filter((occ) => formData.education.isStudent || occ.value !== 'Student')}
                      />
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
                        <WizardSelect
                          fieldId="field-agriProfCategory"
                          value={formData.occupation.agriProfCategory || 'Agriculture Consultant'}
                          onChange={(v) => updateFormSection('occupation', (prev) => ({ ...prev, agriProfCategory: v as any }))}
                          options={[
                            { value: 'Agriculture Officer', label: 'Agriculture Officer', icon: '🏛️' },
                            { value: 'Agriculture Consultant', label: 'Agriculture Consultant', icon: '👨‍🌾' },
                            { value: 'Input Dealer', label: 'Input Dealer', icon: '🏬' },
                            { value: 'Agriculture Sales', label: 'Agriculture Sales', icon: '📈' },
                            { value: 'Extension Worker', label: 'Extension Worker', icon: '🤝' },
                            { value: 'Research', label: 'Research', icon: '🔬' },
                            { value: 'NGO', label: 'NGO', icon: '🌐' },
                            { value: 'Other', label: 'Other', icon: '🔄' },
                          ]}
                          small
                        />
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
                          <WizardSelect
                            value={formData.occupation.employeeDetails?.totalJobExperience || '1–3 Years'}
                            onChange={(v) => updateFormSection('occupation', (prev) => ({ ...prev, employeeDetails: { ...prev.employeeDetails, totalJobExperience: v as ExperienceRange } as any }))}
                            options={[
                              { value: 'Less than 1 Year', label: 'Less than 1 Year', icon: '⏱️' },
                              { value: '1–3 Years', label: '1–3 Years', icon: '⏱️' },
                              { value: '3–5 Years', label: '3–5 Years', icon: '⏱️' },
                              { value: '5–10 Years', label: '5–10 Years', icon: '⏱️' },
                              { value: 'More than 10 Years', label: 'More than 10 Years', icon: '⏱️' },
                            ]}
                            small
                          />
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
                              <label className={`font-medium text-[13px] block ${(validationErrors['pastBusinessType'] || /[\u0900-\u097F]/.test(formData.occupation.pastBusinessDetails?.businessType || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                Business Type
                              </label>
                              <input
                                id="field-pastBusinessType"
                                type="text"
                                value={formData.occupation.pastBusinessDetails?.businessType || ''}
                                onChange={(e) => {
                                  const upperVal = e.target.value.toUpperCase();
                                  updateFormSection('occupation', (prev) => ({ ...prev, pastBusinessDetails: { ...prev.pastBusinessDetails, businessType: upperVal } as any }), 'pastBusinessType');
                                }}
                                placeholder="e.g. RETAIL SHOP / TRADING"
                                className={`w-full h-[50px] bg-[#111827] border rounded-[12px] px-3.5 text-white uppercase font-bold text-[15px] focus:outline-none ${
                                  validationErrors['pastBusinessType'] || /[\u0900-\u097F]/.test(formData.occupation.pastBusinessDetails?.businessType || '')
                                    ? 'border-rose-500 bg-rose-500/10'
                                    : 'border-[#1F2937] focus:border-[#059669]'
                                }`}
                              />
                              {/[\u0900-\u097F]/.test(formData.occupation.pastBusinessDetails?.businessType || '') ? (
                                <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Business Type must be in CAPITAL English (Marathi script not allowed).</p>
                              ) : validationErrors['pastBusinessType'] ? (
                                <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['pastBusinessType']}</p>
                              ) : null}
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-medium text-[13px] text-slate-300 block">Years Operated</label>
                              <WizardSelect
                                value={formData.occupation.pastBusinessDetails?.yearsOperated || '1 Year'}
                                onChange={(v) => updateFormSection('occupation', (prev) => ({ ...prev, pastBusinessDetails: { ...prev.pastBusinessDetails, yearsOperated: v } as any }))}
                                options={[
                                  'Less than 1 Year', '1 Year', '2 Years', '3 Years',
                                  '4 Years', '5 Years', '6–10 Years', '10+ Years'
                                ].map(opt => ({ value: opt, label: opt, icon: '📅' }))}
                                small
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                      <div id="field-agriActivities" className="space-y-2">
                        <label className={`font-medium text-[13px] block ${validationErrors['agriActivities'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Farming Activities Involved In <span className="text-rose-500">*</span>
                        </label>
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
                                  }, 'agriActivities');
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
                        {validationErrors['agriActivities'] && (
                          <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['agriActivities']}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className={`font-medium text-[13px] block ${validationErrors['farmingExperience'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Farming Experience <span className="text-rose-500">*</span>
                        </label>
                        <WizardSelect
                          fieldId="field-farmingExperience"
                          value={formData.agriculture.farmingExperience || ''}
                          onChange={(v) => updateFormSection('agriculture', (prev) => ({ ...prev, farmingExperience: v as any }), 'farmingExperience')}
                          error={validationErrors['farmingExperience']}
                          options={[
                            { value: 'Less than 1 Year', label: 'Less than 1 Year', icon: '🌱' },
                            { value: '1–3 Years', label: '1–3 Years', icon: '🌾' },
                            { value: '3–5 Years', label: '3–5 Years', icon: '🌿' },
                            { value: '5–10 Years', label: '5–10 Years', icon: '🌳' },
                            { value: 'More than 10 Years', label: 'More than 10 Years', icon: '🚜' },
                          ]}
                          placeholder="Select Farming Experience..."
                          small
                        />
                        {validationErrors['farmingExperience'] && (
                          <p className="text-[12px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['farmingExperience']}</p>
                        )}
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
                    <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-4 animate-in fade-in duration-200">
                      {/* 1. TOTAL LAND AREA & 2. LAND MEASUREMENT UNIT */}
                      <div className="space-y-2 pb-3 border-b border-[#1F2937]">
                        <label className="font-bold text-[14px] text-white block">
                          Total Land Area <span className="text-rose-500">*</span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <input
                              id="field-totalLandArea"
                              type="text"
                              value={formData.agriculture.landDetails?.totalLandArea || ''}
                              onChange={(e) => updateFormSection('agriculture', (prev) => ({
                                ...prev,
                                landDetails: { ...prev.landDetails, totalLandArea: e.target.value } as any
                              }), 'totalLandArea')}
                              placeholder="e.g. 4.50"
                              className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3.5 text-white font-mono text-[14px] focus:outline-none ${
                                validationErrors['totalLandArea'] ? 'border-rose-500 bg-rose-500/10' : 'border-[#1F2937] focus:border-[#059669]'
                              }`}
                            />
                          </div>

                          <div className="space-y-1">
                            <WizardSelect
                              value={formData.agriculture.landUnit || 'Acre'}
                              onChange={(v) => updateFormSection('agriculture', (prev) => ({ ...prev, landUnit: v as 'Acre' | 'Hectare' }))}
                              options={[
                                { value: 'Acre', label: 'Acres', icon: '📐' },
                                { value: 'Hectare', label: 'Hectares', icon: '📐' },
                                { value: 'Guntha', label: 'Guntha', icon: '📐' },
                              ]}
                            />
                          </div>
                        </div>

                        {validationErrors['totalLandArea'] && (
                          <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['totalLandArea']}</p>
                        )}
                      </div>

                      {/* 3. LAND OWNERSHIP */}
                      <div className="space-y-1.5 pb-3 border-b border-[#1F2937]">
                        <label className="font-medium text-[13px] text-slate-300 block">
                          Land Ownership
                        </label>
                        <WizardSelect
                          value={formData.agriculture.landOwnership || 'Self Owned'}
                          onChange={(v) => updateFormSection('agriculture', (prev) => ({ ...prev, landOwnership: v as any }))}
                          options={[
                            { value: 'Self Owned', label: 'Self Owned', icon: '🏡' },
                            { value: 'Family Owned', label: 'Family Owned', icon: '👨‍👩‍👧‍👦' },
                            { value: 'Leased / Rented', label: 'Leased / Rented', icon: '📜' },
                            { value: 'Jointly Owned', label: 'Jointly Owned', icon: '🤝' },
                          ]}
                          small
                        />
                      </div>

                      {/* 4. FARM LOCATION DETAILS */}
                      <div className="p-3.5 bg-[#182234] rounded-[14px] border border-[#1F2937] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                          <h4 className="font-bold text-[13.5px] text-white flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            <span>Farm Location Details <span className="text-rose-500">*</span></span>
                          </h4>
                        </div>

                        {(() => {
                          const currentDist = formData.agriculture.landDetails?.farmDistrict || formData.district || initialDistrict;
                          const availableTalukas = getTalukasForDistrict(currentDist);
                          const currentTaluka = formData.agriculture.landDetails?.farmTaluka || formData.taluka || (availableTalukas[0] || initialTaluka);
                          const villageVal = formData.agriculture.landDetails?.farmVillage ?? formData.village ?? initialVillage;
                          const hasMarathiVillage = /[\u0900-\u097F]/.test(villageVal);

                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <WizardSelect
                                  label="Farm District"
                                  value={currentDist}
                                  onChange={(v) => {
                                    const talukas = getTalukasForDistrict(v);
                                    const nextTaluka = talukas.length > 0 ? talukas[0] : '';
                                    updateFormSection('agriculture', (prev) => ({
                                      ...prev,
                                      landDetails: { ...prev.landDetails, farmDistrict: v, farmTaluka: nextTaluka } as any
                                    }));
                                  }}
                                  options={MAHARASHTRA_DISTRICTS.map((d) => ({
                                    value: d,
                                    label: d,
                                    icon: <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                                  }))}
                                  small
                                />

                                <WizardSelect
                                  label="Farm Taluka"
                                  value={currentTaluka}
                                  onChange={(v) => updateFormSection('agriculture', (prev) => ({
                                    ...prev,
                                    landDetails: { ...prev.landDetails, farmTaluka: v } as any
                                  }))}
                                  options={availableTalukas.map((t) => ({
                                    value: t,
                                    label: t,
                                    icon: '📌'
                                  }))}
                                  small
                                />
                              </div>

                              <div className="space-y-1">
                                <label className={`text-[12px] font-medium block ${(validationErrors['farmVillage'] || hasMarathiVillage) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                                  Farm Village / Town <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id="field-farmVillage"
                                  type="text"
                                  value={villageVal}
                                  onChange={(e) => {
                                    const upperVal = e.target.value.toUpperCase();
                                    updateFormSection('agriculture', (prev) => ({
                                      ...prev,
                                      landDetails: { ...prev.landDetails, farmVillage: upperVal } as any
                                    }), 'farmVillage');
                                  }}
                                  placeholder="e.g. PAVANAR"
                                  className={`w-full h-[46px] bg-[#111827] border rounded-[10px] px-3 font-bold text-white uppercase text-[13.5px] focus:outline-none ${
                                    (validationErrors['farmVillage'] || hasMarathiVillage) ? 'border-rose-500 bg-rose-500/10' : 'border-[#1F2937] focus:border-[#059669]'
                                  }`}
                                />
                                {hasMarathiVillage ? (
                                  <p className="text-[11.5px] text-rose-400 font-bold mt-1 flex items-center space-x-1">
                                    <span>⚠️ Farm Village / Town must be in CAPITAL English (Marathi script not allowed).</span>
                                  </p>
                                ) : validationErrors['farmVillage'] ? (
                                  <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['farmVillage']}</p>
                                ) : null}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* 5. GAT / SURVEY PARCEL ENTRY */}
                      <div className="p-3.5 bg-[#182234] border border-[#1F2937] rounded-xl space-y-3">
                        <div className="border-b border-[#1F2937] pb-2">
                          <span className="font-bold text-[13.5px] text-white block leading-tight">Gat / Survey Parcel Entry</span>
                          <span className="text-[11.5px] text-slate-400 font-normal block leading-tight">Add Gat / Survey numbers one by one</span>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={parcelGatNoInput}
                              onChange={(e) => setParcelGatNoInput(e.target.value.toUpperCase())}
                              placeholder="Gat (e.g. 45/1)"
                              className={`flex-1 h-[44px] bg-[#111827] border rounded-lg px-3 font-mono font-bold text-white text-xs uppercase focus:outline-none ${
                                /[\u0900-\u097F]/.test(parcelGatNoInput) ? 'border-rose-500 bg-rose-500/10' : 'border-[#1F2937] focus:border-[#059669]'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={addGatParcel}
                              className="h-[44px] px-5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                            >
                              + Add
                            </button>
                          </div>
                          {/[\u0900-\u097F]/.test(parcelGatNoInput) && (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Gat No. must be in CAPITAL English (Marathi script not allowed).</p>
                          )}
                        </div>

                        {/* COMPACT REMOVABLE PARCEL CARDS */}
                        {formData.agriculture.landDetails?.gatSurveyParcels && formData.agriculture.landDetails.gatSurveyParcels.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {formData.agriculture.landDetails.gatSurveyParcels.map((parcel: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold"
                              >
                                <span>Gat {parcel.gatNumber}</span>
                                <button type="button" onClick={() => removeGatParcel(idx)} className="text-emerald-400 hover:text-rose-400 font-bold cursor-pointer ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* COMBINED GAT SUMMARY INPUT */}
                        <div className="pt-2 border-t border-[#1F2937]/60 space-y-1">
                          <label className={`text-[11.5px] font-medium block ${/[\u0900-\u097F]/.test(formData.agriculture.landDetails?.gatSurveyNumber || '') ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                            Combined Gat / Survey Summary No.
                          </label>
                          <input
                            type="text"
                            value={formData.agriculture.landDetails?.gatSurveyNumber || ''}
                            onChange={(e) => updateFormSection('agriculture', (prev) => ({
                              ...prev,
                              landDetails: { ...prev.landDetails, gatSurveyNumber: e.target.value.toUpperCase() } as any
                            }))}
                            placeholder="e.g. GAT NO. 45/1, 102/2A"
                            className={`w-full h-[44px] bg-[#111827] border rounded-lg px-3 text-white font-mono uppercase text-xs focus:outline-none ${
                              /[\u0900-\u097F]/.test(formData.agriculture.landDetails?.gatSurveyNumber || '') ? 'border-rose-500 bg-rose-500/10' : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {/[\u0900-\u097F]/.test(formData.agriculture.landDetails?.gatSurveyNumber || '') && (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Gat / Survey Summary No. must be in CAPITAL English (Marathi script not allowed).</p>
                          )}
                        </div>
                      </div>
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
                        <label className={`font-medium text-[13px] block ${(validationErrors['farmerIdNumber'] || (!formData.agriculture.dontKnowFarmerId && /[\u0900-\u097F]/.test(formData.agriculture.farmerIdNumber || ''))) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Farmer Registration Number
                        </label>
                        <input
                          id="field-farmerIdNumber"
                          type="text"
                          disabled={formData.agriculture.dontKnowFarmerId}
                          value={formData.agriculture.farmerIdNumber || ''}
                          onChange={(e) => {
                            const upperVal = e.target.value.toUpperCase();
                            updateFormSection('agriculture', (prev) => ({ ...prev, farmerIdNumber: upperVal }), 'farmerIdNumber');
                          }}
                          placeholder={formData.agriculture.dontKnowFarmerId ? "ID Not Known" : "e.g. MH-WDA-2024-98765"}
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase font-mono text-[15px] focus:outline-none ${
                            formData.agriculture.dontKnowFarmerId ? 'opacity-50 cursor-not-allowed border-[#1F2937]' :
                            validationErrors['farmerIdNumber'] || /[\u0900-\u097F]/.test(formData.agriculture.farmerIdNumber || '')
                              ? 'border-rose-500 bg-rose-500/10'
                              : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        />
                        {!formData.agriculture.dontKnowFarmerId && /[\u0900-\u097F]/.test(formData.agriculture.farmerIdNumber || '') ? (
                          <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Farmer Registration Number must be in CAPITAL English (Marathi script not allowed).</p>
                        ) : validationErrors['farmerIdNumber'] ? (
                          <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['farmerIdNumber']}</p>
                        ) : null}
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
                        {['PM-KISAN', 'MAHA-DBT', 'PoCRA Yojana', 'Solar Pump', 'Drip Irrigation', 'Farm Mechanization', 'Soil Health Card', 'Other'].map((sch) => {
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

                      {/* PM-KISAN STATUS REMOVED */}

                      {/* GOVT SCHEME OTHER SPECIFY */}
                      {formData.agriculture.govtSchemesReceived?.includes('Other' as any) && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                          <label className={`font-medium text-[12px] block ${(validationErrors['govtSchemeOther'] || /[\u0900-\u097F]/.test(formData.agriculture.govtSchemeOther || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Please Specify Other Scheme <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-govtSchemeOther"
                            type="text"
                            value={formData.agriculture.govtSchemeOther || ''}
                            onChange={(e) => {
                              const upperVal = e.target.value.toUpperCase();
                              updateFormSection('agriculture', (prev) => ({ ...prev, govtSchemeOther: upperVal }), 'govtSchemeOther');
                            }}
                            placeholder="e.g. POCRA SUB-PROJECT"
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase font-bold text-[14px] focus:outline-none ${
                              validationErrors['govtSchemeOther'] || /[\u0900-\u097F]/.test(formData.agriculture.govtSchemeOther || '')
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {/[\u0900-\u097F]/.test(formData.agriculture.govtSchemeOther || '') ? (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Scheme Name must be in CAPITAL English (Marathi script not allowed).</p>
                          ) : validationErrors['govtSchemeOther'] ? (
                            <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['govtSchemeOther']}</p>
                          ) : null}
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
                        <label className={`font-medium text-[13px] block ${(validationErrors['fpoName'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoName || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          FPO Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="field-fpoName"
                          type="text"
                          value={formData.agriculture.fpoName || ''}
                          onChange={(e) => {
                            const upperVal = e.target.value.toUpperCase();
                            updateFormSection('agriculture', (prev) => ({ ...prev, fpoName: upperVal }), 'fpoName');
                          }}
                          placeholder="e.g. WARDHA FARMER PRODUCER CO. LTD."
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase font-bold text-[15px] focus:outline-none ${
                            validationErrors['fpoName'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoName || '')
                              ? 'border-rose-500 bg-rose-500/10'
                              : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        />
                        {/[\u0900-\u097F]/.test(formData.agriculture.fpoName || '') ? (
                          <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ FPO Name must be in CAPITAL English (Marathi script not allowed).</p>
                        ) : validationErrors['fpoName'] ? (
                          <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['fpoName']}</p>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <WizardSelect
                          label="Position in FPO *"
                          value={formData.agriculture.fpoPosition || 'Director'}
                          onChange={(v) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoPosition: v as any }), 'fpoPosition')}
                          options={[
                            { value: 'Director', label: 'Director', icon: '👔' },
                            { value: 'Chairman', label: 'Chairman / President', icon: '👑' },
                            { value: 'Secretary', label: 'Secretary', icon: '📝' },
                            { value: 'Treasurer', label: 'Treasurer', icon: '💰' },
                            { value: 'CEO', label: 'CEO / Manager', icon: '💼' },
                            { value: 'Shareholder Member', label: 'Shareholder Member', icon: '👥' },
                            { value: 'Farmer Member', label: 'Farmer Member', icon: '🌾' },
                            { value: 'Other', label: 'Other', icon: '🔄' },
                          ]}
                          small
                        />

                        <WizardSelect
                          label="Year Joined FPO *"
                          value={formData.agriculture.fpoYearJoined || '2022'}
                          onChange={(v) => updateFormSection('agriculture', (prev) => ({ ...prev, fpoYearJoined: v }), 'fpoYearJoined')}
                          options={Array.from({ length: 29 }, (_, i) => String(2028 - i)).map((yr) => ({
                            value: yr,
                            label: yr,
                            icon: '📅'
                          }))}
                          small
                        />
                      </div>

                      {formData.agriculture.fpoPosition === 'Other' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className={`font-medium text-[12px] block ${(validationErrors['fpoPositionOther'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoPositionOther || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Specify Position <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="field-fpoPositionOther"
                            type="text"
                            value={formData.agriculture.fpoPositionOther || ''}
                            onChange={(e) => {
                              const upperVal = e.target.value.toUpperCase();
                              updateFormSection('agriculture', (prev) => ({ ...prev, fpoPositionOther: upperVal }), 'fpoPositionOther');
                            }}
                            placeholder="e.g. TECHNICAL ADVISOR"
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase font-bold text-[14px] focus:outline-none ${
                              validationErrors['fpoPositionOther'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoPositionOther || '')
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {/[\u0900-\u097F]/.test(formData.agriculture.fpoPositionOther || '') ? (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Position must be in CAPITAL English (Marathi script not allowed).</p>
                          ) : validationErrors['fpoPositionOther'] ? (
                            <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['fpoPositionOther']}</p>
                          ) : null}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className={`font-medium text-[12px] block ${(validationErrors['fpoFarmersConnected'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoFarmersConnected || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Farmers Connected
                          </label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoFarmersConnected || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateFormSection('agriculture', (prev) => ({ ...prev, fpoFarmersConnected: val }), 'fpoFarmersConnected');
                            }}
                            placeholder="e.g. 150"
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3 text-white font-mono text-[14px] focus:outline-none ${
                              validationErrors['fpoFarmersConnected'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoFarmersConnected || '')
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {/[\u0900-\u097F]/.test(formData.agriculture.fpoFarmersConnected || '') ? (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ English digits only (Marathi font not allowed).</p>
                          ) : validationErrors['fpoFarmersConnected'] ? (
                            <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['fpoFarmersConnected']}</p>
                          ) : null}
                        </div>

                        <div className="space-y-1.5">
                          <label className={`font-medium text-[12px] block ${(validationErrors['fpoVillageCoverage'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoVillageCoverage || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                            Village Coverage
                          </label>
                          <input
                            type="text"
                            value={formData.agriculture.fpoVillageCoverage || ''}
                            onChange={(e) => {
                              const upperVal = e.target.value.toUpperCase();
                              updateFormSection('agriculture', (prev) => ({ ...prev, fpoVillageCoverage: upperVal }), 'fpoVillageCoverage');
                            }}
                            placeholder="e.g. 5 VILLAGES"
                            className={`w-full h-[48px] bg-[#182234] border rounded-[12px] px-3 text-white uppercase font-bold text-[14px] focus:outline-none ${
                              validationErrors['fpoVillageCoverage'] || /[\u0900-\u097F]/.test(formData.agriculture.fpoVillageCoverage || '')
                                ? 'border-rose-500 bg-rose-500/10'
                                : 'border-[#1F2937] focus:border-[#059669]'
                            }`}
                          />
                          {/[\u0900-\u097F]/.test(formData.agriculture.fpoVillageCoverage || '') ? (
                            <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ CAPITAL English / Digits only (Marathi font not allowed).</p>
                          ) : validationErrors['fpoVillageCoverage'] ? (
                            <p className="text-[11.5px] text-rose-400 font-medium mt-1">⚠️ {validationErrors['fpoVillageCoverage']}</p>
                          ) : null}
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
                    <div className="p-1 bg-[#182234] rounded-[14px] border border-[#1F2937] grid grid-cols-2 gap-1">
                      {['Yes', 'No'].map((opt) => (
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
                        <label className={`font-medium text-[13px] block ${(validationErrors['instituteName'] || /[\u0900-\u097F]/.test(formData.agriDrone.trainingDetails?.instituteName || '')) ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                          Training Institute Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="field-instituteName"
                          type="text"
                          value={formData.agriDrone.trainingDetails?.instituteName || ''}
                          onChange={(e) => {
                            const upperVal = e.target.value.toUpperCase();
                            updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, instituteName: upperVal } as any }), 'instituteName');
                          }}
                          placeholder="e.g. MPKV RAHURI / DGCA RPTO"
                          className={`w-full h-[50px] bg-[#182234] border rounded-[12px] px-3.5 text-white uppercase font-bold text-[15px] focus:outline-none ${
                            validationErrors['instituteName'] || /[\u0900-\u097F]/.test(formData.agriDrone.trainingDetails?.instituteName || '')
                              ? 'border-rose-500 bg-rose-500/10'
                              : 'border-[#1F2937] focus:border-[#059669]'
                          }`}
                        />
                        {/[\u0900-\u097F]/.test(formData.agriDrone.trainingDetails?.instituteName || '') ? (
                          <p className="text-[11.5px] text-rose-400 font-bold mt-1">⚠️ Institute Name must be in CAPITAL English (Marathi script not allowed).</p>
                        ) : validationErrors['instituteName'] ? (
                          <p className="text-[11.5px] text-rose-400 font-medium mt-1 animate-in fade-in">⚠️ {validationErrors['instituteName']}</p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <WizardSelect
                          label="Training Year *"
                          value={formData.agriDrone.trainingDetails?.trainingYear || '2024'}
                          onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, trainingDetails: { ...prev.trainingDetails, trainingYear: v } as any }), 'trainingYear')}
                          options={Array.from({ length: 29 }, (_, i) => String(2028 - i)).map((yr) => ({
                            value: yr,
                            label: yr,
                            icon: '📅'
                          }))}
                          small
                        />
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
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Capacity</label>
                          <WizardSelect
                            fieldId="field-droneCapacity"
                            value={formData.agriDrone.ownedDroneDetails?.capacity || '10 Liters'}
                            onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, capacity: v } as any }))}
                            options={[
                              { value: '10 Liters', label: '10 Liters' },
                              { value: '16 Liters', label: '16 Liters' },
                              { value: '25 Liters', label: '25 Liters' },
                              { value: '30 Liters', label: '30 Liters' },
                            ]}
                            small
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Category</label>
                          <WizardSelect
                            fieldId="field-droneCategory"
                            value={formData.agriDrone.ownedDroneDetails?.category || 'Small'}
                            onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, category: v } as any }))}
                            options={[
                              { value: 'Micro', label: 'Micro (<2kg)' },
                              { value: 'Small', label: 'Small (2-25kg)' },
                              { value: 'Medium', label: 'Medium (25-150kg)' },
                            ]}
                            small
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-medium text-[12px] text-slate-300 block">Drone Condition</label>
                          <WizardSelect
                            value={formData.agriDrone.ownedDroneDetails?.condition || 'Operational'}
                            onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, ownedDroneDetails: { ...prev.ownedDroneDetails, condition: v } as any }))}
                            options={[
                              { value: 'Operational', label: 'Operational' },
                              { value: 'Repair Required', label: 'Repair Required' },
                              { value: 'Not Working', label: 'Not Working' },
                            ]}
                            small
                          />
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
                              How do you plan to finance your drone purchase? <span className="text-rose-500">*</span>
                            </label>
                            <WizardSelect
                              fieldId="field-purchaseMethod"
                              value={formData.agriDrone.purchaseMethod || 'Government Subsidy / Subsidized Scheme'}
                              onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, purchaseMethod: v as any }), 'purchaseMethod')}
                              options={[
                                { value: 'Government Subsidy / Subsidized Scheme', label: 'Government Subsidy / Subsidized Scheme', icon: '🏛️' },
                                { value: 'Bank Loan', label: 'Bank Loan', icon: '🏦' },
                                { value: 'Self-Funded Purchase', label: 'Self-Funded Purchase', icon: '💰' },
                                { value: 'Leasing', label: 'Leasing', icon: '🤝' },
                                { value: 'Other', label: 'Other', icon: '🔄' },
                              ]}
                              small
                            />
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
                          {formData.agriDrone.purchaseMethod === 'Government Subsidy / Subsidized Scheme' && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <label className="font-medium text-[13px] text-slate-200 block">Govt Subsidy Scheme Application Status</label>
                              <WizardSelect
                                value={formData.agriDrone.schemeAppliedStatus || 'Planning to Apply'}
                                onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, schemeAppliedStatus: v as any }))}
                                options={[
                                  { value: 'Already Applied', label: 'Already Applied', icon: '✅' },
                                  { value: 'Planning to Apply', label: 'Planning to Apply', icon: '📝' },
                                  { value: 'No', label: 'Not Applied Yet', icon: '❌' },
                                ]}
                                small
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className={`font-medium text-[13px] block ${validationErrors['purchaseTimeline'] ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              Expected Timeline <span className="text-rose-500">*</span>
                            </label>
                            <WizardSelect
                              fieldId="field-purchaseTimeline"
                              value={formData.agriDrone.purchaseTimeline || 'Within 3 Months'}
                              onChange={(v) => updateFormSection('agriDrone', (prev) => ({ ...prev, purchaseTimeline: v as any }), 'purchaseTimeline')}
                              options={[
                                { value: 'Immediately', label: 'Immediately (Within 1 Month)', icon: '⚡' },
                                { value: 'Within 3 Months', label: 'Within 3 Months', icon: '📅' },
                                { value: 'Within 6 Months', label: 'Within 6 Months', icon: '📅' },
                                { value: 'Within 1 Year', label: 'Within 1 Year', icon: '🗓️' },
                                { value: 'After Training Completion', label: 'After Training Completion', icon: '🎓' },
                              ]}
                              small
                            />
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
                          items: ['Agri Drone Entrepreneur', 'Professional Drone Pilot'],
                        },
                        {
                          category: '🌾 Agri Business & Inputs',
                          items: [
                            'MAHA-AGRI Krushi Seva Kendra / Agri Service Centre',
                            'Soil Testing Entrepreneur',
                            'Nursery',
                            'Custom Hiring / Farm Machinery Rental',
                          ],
                        },
                        {
                          category: '💻 Agri Technology & Allied Sector',
                          items: [
                            'Food Processing',
                            'Dairy',
                            'Goat Farming',
                            'Poultry',
                            'Fisheries',
                            'Organic Farming',
                            'FPO Entrepreneur',
                            'Other',
                          ],
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
                  {['Agri Drone Entrepreneur', 'Professional Drone Pilot'].some((p) =>
                    (formData.entrepreneurInterest.selectedPrograms || []).includes(p as EntrepreneurProgram)
                  ) && (
                    <div className="p-4 bg-[#111827] rounded-[18px] border-2 border-[#059669] space-y-4 shadow-xl animate-in fade-in duration-200">
                      <div className="border-b border-[#059669]/40 pb-2.5">
                        <h4 className="font-extrabold text-[15px] text-[#059669] uppercase tracking-wider flex items-center space-x-2">
                          <span>✈️ Dynamic Module A: Agri Drone Enterprise</span>
                        </h4>
                        <p className="text-[12px] text-slate-300 leading-snug mt-1">
                          Configure your Agri Drone business profile and EDP workshop preferences.
                        </p>
                      </div>

                      {/* OUTSIDE QUESTION A: DRONE OWNERSHIP PREFERENCE */}
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">Drone Ownership Preference</label>
                        <WizardSelect
                          value={formData.entrepreneurInterest.moduleADrone?.ownershipInterest || 'Own'}
                          onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, ownershipInterest: v as any } }))}
                          options={[
                            { value: 'Own', label: 'Own Purchase', icon: '🛒' },
                            { value: 'Lease', label: 'Leasing / Rental', icon: '🤝' },
                            { value: 'Franchise', label: 'Franchise Model', icon: '🏢' },
                          ]}
                          small
                        />
                      </div>

                      {/* OUTSIDE QUESTION B: FINANCING PLAN */}
                      <div className="space-y-1.5">
                        <label className="font-medium text-[13px] text-slate-300 block">How do you plan to finance your drone purchase?</label>
                        <WizardSelect
                          value={formData.entrepreneurInterest.moduleADrone?.purchasePreference || 'Government Subsidy / Subsidized Scheme'}
                          onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, purchasePreference: v } as any }))}
                          options={[
                            { value: 'Government Subsidy / Subsidized Scheme', label: 'Government Subsidy / Subsidized Scheme', icon: '🏛️' },
                            { value: 'Bank Loan', label: 'Bank Loan', icon: '🏦' },
                            { value: 'Self-Funded Purchase', label: 'Self-Funded Purchase', icon: '💰' },
                            { value: 'Leasing', label: 'Leasing', icon: '🤝' },
                            { value: 'Other', label: 'Other', icon: '🔄' },
                          ]}
                          small
                        />
                      </div>

                      {/* OUTSIDE QUESTION C: MANDATORY EDP AGREEMENT */}
                      <div id="field-agreeToCompleteEdpBeforeOnboarding" className="space-y-1.5 p-3 bg-[#182234]/80 rounded-[14px] border border-emerald-500/30">
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

                      {/* ========================================================================= */}
                      {/* V5 SUBSECTION: ENTREPRENEUR DEVELOPMENT PROGRAM (EDP) – AGRI DRONE */}
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

                        {/* Q1: EDP WORKSHOP ATTENDANCE */}
                        <div id="field-canAttendWorkshop" className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q1. Will you be able to attend the 2-Day EDP Workshop?</label>
                          <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                            {['Yes', 'No', 'Maybe'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, canAttendWorkshop: opt as any } } as any }))}
                                className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                                  (formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop || 'Yes') === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop === 'No' && (
                          <div id="field-cannotAttendReason" className="space-y-1.5 animate-in fade-in duration-200">
                            <label className="font-medium text-[13px] text-slate-300 block">Reason for Not Attending</label>
                            <WizardSelect
                              fieldId="field-cannotAttendReason"
                              value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReason || 'Distance / Venue Location'}
                              onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, cannotAttendReason: v as any } } as any }))}
                              options={[
                                { value: 'Distance / Venue Location', label: 'Distance / Venue Location', icon: '📍' },
                                { value: 'Occupied with Work / Business', label: 'Occupied with Work / Business', icon: '💼' },
                                { value: 'Financial Constraints', label: 'Financial Constraints', icon: '💰' },
                                { value: 'Health / Personal Reason', label: 'Health / Personal Reason', icon: '🏥' },
                                { value: 'Other', label: 'Other', icon: '🔄' },
                              ]}
                              small
                            />
                            {formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReason === 'Other' && (
                              <input
                                type="text"
                                value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.cannotAttendReasonOther || ''}
                                onChange={(e) => {
                                  const upperVal = e.target.value.toUpperCase();
                                  updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, cannotAttendReasonOther: upperVal } } as any }));
                                }}
                                placeholder="PLEASE SPECIFY REASON"
                                className="w-full h-[44px] mt-1 bg-[#182234] border border-[#1F2937] rounded-[10px] px-3.5 text-white uppercase font-bold text-[13px] focus:border-[#059669] focus:outline-none"
                              />
                            )}
                          </div>
                        )}

                        {/* Q2: PREFERRED TRAINING LOCATION */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q2. Preferred Training Location</label>
                          <WizardSelect
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredTrainingLocation || 'Taluka HQ'}
                            onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, preferredTrainingLocation: v as any } } as any }))}
                            options={[
                              { value: 'Taluka HQ', label: 'Taluka HQ', icon: '🏛️' },
                              { value: 'District HQ', label: 'District HQ', icon: '🏢' },
                              { value: 'Either Taluka or District HQ', label: 'Either Taluka or District HQ', icon: '📍' },
                            ]}
                            small
                          />
                        </div>

                        {/* Q3: POST-EDP PLAN */}
                        <div id="field-postTrainingPlan" className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">
                            Q3. After completing the EDP Workshop, what do you plan to do? <span className="text-rose-500">*</span>
                          </label>
                          <WizardSelect
                            fieldId="field-postTrainingPlan"
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan || 'Start My Own Agri Drone Spraying Business'}
                            onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, postTrainingPlan: v } } as any }))}
                            options={[
                              { value: 'Start My Own Agri Drone Spraying Business', label: '🚁 Start My Own Agri Drone Spraying Business' },
                              { value: 'Become a Professional Drone Pilot', label: '👨‍✈️ Become a Professional Drone Pilot' },
                              { value: 'Start a Drone Rental / Custom Hiring Center', label: '🚜 Start a Drone Rental / Custom Hiring Center' },
                              { value: 'Work as a Drone Operator with MAHA-AGRI', label: '🏢 Work as a Drone Operator with MAHA-AGRI' },
                              { value: 'Start a Drone Sales, Service & Repair Center', label: '🛠️ Start a Drone Sales, Service & Repair Center' },
                              { value: 'Provide Agri Drone Services in My Village / Local Area', label: '🌾 Provide Agri Drone Services in My Village / Local Area' },
                              { value: 'Other', label: 'Other' },
                            ]}
                            small
                          />
                        </div>

                        {/* Q4: INITIAL SERVICE COVERAGE */}
                        <div id="field-villagesTargetToServe" className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q4. How many villages do you plan to serve initially?</label>
                          <WizardSelect
                            fieldId="field-villagesTargetToServe"
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.villagesTargetToServe || '1–5 Villages'}
                            onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, villagesTargetToServe: v as any } } as any }))}
                            options={[
                              { value: '1–5 Villages', label: '1–5 Villages' },
                              { value: '5–10 Villages', label: '5–10 Villages' },
                              { value: '11–20 Villages', label: '11–20 Villages' },
                              { value: '21–50 Villages', label: '21–50 Villages' },
                              { value: '50+ Villages', label: '50+ Villages' },
                            ]}
                            small
                          />
                        </div>

                        {/* Q5: WORKING WITH MAHA-AGRI */}
                        <div id="field-mahaAgriWorkingModel" className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q5. How would you like to work with MAHA-AGRI?</label>
                          <WizardSelect
                            fieldId="field-mahaAgriWorkingModel"
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.mahaAgriWorkingModel || 'MAHA-AGRI Business Partner'}
                            onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, mahaAgriWorkingModel: v as any } } as any }))}
                            options={[
                              { value: 'I do not plan to work with MAHA-AGRI', label: '🚫 I do not plan to work with MAHA-AGRI' },
                              { value: 'MAHA-AGRI Business Partner', label: '🤝 MAHA-AGRI Business Partner' },
                              { value: 'Agri Drone Pilot / Operator with MAHA-AGRI', label: '👨‍✈️ Agri Drone Pilot / Operator with MAHA-AGRI' },
                              { value: 'Business Partner + Drone Pilot / Operator', label: '🤝👨‍✈️ Business Partner + Drone Pilot / Operator' },
                              { value: 'MAHA-AGRI District / Local Partner', label: '📍 MAHA-AGRI District / Local Partner' },
                              { value: 'Other', label: 'Other' },
                            ]}
                            small
                          />
                        </div>

                        {/* Q6: DRONE BUSINESS OPERATION */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-200 block">Q6. How do you plan to operate your Agri Drone business?</label>
                          <WizardSelect
                            value={formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.droneBusinessOperation || 'I will operate the drone myself as an individual entrepreneur'}
                            onChange={(v) => updateFormSection('entrepreneurInterest', (prev) => ({ ...prev, moduleADrone: { ...prev.moduleADrone, edpWorkshop: { ...prev.moduleADrone?.edpWorkshop, droneBusinessOperation: v } } as any }))}
                            options={[
                              { value: 'I will operate the drone myself as an individual entrepreneur', label: '👤 I will operate the drone myself as an individual entrepreneur' },
                              { value: 'I will own the drone and work with a trained drone pilot', label: '👨‍✈️ I will own the drone and work with a trained drone pilot' },
                              { value: 'I will operate the business with a partner / team', label: '👥 I will operate the business with a partner / team' },
                              { value: 'I will hire a trained drone operator to provide services', label: '🚜 I will hire a trained drone operator to provide services' },
                              { value: 'I will operate through an FPO / Farmer Group', label: '🌾 I will operate through an FPO / Farmer Group' },
                              { value: 'I will operate through an SHG / Cooperative', label: '🏛️ I will operate through an SHG / Cooperative' },
                              { value: 'Other', label: '🔄 Other' },
                            ]}
                            small
                          />
                        </div>
                      </div>
                    </div>
                  )}


                </div>
              )}

              {/* SECTION 6: INVESTMENT CAPACITY */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* CARD 1: INVESTMENT CAPACITY & OWN CAPITAL */}
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
                        <WizardSelect
                          fieldId="field-investmentCapacity"
                          value={formData.investment.capacity || 'Up to ₹50,000'}
                          onChange={(v) => updateFormSection('investment', (prev) => ({ ...prev, capacity: v as InvestmentCapacityRange }), 'investmentCapacity')}
                          options={[
                            { value: 'Up to ₹50,000', label: 'Up to ₹50,000', icon: '💵' },
                            { value: '₹50,000–₹1 Lakh', label: '₹50,000–₹1 Lakh', icon: '💵' },
                            { value: '₹1–2 Lakh', label: '₹1–2 Lakh', icon: '💰' },
                            { value: '₹2–5 Lakh', label: '₹2–5 Lakh', icon: '💰' },
                            { value: '₹5–10 Lakh', label: '₹5–10 Lakh', icon: '🏦' },
                            { value: '₹10 Lakh & Above', label: '₹10 Lakh & Above', icon: '🏛️' },
                          ]}
                          small
                        />
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
                        Primary Source of Initial Investment <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <WizardSelect
                          fieldId="field-investmentSource"
                          value={formData.investment.source || 'Self Investment / Own Capital'}
                          onChange={(v) => updateFormSection('investment', (prev) => ({ ...prev, source: v as InvestmentSourceType }), 'investmentSource')}
                          options={[
                            { value: 'Self Investment / Own Capital', label: 'Self Investment / Own Capital', icon: '👤' },
                            { value: 'Family / Relatives Savings', label: 'Family / Relatives Savings', icon: '👨‍👩‍👧' },
                            { value: 'Bank Loan / Business Loan', label: 'Bank Loan / Business Loan', icon: '🏦' },
                            { value: 'Government Scheme / Subsidy', label: 'Government Scheme / Subsidy', icon: '🏛️' },
                            { value: 'Private Investor / Angel Funding', label: 'Private Investor / Angel Funding', icon: '🤝' },
                            { value: 'Other', label: 'Other', icon: '🔄' },
                          ]}
                          small
                        />
                      </div>
                      {validationErrors['investmentSource'] && (
                        <p id="error-investmentSource" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['investmentSource']}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: FUNDING ASSISTANCE */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Funding Assistance</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Select your preferred type of funding assistance.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium text-[13px] text-slate-300 block">What type of financial support are you interested in?</label>
                      <WizardSelect
                        value={formData.investment.preferredFundingAssistance || 'Government Subsidy Scheme (CMEGP / MAHA-DBT)'}
                        onChange={(v) => updateFormSection('investment', (prev) => ({ ...prev, preferredFundingAssistance: v }))}
                        options={[
                          { value: 'Government Subsidy Scheme (CMEGP / MAHA-DBT)', label: 'Government Subsidy Scheme (CMEGP / MAHA-DBT)', icon: '🏛️' },
                          { value: 'Bank Loan / Business Loan', label: 'Bank Loan / Business Loan', icon: '🏦' },
                          { value: 'Self Investment / Family Savings', label: 'Self Investment / Family Savings', icon: '💰' },
                          { value: 'Private Investor / Angel Funding', label: 'Private Investor / Angel Funding', icon: '🤝' },
                          { value: 'Combination of Government Scheme + Bank Loan', label: 'Combination of Government Scheme + Bank Loan', icon: '🔗' },
                          { value: 'Not Sure / Need Guidance', label: 'Not Sure / Need Guidance', icon: '❓' },
                          { value: 'Other', label: 'Other', icon: '🔄' },
                        ]}
                        small
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: LOAN & FINANCIAL PROFILE */}
              {currentStep === 7 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* SECTION 1: EXISTING LOANS & CREDIT PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>Existing Loans & Credit Profile</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Financial liability and approximate credit rating.</p>
                    </div>

                    {/* Q1: RUNNING LOANS STATUS */}
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

                    {/* CONDITIONAL LOAN QUESTIONS (Q2 & Q3) */}
                    {formData.financial.hasRunningLoan && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        {/* Q2: RUNNING LOAN TYPES (MULTI-SELECT) */}
                        <div
                          id="field-runningLoanTypes"
                          className={`p-3.5 bg-[#182234] rounded-[16px] border space-y-2 transition-all ${
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

                        {/* Q3: APPROXIMATE TOTAL MONTHLY EMI OBLIGATION */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-[13px] text-slate-300 block">Approximate Total Monthly EMI Obligation</label>
                          <WizardSelect
                            value={formData.financial.monthlyEmiObligation || 'Up to ₹5,000'}
                            onChange={(v) => updateFormSection('financial', (prev) => ({ ...prev, monthlyEmiObligation: v }))}
                            options={[
                              { value: 'No EMI / Not Applicable', label: 'No EMI / Not Applicable', icon: '💳' },
                              { value: 'Up to ₹5,000', label: 'Up to ₹5,000', icon: '💵' },
                              { value: '₹5,001–₹10,000', label: '₹5,001–₹10,000', icon: '💵' },
                              { value: '₹10,001–₹20,000', label: '₹10,001–₹20,000', icon: '💰' },
                              { value: '₹20,001–₹30,000', label: '₹20,001–₹30,000', icon: '💰' },
                              { value: '₹30,001–₹50,000', label: '₹30,001–₹50,000', icon: '🏦' },
                              { value: 'Above ₹50,000', label: 'Above ₹50,000', icon: '🏛️' },
                            ]}
                            small
                          />
                        </div>
                      </div>
                    )}

                    {/* Q4: CIBIL SCORE */}
                    <div className="space-y-2">
                      <label className={`font-medium text-[14px] block ${validationErrors['cibilScore'] ? 'text-rose-400 font-semibold' : 'text-slate-200'}`}>
                        Approximate CIBIL Score <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <WizardSelect
                          fieldId="field-cibilScore"
                          value={formData.financial.cibilScore || '700–750'}
                          onChange={(v) => updateFormSection('financial', (prev) => ({ ...prev, cibilScore: v as CibilScoreRange }), 'cibilScore')}
                          options={[
                            { value: 'Above 750', label: 'Above 750 (Excellent)', icon: '⭐' },
                            { value: '700–750', label: '700–750 (Good)', icon: '✅' },
                            { value: '650–700', label: '650–700 (Average)', icon: '📊' },
                            { value: '600–650', label: '600–650 (Below Average)', icon: '⚠️' },
                            { value: 'Below 600', label: 'Below 600 (Low Credit Score)', icon: '❌' },
                            { value: "Don't Know", label: "Don't Know / No CIBIL History", icon: '❓' },
                          ]}
                          small
                        />
                      </div>
                      {validationErrors['cibilScore'] && (
                        <p id="error-cibilScore" role="alert" className="text-[12px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1.5 animate-in fade-in duration-180">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{validationErrors['cibilScore']}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2: PREVIOUS GOVERNMENT SCHEME BENEFITS */}
                  <div className="p-4 bg-[#111827] rounded-[18px] border border-[#1F2937] space-y-3.5 shadow-md">
                    <div className="border-b border-[#1F2937] pb-2">
                      <h3 className="text-[14px] font-bold text-white flex items-center space-x-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Previous Government Scheme Benefits</span>
                      </h3>
                      <p className="text-[11.5px] text-[#94A3B8]">Details of previous benefits received under specific government schemes for admin shortlisting.</p>
                    </div>

                    {/* Q5: CMEGP BENEFIT */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-[13px] text-slate-200 block">Have you previously availed benefits under CMEGP?</label>
                      <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                        {(['Yes', 'No', 'Not Sure'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateFormSection('financial', (prev) => ({ ...prev, hasCmegpBenefit: opt }))}
                            className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                              (formData.financial.hasCmegpBenefit || 'No') === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q6: MAHA-DBT AGRI MACHINERY BENEFIT */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-[13px] text-slate-200 block">
                        Have you previously availed benefits under MAHA-DBT Agriculture Machinery Scheme?
                      </label>
                      <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                        {(['Yes', 'No', 'Not Sure'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateFormSection('financial', (prev) => ({ ...prev, hasMahaDbtAgriMachineryBenefit: opt }))}
                            className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                              (formData.financial.hasMahaDbtAgriMachineryBenefit || 'No') === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q7: OTHER GOVT SCHEME BENEFIT */}
                    <div className="space-y-1.5">
                      <label className="font-medium text-[13px] text-slate-200 block">
                        Have you previously availed benefits under any other Government Scheme?
                      </label>
                      <div className="p-1 bg-[#182234] rounded-[12px] border border-[#1F2937] grid grid-cols-3 gap-1">
                        {(['Yes', 'No', 'Not Sure'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateFormSection('financial', (prev) => ({ ...prev, hasOtherGovtSchemeBenefit: opt }))}
                            className={`h-[42px] rounded-[8px] text-[13px] font-semibold transition-all ${
                              (formData.financial.hasOtherGovtSchemeBenefit || 'No') === opt ? 'bg-[#059669] text-white shadow-sm' : 'text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q8 (CONDITIONAL ON Q7 = YES): WHICH GOVERNMENT SCHEME? */}
                    {formData.financial.hasOtherGovtSchemeBenefit === 'Yes' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="font-medium text-[13px] text-slate-300 block">Which Government Scheme?</label>
                        <input
                          type="text"
                          value={formData.financial.otherGovtSchemeName || ''}
                          onChange={(e) => {
                            const upperVal = e.target.value.toUpperCase();
                            updateFormSection('financial', (prev) => ({ ...prev, otherGovtSchemeName: upperVal }));
                          }}
                          placeholder="PLEASE SPECIFY SCHEME NAME"
                          className="w-full h-[44px] bg-[#182234] border border-[#1F2937] rounded-[10px] px-3.5 text-white uppercase font-bold text-[13px] focus:border-[#059669] focus:outline-none"
                        />
                      </div>
                    )}
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
                        onClick={() => handleEditStep(1)}
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
                        onClick={() => handleEditStep(2)}
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
                        onClick={() => handleEditStep(3)}
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
                      <div>
                        <span className="text-[#94A3B8] block">FPO Membership</span>
                        <strong className="text-white font-medium">
                          {formData.agriculture.isFpoMember
                            ? (() => {
                                const parts: string[] = [];
                                if (formData.agriculture.fpoPosition) parts.push(formData.agriculture.fpoPosition === 'Other' ? (formData.agriculture.fpoPositionOther || 'Other') : formData.agriculture.fpoPosition);
                                if (formData.agriculture.fpoYearJoined) parts.push(`Joined ${formData.agriculture.fpoYearJoined}`);
                                if (formData.agriculture.fpoFarmersConnected) parts.push(`${formData.agriculture.fpoFarmersConnected} Farmers`);
                                if (formData.agriculture.fpoVillageCoverage) parts.push(formData.agriculture.fpoVillageCoverage);
                                const detailsStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
                                return `${formData.agriculture.fpoName || 'FPO'}${detailsStr}`;
                              })()
                            : 'No'}
                        </strong>
                      </div>
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
                        onClick={() => handleEditStep(4)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-cyan-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Knows Drones?</span><strong className="text-white font-medium">{formData.agriDrone.knowsAgriDrones}</strong></div>
                      <div><span className="text-[#94A3B8] block">Attended Training?</span><strong className="text-white font-medium">{formData.agriDrone.attendedTraining ? `${formData.agriDrone.trainingDetails?.instituteName} (${formData.agriDrone.trainingDetails?.trainingYear})` : 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Possess RPC Certificate?</span><strong className="text-emerald-400 font-medium">{formData.agriDrone.hasRpc ? 'Yes (Certified Pilot)' : 'No'}</strong></div>
                      <div>
                        <span className="text-[#94A3B8] block">Currently Owns Drone?</span>
                        <strong className="text-white font-medium">
                          {formData.agriDrone.currentlyOwnsDrone
                            ? (() => {
                                const mfr = formData.agriDrone.ownedDroneDetails?.manufacturer === 'Other'
                                  ? formData.agriDrone.ownedDroneDetails?.manufacturerOther
                                  : formData.agriDrone.ownedDroneDetails?.manufacturer;
                                const mdl = formData.agriDrone.ownedDroneDetails?.model;
                                if (mfr && mdl) return `${mfr} (${mdl})`;
                                if (mfr) return mfr;
                                if (mdl) return `Owned (${mdl})`;
                                return 'Yes (Owned)';
                              })()
                            : 'No'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* CARD 5: ENTREPRENEUR PROGRAMS & EDP RESPONSES */}
                  <div className="p-[#111827] bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3 p-4">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-[#0D9488]" />
                        <h4 className="font-bold text-[14px] text-white">5. Selected Programs & EDP Responses</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditStep(5)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-[#0D9488] hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-[13px]">
                      <div>
                        <span className="text-[#94A3B8] block">Selected Programs ({formData.entrepreneurInterest.selectedPrograms.length})</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.entrepreneurInterest.selectedPrograms.map((p) => (
                            <span key={p} className="px-2 py-0.5 bg-[#182234] border border-[#1F2937] rounded-md text-[11px] text-emerald-300">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      {formData.entrepreneurInterest.selectedPrograms.some((p) => p === 'Agri Drone Entrepreneur' || p === 'Professional Drone Pilot') && (
                        <div className="pt-2 border-t border-[#1F2937] space-y-1">
                          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">🎓 Dynamic Module A: Agri Drone Enterprise</span>
                          <div className="grid grid-cols-2 gap-1.5 text-[12px] text-slate-300">
                            <div>Workshop Attendance: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.canAttendWorkshop || 'Yes'}</strong></div>
                            <div>Training Location: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.preferredTrainingLocation || 'Taluka HQ'}</strong></div>
                            <div>Post-Training Plan: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.postTrainingPlan || 'Start My Own Agri Drone Spraying Business'}</strong></div>
                            <div>Village Coverage: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.villagesTargetToServe || '1–5 Villages'}</strong></div>
                            <div>Work with MAHA-AGRI: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.mahaAgriWorkingModel || 'MAHA-AGRI Business Partner'}</strong></div>
                            <div>Business Operation: <strong className="text-white">{formData.entrepreneurInterest.moduleADrone?.edpWorkshop?.droneBusinessOperation || 'I will operate the drone myself as an individual entrepreneur'}</strong></div>
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
                        onClick={() => handleEditStep(6)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-emerald-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Initial Investment Capacity</span><strong className="text-white font-medium">{formData.investment.capacity}</strong></div>
                      <div><span className="text-[#94A3B8] block">Primary Source of Initial Investment</span><strong className="text-white font-medium">{formData.investment.source}</strong></div>
                      <div className="col-span-2"><span className="text-[#94A3B8] block">Financial Support Interested In</span><strong className="text-emerald-400 font-medium">{formData.investment.preferredFundingAssistance || 'Not Specified'}</strong></div>
                    </div>
                  </div>

                  {/* CARD 7: LOAN & FINANCIAL PROFILE */}
                  <div className="p-4 bg-[#111827] rounded-[16px] border border-[#1F2937] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937] pb-2.5">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <h4 className="font-bold text-[14px] text-white">7. Loan & Financial Profile</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditStep(7)}
                        className="px-2.5 py-1 bg-[#182234] hover:bg-[#1F2937] text-teal-400 hover:text-white text-[12px] font-medium rounded-lg border border-[#1F2937] transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="text-[#94A3B8] block">Running Loans?</span><strong className="text-white font-medium">{formData.financial.hasRunningLoan ? (formData.financial.runningLoanTypes?.join(', ') || 'Yes') : 'No'}</strong></div>
                      {formData.financial.hasRunningLoan && (
                        <div><span className="text-[#94A3B8] block">Monthly EMI Obligation</span><strong className="text-white font-medium">{formData.financial.monthlyEmiObligation || 'Not Specified'}</strong></div>
                      )}
                      <div><span className="text-[#94A3B8] block">Approximate CIBIL Score</span><strong className="text-emerald-400 font-medium">{formData.financial.cibilScore}</strong></div>
                      <div><span className="text-[#94A3B8] block">CMEGP Benefit</span><strong className="text-white font-medium">{formData.financial.hasCmegpBenefit || 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">MAHA-DBT Machinery Benefit</span><strong className="text-white font-medium">{formData.financial.hasMahaDbtAgriMachineryBenefit || 'No'}</strong></div>
                      <div><span className="text-[#94A3B8] block">Other Govt Scheme</span><strong className="text-white font-medium">{formData.financial.hasOtherGovtSchemeBenefit === 'Yes' ? `Yes (${formData.financial.otherGovtSchemeName || ''})` : (formData.financial.hasOtherGovtSchemeBenefit || 'No')}</strong></div>
                    </div>
                  </div>

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
                        I declare that the information provided in this application is true and correct.
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
                        I understand that submission of this application does not guarantee selection, EDP training admission, drone subsidy, loan approval, or financial assistance.
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
                        If shortlisted, I agree to participate in the required assessment, interview, EDP training, document verification and other project-related processes.
                      </span>
                    </label>

                    {/* MANDATORY VERIFICATION CHECKBOX */}
                    <div className="pt-2 border-t border-[#1F2937]">
                      <label className="flex items-start space-x-3 cursor-pointer p-2.5 bg-[#182234] rounded-xl border border-emerald-500/40">
                        <input
                          type="checkbox"
                          checked={isVerifiedByCandidate}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setIsVerifiedByCandidate(val);
                            updateFormSection('declaration', (prev) => ({
                              ...prev,
                              isInformationTrue: val,
                              understandsNoGuarantee: val,
                              agreesToAssessmentProcess: val,
                            }));
                          }}
                          className="rounded border-slate-700 bg-[#0B1220] text-[#059669] w-5 h-5 mt-0.5 cursor-pointer"
                        />
                        <span className="text-emerald-300 font-semibold text-[13px] leading-relaxed">
                          I have reviewed and verified all the information provided above and confirm that it is true and accurate.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 9: FINAL SUBMISSION CONFIRMATION */}
              {currentStep === 9 && (
                <div className="py-6 px-4 bg-[#0B1220] text-slate-100 space-y-6 text-center animate-in fade-in duration-300 max-w-sm mx-auto flex flex-col justify-center items-center min-h-[60vh]">
                  
                  {/* 1. PREMIUM SUCCESS ICON */}
                  <div className="space-y-4 w-full">
                    <div className="relative flex items-center justify-center mx-auto w-20 h-20">
                      <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500/80 flex items-center justify-center shadow-2xl shadow-emerald-900/50">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[2.5]" />
                      </div>
                    </div>

                    {/* 2. MAIN HEADING */}
                    <div className="space-y-1.5">
                      <h1 className="font-black text-[22px] sm:text-[25px] text-white tracking-tight leading-tight">
                        ✓ Submission Confirmed
                      </h1>
                      <p className="text-[13.5px] text-slate-300 font-medium leading-relaxed">
                        Your application has been successfully submitted.
                      </p>
                    </div>
                  </div>

                  {/* 3. APPLICATION ID CARD */}
                  <div className="w-full bg-[#111827] rounded-2xl border border-emerald-500/40 p-5 text-center space-y-2.5 shadow-xl shadow-emerald-950/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />
                    <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">
                      APPLICATION ID
                    </span>
                    <strong className="text-emerald-400 font-mono text-[20px] sm:text-[22px] font-extrabold tracking-wider block select-all">
                      {submissionResult?.candidateId || 'MAHA-AGRI-EDP-84729103'}
                    </strong>
                    <p className="text-[12px] text-slate-400 font-normal pt-2 border-t border-[#1F2937]">
                      Please keep this Application ID for future reference.
                    </p>
                  </div>

                  {/* 3B. EDP TRAINING FEE BADGE / SUMMARY */}
                  <div className="w-full bg-[#111827] rounded-xl border border-[#1F2937] px-4 py-3 flex items-center justify-between shadow-md">
                    <div className="text-left">
                      <span className="text-slate-300 text-[13px] font-semibold block">EDP Training Fee</span>
                      <span className="text-[11px] text-slate-400">Fixed Government Enrolment Rate</span>
                    </div>
                    <span className="text-emerald-400 text-[16px] font-bold font-mono">₹2,068</span>
                  </div>

                  {/* 4. STATUS */}
                  <div className="w-full bg-[#111827] rounded-xl border border-[#1F2937] px-4 py-3 flex items-center justify-between shadow-md">
                    <span className="text-slate-400 text-[13px] font-medium">Status</span>
                    {paymentStatus === 'PAID' ? (
                      <span className="text-emerald-400 text-[13.5px] font-semibold flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Fee Paid & Enrolled</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[13.5px] font-semibold flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Application Received</span>
                      </span>
                    )}
                  </div>

                  {/* 4B. VERIFIED PAYMENT REFERENCE (If paid) */}
                  {paymentStatus === 'PAID' && paymentTransactionId && (
                    <div className="w-full bg-[#064E3B]/40 rounded-xl border border-emerald-500/40 px-4 py-3 text-left space-y-1 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-300">
                          Payment Reference
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                          VERIFIED
                        </span>
                      </div>
                      <span className="font-mono text-[13px] text-emerald-200 font-bold block select-all">
                        {paymentTransactionId}
                      </span>
                      <p className="text-[11px] text-emerald-300/80">
                        EDP Training Seat Reserved & Portal Access Activated.
                      </p>
                    </div>
                  )}

                  {/* 4C. PAYMENT GATEWAY NOTICE (If error) */}
                  {paymentError && (
                    <div className="w-full bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 text-left space-y-1 text-rose-300 text-xs animate-in fade-in">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Payment Notice</span>
                      </div>
                      <p className="leading-snug">{paymentError}</p>
                    </div>
                  )}

                  {/* 5. ACTIONS: PAY EDP TRAINING FEE (PRIMARY) & BACK TO HOME (SECONDARY) */}
                  <div className="w-full pt-1 space-y-3">
                    {/* Primary Button: Pay EDP Training Fee — ₹2,068 */}
                    <button
                      type="button"
                      disabled={isPaymentProcessing || paymentStatus === 'PAID'}
                      onClick={handlePayEdpFee}
                      className={`w-full h-[56px] min-h-[56px] font-bold text-[16px] rounded-[16px] transition-all cursor-pointer flex items-center justify-center space-x-2.5 active:scale-[0.99] ${
                        paymentStatus === 'PAID'
                          ? 'bg-[#064E3B] text-emerald-200 border border-emerald-500/50 cursor-default opacity-90'
                          : isPaymentProcessing
                          ? 'bg-[#047857] text-white opacity-90 cursor-wait shadow-lg shadow-emerald-950/40'
                          : 'bg-[#059669] hover:bg-[#047857] text-white shadow-lg shadow-emerald-950/40'
                      }`}
                    >
                      {isPaymentProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 text-white animate-spin shrink-0" />
                          <span>Connecting Cashfree Gateway...</span>
                        </>
                      ) : paymentStatus === 'PAID' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                          <span>✓ EDP Training Fee Paid</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 text-white shrink-0" />
                          <span>Pay EDP Training Fee — ₹2,068</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Button: Back to Home */}
                    <button
                      type="button"
                      onClick={handleNavigateHome}
                      className="w-full h-[56px] min-h-[56px] bg-[#111827] hover:bg-[#182234] text-slate-200 hover:text-white font-semibold text-[15px] rounded-[16px] border border-[#1F2937] hover:border-slate-600 shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2.5 active:scale-[0.99]"
                    >
                      <Home className="w-5 h-5 text-slate-400 shrink-0" />
                      <span>Back to Home</span>
                    </button>
                  </div>

                </div>
              )}

            </main>

            {/* ========================================================================= */}
            {/* STICKY BOTTOM ACTION FOOTER (56px TOUCH TARGETS, FILLED EMERALD PRIMARY) */}
            {/* ========================================================================= */}
            {currentStep < 9 && (
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
            )}

      </div>
    </div>
  );
};
