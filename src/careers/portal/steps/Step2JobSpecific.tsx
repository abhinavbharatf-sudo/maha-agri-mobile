import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Briefcase,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Plus,
  Trash2,
  Award,
  Clock,
  Compass,
  Building2,
  Home,
  X,
  ShieldCheck
} from 'lucide-react';
import { getTalukasForDistrict, MAHARASHTRA_DISTRICTS } from '../../../data/maharashtraGeography';
import type { RmsJobPosting } from '../../lib/types';
import { getDefaultLocationQuestions } from '../../lib/constants';
import {
  checkResidentialVacancyEligibility,
  getLocationVacancyStatus,
  type VacancyEligibilityResult
} from '../utils/vacancyEligibility';
import {
  QUALIFICATION_LEVELS,
  COURSE_OPTIONS_BY_LEVEL,
  INITIAL_QUALIFICATION,
  INITIAL_EXPERIENCE,
  determineHighestQualificationIndex,
  type JobSpecificFormData,
  type MasterProfileFormData,
  type QualificationEntry,
  type WorkExperienceEntry,
  type DistrictPreference,
  type MobilityConsentRecord
} from '../types';
import { calculateAge, calculateDuration, calculateMergedTotalExperience, getLocalTodayIso } from '../utils/verhoeff';

export const MOBILITY_CONSENT_TEXT = "I understand that I have selected preferred posting locations outside my current and/or permanent residential district. I am willing to work in the selected districts, subject to vacancy availability, recruitment requirements and the organisation's final posting decision. My preferences do not guarantee posting in any specific district or taluka.";

/**
 * Dynamically builds the explanatory text for outside preferred posting districts,
 * taking into account both Current and Permanent Residential Districts.
 */
export function getOutsideDistrictsExplanation(
  outsideDistricts: string[],
  currentDistrict?: string | null,
  permanentDistrict?: string | null,
  isSameAddress?: boolean
): string {
  if (!outsideDistricts || outsideDistricts.length === 0) return '';

  const outsideStr = outsideDistricts.join(', ');
  const isPlural = outsideDistricts.length > 1;
  const verb = isPlural ? 'are' : 'is';

  const cleanCurrent = (currentDistrict || '').trim();
  const cleanPermanent = (permanentDistrict || '').trim();

  const hasBothDistinct = Boolean(
    cleanCurrent &&
    cleanPermanent &&
    !isSameAddress &&
    cleanCurrent.toLowerCase() !== cleanPermanent.toLowerCase()
  );

  if (hasBothDistinct) {
    return `You have selected ${outsideStr}, which ${verb} outside both your current residential district (${cleanCurrent}) and permanent residential district (${cleanPermanent}).`;
  }

  if (cleanCurrent) {
    return `You have selected ${outsideStr}, which ${verb} outside your declared residential district (${cleanCurrent}).`;
  }

  if (cleanPermanent) {
    return `You have selected ${outsideStr}, which ${verb} outside your permanent residential district (${cleanPermanent}).`;
  }

  return `You have selected ${outsideStr}, which ${verb} outside your declared residential district.`;
}

interface Step2JobSpecificProps {
  data: JobSpecificFormData;
  masterProfile?: MasterProfileFormData;
  onMasterProfileChange?: (field: keyof MasterProfileFormData, value: any) => void;
  job: RmsJobPosting;
  onChange: <K extends keyof JobSpecificFormData>(field: K, value: JobSpecificFormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  returnToReview?: boolean;
  targetSection?: string | null;
}

export type FieldErrorMap = Record<string, string>;

// Helper for English capital validation
function validateEnglishCapitalText(text: string, isRequired = true, fieldName = 'text'): string | null {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return isRequired ? `Please enter ${fieldName}.` : null;
  }
  // Check for Marathi / Devanagari script explicitly
  if (/[\u0900-\u097F]/.test(text)) {
    return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
  }
  // Allow English uppercase, numbers, spaces, and standard punctuation (. , - ' & ( ) /)
  const allowedRegex = /^[A-Z0-9\s.,'&\(\)\/-]+$/;
  if (!allowedRegex.test(text.toUpperCase())) {
    return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
  }
  return null;
}

export default function Step2JobSpecific({
  data,
  masterProfile,
  onMasterProfileChange,
  job,
  onChange,
  onNext,
  onBack,
  returnToReview,
  targetSection,
}: Step2JobSpecificProps) {
  const [errors, setErrors] = useState<FieldErrorMap>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [showMobilityModal, setShowMobilityModal] = useState(false);

  // Dynamic references store for repeatable cards & form fields
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});

  const registerRef = (key: string) => (el: HTMLElement | null) => {
    elementRefs.current[key] = el;
  };

  // Scroll to targeted section if directed from Step 4 Review
  useEffect(() => {
    if (targetSection) {
      const sectionId =
        targetSection === 'qualifications'
          ? 'section-qualifications'
          : targetSection === 'experience'
          ? 'section-experience'
          : targetSection === 'posting_location'
          ? 'section-posting-location'
          : null;
      if (sectionId) {
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    }
  }, [targetSection]);

  // ── 1. Dynamic Passing Years (1980 through current year, newest first) ──────
  const currentYear = new Date().getFullYear();
  const passingYearOptions = useMemo<number[]>(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= 1980; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // ── 2. Authoritative Allowed Districts from Job Posting ─────────────────────
  const allowedDistricts = useMemo<string[]>(() => {
    // 1. Explicit districts configured in job.location_districts
    if (Array.isArray(job.location_districts) && job.location_districts.length > 0) {
      const filtered = job.location_districts.filter(d => Boolean(d && d.trim()));
      if (filtered.length > 0) return filtered;
    }
    // 2. Districts configured in vacancy_allocations.district_allocations
    const distAlloc = job.vacancy_allocations?.district_allocations;
    if (distAlloc && typeof distAlloc === 'object') {
      const keys = Object.keys(distAlloc).filter(k => distAlloc[k]?.included !== false);
      if (keys.length > 0) return keys;
    }
    // 3. Fallback to all Maharashtra districts so candidate can select any eligible posting location
    return MAHARASHTRA_DISTRICTS;
  }, [job.location_districts, job.vacancy_allocations]);

  const postingLevel = useMemo(() => {
    if (job.posting_level) return job.posting_level;
    if (job.vacancy_allocations?.posting_level) return job.vacancy_allocations.posting_level;
    if (job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district') {
      return 'District-wise';
    }
    return 'Taluka-wise';
  }, [job.posting_level, job.vacancy_allocations, job.vacancy_level]);

  const isDistrictWise = postingLevel === 'District-wise';

  const isDistrictLevel = useMemo(() => {
    return isDistrictWise || (
      job.vacancy_level === 'district' ||
      job.vacancy_allocations?.vacancy_level === 'district'
    );
  }, [isDistrictWise, job.vacancy_level, job.vacancy_allocations]);

  // Active Location & Mobility Yes/No questions configured by HR
  const locationQuestions = useMemo(() => {
    const raw = job.location_questions || job.vacancy_allocations?.location_questions;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter(q => q.enabled !== false);
    }
    return getDefaultLocationQuestions(postingLevel).filter(q => q.enabled !== false);
  }, [job.location_questions, job.vacancy_allocations, postingLevel]);

  // Determine if this job has an active, published questionnaire visible to candidates
  const hasPublishedQuestionnaire = useMemo(() => {
    const q = (job as any)?.questionnaire || (job?.vacancy_allocations as any)?.questionnaire;
    return Boolean(
      q &&
      q.status !== 'draft' &&
      q.isVisibleToCandidates !== false &&
      Array.isArray(q.questions) &&
      q.questions.some((item: any) => item.isVisible !== false)
    );
  }, [job]);

  // ── 3. Authoritative Talukas for Selected District ──────────────────────────
  const { availableTalukas, talukaFilterSupported } = useMemo(() => {
    if (!data.preferredDistrict) {
      return { availableTalukas: [], talukaAllocationMap: {}, talukaFilterSupported: true };
    }

    const distAlloc = job.vacancy_allocations?.district_allocations?.[data.preferredDistrict];
    const talukaAllocMap: Record<string, number | null> = {};

    if (distAlloc?.taluka_allocations && Object.keys(distAlloc.taluka_allocations).length > 0) {
      const filtered: string[] = [];
      Object.entries(distAlloc.taluka_allocations).forEach(([tName, tConfig]) => {
        if (tConfig && tConfig.included !== false) {
          filtered.push(tName);
          talukaAllocMap[tName] = tConfig.vacancies ?? null;
        }
      });

      if (filtered.length > 0) {
        return {
          availableTalukas: filtered,
          talukaAllocationMap: talukaAllocMap,
          talukaFilterSupported: true,
        };
      }
    }

    // Fallback: If no granular taluka allocations specified, provide all talukas for the selected district
    const geoTalukas = getTalukasForDistrict(data.preferredDistrict);
    return {
      availableTalukas: geoTalukas,
      talukaAllocationMap: {},
      talukaFilterSupported: true,
    };
  }, [data.preferredDistrict, job.vacancy_allocations]);

  // ── 4. Residential Location & Vacancy Availability Computation ────────────
  // Uses strictly existing Candidate Profile fields: Current Address & Permanent Address
  const currentAddress = useMemo(() => ({
    line1: masterProfile?.currentAddressLine1 || masterProfile?.addressLine1 || '',
    district: masterProfile?.currentDistrict || masterProfile?.homeDistrict || '',
    taluka: masterProfile?.currentTaluka || masterProfile?.homeTaluka || '',
    pincode: masterProfile?.currentPincode || masterProfile?.pincode || '',
  }), [masterProfile]);

  const permanentAddress = useMemo(() => {
    if (masterProfile?.permanentSameAsCurrent) {
      return currentAddress;
    }
    return {
      line1: masterProfile?.permanentAddressLine1 || '',
      district: masterProfile?.permanentDistrict || '',
      taluka: masterProfile?.permanentTaluka || '',
      pincode: masterProfile?.permanentPincode || '',
    };
  }, [masterProfile?.permanentSameAsCurrent, masterProfile?.permanentAddressLine1, masterProfile?.permanentDistrict, masterProfile?.permanentTaluka, masterProfile?.permanentPincode, currentAddress]);

  const isSameAddress = useMemo(() => {
    if (masterProfile?.permanentSameAsCurrent) return true;
    if (!permanentAddress.district && !permanentAddress.taluka && !permanentAddress.line1) return true;
    return (
      (currentAddress.district || '').trim().toLowerCase() === (permanentAddress.district || '').trim().toLowerCase() &&
      (currentAddress.taluka || '').trim().toLowerCase() === (permanentAddress.taluka || '').trim().toLowerCase() &&
      (currentAddress.line1 || '').trim().toLowerCase() === (permanentAddress.line1 || '').trim().toLowerCase() &&
      (currentAddress.pincode || '').trim() === (permanentAddress.pincode || '').trim()
    );
  }, [masterProfile?.permanentSameAsCurrent, currentAddress, permanentAddress]);

  const hasAnyResidentialAddress = Boolean(currentAddress.district || permanentAddress.district);

  // Compute vacancy eligibility for Current Address
  const currentEligibility = useMemo<VacancyEligibilityResult>(() => {
    return checkResidentialVacancyEligibility(currentAddress.district, currentAddress.taluka, job);
  }, [currentAddress.district, currentAddress.taluka, job]);

  // Compute vacancy eligibility for Permanent Address (reused if identical)
  const permanentEligibility = useMemo<VacancyEligibilityResult>(() => {
    if (isSameAddress) return currentEligibility;
    return checkResidentialVacancyEligibility(permanentAddress.district, permanentAddress.taluka, job);
  }, [isSameAddress, currentEligibility, permanentAddress.district, permanentAddress.taluka, job]);

  // Location Difference check: requires confirmation if preferred location differs from residential addresses
  const isDifferentFromNative = useMemo(() => {
    if (!data.preferredDistrict) return false;

    // Check match against Current Address
    const currentMatchesDistrict = Boolean(
      currentAddress.district &&
      data.preferredDistrict.trim().toLowerCase() === currentAddress.district.trim().toLowerCase()
    );
    const currentMatchesTaluka = isDistrictWise
      ? true
      : Boolean(
          currentAddress.taluka &&
          data.preferredTaluka &&
          data.preferredTaluka.trim().toLowerCase() === currentAddress.taluka.trim().toLowerCase()
        );

    // Check match against Permanent Address
    const permMatchesDistrict = Boolean(
      permanentAddress.district &&
      data.preferredDistrict.trim().toLowerCase() === permanentAddress.district.trim().toLowerCase()
    );
    const permMatchesTaluka = isDistrictWise
      ? true
      : Boolean(
          permanentAddress.taluka &&
          data.preferredTaluka &&
          data.preferredTaluka.trim().toLowerCase() === permanentAddress.taluka.trim().toLowerCase()
        );

    const matchesCurrent = currentMatchesDistrict && currentMatchesTaluka;
    const matchesPermanent = permMatchesDistrict && permMatchesTaluka;

    if (matchesCurrent || matchesPermanent) {
      return false;
    }

    return hasAnyResidentialAddress;
  }, [data.preferredDistrict, data.preferredTaluka, currentAddress, permanentAddress, isDistrictWise, hasAnyResidentialAddress]);

  // ── 5. Repeatable Qualifications State & Synchronization ──────────────────
  const rawQualifications = data.qualifications;
  const qualifications: QualificationEntry[] = useMemo(() => {
    if (Array.isArray(rawQualifications) && rawQualifications.length > 0) {
      const highestIdx = determineHighestQualificationIndex(rawQualifications);
      return rawQualifications.map((q, idx) => ({
        ...q,
        isPrimary: idx === highestIdx,
      }));
    }
    return [{
      ...INITIAL_QUALIFICATION,
      level: data.highestQualification || '',
      course: '',
      passingYear: data.passingYear || '',
      marksValue: data.marksPercentage || '',
      isPrimary: true,
    }];
  }, [rawQualifications, data.highestQualification, data.passingYear, data.marksPercentage]);

  const syncQualifications = useCallback((updated: QualificationEntry[]) => {
    const highestIdx = determineHighestQualificationIndex(updated);
    const withHighest = updated.map((q, idx) => ({
      ...q,
      isPrimary: idx === highestIdx,
    }));
    onChange('qualifications', withHighest);
    // Sync legacy summary scalar fields with designated highest qualification
    const highest = withHighest[highestIdx] || withHighest[0];
    if (highest) {
      let displayCourse = highest.level;
      if (highest.level === 'Other Equivalent Education') {
        displayCourse = highest.customQualification ? `Other: ${highest.customQualification}` : 'Other Equivalent Education';
      } else if (['HSC', 'ITI', 'Diploma', 'Graduate', 'Post Graduate'].includes(highest.level)) {
        if (highest.course === 'Other') {
          displayCourse = highest.customCourse ? `${highest.level} - ${highest.customCourse}` : `${highest.level} - Other`;
        } else if (highest.course) {
          displayCourse = `${highest.level} - ${highest.course}`;
        }
      }
      onChange('highestQualification', displayCourse);
      onChange('passingYear', highest.passingYear);
      onChange('marksPercentage', highest.marksValue);
    }
  }, [onChange]);

  // Check validity of an individual qualification card to determine whether "Add Another" can show
  const isQualificationCardValid = (q: QualificationEntry): boolean => {
    if (!q.level || !q.level.trim()) return false;
    if (q.level === 'Other Equivalent Education') {
      if (!q.customQualification || !q.customQualification.trim()) return false;
      if (validateEnglishCapitalText(q.customQualification, true, 'qualification name')) return false;
    } else if (['HSC', 'ITI', 'Diploma', 'Graduate', 'Post Graduate'].includes(q.level)) {
      if (!q.course || !q.course.trim()) return false;
      if (q.course === 'Other') {
        if (!q.customCourse || !q.customCourse.trim()) return false;
        if (validateEnglishCapitalText(q.customCourse, true, q.level === 'HSC' ? 'course/stream name' : 'course/degree name')) return false;
      }
    }
    if (!q.passingYear || !q.passingYear.trim()) return false;
    const yearNum = parseInt(q.passingYear.trim(), 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > currentYear) return false;

    const marksStr = (q.marksValue || '').trim();
    if (!marksStr) return false;
    if (/[\u0900-\u097F]/.test(marksStr) || /[\u0966-\u096F]/.test(marksStr) || /[a-zA-Z]/.test(marksStr)) return false;
    const cleanNumStr = marksStr.replace('%', '').trim();
    const num = parseFloat(cleanNumStr);
    if (isNaN(num)) return false;
    if (q.gradingFormat === 'cgpa') {
      if (num < 0 || num > 10.0) return false;
    } else {
      if (num < 0 || num > 100.0) return false;
    }
    return true;
  };

  const handleAddQualification = () => {
    const newEntry: QualificationEntry = {
      id: `qual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      level: '',
      course: '',
      passingYear: '',
      gradingFormat: 'percentage',
      marksValue: '',
      isPrimary: false,
    };
    syncQualifications([...qualifications, newEntry]);
  };

  const handleRemoveQualification = (idToRemove: string) => {
    if (qualifications.length <= 1) return; // Never remove the only card
    const filtered = qualifications.filter(q => q.id !== idToRemove);
    syncQualifications(filtered);
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`qual_${idToRemove}`)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const handleQualificationFieldChange = (
    id: string,
    field: keyof QualificationEntry,
    rawValue: string
  ) => {
    // Automatically convert user-typed text fields to uppercase English
    let value = rawValue;
    if (field === 'customQualification' || field === 'customCourse') {
      value = rawValue.toUpperCase();
    }

    const updated = qualifications.map(q => {
      if (q.id === id) {
        const next = { ...q, [field]: value };
        // Hide and clear ONLY the dependent course/custom fields when qualification level changes
        if (field === 'level') {
          next.course = '';
          next.customCourse = '';
          next.customQualification = '';
        }
        // Clear customCourse if course changes away from 'Other'
        if (field === 'course' && value !== 'Other') {
          next.customCourse = '';
        }
        return next;
      }
      return q;
    });
    syncQualifications(updated);

    const errorKey = `qual_${id}_${field}`;
    // Immediate validation for user-editable text fields on typing/pasting
    if (field === 'customQualification' || field === 'customCourse') {
      const fieldLabel = field === 'customQualification' ? 'qualification name' : 'course/degree name';
      const validationErr = validateEnglishCapitalText(rawValue, false, fieldLabel);
      if (validationErr) {
        setErrors(prev => ({ ...prev, [errorKey]: validationErr }));
        return;
      }
    }

    if (field === 'marksValue' || field === 'gradingFormat') {
      const targetQual = qualifications.find(q => q.id === id);
      const currentFormat = field === 'gradingFormat' ? value : (targetQual?.gradingFormat || 'percentage');
      const marksVal = field === 'marksValue' ? value : (targetQual?.marksValue || '');
      const marksKey = `qual_${id}_marksValue`;

      if (marksVal.trim()) {
        const trimmed = marksVal.trim();
        if (/[\u0900-\u097F]/.test(trimmed) || /[\u0966-\u096F]/.test(trimmed)) {
          setErrors(prev => ({
            ...prev,
            [marksKey]: 'Only English digits (0–9) and decimal point are allowed. Marathi numerals/characters are not accepted.'
          }));
          return;
        }
        if (/[a-zA-Z]/.test(trimmed)) {
          setErrors(prev => ({
            ...prev,
            [marksKey]: 'Letters are not allowed. Please enter numeric digits (0–9) and decimal point only.'
          }));
          return;
        }
        if (currentFormat === 'cgpa' && /[^\d.]/.test(trimmed)) {
          setErrors(prev => ({
            ...prev,
            [marksKey]: 'Only English digits (0–9) and decimal point are allowed for CGPA.'
          }));
          return;
        }
        if (currentFormat === 'percentage' && /[^\d.%]/.test(trimmed)) {
          setErrors(prev => ({
            ...prev,
            [marksKey]: 'Only English digits (0–9), decimal point, and optional % are allowed.'
          }));
          return;
        }

        const cleanNumStr = trimmed.replace('%', '').trim();
        const num = parseFloat(cleanNumStr);
        if (!isNaN(num)) {
          if (currentFormat === 'cgpa') {
            if (num < 0 || num > 10.0) {
              setErrors(prev => ({
                ...prev,
                [marksKey]: num > 10.0
                  ? 'Invalid CGPA: CGPA must be on a 10.0 scale (between 0.0 and 10.0). If your score is 8.0, enter 8.0 instead of 80.'
                  : 'CGPA must be between 0.0 and 10.0.'
              }));
              return;
            }
          } else {
            if (num < 0 || num > 100.0) {
              setErrors(prev => ({
                ...prev,
                [marksKey]: 'Percentage must be between 0.0% and 100.0%.'
              }));
              return;
            }
          }
        }
        // Valid marks value - clear any error
        setErrors(prev => {
          const next = { ...prev };
          delete next[marksKey];
          return next;
        });
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next[marksKey];
          return next;
        });
      }
    }

    if (errors[errorKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  // ── 6. Repeatable Work Experience State & Synchronization ──────────────────
  const isExperienced = data.experienceType === 'experienced';
  const rawExperiences = data.experiences;
  const experiences: WorkExperienceEntry[] = useMemo(() => {
    if (Array.isArray(rawExperiences) && rawExperiences.length > 0) {
      return rawExperiences;
    }
    if (isExperienced) {
      return [{
        ...INITIAL_EXPERIENCE,
        employer: data.previousEmployer || '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        hasCertificate: 'no',
        years: '',
        months: '',
        days: '',
      }];
    }
    return [];
  }, [rawExperiences, isExperienced, data.previousEmployer, data.experienceYears, data.experienceMonths]);

  // Calculate Total Experience dynamically (in years, months and days) with merged non-overlapping intervals
  const totalExperience = useMemo(() => {
    if (!isExperienced || experiences.length === 0) {
      return { years: 0, months: 0, days: 0, totalInMonths: 0 };
    }
    const merged = calculateMergedTotalExperience(
      experiences.map(e => ({
        startDate: e.startDate || '',
        endDate: e.endDate,
        isCurrent: e.isCurrent,
      }))
    );
    return {
      years: merged.years,
      months: merged.months,
      days: merged.days,
      totalInMonths: merged.totalMonths,
    };
  }, [isExperienced, experiences]);

  const syncExperiences = useCallback((updated: WorkExperienceEntry[]) => {
    onChange('experiences', updated);
    const merged = calculateMergedTotalExperience(
      updated.map(e => ({
        startDate: e.startDate || '',
        endDate: e.endDate,
        isCurrent: e.isCurrent,
      }))
    );
    onChange('experienceYears', String(merged.years));
    onChange('experienceMonths', String(merged.months));
    onChange('experienceDays', String(merged.days));
    if (updated.length > 0) {
      onChange('previousEmployer', updated[0].employer || '');
    }
  }, [onChange]);

  // Check validity of an individual experience card to determine whether "Add Another" can show
  const isExperienceCardValid = (exp: WorkExperienceEntry): boolean => {
    if (!exp.employer || !exp.employer.trim()) return false;
    if (validateEnglishCapitalText(exp.employer, true, 'previous employer')) return false;
    if (exp.designation && validateEnglishCapitalText(exp.designation, false, 'designation')) return false;
    if (!exp.startDate) return false;
    const todayIso = getLocalTodayIso();
    if (exp.startDate > todayIso) return false;
    if (!exp.isCurrent && !exp.endDate) return false;
    if (!exp.isCurrent && exp.endDate && exp.endDate > todayIso) return false;
    if (!exp.isCurrent && exp.endDate && exp.endDate < exp.startDate) return false;
    if (!exp.hasCertificate) return false;
    return true;
  };

  const handleAddExperience = () => {
    const newEntry: WorkExperienceEntry = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employer: '',
      designation: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      hasCertificate: 'no',
      years: '',
      months: '',
      days: '',
    };
    syncExperiences([...experiences, newEntry]);
  };

  const handleRemoveExperience = (idToRemove: string) => {
    if (experiences.length <= 1) return; // Retain at least one card for experienced
    const filtered = experiences.filter(e => e.id !== idToRemove);
    syncExperiences(filtered);
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`exp_${idToRemove}`)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const handleExperienceFieldChange = (
    id: string,
    field: keyof WorkExperienceEntry,
    rawValue: any
  ) => {
    // Automatically convert text inputs to uppercase English
    let value = rawValue;
    if (field === 'employer' || field === 'designation') {
      value = typeof rawValue === 'string' ? rawValue.toUpperCase() : rawValue;
    }

    const todayStr = getLocalTodayIso();
    const updated = experiences.map(e => {
      if (e.id === id) {
        const next = { ...e, [field]: value };
        if (field === 'isCurrent' && value === true) {
          next.endDate = '';
        }

        const isFutureEnd = !next.isCurrent && next.endDate && next.endDate > todayStr;
        const isBeforeStart = !next.isCurrent && next.endDate && next.startDate && next.endDate < next.startDate;

        if (next.startDate && (next.isCurrent || next.endDate) && !isFutureEnd && !isBeforeStart) {
          const dur = calculateDuration(next.startDate, next.endDate || '', Boolean(next.isCurrent));
          next.years = String(dur.years);
          next.months = String(dur.months);
          next.days = String(dur.days);
        } else {
          next.years = '';
          next.months = '';
          next.days = '';
        }
        return next;
      }
      return e;
    });
    syncExperiences(updated);

    const errorKey = `exp_${id}_${field}`;
    // Immediate validation for user-editable text fields on typing/pasting
    if (field === 'employer' || field === 'designation') {
      const fieldLabel = field === 'employer' ? 'previous employer' : 'designation';
      const validationErr = validateEnglishCapitalText(String(rawValue || ''), false, fieldLabel);
      if (validationErr) {
        setErrors(prev => ({ ...prev, [errorKey]: validationErr }));
        return;
      }
    }

    if (field === 'endDate' || field === 'startDate' || field === 'isCurrent') {
      const targetExp = updated.find(e => e.id === id);
      const endErrKey = `exp_${id}_endDate`;
      const startErrKey = `exp_${id}_startDate`;
      if (targetExp) {
        if (targetExp.startDate && targetExp.startDate > todayStr) {
          setErrors(prev => ({ ...prev, [startErrKey]: 'Start date cannot be in the future.' }));
        } else if (errors[startErrKey]) {
          setErrors(prev => {
            const next = { ...prev };
            delete next[startErrKey];
            return next;
          });
        }

        if (targetExp.isCurrent) {
          setErrors(prev => {
            const next = { ...prev };
            delete next[endErrKey];
            return next;
          });
        } else if (targetExp.endDate) {
          if (targetExp.endDate > todayStr) {
            setErrors(prev => ({ ...prev, [endErrKey]: 'End Date cannot be in the future.' }));
          } else if (targetExp.startDate && targetExp.endDate < targetExp.startDate) {
            setErrors(prev => ({ ...prev, [endErrKey]: 'End Date cannot be earlier than Start Date.' }));
          } else if (errors[endErrKey]) {
            setErrors(prev => {
              const next = { ...prev };
              delete next[endErrKey];
              return next;
            });
          }
        }
      }
    }

    if (errors[errorKey] && field !== 'endDate' && field !== 'startDate' && field !== 'isCurrent') {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const handleToggleExperienceType = (type: 'fresher' | 'experienced') => {
    onChange('experienceType', type);
    if (type === 'fresher') {
      onChange('experienceYears', '0');
      onChange('experienceMonths', '0');
      onChange('experienceDays', '0');
      onChange('experiences', []);
      onChange('previousEmployer', '');
      onChange('jobResponsibilities', '');
      setErrors(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (k.startsWith('exp_')) delete next[k];
        });
        return next;
      });
    } else {
      if (experiences.length === 0) {
        syncExperiences([INITIAL_EXPERIENCE]);
      }
    }
  };

  // ── 7. Single Field Error Handlers ──────────────────────────────────────────
  const clearFieldError = (fieldKey: string) => {
    if (errors[fieldKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
    if (topError) setTopError(null);
  };

  const handleDistrictChange = (dist: string) => {
    onChange('preferredDistrict', dist);
    onChange('preferredTaluka', '');
    clearFieldError('preferredDistrict');
    clearFieldError('preferredTaluka');
  };

  // ── Multiple Preferred Posting Locations Configuration & State ────────────
  const isMultipleLocationsEnabled = Boolean(
    job.multiple_locations_config?.enabled ||
    job.vacancy_allocations?.multiple_locations_config?.enabled
  );

  const maxDistrictsAllowed = Math.min(
    3,
    Math.max(
      1,
      Number(
        job.multiple_locations_config?.maxDistricts ||
        job.vacancy_allocations?.multiple_locations_config?.maxDistricts ||
        3
      )
    )
  );

  const maxTalukasPerDistrict = Math.min(
    2,
    Math.max(
      1,
      Number(
        job.multiple_locations_config?.maxTalukasPerDistrict ||
        job.vacancy_allocations?.multiple_locations_config?.maxTalukasPerDistrict ||
        2
      )
    )
  );

  const candidateResidentialDistricts = useMemo(() => {
    const list: string[] = [];
    if (currentAddress.district) list.push(currentAddress.district.trim().toLowerCase());
    if (permanentAddress.district) list.push(permanentAddress.district.trim().toLowerCase());
    return list;
  }, [currentAddress.district, permanentAddress.district]);

  // Normalize preferredDistricts array
  const preferredDistricts: DistrictPreference[] = useMemo(() => {
    if (Array.isArray(data.preferredDistricts) && data.preferredDistricts.length > 0) {
      return data.preferredDistricts;
    }
    if (data.preferredDistrict) {
      return [
        {
          id: 'pref-1',
          priority: 1,
          district: data.preferredDistrict,
          talukas: data.preferredTaluka ? [data.preferredTaluka] : [],
        },
      ];
    }
    return [
      {
        id: 'pref-1',
        priority: 1,
        district: '',
        talukas: [],
      },
    ];
  }, [data.preferredDistricts, data.preferredDistrict, data.preferredTaluka]);

  // Sync preferred districts helper
  const syncPreferredDistricts = useCallback((updated: DistrictPreference[]) => {
    const normalized = updated.map((item, idx) => ({
      ...item,
      priority: idx + 1,
    }));
    onChange('preferredDistricts', normalized);
    const p1 = normalized[0];
    const p1District = p1?.district || '';
    const p1Taluka = p1?.talukas?.[0] || '';
    onChange('preferredDistrict', p1District);
    onChange('preferredTaluka', p1Taluka);
  }, [onChange]);

  // Outside districts detection
  const outsideDistricts = useMemo(() => {
    if (!isMultipleLocationsEnabled) {
      if (!data.preferredDistrict) return [];
      const isOutside = !candidateResidentialDistricts.includes(data.preferredDistrict.trim().toLowerCase());
      return isOutside ? [data.preferredDistrict] : [];
    }
    const outside: string[] = [];
    preferredDistricts.forEach(p => {
      if (p.district && !candidateResidentialDistricts.includes(p.district.trim().toLowerCase())) {
        if (!outside.includes(p.district)) {
          outside.push(p.district);
        }
      }
    });
    return outside;
  }, [isMultipleLocationsEnabled, data.preferredDistrict, preferredDistricts, candidateResidentialDistricts]);

  const requiresMobilityConsent = outsideDistricts.length > 0;

  // Mobility Consent validation: consent is valid iff consented is true and consented outsideDistricts match current outsideDistricts exactly
  const isMobilityConsentValid = useMemo(() => {
    if (!requiresMobilityConsent) return true;
    if (!data.mobilityConsent?.consented) return false;
    const recordedOutside = (data.mobilityConsent.outsideDistricts || []).map(d => d.trim().toLowerCase()).sort();
    const currentOutside = outsideDistricts.map(d => d.trim().toLowerCase()).sort();
    if (recordedOutside.length !== currentOutside.length) return false;
    return recordedOutside.every((d, i) => d === currentOutside[i]);
  }, [requiresMobilityConsent, data.mobilityConsent, outsideDistricts]);

  // Reactive invalidation: if preferred locations change such that outsideDistricts no longer match, invalidate stale consent
  useEffect(() => {
    if (!data.mobilityConsent?.consented) return;
    const recorded = (data.mobilityConsent.outsideDistricts || []).map(d => d.trim().toLowerCase()).sort().join('|');
    const current = outsideDistricts.map(d => d.trim().toLowerCase()).sort().join('|');
    if (recorded !== current) {
      onChange('mobilityConsent', undefined);
      onChange('locationConfirmed', false);
    }
  }, [outsideDistricts, data.mobilityConsent?.consented, onChange]);

  const handleAddPreferredDistrict = () => {
    if (preferredDistricts.length >= maxDistrictsAllowed) return;
    const newEntry: DistrictPreference = {
      id: `pref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      priority: preferredDistricts.length + 1,
      district: '',
      talukas: [],
    };
    syncPreferredDistricts([...preferredDistricts, newEntry]);
  };

  const handleRemovePreferredDistrict = (id: string) => {
    if (preferredDistricts.length <= 1) return;
    const filtered = preferredDistricts.filter(p => p.id !== id);
    syncPreferredDistricts(filtered);
  };

  const handleDistrictPreferenceChange = (id: string, newDistrict: string) => {
    const updated = preferredDistricts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          district: newDistrict,
          talukas: [],
        };
      }
      return p;
    });
    syncPreferredDistricts(updated);
    clearFieldError(`pref_dist_${id}`);
    clearFieldError('preferredDistrict');
  };

  const handleAddTalukaToDistrict = (id: string) => {
    const target = preferredDistricts.find(p => p.id === id);
    if (!target || !target.district) return;
    const currentTalukas = target.talukas || [];
    if (currentTalukas.length >= maxTalukasPerDistrict) return;
    const updated = preferredDistricts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          talukas: [...currentTalukas, ''],
        };
      }
      return p;
    });
    syncPreferredDistricts(updated);
  };

  const handleRemoveTalukaFromDistrict = (id: string, talukaIndex: number) => {
    const updated = preferredDistricts.map(p => {
      if (p.id === id) {
        const currentTalukas = [...(p.talukas || [])];
        currentTalukas.splice(talukaIndex, 1);
        return {
          ...p,
          talukas: currentTalukas,
        };
      }
      return p;
    });
    syncPreferredDistricts(updated);
  };

  const handleTalukaPreferenceChange = (id: string, talukaIndex: number, newTaluka: string) => {
    const updated = preferredDistricts.map(p => {
      if (p.id === id) {
        const currentTalukas = [...(p.talukas || [])];
        currentTalukas[talukaIndex] = newTaluka;
        return {
          ...p,
          talukas: currentTalukas,
        };
      }
      return p;
    });
    syncPreferredDistricts(updated);
    clearFieldError(`pref_tal_${id}_${talukaIndex}`);
    clearFieldError('preferredTaluka');
  };

  const getTalukasForSpecificDistrict = (distName: string): string[] => {
    if (!distName) return [];
    const distAlloc = job.vacancy_allocations?.district_allocations?.[distName];
    if (distAlloc?.taluka_allocations && Object.keys(distAlloc.taluka_allocations).length > 0) {
      const filtered: string[] = [];
      Object.entries(distAlloc.taluka_allocations).forEach(([tName, tConfig]) => {
        if (tConfig && tConfig.included !== false) {
          filtered.push(tName);
        }
      });
      if (filtered.length > 0) return filtered;
    }
    return getTalukasForDistrict(distName);
  };

  // ── 8. Form Validation & Auto-Focus/Scroll ──────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: FieldErrorMap = {};
    const errorFieldKeys: string[] = [];

    // 1. Validate each qualification card
    if (qualifications.length === 0) {
      newErrors['qual_general'] = 'Please add at least one educational qualification.';
      errorFieldKeys.push('qual_general');
    } else {
      qualifications.forEach((q, idx) => {
        const cardNum = idx + 1;

        // Level
        if (!q.level || !q.level.trim()) {
          const key = `qual_${q.id}_level`;
          newErrors[key] = `Please select a qualification level for Qualification #${cardNum}.`;
          errorFieldKeys.push(key);
        } else if (q.level === 'Other Equivalent Education') {
          // Custom qualification name
          const customQualErr = validateEnglishCapitalText(q.customQualification || '', true, 'qualification name');
          if (customQualErr) {
            const key = `qual_${q.id}_customQualification`;
            newErrors[key] = customQualErr;
            errorFieldKeys.push(key);
          }
        } else if (['HSC', 'ITI', 'Diploma', 'Graduate', 'Post Graduate'].includes(q.level)) {
          // Course / Stream dropdown
          const isHsc = q.level === 'HSC';
          if (!q.course || !q.course.trim()) {
            const key = `qual_${q.id}_course`;
            newErrors[key] = isHsc
              ? `Please select the course/stream for Qualification #${cardNum}.`
              : `Please select the course/degree for Qualification #${cardNum}.`;
            errorFieldKeys.push(key);
          } else if (q.course === 'Other') {
            // Custom course name
            const customCourseErr = validateEnglishCapitalText(
              q.customCourse || '',
              true,
              isHsc ? 'course/stream name' : 'course/degree name'
            );
            if (customCourseErr) {
              const key = `qual_${q.id}_customCourse`;
              newErrors[key] = customCourseErr;
              errorFieldKeys.push(key);
            }
          }
        }

        // Passing Year
        if (!q.passingYear || !q.passingYear.trim()) {
          const key = `qual_${q.id}_passingYear`;
          newErrors[key] = `Please select the passing year for Qualification #${cardNum}.`;
          errorFieldKeys.push(key);
        } else {
          const yearNum = parseInt(q.passingYear.trim(), 10);
          if (isNaN(yearNum) || yearNum < 1980 || yearNum > currentYear) {
            const key = `qual_${q.id}_passingYear`;
            newErrors[key] = `Passing year must be between 1980 and ${currentYear}.`;
            errorFieldKeys.push(key);
          }
        }

        // Marks / Percentage / CGPA
        const marksStr = (q.marksValue || '').trim();
        const marksKey = `qual_${q.id}_marksValue`;
        if (!marksStr) {
          newErrors[marksKey] = q.gradingFormat === 'cgpa'
            ? 'Please enter your CGPA (e.g. 8.4).'
            : 'Please enter your percentage (e.g. 74.5%).';
          errorFieldKeys.push(marksKey);
        } else if (/[\u0900-\u097F]/.test(marksStr) || /[\u0966-\u096F]/.test(marksStr)) {
          newErrors[marksKey] = 'Only English digits (0–9) and decimal point are allowed. Marathi numerals/characters are not accepted.';
          errorFieldKeys.push(marksKey);
        } else if (/[a-zA-Z]/.test(marksStr)) {
          newErrors[marksKey] = 'Letters are not allowed. Please enter numeric digits (0–9) and decimal point only.';
          errorFieldKeys.push(marksKey);
        } else if (q.gradingFormat === 'cgpa' && /[^\d.]/.test(marksStr)) {
          newErrors[marksKey] = 'Only English digits (0–9) and decimal point are allowed for CGPA.';
          errorFieldKeys.push(marksKey);
        } else if (q.gradingFormat === 'percentage' && /[^\d.%]/.test(marksStr)) {
          newErrors[marksKey] = 'Only English digits (0–9), decimal point, and optional % are allowed.';
          errorFieldKeys.push(marksKey);
        } else {
          const cleanNumStr = marksStr.replace('%', '').trim();
          const num = parseFloat(cleanNumStr);
          if (isNaN(num)) {
            newErrors[marksKey] = q.gradingFormat === 'cgpa'
              ? 'Please enter a valid numeric CGPA out of 10.0.'
              : 'Please enter a valid numeric percentage (0–100%).';
            errorFieldKeys.push(marksKey);
          } else if (q.gradingFormat === 'cgpa') {
            if (num < 0 || num > 10.0) {
              newErrors[marksKey] = num > 10.0
                ? 'Invalid CGPA: CGPA must be on a 10.0 scale (between 0.0 and 10.0). If your score is 8.0, enter 8.0 instead of 80.'
                : 'CGPA must be between 0.0 and 10.0.';
              errorFieldKeys.push(marksKey);
            }
          } else {
            if (num < 0 || num > 100.0) {
              newErrors[marksKey] = 'Percentage must be between 0.0% and 100.0%.';
              errorFieldKeys.push(marksKey);
            }
          }
        }
      });
    }

    // 2. Validate Work Experience (if Experienced)
    if (isExperienced) {
      if (experiences.length === 0) {
        newErrors['exp_general'] = 'Please add at least one work experience entry.';
        errorFieldKeys.push('exp_general');
      } else {
        const todayIso = getLocalTodayIso();

        experiences.forEach((exp, idx) => {
          const cardNum = idx + 1;
          // Employer
          const empErr = validateEnglishCapitalText(exp.employer || '', true, 'previous employer');
          if (empErr) {
            const key = `exp_${exp.id}_employer`;
            newErrors[key] = empErr;
            errorFieldKeys.push(key);
          }

          // Optional Designation English Validation
          if (exp.designation && exp.designation.trim()) {
            const desErr = validateEnglishCapitalText(exp.designation, false, 'designation');
            if (desErr) {
              const key = `exp_${exp.id}_designation`;
              newErrors[key] = desErr;
              errorFieldKeys.push(key);
            }
          }

          // Start Date Validation
          if (!exp.startDate) {
            const key = `exp_${exp.id}_startDate`;
            newErrors[key] = `Please select employment start date for Experience #${cardNum}.`;
            errorFieldKeys.push(key);
          } else if (exp.startDate > todayIso) {
            const key = `exp_${exp.id}_startDate`;
            newErrors[key] = 'Start Date cannot be in the future.';
            errorFieldKeys.push(key);
          }

          // End Date Validation
          if (!exp.isCurrent) {
            if (!exp.endDate) {
              const key = `exp_${exp.id}_endDate`;
              newErrors[key] = `Please select employment end date for Experience #${cardNum}.`;
              errorFieldKeys.push(key);
            } else if (exp.endDate > todayIso) {
              const key = `exp_${exp.id}_endDate`;
              newErrors[key] = 'End Date cannot be in the future.';
              errorFieldKeys.push(key);
            } else if (exp.startDate && exp.endDate < exp.startDate) {
              const key = `exp_${exp.id}_endDate`;
              newErrors[key] = 'End Date cannot be earlier than Start Date.';
              errorFieldKeys.push(key);
            }
          }

          // Certificate Available
          if (!exp.hasCertificate) {
            const key = `exp_${exp.id}_hasCertificate`;
            newErrors[key] = `Please indicate whether experience certificate is available for Experience #${cardNum}.`;
            errorFieldKeys.push(key);
          }

          const y = parseInt(exp.years || '0', 10);
          const m = parseInt(exp.months || '0', 10);
          if (y === 0 && m === 0) {
            const key = `exp_${exp.id}_duration`;
            newErrors[key] = `Calculated duration for Experience #${cardNum} must be at least 1 month.`;
            errorFieldKeys.push(key);
          }
        });

        if (totalExperience.totalInMonths <= 0) {
          newErrors['exp_total'] = 'Total non-overlapping experience must be at least 1 month.';
          errorFieldKeys.push('exp_total');
        }
      }
    }

    // 3. Validate Posting Location
    if (isMultipleLocationsEnabled) {
      if (allowedDistricts.length === 0) {
        newErrors['preferredDistrict'] = 'No eligible posting districts are configured for this position by HR.';
        errorFieldKeys.push('preferredDistrict');
      } else {
        if (!preferredDistricts[0]?.district) {
          newErrors['preferredDistrict'] = 'Please select Priority 1 Preferred District.';
          errorFieldKeys.push('preferredDistrict');
        }
        const seenDistricts = new Set<string>();
        preferredDistricts.forEach(p => {
          if (!p.district) {
            const key = `pref_dist_${p.id}`;
            newErrors[key] = `Please select a district for Priority ${p.priority}.`;
            errorFieldKeys.push(key);
          } else if (!allowedDistricts.includes(p.district)) {
            const key = `pref_dist_${p.id}`;
            newErrors[key] = `Selected district for Priority ${p.priority} is not eligible for this job posting.`;
            errorFieldKeys.push(key);
          } else if (seenDistricts.has(p.district.toLowerCase())) {
            const key = `pref_dist_${p.id}`;
            newErrors[key] = `District "${p.district}" is already selected in another priority card.`;
            errorFieldKeys.push(key);
          } else {
            seenDistricts.add(p.district.toLowerCase());
          }

          if (!isDistrictWise && p.district) {
            const talukas = p.talukas || [];
            if (talukas.length === 0 || !talukas[0]) {
              const key = `pref_tal_${p.id}_0`;
              newErrors[key] = `Please select at least one preferred taluka for Priority ${p.priority} (${p.district}).`;
              errorFieldKeys.push(key);
            }
          }
        });
      }

      // Check conditional mobility consent
      if ((requiresMobilityConsent && !data.mobilityConsent?.consented && !data.locationConfirmed) || (requiresMobilityConsent && !isMobilityConsentValid)) {
        newErrors['mobilityConsent'] = 'Please confirm your willingness to work at the selected posting location(s) outside your residential district.';
        errorFieldKeys.push('mobilityConsent');
      }
    } else {
      if (allowedDistricts.length === 0) {
        newErrors['preferredDistrict'] = 'No eligible posting districts are configured for this position by HR.';
        errorFieldKeys.push('preferredDistrict');
      } else {
        if (!data.preferredDistrict) {
          newErrors['preferredDistrict'] = 'Please select your preferred posting district.';
          errorFieldKeys.push('preferredDistrict');
        } else if (!allowedDistricts.includes(data.preferredDistrict)) {
          newErrors['preferredDistrict'] = 'Selected district is not eligible for this job posting.';
          errorFieldKeys.push('preferredDistrict');
        }

        if (!isDistrictWise && !data.preferredTaluka) {
          newErrors['preferredTaluka'] = 'Please select your preferred posting taluka.';
          errorFieldKeys.push('preferredTaluka');
        }
      }

      // 4. Validate Location Difference Confirmation
      if (isDifferentFromNative && !data.locationConfirmed) {
        newErrors['locationConfirmed'] = 'Please confirm your willingness to work at the selected posting location.';
        errorFieldKeys.push('locationConfirmed');
      }
    }

    // 5. Validate Location & Mobility Questions
    locationQuestions.forEach(q => {
      if (q.required) {
        const val = data.locationAnswers?.[q.id];
        if (typeof val !== 'boolean') {
          newErrors[`loc_q_${q.id}`] = 'Please answer this question (Yes or No).';
          errorFieldKeys.push(`loc_q_${q.id}`);
        }
      }
    });

    setErrors(newErrors);

    if (errorFieldKeys.length > 0) {
      const firstInvalidKey = errorFieldKeys[0];
      const targetElement = elementRefs.current[firstInvalidKey];
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (typeof (targetElement as any).focus === 'function') {
            (targetElement as any).focus();
          }
        }, 150);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTopError(null);

    const isValid = validateForm();
    if (!isValid) return;

    onNext();
  };

  const lastQualification = qualifications[qualifications.length - 1];
  const canAddMoreQualifications = qualifications.length > 0 && isQualificationCardValid(lastQualification);

  const lastExperience = experiences[experiences.length - 1];
  const canAddMoreExperiences = isExperienced && experiences.length > 0 && isExperienceCardValid(lastExperience);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Step Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102a43]">Step 3: Position Details &amp; Posting Preferences</h2>
            <p className="text-xs text-[#627d98]">
              Educational credentials, work experience background, and preferred operational posting location.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
          {job.title}
        </span>
      </div>

      {returnToReview && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Editing from Review:</strong> Update your details below and click <strong>Save &amp; Return to Review</strong> to return directly to Step 4.
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
          >
            Cancel &amp; Return
          </button>
        </div>
      )}

      {/* Top Error Callout */}
      {topError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{topError}</span>
        </div>
      )}

      {/* ── SECTION 1: Educational Qualifications (Dynamic Repeatable Cards) ─── */}
      <div id="section-qualifications" className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            1. Educational Qualifications
          </h3>
        </div>

        {errors['qual_general'] && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors['qual_general']}</span>
          </div>
        )}

        {/* Repeatable Qualification Cards */}
        <div className="space-y-4">
          {qualifications.map((qual, idx) => {
            const cardNum = idx + 1;
            const courseList = COURSE_OPTIONS_BY_LEVEL[qual.level] || [];
            const isDegreeLevel = ['HSC', 'ITI', 'Diploma', 'Graduate', 'Post Graduate'].includes(qual.level);
            const isOtherEducation = qual.level === 'Other Equivalent Education';
            const isCourseOther = isDegreeLevel && qual.course === 'Other';

            const levelError = errors[`qual_${qual.id}_level`];
            const customQualError = errors[`qual_${qual.id}_customQualification`];
            const courseError = errors[`qual_${qual.id}_course`];
            const customCourseError = errors[`qual_${qual.id}_customCourse`];
            const yearError = errors[`qual_${qual.id}_passingYear`];
            const marksError = errors[`qual_${qual.id}_marksValue`];

            return (
              <div
                key={qual.id}
                className={`p-4 rounded-xl border transition-all ${
                  qual.isPrimary
                    ? 'border-emerald-300 bg-emerald-50/15 ring-1 ring-emerald-300'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                {/* Card Title & Primary / Remove Actions */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#102a43] text-white text-[11px] font-bold flex items-center justify-center">
                      {cardNum}
                    </span>
                    <h4 className="text-xs font-bold text-[#102a43]">
                      Qualification #{cardNum}
                      {qual.level && <span className="ml-1 text-slate-500 font-normal">({qual.level})</span>}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Highest Qualification Badge (Automatically Identified) */}
                    {qual.isPrimary && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs"
                        title="Automatically identified as your highest qualification"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        Highest Qualification
                      </span>
                    )}

                    {/* Remove Card Button (disabled/hidden if only 1 card) */}
                    {qualifications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQualification(qual.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove this qualification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* Field 1: Clean Qualification Level */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Qualification Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={registerRef(`qual_${qual.id}_level`)}
                      value={qual.level || ''}
                      onChange={e => handleQualificationFieldChange(qual.id, 'level', e.target.value)}
                      aria-invalid={Boolean(levelError)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                        levelError
                          ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                          : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                      }`}
                    >
                      <option value="">-- Select Level --</option>
                      {QUALIFICATION_LEVELS.map(q => (
                        <option key={q.value} value={q.value}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                    {levelError && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {levelError}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Dependent Course / Degree Dropdown OR Custom Qualification Text */}
                  {isOtherEducation ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Enter Qualification Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={registerRef(`qual_${qual.id}_customQualification`)}
                        type="text"
                        placeholder="E.G. PG DIPLOMA IN RURAL DEV."
                        value={qual.customQualification || ''}
                        onChange={e => handleQualificationFieldChange(qual.id, 'customQualification', e.target.value)}
                        aria-invalid={Boolean(customQualError)}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                          customQualError
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      />
                      {customQualError && (
                        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {customQualError}
                        </p>
                      )}
                    </div>
                  ) : isDegreeLevel ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {qual.level === 'HSC' ? 'Course / Stream' : 'Course / Degree Name'} <span className="text-red-500">*</span>
                      </label>
                      <select
                        ref={registerRef(`qual_${qual.id}_course`)}
                        value={qual.course || ''}
                        onChange={e => handleQualificationFieldChange(qual.id, 'course', e.target.value)}
                        aria-invalid={Boolean(courseError)}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          courseError
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      >
                        <option value="">{qual.level === 'HSC' ? '-- Select Course / Stream --' : '-- Select Course / Degree --'}</option>
                        {courseList.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {courseError && (
                        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {courseError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Course / Stream
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-500 select-none">
                        Standard Board Curriculum
                      </div>
                    </div>
                  )}

                  {/* Field 2B: Custom Course Name when Course === 'Other' */}
                  {isCourseOther && (
                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {qual.level === 'HSC' ? 'Enter Course / Stream Name' : 'Enter Course/Degree Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={registerRef(`qual_${qual.id}_customCourse`)}
                        type="text"
                        placeholder={qual.level === 'HSC' ? 'E.G. VOCATIONAL FISHERIES / MCVC' : 'E.G. B.SC. SERICULTURE / AGRICULTURAL MARKETING'}
                        value={qual.customCourse || ''}
                        onChange={e => handleQualificationFieldChange(qual.id, 'customCourse', e.target.value)}
                        aria-invalid={Boolean(customCourseError)}
                        className={`w-full px-3.5 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                          customCourseError
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      />
                      {customCourseError && (
                        <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {customCourseError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Field 3: Passing Year */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Passing Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={registerRef(`qual_${qual.id}_passingYear`)}
                      value={qual.passingYear || ''}
                      onChange={e => handleQualificationFieldChange(qual.id, 'passingYear', e.target.value)}
                      aria-invalid={Boolean(yearError)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                        yearError
                          ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                          : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                      }`}
                    >
                      <option value="">-- Year --</option>
                      {passingYearOptions.map(y => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                    {yearError && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {yearError}
                      </p>
                    )}
                  </div>

                  {/* Field 4: Percentage (%) / CGPA Radio Selection (Only buttons, no redundant label) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 pt-0.5">
                      <div className="flex items-center gap-2.5">
                        <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold select-none transition-colors ${
                          qual.gradingFormat !== 'cgpa' ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                        }`}>
                          <input
                            type="radio"
                            name={`grading_format_${qual.id}`}
                            value="percentage"
                            checked={qual.gradingFormat !== 'cgpa'}
                            onChange={() => handleQualificationFieldChange(qual.id, 'gradingFormat', 'percentage')}
                            className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                          />
                          <span>Percentage (%)</span>
                        </label>

                        <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold select-none transition-colors ${
                          qual.gradingFormat === 'cgpa' ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                        }`}>
                          <input
                            type="radio"
                            name={`grading_format_${qual.id}`}
                            value="cgpa"
                            checked={qual.gradingFormat === 'cgpa'}
                            onChange={() => handleQualificationFieldChange(qual.id, 'gradingFormat', 'cgpa')}
                            className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                          />
                          <span>CGPA</span>
                        </label>
                      </div>
                      <span className="text-red-500 font-bold text-xs select-none">*</span>
                    </div>

                    <div className="flex">
                      <input
                        ref={registerRef(`qual_${qual.id}_marksValue`)}
                        type="text"
                        placeholder={qual.gradingFormat === 'cgpa' ? 'E.G. 8.4' : 'E.G. 74.5'}
                        value={qual.marksValue || ''}
                        onChange={e => handleQualificationFieldChange(qual.id, 'marksValue', e.target.value)}
                        aria-invalid={Boolean(marksError)}
                        className={`w-full px-3 py-2 bg-white border rounded-l-xl text-xs sm:text-sm font-semibold text-[#102a43] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                          marksError
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      />
                      <span className="inline-flex items-center px-3.5 bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl text-xs font-bold text-slate-700 select-none whitespace-nowrap">
                        {qual.gradingFormat === 'cgpa' ? 'CGPA' : '%'}
                      </span>
                    </div>
                    {marksError && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {marksError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Add Another Education Button (Rendered directly below the latest card) */}
        <div className="pt-2">
          {canAddMoreQualifications ? (
            <button
              type="button"
              onClick={handleAddQualification}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#102a43] hover:bg-[#243b53] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add Another Education</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium select-none">
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Complete Qualification #{qualifications.length} to add another</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Work Experience (Dynamic Repeatable Cards) ─────────────── */}
      <div id="section-experience" className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            2. Work Experience
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Do you have relevant work experience? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fresher Option */}
            <div
              onClick={() => handleToggleExperienceType('fresher')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                !isExperienced
                  ? 'border-[#102a43] bg-slate-50 text-[#102a43]'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  !isExperienced ? 'border-[#102a43] bg-[#102a43]' : 'border-slate-300'
                }`}
              >
                {!isExperienced && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#102a43]">Fresher</p>
                <p className="text-[11px] text-[#627d98]">I am a fresher / entry-level applicant.</p>
              </div>
            </div>

            {/* Experienced Option */}
            <div
              onClick={() => handleToggleExperienceType('experienced')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                isExperienced
                  ? 'border-[#102a43] bg-slate-50 text-[#102a43]'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  isExperienced ? 'border-[#102a43] bg-[#102a43]' : 'border-slate-300'
                }`}
              >
                {isExperienced && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#102a43]">Experienced</p>
                <p className="text-[11px] text-[#627d98]">I have relevant professional or field experience.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fresher Confirmation Banner */}
        {!isExperienced ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Applying as Fresher. No prior work experience details are required for this application.</span>
            </div>
            <span className="font-bold text-[11px] bg-white border border-emerald-300 px-2.5 py-0.5 rounded-full text-emerald-800">
              Total Experience: 0 Years 0 Months
            </span>
          </div>
        ) : (
          /* Experienced Details Form */
          <div className="pt-2 space-y-4">
            {errors['exp_general'] && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors['exp_general']}</span>
              </div>
            )}

            {/* Repeatable Experience Cards */}
            <div className="space-y-4">
              {experiences.map((exp, idx) => {
                const cardNum = idx + 1;
                const employerError = errors[`exp_${exp.id}_employer`];
                const designationError = errors[`exp_${exp.id}_designation`];

                return (
                  <div
                    key={exp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#102a43] text-white text-[11px] font-bold flex items-center justify-center">
                          {cardNum}
                        </span>
                        <h4 className="text-xs font-bold text-[#102a43]">
                          Experience #{cardNum}
                          {exp.employer && <span className="ml-1 text-slate-500 font-normal">({exp.employer})</span>}
                        </h4>
                      </div>

                      {experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove this experience entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                      {/* Employer */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Previous Employer / Organisation <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={registerRef(`exp_${exp.id}_employer`)}
                          type="text"
                          placeholder="E.G. ABC AGRI SERVICES PVT LTD"
                          value={exp.employer || ''}
                          onChange={e => handleExperienceFieldChange(exp.id, 'employer', e.target.value)}
                          aria-invalid={Boolean(employerError)}
                          className={`w-full px-3 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all h-[38px] ${
                            employerError
                              ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                              : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                          }`}
                        />
                        {employerError && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {employerError}
                          </p>
                        )}
                      </div>

                      {/* Designation */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Designation / Job Role <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          ref={registerRef(`exp_${exp.id}_designation`)}
                          type="text"
                          placeholder="E.G. FIELD EXECUTIVE / AGRONOMIST"
                          value={exp.designation || ''}
                          onChange={e => handleExperienceFieldChange(exp.id, 'designation', e.target.value)}
                          aria-invalid={Boolean(designationError)}
                          className={`w-full px-3 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] placeholder-slate-400 focus:outline-none focus:ring-2 transition-all h-[38px] ${
                            designationError
                              ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                              : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                          }`}
                        />
                        {designationError && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {designationError}
                          </p>
                        )}
                      </div>

                      {/* Employment Start Date */}
                      <div>
                        <div className="h-7 flex items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <input
                          ref={registerRef(`exp_${exp.id}_startDate`)}
                          type="date"
                          max={getLocalTodayIso()}
                          value={exp.startDate || ''}
                          onChange={e => handleExperienceFieldChange(exp.id, 'startDate', e.target.value)}
                          className="w-full px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 focus:ring-[#102a43]/20 focus:border-[#102a43] transition-all h-[38px]"
                        />
                        {errors[`exp_${exp.id}_startDate`] && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {errors[`exp_${exp.id}_startDate`]}
                          </p>
                        )}
                      </div>

                      {/* Employment End Date */}
                      <div>
                        <div className="h-7 flex items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            End Date {!exp.isCurrent && <span className="text-red-500">*</span>}
                          </label>
                        </div>
                        {exp.isCurrent ? (
                          <div className="w-full px-3 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 flex items-center justify-between h-[38px] select-none cursor-not-allowed">
                            <span className="text-slate-500 font-medium">Present</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Ongoing
                            </span>
                          </div>
                        ) : (
                          <input
                            ref={registerRef(`exp_${exp.id}_endDate`)}
                            type="date"
                            max={getLocalTodayIso()}
                            min={exp.startDate || undefined}
                            value={exp.endDate || ''}
                            onChange={e => handleExperienceFieldChange(exp.id, 'endDate', e.target.value)}
                            className="w-full px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 focus:ring-[#102a43]/20 focus:border-[#102a43] transition-all h-[38px]"
                          />
                        )}
                        <div className="mt-1.5 flex items-center">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(exp.isCurrent)}
                              onChange={e => handleExperienceFieldChange(exp.id, 'isCurrent', e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-[11px] font-medium text-slate-700">Currently Working</span>
                          </label>
                        </div>
                        {errors[`exp_${exp.id}_endDate`] && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {errors[`exp_${exp.id}_endDate`]}
                          </p>
                        )}
                      </div>

                      {/* Calculated Duration */}
                      <div>
                        <div className="h-7 flex items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Calculated Duration
                          </label>
                        </div>
                        <div className="w-full px-3 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-[#102a43] flex items-center gap-1.5 h-[38px] select-none">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            {exp.startDate && (exp.isCurrent || exp.endDate) && (exp.years !== '' || exp.months !== '')
                              ? `${exp.years || 0} Y ${exp.months || 0} M ${exp.days || 0} D`
                              : '--'}
                          </span>
                        </div>
                        {errors[`exp_${exp.id}_duration`] && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {errors[`exp_${exp.id}_duration`]}
                          </p>
                        )}
                      </div>

                      {/* Experience Certificate Available */}
                      <div>
                        <div className="h-7 flex items-end mb-1">
                          <label className="block text-xs font-semibold text-slate-700 leading-tight">
                            Experience Certificate Available <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <select
                          ref={registerRef(`exp_${exp.id}_hasCertificate`)}
                          value={exp.hasCertificate || 'no'}
                          onChange={e => handleExperienceFieldChange(exp.id, 'hasCertificate', e.target.value)}
                          className="w-full px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 focus:ring-[#102a43]/20 focus:border-[#102a43] transition-all cursor-pointer h-[38px]"
                        >
                          <option value="no">No - Not Available</option>
                          <option value="yes">Yes - Available</option>
                        </select>
                        {errors[`exp_${exp.id}_hasCertificate`] && (
                          <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {errors[`exp_${exp.id}_hasCertificate`]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Add Another Experience Button (Rendered directly below newest experience card) */}
            <div className="pt-2">
              {canAddMoreExperiences ? (
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#102a43] hover:bg-[#243b53] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Another Experience</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium select-none">
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Complete Experience #{experiences.length} to add another</span>
                </div>
              )}
            </div>

            {/* Calculated Total Work Experience Banner (Placed below all cards & Add button) */}
            <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-[#102a43]">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span className="font-semibold text-slate-700">Calculated Total Work Experience:</span>
                  <span className="font-bold text-[#102a43] text-sm">
                    {totalExperience.years} {totalExperience.years === 1 ? 'Year' : 'Years'}{' '}
                    {totalExperience.months} {totalExperience.months === 1 ? 'Month' : 'Months'}{' '}
                    {totalExperience.days} {totalExperience.days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <span className="text-[11px] text-[#627d98]">
                  Summed from {experiences.length} declared employer duration{experiences.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Note: This total is calculated automatically based on non-overlapping employment date ranges.
              </p>
            </div>

            {errors['exp_total'] && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors['exp_total']}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 3: Your Residential Location & Vacancy Availability ─────── */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-[#102a43]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              3. Your Residential Location &amp; Vacancy Availability
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            {postingLevel} Drive
          </span>
        </div>

        <p className="text-xs text-[#486581]">
          The system checks official vacancies for this job posting based on the residential addresses recorded in your Candidate Profile.
        </p>

        {/* Incomplete Address Case */}
        {!hasAnyResidentialAddress ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Incomplete Residential Address Information</p>
                <p className="text-amber-800 mt-0.5">
                  Your profile does not contain a verified district and taluka. Vacancy availability cannot be determined automatically. You may still select an eligible posting location below.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Info className="w-3.5 h-3.5" /> Availability Not Determined
            </div>
          </div>
        ) : isSameAddress ? (
          /* Single Unified Card (Addresses are identical or one is unspecified) */
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#102a43]">
                <Home className="w-4 h-4 text-slate-500" />
                <span>Residential Address (Current &amp; Permanent)</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                currentEligibility.status === 'Vacancy Available'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : currentEligibility.status === 'Available in Other Taluka'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : currentEligibility.status === 'No Vacancy'
                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {currentEligibility.status === 'Vacancy Available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                {currentEligibility.status === 'Available in Other Taluka' && <Info className="w-3.5 h-3.5 text-blue-700" />}
                {currentEligibility.status === 'No Vacancy' && <AlertCircle className="w-3.5 h-3.5 text-slate-600" />}
                {currentEligibility.status === 'Availability Not Determined' && <AlertCircle className="w-3.5 h-3.5 text-amber-700" />}
                {currentEligibility.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Location:</span>
                <p className="text-slate-600 text-xs">
                  <span>District: </span>
                  <span className="font-semibold text-[#102a43]">{currentAddress.district || 'Not specified'}</span>
                  <span className="text-slate-300 mx-1.5 select-none">|</span>
                  <span>Taluka: </span>
                  <span className="font-semibold text-[#102a43]">{currentAddress.taluka || 'Not specified'}</span>
                </p>
              </div>
              {currentAddress.pincode && (
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Pincode:</span>
                  <span className="font-semibold text-[#102a43] pl-0.5 block">{currentAddress.pincode}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-xs">
              <p className="text-slate-700 leading-snug">{currentEligibility.message}</p>
              {currentEligibility.isReliable && currentEligibility.vacancyCount !== null && (
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-slate-300 text-[#102a43]">
                  {currentEligibility.vacancyCount} open post{currentEligibility.vacancyCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {currentEligibility.lastUpdatedAt && (
              <p className="text-[10px] text-slate-400">
                Quota verified as of {new Date(currentEligibility.lastUpdatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          /* Separate Address Cards (Current & Permanent differ) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Residential Address Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#102a43]">
                  <Home className="w-3.5 h-3.5 text-slate-500" />
                  <span>Current Residential Address</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentEligibility.status === 'Vacancy Available'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : currentEligibility.status === 'Available in Other Taluka'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : currentEligibility.status === 'No Vacancy'
                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {currentEligibility.status}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Location:</span>
                  <p className="text-slate-600 text-xs">
                    <span>District: </span>
                    <span className="font-semibold text-[#102a43]">{currentAddress.district || 'Not specified'}</span>
                    <span className="text-slate-300 mx-1.5 select-none">|</span>
                    <span>Taluka: </span>
                    <span className="font-semibold text-[#102a43]">{currentAddress.taluka || 'Not specified'}</span>
                  </p>
                </div>
                <p className="text-slate-700 text-xs pt-0.5">{currentEligibility.message}</p>
                {currentEligibility.isReliable && currentEligibility.vacancyCount !== null && (
                  <p className="font-mono font-bold text-[11px] text-[#102a43]">
                    Count: {currentEligibility.vacancyCount} post(s)
                  </p>
                )}
              </div>
            </div>

            {/* Permanent Residential Address Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#102a43]">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Permanent Residential Address</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  permanentEligibility.status === 'Vacancy Available'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : permanentEligibility.status === 'Available in Other Taluka'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : permanentEligibility.status === 'No Vacancy'
                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {permanentEligibility.status}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Location:</span>
                  <p className="text-slate-600 text-xs">
                    <span>District: </span>
                    <span className="font-semibold text-[#102a43]">{permanentAddress.district || 'Not specified'}</span>
                    <span className="text-slate-300 mx-1.5 select-none">|</span>
                    <span>Taluka: </span>
                    <span className="font-semibold text-[#102a43]">{permanentAddress.taluka || 'Not specified'}</span>
                  </p>
                </div>
                <p className="text-slate-700 text-xs pt-0.5">{permanentEligibility.message}</p>
                {permanentEligibility.isReliable && permanentEligibility.vacancyCount !== null && (
                  <p className="font-mono font-bold text-[11px] text-[#102a43]">
                    Count: {permanentEligibility.vacancyCount} post(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informational Disclaimer Notice */}
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>Informational Notice:</strong> Vacancy availability shown above is purely indicative based on current published quotas. It does not disqualify you from applying for this role or any eligible location, nor does it guarantee final appointment.
          </span>
        </div>
      </div>

      {/* ── SECTION 4: PREFERRED POSTING LOCATION ────────────────────────────── */}
      <div id="section-posting-location" className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-[#102a43]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              4. PREFERRED POSTING LOCATION <span className="text-red-500">*</span>
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            isDistrictWise 
              ? 'text-purple-700 bg-purple-50 border border-purple-200' 
              : 'text-blue-700 bg-blue-50 border border-blue-200'
          }`}>
            {isDistrictWise ? 'District-Wise Drive' : 'Taluka-Wise Drive'}
          </span>
        </div>

        <p className="text-[11px] text-[#627d98]">
          {isDistrictWise
            ? 'This position is recruited at the District level. Please select your preferred district of posting. You are eligible to apply regardless of your residential address.'
            : 'This position is recruited at the Taluka level. Please select your preferred district and taluka. You are eligible to apply regardless of your residential address.'}
        </p>

        {allowedDistricts.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No Posting Districts Configured</p>
              <p className="mt-0.5">
                The Admin has not configured eligible posting districts for this position. Applications cannot proceed without verified locations.
              </p>
            </div>
          </div>
        ) : isMultipleLocationsEnabled ? (
          /* ── MULTIPLE PREFERRED POSTING LOCATIONS SELECTION ── */
          <div className="space-y-5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#102a43] flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold">
                You can select up to <strong>{maxDistrictsAllowed} preferred districts</strong> in order of priority (Priority 1 = Highest Priority).
                {!isDistrictWise && ` You may select up to ${maxTalukasPerDistrict} preferred talukas for each district.`}
              </span>
              <span className="font-bold text-[11px] bg-white border border-slate-300 px-2.5 py-0.5 rounded-full text-slate-700">
                {preferredDistricts.filter(p => p.district).length} of {maxDistrictsAllowed} Selected
              </span>
            </div>

            {/* List of District Preference Cards */}
            <div className="space-y-4">
              {preferredDistricts.map((card, cardIdx) => {
                const priorityNum = cardIdx + 1;
                const isFirstPriority = priorityNum === 1;
                const distVacancy = card.district ? getLocationVacancyStatus(card.district, null, job) : null;
                const cardTalukasForDist = card.district ? getTalukasForSpecificDistrict(card.district) : [];
                const selectedDistrictsInOtherCards = preferredDistricts
                  .filter(p => p.id !== card.id && p.district)
                  .map(p => p.district.trim().toLowerCase());

                const distError = errors[`pref_dist_${card.id}`] || (isFirstPriority ? errors['preferredDistrict'] : null);

                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3.5 transition-all"
                  >
                    {/* Card Header: Priority & Remove Button */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isFirstPriority
                            ? 'bg-[#102a43] text-white shadow-2xs'
                            : priorityNum === 2
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          Priority {priorityNum} {isFirstPriority ? '(Primary)' : ''}
                        </span>
                        {card.district && (
                          <span className="text-xs font-semibold text-[#102a43]">
                            — {card.district}
                          </span>
                        )}
                      </div>

                      {preferredDistricts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePreferredDistrict(card.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={`Remove Priority ${priorityNum} Preference`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* District Selection & Vacancy Status */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Preferred District (Priority {priorityNum}) <span className="text-red-500">*</span>
                      </label>
                      <select
                        ref={registerRef(`pref_dist_${card.id}`)}
                        value={card.district || ''}
                        onChange={e => handleDistrictPreferenceChange(card.id, e.target.value)}
                        aria-invalid={Boolean(distError)}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          distError
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      >
                        <option value="">Select Priority {priorityNum} District</option>
                        {allowedDistricts.map(dist => {
                          const isAlreadySelected = selectedDistrictsInOtherCards.includes(dist.trim().toLowerCase());
                          const isResidential = Boolean(
                            currentAddress.district && dist.toLowerCase() === currentAddress.district.toLowerCase()
                          );
                          return (
                            <option key={dist} value={dist} disabled={isAlreadySelected}>
                              {dist} {isResidential ? '(Residential District)' : ''} {isAlreadySelected ? '(Already Selected in Another Priority)' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {distError && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {distError}
                        </p>
                      )}

                      {/* District-level Vacancy Status Badge */}
                      {card.district && distVacancy && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            distVacancy.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : distVacancy.status === 'NO VACANCY'
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {distVacancy.status === 'AVAILABLE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                            {distVacancy.status === 'NO VACANCY' && <AlertCircle className="w-3.5 h-3.5 text-slate-600" />}
                            {distVacancy.status === 'NOT DETERMINED' && <Info className="w-3.5 h-3.5 text-amber-700" />}
                            {distVacancy.status === 'AVAILABLE'
                              ? 'Vacancy Available'
                              : distVacancy.status === 'NO VACANCY'
                              ? 'No Vacancy'
                              : 'Availability Not Determined'}
                          </span>
                          <span className="text-slate-600 text-xs">
                            {distVacancy.message}
                          </span>
                          {distVacancy.count !== null && (
                            <span className="font-mono font-bold text-[11px] text-[#102a43] bg-white border border-slate-200 px-2 py-0.5 rounded">
                              {distVacancy.count} post{distVacancy.count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Taluka Selection Controls (Rendered ONLY for Taluka-wise drive) */}
                    {!isDistrictWise && (
                      <div className="pt-2 border-t border-slate-200/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700">
                            Preferred Talukas in {card.district || 'Selected District'} <span className="text-red-500">*</span>
                            <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                              (Equal priority within this district, max {maxTalukasPerDistrict})
                            </span>
                          </label>
                        </div>

                        {!card.district ? (
                          <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-400 select-none">
                            Select District above to configure preferred talukas
                          </div>
                        ) : cardTalukasForDist.length === 0 ? (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                            No talukas configured or found for {card.district}.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(card.talukas && card.talukas.length > 0 ? card.talukas : ['']).map((talVal, talIdx) => {
                              const talukaError = errors[`pref_tal_${card.id}_${talIdx}`] || (isFirstPriority && talIdx === 0 ? errors['preferredTaluka'] : null);
                              const talVacancy = (card.district && talVal) ? getLocationVacancyStatus(card.district, talVal, job) : null;
                              const otherTalukasInCard = (card.talukas || [])
                                .filter((_, idx) => idx !== talIdx)
                                .map(t => t.trim().toLowerCase());

                              return (
                                <div key={talIdx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-600">
                                      Taluka Preference #{talIdx + 1}
                                    </span>
                                    {talIdx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTalukaFromDistrict(card.id, talIdx)}
                                        className="text-red-600 hover:text-red-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" /> Remove Taluka
                                      </button>
                                    )}
                                  </div>

                                  <select
                                    ref={registerRef(`pref_tal_${card.id}_${talIdx}`)}
                                    value={talVal || ''}
                                    onChange={e => handleTalukaPreferenceChange(card.id, talIdx, e.target.value)}
                                    aria-invalid={Boolean(talukaError)}
                                    className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                                      talukaError
                                        ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                                        : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                                    }`}
                                  >
                                    <option value="">Select Taluka #{talIdx + 1}</option>
                                    {cardTalukasForDist.map(t => {
                                      const isAlreadyChosen = otherTalukasInCard.includes(t.trim().toLowerCase());
                                      return (
                                        <option key={t} value={t} disabled={isAlreadyChosen}>
                                          {t} {isAlreadyChosen ? '(Already Selected in this District)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>

                                  {talukaError && (
                                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      {talukaError}
                                    </p>
                                  )}

                                  {/* Taluka Vacancy Status Badge */}
                                  {talVal && talVacancy && (
                                    <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        talVacancy.status === 'AVAILABLE'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                          : talVacancy.status === 'NO VACANCY'
                                          ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                                      }`}>
                                        {talVacancy.status === 'AVAILABLE'
                                          ? 'Vacancy Available'
                                          : talVacancy.status === 'NO VACANCY'
                                          ? 'No Vacancy'
                                          : 'Availability Not Determined'}
                                      </span>
                                      <span className="text-slate-600 text-[11px]">
                                        {talVacancy.message}
                                      </span>
                                      {talVacancy.count !== null && (
                                        <span className="font-mono font-bold text-[10px] text-[#102a43] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                          {talVacancy.count} post{talVacancy.count === 1 ? '' : 's'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Add Second Taluka Button */}
                            {(card.talukas?.length || 0) < maxTalukasPerDistrict && card.talukas?.[0] && (
                              <button
                                type="button"
                                onClick={() => handleAddTalukaToDistrict(card.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#102a43] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+ Add Second Preferred Taluka for {card.district}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Add Preferred District Button */}
            <div className="pt-2">
              {preferredDistricts.length < maxDistrictsAllowed ? (
                <button
                  type="button"
                  onClick={handleAddPreferredDistrict}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#102a43] hover:bg-[#243b53] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Preferred District (Priority {preferredDistricts.length + 1} of {maxDistrictsAllowed})</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium select-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Maximum {maxDistrictsAllowed} preferred districts configured</span>
                </div>
              )}
            </div>

            {/* ── CONDITIONAL MOBILITY CONSENT SECTION ── */}
            <div className="pt-3 border-t border-slate-200">
              {!requiresMobilityConsent ? (
                /* All preferred locations match residential location: Consent NOT required */
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Native Location Match:</strong> All your selected preferred posting locations match your declared residential district(s). No outside mobility consent declaration is required.
                  </span>
                </div>
              ) : (
                /* Outside locations selected: Mandatory Mobility Consent with Modal */
                <div className={`p-4 rounded-xl border transition-all space-y-3 ${
                  errors['mobilityConsent']
                    ? 'bg-amber-50/80 border-2 border-red-400'
                    : 'bg-amber-50/40 border-amber-300'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#102a43] uppercase tracking-wider">
                        Mobility &amp; Posting Allocation Consent <span className="text-red-500">*</span>
                      </h4>
                      <p className="text-xs text-amber-900 mt-0.5">
                        {getOutsideDistrictsExplanation(outsideDistricts, currentAddress.district, permanentAddress.district, isSameAddress)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white/80 border border-amber-200 rounded-xl">
                    <input
                      ref={registerRef('mobilityConsent')}
                      id="mobilityConsentCheckbox"
                      type="checkbox"
                      checked={Boolean(isMobilityConsentValid && (data.mobilityConsent?.consented || data.locationConfirmed))}
                      onChange={e => {
                        if (e.target.checked) {
                          setShowMobilityModal(true);
                        } else {
                          onChange('mobilityConsent', undefined);
                          onChange('locationConfirmed', false);
                        }
                      }}
                      className="w-4 h-4 mt-0.5 rounded text-[#102a43] focus:ring-[#102a43] border-slate-300 cursor-pointer"
                    />
                    <div className="flex-1 text-xs text-slate-800 leading-relaxed">
                      <label htmlFor="mobilityConsentCheckbox" className="font-semibold text-[#102a43] cursor-pointer">
                        I understand and accept the Mobility &amp; Posting Allocation Declaration for outside locations.
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMobilityModal(true)}
                        className="ml-2 text-blue-700 hover:text-blue-900 underline font-semibold text-xs cursor-pointer inline-block"
                      >
                        [Read Full Declaration]
                      </button>
                      {data.mobilityConsent?.consented && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Consent recorded on {new Date(data.mobilityConsent.consentedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {errors['mobilityConsent'] && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors['mobilityConsent']}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── SINGLE PREFERRED LOCATION WORKFLOW (LEGACY / DISABLED) ── */
          <div className="space-y-4">
            <div className={`grid grid-cols-1 ${isDistrictWise ? '' : 'sm:grid-cols-2'} gap-4`}>
              {/* Preferred District */}
              <div>
                <label htmlFor="preferredDistrict" className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred District <span className="text-red-500">*</span>
                </label>
                <select
                  ref={registerRef('preferredDistrict')}
                  id="preferredDistrict"
                  name="preferredDistrict"
                  value={data.preferredDistrict || ''}
                  onChange={e => handleDistrictChange(e.target.value)}
                  aria-invalid={Boolean(errors['preferredDistrict'])}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                    errors['preferredDistrict']
                      ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                      : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                  }`}
                >
                  <option value="">Select Preferred District</option>
                  {allowedDistricts.map(dist => (
                    <option key={dist} value={dist}>
                      {dist} {Boolean(currentAddress.district && dist.toLowerCase() === currentAddress.district.toLowerCase()) ? '(Residential District)' : ''}
                    </option>
                  ))}
                </select>
                {errors['preferredDistrict'] ? (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors['preferredDistrict']}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#627d98] mt-1">
                    {allowedDistricts.length === MAHARASHTRA_DISTRICTS.length
                      ? 'Open for all Maharashtra districts. You may select any district.'
                      : `Configured for ${allowedDistricts.length} eligible district${allowedDistricts.length === 1 ? '' : 's'}. You may select any listed district.`}
                  </p>
                )}
              </div>

              {/* Preferred Taluka (Rendered only for Taluka-wise posting) */}
              {!isDistrictWise && (
                <div>
                  <label htmlFor="preferredTaluka" className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Taluka <span className="text-red-500">*</span>
                  </label>

                  {!data.preferredDistrict ? (
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-400 select-none">
                      Select Preferred District First
                    </div>
                  ) : availableTalukas.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                      No talukas found for {data.preferredDistrict}.
                    </div>
                  ) : (
                    <>
                      <select
                        ref={registerRef('preferredTaluka')}
                        id="preferredTaluka"
                        name="preferredTaluka"
                        value={data.preferredTaluka || ''}
                        onChange={e => {
                          onChange('preferredTaluka', e.target.value);
                          clearFieldError('preferredTaluka');
                        }}
                        aria-invalid={Boolean(errors['preferredTaluka'])}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-[#102a43] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                          errors['preferredTaluka']
                            ? 'border-red-400 bg-red-50/20 focus:ring-red-200 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#102a43]/20 focus:border-[#102a43]'
                        }`}
                      >
                        <option value="">Select Preferred Taluka</option>
                        {availableTalukas.map(tal => (
                          <option key={tal} value={tal}>
                            {tal}
                          </option>
                        ))}
                      </select>
                      {errors['preferredTaluka'] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {errors['preferredTaluka']}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Location Difference Confirmation Checkbox */}
            {isDifferentFromNative && (
              <div className="pt-2">
                <label
                  htmlFor="locationConfirmed"
                  className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors ${
                    errors['locationConfirmed']
                      ? 'bg-amber-50/70 border-2 border-red-300'
                      : 'bg-amber-50/40 border border-amber-200 hover:bg-amber-50/70'
                  }`}
                >
                  <input
                    ref={registerRef('locationConfirmed')}
                    id="locationConfirmed"
                    name="locationConfirmed"
                    type="checkbox"
                    checked={Boolean(data.locationConfirmed)}
                    onChange={e => {
                      onChange('locationConfirmed', e.target.checked);
                      clearFieldError('locationConfirmed');
                    }}
                    aria-invalid={Boolean(errors['locationConfirmed'])}
                    className="w-4 h-4 mt-0.5 rounded text-[#102a43] focus:ring-[#102a43] border-slate-300 cursor-pointer"
                  />
                  <div className="text-xs text-slate-800 leading-relaxed">
                    <span className="font-bold text-[#102a43] block mb-0.5">Location Difference Confirmation:</span>
                    I understand that my preferred posting location differs from my residential district and/or taluka, and I am willing to work at the selected location, subject to vacancy availability and the organisation’s allocation policy.
                  </div>
                </label>
                {errors['locationConfirmed'] && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors['locationConfirmed']}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 5: Work Location Flexibility ────────────────────────────── */}
      {locationQuestions.length > 0 && (
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-[#102a43]">
            <Compass className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              5. Work Location Flexibility
            </h3>
          </div>
          <p className="text-[11px] text-[#627d98]">
            Please answer the following mobility questions regarding your availability for this {postingLevel} role.
          </p>

          <div className="space-y-3">
            {locationQuestions.map((q, idx) => {
              const ans = data.locationAnswers?.[q.id];
              const err = errors[`loc_q_${q.id}`];

              return (
                <div
                  key={q.id}
                  ref={registerRef(`loc_q_${q.id}`)}
                  tabIndex={-1}
                  className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                    err
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="font-bold text-[#102a43] leading-snug">
                      <span className="text-slate-500 font-mono mr-1.5">{idx + 1}.</span>
                      {q.questionText}
                      {q.required ? (
                        <span className="text-red-500 ml-1" title="Required question">*</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">(optional)</span>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <label
                      onClick={() => {
                        onChange('locationAnswers', { ...(data.locationAnswers || {}), [q.id]: true });
                        clearFieldError(`loc_q_${q.id}`);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                        ans === true
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`loc_q_${q.id}`}
                        checked={ans === true}
                        onChange={() => {
                          onChange('locationAnswers', { ...(data.locationAnswers || {}), [q.id]: true });
                          clearFieldError(`loc_q_${q.id}`);
                        }}
                        className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Yes</span>
                    </label>

                    <label
                      onClick={() => {
                        onChange('locationAnswers', { ...(data.locationAnswers || {}), [q.id]: false });
                        clearFieldError(`loc_q_${q.id}`);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                        ans === false
                          ? 'bg-slate-100 text-slate-900 border-slate-700 shadow-xs ring-1 ring-slate-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`loc_q_${q.id}`}
                        checked={ans === false}
                        onChange={() => {
                          onChange('locationAnswers', { ...(data.locationAnswers || {}), [q.id]: false });
                          clearFieldError(`loc_q_${q.id}`);
                        }}
                        className="w-4 h-4 text-slate-800 border-slate-300 focus:ring-slate-500 cursor-pointer"
                      />
                      <span>No</span>
                    </label>
                  </div>

                  {err && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {returnToReview ? '← Return to Review' : <>&larr; Back to Identity &amp; Address</>}
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          {returnToReview
            ? 'Save & Return to Review'
            : hasPublishedQuestionnaire
            ? 'Continue to Job-Specific Questions'
            : 'Review Application'}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobility & Posting Allocation Modal */}
      {showMobilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#102a43]">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Mobility &amp; Posting Allocation Declaration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobilityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-amber-900 block">
                Selected Non-Residential Locations:
              </span>
              <p className="text-amber-800">
                {getOutsideDistrictsExplanation(outsideDistricts, currentAddress.district, permanentAddress.district, isSameAddress)}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
              <p className="font-semibold text-[#102a43] mb-1">Declaration Statement:</p>
              <p>{MOBILITY_CONSENT_TEXT}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMobilityModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('mobilityConsent', {
                    consented: true,
                    consentedAt: new Date().toISOString(),
                    outsideDistricts,
                    consentText: MOBILITY_CONSENT_TEXT,
                    consentVersion: 'v1.0',
                    candidateId: masterProfile?.candidateId || undefined,
                  });
                  onChange('locationConfirmed', true);
                  clearFieldError('mobilityConsent');
                  clearFieldError('locationConfirmed');
                  setShowMobilityModal(false);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                I Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
