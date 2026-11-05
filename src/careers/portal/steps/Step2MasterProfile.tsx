import { useState, useEffect, useRef } from 'react';
import { User, MapPin, Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft, Phone, Mail, Shield, Eye, EyeOff, Info } from 'lucide-react';
import { MAHARASHTRA_DISTRICTS, getTalukasForDistrict } from '../../../data/maharashtraGeography';
import { upsertCandidateProfile } from '../../lib/api';
import { CASTE_CATEGORIES, type MasterProfileFormData } from '../types';
import { validateVerhoeff, computeAadhaarHmac, checkAadhaarDuplicateServer, registerAadhaarHash, formatAadhaarDisplay, getLocalTodayIso } from '../utils/verhoeff';

interface Step1MasterProfileProps {
  data: MasterProfileFormData;
  userId: string;
  verifiedMobile: string;
  isCasteRequired?: boolean;
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
  returnToReview?: boolean;
  onChange: (field: keyof MasterProfileFormData, value: any) => void;
  onNext: () => void;
  onBack?: () => void;
  onCancel: () => void;
}

export type FieldErrors = Partial<Record<keyof MasterProfileFormData | 'currentAddressLine1' | 'currentDistrict' | 'currentTaluka' | 'currentPincode' | 'permanentAddressLine1' | 'permanentDistrict' | 'permanentTaluka' | 'permanentPincode', string>>;

export default function Step1MasterProfile({
  data,
  userId,
  verifiedMobile,
  isCasteRequired = false,
  submitButtonLabel,
  cancelButtonLabel,
  returnToReview,
  onChange,
  onNext,
  onBack,
  onCancel,
}: Step1MasterProfileProps) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showAadhaar, setShowAadhaar] = useState(false);

  // ── Element references for Auto-Focus & Auto-Scroll ──────────────────────────
  const fieldRefs = {
    fullName: useRef<HTMLInputElement>(null),
    aadhaarNumber: useRef<HTMLInputElement>(null),
    dateOfBirth: useRef<HTMLInputElement>(null),
    gender: useRef<HTMLSelectElement>(null),
    alternateMobile: useRef<HTMLInputElement>(null),
    casteCategory: useRef<HTMLSelectElement>(null),
    email: useRef<HTMLInputElement>(null),
    currentAddressLine1: useRef<HTMLInputElement>(null),
    currentDistrict: useRef<HTMLSelectElement>(null),
    currentTaluka: useRef<HTMLSelectElement>(null),
    currentPincode: useRef<HTMLInputElement>(null),
    permanentAddressLine1: useRef<HTMLInputElement>(null),
    permanentDistrict: useRef<HTMLSelectElement>(null),
    permanentTaluka: useRef<HTMLSelectElement>(null),
    permanentPincode: useRef<HTMLInputElement>(null),
  };

  const cleanVerifiedMobile = (verifiedMobile || data.mobile || '').replace(/\D/g, '').slice(-10);

  // ── Derived Address Values (with backward-compatible fallbacks) ──────────────
  const currentAddressLine1Val = data.currentAddressLine1 || data.addressLine1 || '';
  const currentDistrictVal = data.currentDistrict || data.homeDistrict || '';
  const currentTalukaVal = data.currentTaluka || data.homeTaluka || '';
  const currentPincodeVal = data.currentPincode || data.pincode || '';

  const isSameAddress = Boolean(data.permanentSameAsCurrent);
  const permanentAddressLine1Val = isSameAddress ? currentAddressLine1Val : (data.permanentAddressLine1 || '');
  const permanentDistrictVal = isSameAddress ? currentDistrictVal : (data.permanentDistrict || '');
  const permanentTalukaVal = isSameAddress ? currentTalukaVal : (data.permanentTaluka || '');
  const permanentPincodeVal = isSameAddress ? currentPincodeVal : (data.permanentPincode || '');

  // ── Taluka Options for Current & Permanent Districts ────────────────────────
  const [currentAvailableTalukas, setCurrentAvailableTalukas] = useState<string[]>([]);
  const [permanentAvailableTalukas, setPermanentAvailableTalukas] = useState<string[]>([]);

  useEffect(() => {
    if (currentDistrictVal) {
      const talukas = getTalukasForDistrict(currentDistrictVal);
      setCurrentAvailableTalukas(talukas);
      if (currentTalukaVal && !talukas.includes(currentTalukaVal)) {
        onChange('currentTaluka', '');
        onChange('homeTaluka', '');
      }
    } else {
      setCurrentAvailableTalukas([]);
    }
  }, [currentDistrictVal]);

  useEffect(() => {
    if (permanentDistrictVal) {
      const talukas = getTalukasForDistrict(permanentDistrictVal);
      setPermanentAvailableTalukas(talukas);
      if (permanentTalukaVal && !talukas.includes(permanentTalukaVal)) {
        onChange('permanentTaluka', '');
      }
    } else {
      setPermanentAvailableTalukas([]);
    }
  }, [permanentDistrictVal]);

  // ── Single Field Validation Logic ───────────────────────────────────────────
  const validateField = (field: string, value: string): string | null => {
    const trimmed = (value || '').trim();

    switch (field) {
      case 'fullName': {
        if (!trimmed) {
          return 'Full name is required as per Aadhaar Card.';
        }
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
        }
        if (/\d/.test(trimmed)) {
          return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
        }
        const englishOnlyRegex = /^[A-Z\s'-]+$/;
        if (!englishOnlyRegex.test(trimmed)) {
          return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
        }
        if (trimmed.length < 2) {
          return 'Please enter a valid full name (minimum 2 characters).';
        }
        return null;
      }

      case 'aadhaarNumber': {
        const clean = trimmed.replace(/\D/g, '');
        if (!clean) {
          return 'Aadhaar number is required.';
        }
        if (clean.length !== 12) {
          return 'Aadhaar number must be exactly 12 numeric digits.';
        }
        if (!/^\d{12}$/.test(clean)) {
          return 'Only English numeric digits (0–9) are allowed.';
        }
        if (!validateVerhoeff(clean)) {
          return 'Please enter a valid 12-digit Indian Aadhaar number.';
        }
        return null;
      }

      case 'dateOfBirth': {
        if (!trimmed) {
          return 'Enter a valid date of birth.';
        }
        const dob = new Date(trimmed);
        if (isNaN(dob.getTime())) {
          return 'Enter a valid date of birth.';
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dob > today) {
          return 'Enter a valid date of birth.';
        }
        const minYear = 1940;
        if (dob.getFullYear() < minYear) {
          return 'Enter a valid date of birth.';
        }
        return null;
      }

      case 'gender': {
        if (!trimmed) {
          return 'Please select a gender.';
        }
        const norm = trimmed.toLowerCase() === 'transgender' ? 'other' : trimmed.toLowerCase();
        const allowed = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!allowed.includes(norm)) {
          return 'Please select a gender.';
        }
        return null;
      }

      case 'alternateMobile': {
        if (!trimmed) return null; // Optional
        const rawDigits = trimmed.replace(/\D/g, '');
        const cleanDigits = rawDigits.length === 12 && rawDigits.startsWith('91')
          ? rawDigits.slice(2)
          : rawDigits.length === 11 && rawDigits.startsWith('0')
          ? rawDigits.slice(1)
          : rawDigits;
        const validIndianMobileRegex = /^[6-9]\d{9}$/;
        if (!validIndianMobileRegex.test(cleanDigits)) {
          return 'Enter a valid 10-digit alternate mobile number.';
        }
        // Alternate number may be identical to WhatsApp verified number
        return null;
      }

      case 'casteCategory': {
        if (isCasteRequired && !trimmed) {
          return 'Please select a caste category.';
        }
        return null;
      }

      case 'email': {
        const trimmed = (value || '').trim().toLowerCase();
        if (!trimmed) return null; // Optional
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English characters are allowed. Marathi / Devanagari characters are not permitted.';
        }
        if (!trimmed.includes('@')) {
          return "Email address must contain '@' (e.g. name@example.com).";
        }
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address with a valid domain (e.g. name@example.com).';
        }
        return null;
      }

      case 'currentAddressLine1':
      case 'addressLine1': {
        if (!trimmed) {
          return 'Current address line is required.';
        }
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English characters are allowed. Please enter address in English CAPITAL letters.';
        }
        const addressRegex = /^[A-Z0-9\s.,'&\(\)\/\\#-]+$/;
        if (!addressRegex.test(trimmed.toUpperCase())) {
          return 'Only English letters, digits, spaces, and standard address punctuation (.,\'&()/#-) are allowed.';
        }
        if (trimmed.length < 3) {
          return 'Please enter a complete address (minimum 3 characters).';
        }
        return null;
      }

      case 'currentDistrict':
      case 'homeDistrict': {
        if (!trimmed || !MAHARASHTRA_DISTRICTS.includes(trimmed)) {
          return 'Please select your current district.';
        }
        return null;
      }

      case 'currentTaluka':
      case 'homeTaluka': {
        if (!trimmed) {
          return 'Please select your current taluka.';
        }
        return null;
      }

      case 'currentPincode':
      case 'pincode': {
        if (!trimmed) {
          return 'PIN code is required.';
        }
        if (/[\u0900-\u097F]/.test(trimmed) || /[\u0966-\u096F]/.test(trimmed)) {
          return 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)';
        }
        if (/[a-zA-Z]/.test(trimmed)) {
          return 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.';
        }
        if (/[^0-9]/.test(trimmed)) {
          return 'Only English digits (0–9) are allowed.';
        }
        if (trimmed.length !== 6) {
          return 'PIN code must be exactly 6 digits.';
        }
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(trimmed)) {
          return 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
        }
        return null;
      }

      case 'permanentAddressLine1': {
        if (!trimmed) {
          return 'Permanent address line is required.';
        }
        if (/[\u0900-\u097F]/.test(trimmed)) {
          return 'Only English characters are allowed. Please enter address in English CAPITAL letters.';
        }
        const addressRegex = /^[A-Z0-9\s.,'&\(\)\/\\#-]+$/;
        if (!addressRegex.test(trimmed.toUpperCase())) {
          return 'Only English letters, digits, spaces, and standard address punctuation (.,\'&()/#-) are allowed.';
        }
        if (trimmed.length < 3) {
          return 'Please enter a complete address (minimum 3 characters).';
        }
        return null;
      }

      case 'permanentDistrict': {
        if (!trimmed || !MAHARASHTRA_DISTRICTS.includes(trimmed)) {
          return 'Please select your permanent district.';
        }
        return null;
      }

      case 'permanentTaluka': {
        if (!trimmed) {
          return 'Please select your permanent taluka.';
        }
        return null;
      }

      case 'permanentPincode': {
        if (!trimmed) {
          return 'Permanent PIN code is required.';
        }
        if (/[\u0900-\u097F]/.test(trimmed) || /[\u0966-\u096F]/.test(trimmed)) {
          return 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)';
        }
        if (/[a-zA-Z]/.test(trimmed)) {
          return 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.';
        }
        if (/[^0-9]/.test(trimmed)) {
          return 'Only English digits (0–9) are allowed.';
        }
        if (trimmed.length !== 6) {
          return 'PIN code must be exactly 6 digits.';
        }
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(trimmed)) {
          return 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
        }
        return null;
      }

      default:
        return null;
    }
  };

  // ── Handle Change with Auto-Uppercase ────────────────────────────────────────
  const handleInputChange = (field: keyof MasterProfileFormData, val: string) => {
    let finalVal = val;
    if (field === 'fullName') {
      finalVal = val.toUpperCase();
    } else if (field === 'email') {
      finalVal = val.toLowerCase().replace(/\s+/g, '');
    } else if (field === 'aadhaarNumber') {
      const prevClean = (data.aadhaarNumber || '').replace(/\D/g, '');
      const prevDisplay = formatAadhaarDisplay(prevClean);
      let clean = val.replace(/\D/g, '');
      if (val.length < prevDisplay.length && clean === prevClean && prevClean.length > 0) {
        // User backspaced over a hyphen, delete preceding digit
        clean = prevClean.slice(0, -1);
      }
      finalVal = clean.slice(0, 12);
    }
    onChange(field, finalVal);

    if (field === 'fullName') {
      if (/[\u0900-\u097F]/.test(val)) {
        setErrors(prev => ({
          ...prev,
          fullName: 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.'
        }));
        return;
      }
      if (/[^A-Z\s'-]/.test(finalVal) && finalVal.trim().length > 0) {
        setErrors(prev => ({
          ...prev,
          fullName: 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.'
        }));
        return;
      }
    }

    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) setFormError(null);
  };

  // ── Address Changes with UpperCase & Same-Address Synchronization ────────────
  const handleAddressChange = (field: keyof MasterProfileFormData, rawVal: string) => {
    let finalVal = rawVal;
    if (field === 'currentAddressLine1' || field === 'permanentAddressLine1' || field === 'addressLine1') {
      finalVal = rawVal.toUpperCase();
    }

    if (field === 'currentPincode' || field === 'permanentPincode') {
      const errorKey = field as keyof FieldErrors;

      // Check for Marathi / Devanagari script or numerals explicitly
      if (/[\u0900-\u097F]/.test(rawVal) || /[\u0966-\u096F]/.test(rawVal)) {
        setErrors(prev => ({
          ...prev,
          [errorKey]: 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)',
          ...(field === 'currentPincode' ? { pincode: 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)' } : {})
        }));
        finalVal = rawVal.replace(/[^0-9]/g, '').slice(0, 6);
        onChange(field, finalVal);
        if (field === 'currentPincode') onChange('pincode', finalVal);
        if (data.permanentSameAsCurrent && field === 'currentPincode') {
          onChange('permanentPincode', finalVal);
        }
        return;
      }

      // Check for letters or other non-digit characters
      if (/[a-zA-Z]/.test(rawVal) || /[^0-9]/.test(rawVal)) {
        setErrors(prev => ({
          ...prev,
          [errorKey]: 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.',
          ...(field === 'currentPincode' ? { pincode: 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.' } : {})
        }));
        finalVal = rawVal.replace(/[^0-9]/g, '').slice(0, 6);
        onChange(field, finalVal);
        if (field === 'currentPincode') onChange('pincode', finalVal);
        if (data.permanentSameAsCurrent && field === 'currentPincode') {
          onChange('permanentPincode', finalVal);
        }
        return;
      }

      // Pure English digits - strictly limit to at most 6 digits
      finalVal = rawVal.replace(/[^0-9]/g, '').slice(0, 6);

      // Clear error when valid digits are entered
      if (errors[errorKey] || (field === 'currentPincode' && errors.pincode)) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[errorKey];
          if (field === 'currentPincode') delete next.pincode;
          return next;
        });
      }

      if (finalVal.length === 6 && !/^[1-9][0-9]{5}$/.test(finalVal)) {
        setErrors(prev => ({
          ...prev,
          [errorKey]: 'Enter a valid 6-digit Indian PIN code (e.g. 400001).',
          ...(field === 'currentPincode' ? { pincode: 'Enter a valid 6-digit Indian PIN code (e.g. 400001).' } : {})
        }));
      }
    }

    onChange(field, finalVal);

    // Sync legacy aliases for current address backward compatibility
    if (field === 'currentAddressLine1') onChange('addressLine1', finalVal);
    if (field === 'currentDistrict') onChange('homeDistrict', finalVal);
    if (field === 'currentTaluka') onChange('homeTaluka', finalVal);
    if (field === 'currentPincode') onChange('pincode', finalVal);

    // If permanent address is marked same as current address, sync automatically
    if (data.permanentSameAsCurrent) {
      if (field === 'currentAddressLine1' || field === 'addressLine1') onChange('permanentAddressLine1', finalVal);
      if (field === 'currentDistrict' || field === 'homeDistrict') onChange('permanentDistrict', finalVal);
      if (field === 'currentTaluka' || field === 'homeTaluka') onChange('permanentTaluka', finalVal);
      if (field === 'currentPincode' || field === 'pincode') onChange('permanentPincode', finalVal);
    }

    if (errors[field as keyof FieldErrors] && field !== 'currentPincode' && field !== 'permanentPincode') {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as keyof FieldErrors];
        return next;
      });
    }
  };

  // Prevent non-numeric characters from being typed in PIN code
  const handlePincodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Home', 'End'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return;
    }

    const isMarathi = /[\u0900-\u097F]/.test(e.key) || /[\u0966-\u096F]/.test(e.key);
    const targetId = (e.currentTarget as HTMLElement).id;
    const isCurrent = targetId.includes('current');
    const errorKey: keyof FieldErrors = isCurrent ? 'currentPincode' : 'permanentPincode';

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setErrors(prev => ({
        ...prev,
        [errorKey]: isMarathi
          ? 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)'
          : 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.',
        ...(isCurrent ? { pincode: isMarathi
          ? 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)'
          : 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.' } : {})
      }));
      return;
    }

    const input = e.currentTarget;
    const selectedLength = (input.selectionEnd || 0) - (input.selectionStart || 0);
    if (input.value.length >= 6 && selectedLength === 0) {
      e.preventDefault();
    }
  };

  // Intercept paste events to reject non-digits, Marathi script, and length overflow
  const handlePincodePaste = (e: React.ClipboardEvent<HTMLInputElement>, field: 'currentPincode' | 'permanentPincode') => {
    const pastedText = e.clipboardData.getData('text');
    const errorKey: keyof FieldErrors = field;
    const input = e.currentTarget;
    const currentVal = input.value || '';
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? currentVal.length;

    // 1. If paste contains Marathi / Devanagari script or numerals, reject the ENTIRE paste
    if (/[\u0900-\u097F]/.test(pastedText) || /[\u0966-\u096F]/.test(pastedText)) {
      e.preventDefault();
      setErrors(prev => ({
        ...prev,
        [errorKey]: 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)',
        ...(field === 'currentPincode' ? { pincode: 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)' } : {})
      }));
      return; // Do NOT call handleAddressChange; previous input value is completely preserved
    }

    // 2. If paste contains alphabets, spaces, punctuation, or any non-English-digit character, reject the ENTIRE paste
    if (/[^0-9]/.test(pastedText)) {
      e.preventDefault();
      setErrors(prev => ({
        ...prev,
        [errorKey]: 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.',
        ...(field === 'currentPincode' ? { pincode: 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.' } : {})
      }));
      return; // Do NOT call handleAddressChange; previous input value is completely preserved
    }

    // 3. If pasted content exceeds 6 digits or resulting length exceeds 6, reject the ENTIRE paste
    const resultingLength = currentVal.length - (end - start) + pastedText.length;
    if (pastedText.length > 6 || resultingLength > 6) {
      e.preventDefault();
      setErrors(prev => ({
        ...prev,
        [errorKey]: 'PIN code must be exactly 6 digits.',
        ...(field === 'currentPincode' ? { pincode: 'PIN code must be exactly 6 digits.' } : {})
      }));
      return; // Do NOT call handleAddressChange; previous input value is completely preserved
    }

    // 4. Valid pure English digits paste (1–6 digits within length limit): apply cleanly
    e.preventDefault();
    const newVal = currentVal.slice(0, start) + pastedText + currentVal.slice(end);
    handleAddressChange(field, newVal);
  };

  // ── Same as Current Address Checkbox Toggle ─────────────────────────────────
  const handleSameAddressToggle = (checked: boolean) => {
    onChange('permanentSameAsCurrent', checked);
    if (checked) {
      onChange('permanentAddressLine1', currentAddressLine1Val);
      onChange('permanentDistrict', currentDistrictVal);
      onChange('permanentTaluka', currentTalukaVal);
      onChange('permanentPincode', currentPincodeVal);
    }
  };

  // ── Handle Field Blur for Inline Real-time Feedback ─────────────────────────
  const handleBlur = (field: string) => {
    let valToCheck = '';
    if (field === 'currentAddressLine1') valToCheck = currentAddressLine1Val;
    else if (field === 'currentDistrict') valToCheck = currentDistrictVal;
    else if (field === 'currentTaluka') valToCheck = currentTalukaVal;
    else if (field === 'currentPincode') valToCheck = currentPincodeVal;
    else if (field === 'permanentAddressLine1') valToCheck = permanentAddressLine1Val;
    else if (field === 'permanentDistrict') valToCheck = permanentDistrictVal;
    else if (field === 'permanentTaluka') valToCheck = permanentTalukaVal;
    else if (field === 'permanentPincode') valToCheck = permanentPincodeVal;
    else valToCheck = String((data as any)[field] || '');

    const errorMsg = validateField(field, valToCheck);
    setErrors(prev => {
      const next = { ...prev };
      if (errorMsg) {
        next[field as keyof FieldErrors] = errorMsg;
      } else {
        delete next[field as keyof FieldErrors];
      }
      return next;
    });
  };

  // ── Form Submit: Validate All, Focus/Scroll First Invalid, Persist ───────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Full Validation Suite
    const newErrors: FieldErrors = {};
    const fieldOrder = [
      'fullName',
      'aadhaarNumber',
      'dateOfBirth',
      'gender',
      'alternateMobile',
      'casteCategory',
      'email',
      'currentAddressLine1',
      'currentDistrict',
      'currentTaluka',
      'currentPincode',
      'permanentAddressLine1',
      'permanentDistrict',
      'permanentTaluka',
      'permanentPincode',
    ];

    for (const field of fieldOrder) {
      let valToCheck = '';
      if (field === 'currentAddressLine1') valToCheck = currentAddressLine1Val;
      else if (field === 'currentDistrict') valToCheck = currentDistrictVal;
      else if (field === 'currentTaluka') valToCheck = currentTalukaVal;
      else if (field === 'currentPincode') valToCheck = currentPincodeVal;
      else if (field === 'permanentAddressLine1') valToCheck = permanentAddressLine1Val;
      else if (field === 'permanentDistrict') valToCheck = permanentDistrictVal;
      else if (field === 'permanentTaluka') valToCheck = permanentTalukaVal;
      else if (field === 'permanentPincode') valToCheck = permanentPincodeVal;
      else valToCheck = String((data as any)[field] || '');

      const errorMsg = validateField(field, valToCheck);
      if (errorMsg) {
        newErrors[field as keyof FieldErrors] = errorMsg;
      }
    }

    if (!cleanVerifiedMobile || cleanVerifiedMobile.length !== 10) {
      setFormError('A valid 10-digit verified WhatsApp mobile number is required.');
      return;
    }

    if (!userId || userId === 'profile-user') {
      setFormError('Authentication required. Please log in with your verified WhatsApp mobile number.');
      return;
    }

    // 2. If Errors Exist: Highlight, Auto-Focus, and Smooth Scroll to First Invalid
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      const firstInvalidKey = fieldOrder.find(k => newErrors[k as keyof FieldErrors]);
      if (firstInvalidKey && (fieldRefs as Record<string, any>)[firstInvalidKey]?.current) {
        const el = (fieldRefs as Record<string, any>)[firstInvalidKey].current;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 150);
      }
      return;
    }

    // 3. Clear errors & persist to PostgreSQL rms_candidate_profiles
    setErrors({});
    setSaving(true);

    try {
      // Server-side Aadhaar Duplicate Check across mobile numbers
      const cleanAadhaar = (data.aadhaarNumber || '').replace(/\D/g, '').slice(0, 12);
      const dupCheck = await checkAadhaarDuplicateServer({
        aadhaarNumber: cleanAadhaar,
        userId,
        mobile: cleanVerifiedMobile,
      });

      if (dupCheck.isDuplicate) {
        const dupMsg = dupCheck.message || 'This Aadhaar number is already registered with another applicant profile.';
        setErrors(prev => ({ ...prev, aadhaarNumber: dupMsg }));
        setFormError(dupMsg);
        if (fieldRefs.aadhaarNumber.current) {
          fieldRefs.aadhaarNumber.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => fieldRefs.aadhaarNumber.current?.focus(), 150);
        }
        setSaving(false);
        return;
      }

      const aadhaarHash = await computeAadhaarHmac(cleanAadhaar);

      const normalizedGender = (data.gender || '').toLowerCase() === 'transgender' ? 'other' : (data.gender || '').toLowerCase();
      const payload: Record<string, unknown> = {
        user_id: userId,
        mobile: cleanVerifiedMobile,
        full_name: data.fullName.trim(),
        date_of_birth: data.dateOfBirth,
        gender: normalizedGender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
        district: currentDistrictVal,
        taluka: currentTalukaVal,
        state: 'Maharashtra',
        profile_complete: true,
      };

      if (aadhaarHash) {
        payload.aadhaar_hash = aadhaarHash;
      }
      if (data.email?.trim()) {
        payload.email = data.email.trim();
      }
      if (data.casteCategory?.trim()) {
        payload.caste_category = data.casteCategory.trim();
      }
      const rawAlt = data.alternateMobile?.trim().replace(/\D/g, '') || '';
      const cleanAlt = (
        rawAlt.length === 12 && rawAlt.startsWith('91')
          ? rawAlt.slice(2)
          : rawAlt.length === 11 && rawAlt.startsWith('0')
          ? rawAlt.slice(1)
          : rawAlt
      ) || null;
      if (cleanAlt) {
        payload.emergency_mobile = cleanAlt;
        payload.alternate_mobile = cleanAlt;
      }
      if (currentAddressLine1Val.trim()) {
        payload.address_line1 = currentAddressLine1Val.trim().toUpperCase();
      }
      if (currentPincodeVal.trim()) {
        payload.pincode = currentPincodeVal.trim();
      }
      payload.permanent_same_as_current = isSameAddress;
      if (permanentAddressLine1Val.trim()) {
        payload.permanent_address_line1 = permanentAddressLine1Val.trim().toUpperCase();
      }
      if (permanentDistrictVal.trim()) {
        payload.permanent_district = permanentDistrictVal.trim();
      }
      if (permanentTalukaVal.trim()) {
        payload.permanent_taluka = permanentTalukaVal.trim();
      }
      if (permanentPincodeVal.trim()) {
        payload.permanent_pincode = permanentPincodeVal.trim();
      }

      const { data: savedProfile, error: saveErr } = await upsertCandidateProfile(payload as any);

      if (saveErr || !savedProfile) {
        console.error('[Step1MasterProfile] Save failed:', saveErr);
        if ((saveErr as any)?.code === '23505' || (saveErr as any)?.message?.includes('aadhaar')) {
          const dupMsg = 'This Aadhaar number is already registered with another applicant profile.';
          setErrors(prev => ({ ...prev, aadhaarNumber: dupMsg }));
          setFormError(dupMsg);
        } else {
          setFormError((saveErr as any)?.message || 'Failed to save profile. Please verify your details and try again.');
        }
        setSaving(false);
        return;
      }

      registerAadhaarHash(aadhaarHash, cleanVerifiedMobile);
      setSaving(false);
      onNext();
    } catch (err: any) {
      console.error('[Step1MasterProfile] Exception:', err);
      setFormError(err?.message || 'An unexpected error occurred while saving your profile.');
      setSaving(false);
    }
  };

  const getFieldClass = (hasError: boolean) =>
    `w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-none ${
      hasError
        ? 'border-2 border-red-500 bg-red-50/40 text-red-950 focus:ring-2 focus:ring-red-500/20'
        : 'border border-slate-300 bg-white text-[#102a43] focus:ring-2 focus:ring-[#102a43]/20 focus:border-[#102a43]'
    }`;

  // Normalized Gender for Dropdown
  const currentGender = (data.gender || '').toLowerCase();
  const selectedGenderValue = currentGender === 'transgender' ? 'other' : currentGender;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Step Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#102a43] text-white flex items-center justify-center shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102a43]">Step 2: Identity &amp; Address Details</h2>
            <p className="text-xs text-[#627d98]">
              Official demographic identity and residential addresses. Saved to your profile and securely reused across applications.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Essential Information
        </span>
      </div>

      {returnToReview && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Editing from Review:</strong> Update your address/identity details below and save to return directly to Step 4 Review &amp; Submit.
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
          >
            Cancel &amp; Return
          </button>
        </div>
      )}

      {/* Global Form Error Banner */}
      {formError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

        {/* 1. Full Name (English Letters Only, Auto-Uppercase) */}
        <div className="sm:col-span-2">
          <label htmlFor="field-fullName" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
            Full Name as per Aadhaar Card <span className="text-red-500">*</span>
          </label>
          <input
            id="field-fullName"
            ref={fieldRefs.fullName}
            type="text"
            required
            placeholder="ENTER FULL NAME AS PER AADHAAR CARD (E.G. RAMESH SAKHARAM PATIL)"
            value={data.fullName || ''}
            onChange={e => handleInputChange('fullName', e.target.value)}
            onBlur={() => handleBlur('fullName')}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            className={getFieldClass(Boolean(errors.fullName))}
          />
          {errors.fullName ? (
            <p id="fullName-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.fullName}
            </p>
          ) : (
            <p className="text-[11px] text-[#627d98] mt-1">
              Must match your name on official identity documents. English letters only (A-Z). Auto-converts to uppercase.
            </p>
          )}
        </div>

        {/* 2. Aadhaar Number (Mandatory, 12 Digits, Verhoeff Checksum) */}
        <div className="sm:col-span-2">
          <label htmlFor="field-aadhaarNumber" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            Aadhaar Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="field-aadhaarNumber"
              ref={fieldRefs.aadhaarNumber}
              type={showAadhaar ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={14}
              required
              placeholder="1234-5678-9012"
              value={formatAadhaarDisplay(data.aadhaarNumber || '')}
              onChange={e => handleInputChange('aadhaarNumber', e.target.value)}
              onBlur={() => handleBlur('aadhaarNumber')}
              aria-invalid={Boolean(errors.aadhaarNumber)}
              aria-describedby={errors.aadhaarNumber ? 'aadhaarNumber-error' : undefined}
              className={`${getFieldClass(Boolean(errors.aadhaarNumber))} pr-12 font-mono tracking-wider`}
            />
            <button
              type="button"
              onClick={() => setShowAadhaar(prev => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none rounded-sm p-1 cursor-pointer"
              tabIndex={-1}
              title={showAadhaar ? 'Hide Aadhaar' : 'Show Aadhaar'}
            >
              {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.aadhaarNumber ? (
            <p id="aadhaarNumber-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.aadhaarNumber}
            </p>
          ) : (
            <p className="text-[11px] text-[#627d98] mt-1">
              Enter your 12-digit Indian Aadhaar number.
            </p>
          )}
        </div>

        {/* 3. Date of Birth */}
        <div>
          <label htmlFor="field-dob" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#627d98]" />
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            id="field-dob"
            ref={fieldRefs.dateOfBirth}
            type="date"
            required
            max={getLocalTodayIso()}
            min="1940-01-01"
            value={data.dateOfBirth || ''}
            onChange={e => handleInputChange('dateOfBirth', e.target.value)}
            onBlur={() => handleBlur('dateOfBirth')}
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
            className={getFieldClass(Boolean(errors.dateOfBirth))}
          />
          {errors.dateOfBirth && (
            <p id="dateOfBirth-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.dateOfBirth}
            </p>
          )}
        </div>

        {/* 3. Gender (Prefilled from Step 1, Editable) */}
        <div>
          <label htmlFor="field-gender" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="field-gender"
            ref={fieldRefs.gender}
            required
            value={selectedGenderValue}
            onChange={e => handleInputChange('gender', e.target.value)}
            onBlur={() => handleBlur('gender')}
            aria-invalid={Boolean(errors.gender)}
            aria-describedby={errors.gender ? 'gender-error' : undefined}
            className={`${getFieldClass(Boolean(errors.gender))} cursor-pointer`}
          >
            <option value="">-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Transgender / Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <p id="gender-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.gender}
            </p>
          )}
        </div>

        {/* 4. Registered WhatsApp Mobile (Read-Only) */}
        <div>
          <label className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Registered WhatsApp Mobile</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 normal-case tracking-normal">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> WhatsApp Verified
            </span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-600">
              +91
            </span>
            <input
              type="text"
              readOnly
              disabled
              value={cleanVerifiedMobile}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl text-xs sm:text-sm font-mono font-bold text-slate-800 cursor-not-allowed select-none"
            />
          </div>
          <p className="text-[11px] text-[#627d98] mt-1">
            Anchored to your verified WhatsApp authentication session.
          </p>
        </div>

        {/* 5. Alternate Mobile Number (Optional) */}
        <div>
          <label htmlFor="field-alternateMobile" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#627d98]" />
              Alternate Mobile Number
            </span>
            <span className="text-[10px] font-medium text-slate-400 lowercase">(optional)</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-bold text-slate-600">
              +91
            </span>
            <input
              id="field-alternateMobile"
              ref={fieldRefs.alternateMobile}
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={data.alternateMobile || ''}
              onChange={e => handleInputChange('alternateMobile', e.target.value.replace(/\D/g, ''))}
              onBlur={() => handleBlur('alternateMobile')}
              aria-invalid={Boolean(errors.alternateMobile)}
              aria-describedby={errors.alternateMobile ? 'alternateMobile-error' : undefined}
              className={`${getFieldClass(Boolean(errors.alternateMobile))} rounded-l-none`}
            />
          </div>
          {errors.alternateMobile ? (
            <p id="alternateMobile-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.alternateMobile}
            </p>
          ) : (
            <p className="text-[11px] text-[#627d98] mt-1">
              Secondary contact for critical updates. Can be the same as your verified WhatsApp number.
            </p>
          )}
        </div>

        {/* 6. Caste Category */}
        <div>
          <label htmlFor="field-casteCategory" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#627d98]" />
              Caste Category {isCasteRequired && <span className="text-red-500">*</span>}
            </span>
            {!isCasteRequired && <span className="text-[10px] font-medium text-slate-400 lowercase">(optional)</span>}
          </label>
          <select
            id="field-casteCategory"
            ref={fieldRefs.casteCategory}
            value={data.casteCategory || ''}
            onChange={e => handleInputChange('casteCategory', e.target.value)}
            onBlur={() => handleBlur('casteCategory')}
            aria-invalid={Boolean(errors.casteCategory)}
            aria-describedby={errors.casteCategory ? 'casteCategory-error' : undefined}
            className={`${getFieldClass(Boolean(errors.casteCategory))} cursor-pointer`}
          >
            <option value="">-- Select Caste Category {isCasteRequired ? '' : '(Optional)'} --</option>
            {CASTE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.casteCategory ? (
            <p id="casteCategory-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.casteCategory}
            </p>
          ) : (
            <p className="text-[11px] text-[#627d98] mt-1">
              Categories applicable to recruitment specifications in Maharashtra.
            </p>
          )}
        </div>

        {/* 7. Email Address (Optional) */}
        <div>
          <label htmlFor="field-email" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#627d98]" />
              Email Address
            </span>
            <span className="text-[10px] font-medium text-slate-400 lowercase">(optional)</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-500 font-semibold text-xs sm:text-sm select-none">
              <Mail className="w-4 h-4 text-slate-500" />
            </span>
            <div className="relative flex-1">
              <input
                id="field-email"
                ref={fieldRefs.email}
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="candidate@example.com"
                value={data.email || ''}
                onChange={e => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`${getFieldClass(Boolean(errors.email))} rounded-l-none lowercase font-normal`}
              />
            </div>
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.email}
            </p>
          )}
        </div>

        {/* ── Section A: Current Residential Address ──────────────────────────── */}
        <div className="sm:col-span-2 p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-[#102a43]">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider">A. Current Residential Address</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Address Line */}
            <div className="sm:col-span-2">
              <label htmlFor="field-currentAddressLine1" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Address Line <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-medium text-slate-400">English capital letters only</span>
              </label>
              <input
                id="field-currentAddressLine1"
                ref={fieldRefs.currentAddressLine1}
                type="text"
                required
                placeholder="E.G. FLAT 102, GREEN ACRES, SHIVAJI NAGAR"
                value={currentAddressLine1Val}
                onChange={e => handleAddressChange('currentAddressLine1', e.target.value)}
                onBlur={() => handleBlur('currentAddressLine1')}
                aria-invalid={Boolean(errors.currentAddressLine1 || errors.addressLine1)}
                className={getFieldClass(Boolean(errors.currentAddressLine1 || errors.addressLine1))}
              />
              {(errors.currentAddressLine1 || errors.addressLine1) ? (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.currentAddressLine1 || errors.addressLine1}
                </p>
              ) : (
                <p className="text-[11px] text-[#627d98] mt-1">
                  House / Flat / Survey number, building and street name in English.
                </p>
              )}
            </div>

            {/* Current District */}
            <div>
              <label htmlFor="field-currentDistrict" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                District <span className="text-red-500">*</span>
              </label>
              <select
                id="field-currentDistrict"
                ref={fieldRefs.currentDistrict}
                required
                value={currentDistrictVal}
                onChange={e => handleAddressChange('currentDistrict', e.target.value)}
                onBlur={() => handleBlur('currentDistrict')}
                aria-invalid={Boolean(errors.currentDistrict || errors.homeDistrict)}
                className={`${getFieldClass(Boolean(errors.currentDistrict || errors.homeDistrict))} cursor-pointer`}
              >
                <option value="">-- Select Current District --</option>
                {MAHARASHTRA_DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
              {(errors.currentDistrict || errors.homeDistrict) && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.currentDistrict || errors.homeDistrict}
                </p>
              )}
            </div>

            {/* Current Taluka */}
            <div>
              <label htmlFor="field-currentTaluka" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Taluka <span className="text-red-500">*</span>
              </label>
              <select
                id="field-currentTaluka"
                ref={fieldRefs.currentTaluka}
                required
                disabled={!currentDistrictVal || currentAvailableTalukas.length === 0}
                value={currentTalukaVal}
                onChange={e => handleAddressChange('currentTaluka', e.target.value)}
                onBlur={() => handleBlur('currentTaluka')}
                aria-invalid={Boolean(errors.currentTaluka || errors.homeTaluka)}
                className={`${getFieldClass(Boolean(errors.currentTaluka || errors.homeTaluka))} cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
              >
                <option value="">
                  {!currentDistrictVal ? '-- Select District First --' : '-- Select Current Taluka --'}
                </option>
                {currentAvailableTalukas.map(tal => (
                  <option key={tal} value={tal}>
                    {tal}
                  </option>
                ))}
              </select>
              {(errors.currentTaluka || errors.homeTaluka) && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.currentTaluka || errors.homeTaluka}
                </p>
              )}
            </div>

            {/* Current PIN Code */}
            <div>
              <label htmlFor="field-currentPincode" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>PIN Code <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-medium text-slate-400">6 digits</span>
              </label>
              <input
                id="field-currentPincode"
                ref={fieldRefs.currentPincode}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={6}
                placeholder="E.G. 411001"
                value={currentPincodeVal}
                onKeyDown={handlePincodeKeyDown}
                onPaste={e => handlePincodePaste(e, 'currentPincode')}
                onChange={e => {
                  const raw = e.target.value;
                  const clean = raw.replace(/[^0-9]/g, '').slice(0, 6);
                  if (e.target.value !== clean) {
                    e.target.value = clean;
                  }
                  handleAddressChange('currentPincode', raw);
                }}
                onBlur={() => handleBlur('currentPincode')}
                aria-invalid={Boolean(errors.currentPincode || errors.pincode)}
                className={getFieldClass(Boolean(errors.currentPincode || errors.pincode))}
              />
              {(errors.currentPincode || errors.pincode) && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.currentPincode || errors.pincode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section B: Permanent Residential Address ────────────────────────── */}
        <div className="sm:col-span-2 p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[#102a43] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider">B. Permanent Residential Address</h3>
            </div>

            {/* Same As Current Address Checkbox */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#102a43] bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={isSameAddress}
                onChange={e => handleSameAddressToggle(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Permanent Address Same as Current Address</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Permanent Address Line */}
            <div className="sm:col-span-2">
              <label htmlFor="field-permanentAddressLine1" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Address Line <span className="text-red-500">*</span></span>
                {isSameAddress ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Same as Current Address
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">English capital letters only</span>
                )}
              </label>
              <input
                id="field-permanentAddressLine1"
                ref={fieldRefs.permanentAddressLine1}
                type="text"
                required
                readOnly={isSameAddress}
                placeholder="E.G. FLAT 102, GREEN ACRES, SHIVAJI NAGAR"
                value={permanentAddressLine1Val}
                onChange={e => handleAddressChange('permanentAddressLine1', e.target.value)}
                onBlur={() => handleBlur('permanentAddressLine1')}
                aria-invalid={Boolean(errors.permanentAddressLine1)}
                className={`${getFieldClass(Boolean(errors.permanentAddressLine1))} ${isSameAddress ? 'bg-slate-100 text-slate-700 cursor-not-allowed select-none' : ''}`}
              />
              {errors.permanentAddressLine1 && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.permanentAddressLine1}
                </p>
              )}
            </div>

            {/* Permanent District */}
            <div>
              <label htmlFor="field-permanentDistrict" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                District <span className="text-red-500">*</span>
              </label>
              <select
                id="field-permanentDistrict"
                ref={fieldRefs.permanentDistrict}
                required
                disabled={isSameAddress}
                value={permanentDistrictVal}
                onChange={e => handleAddressChange('permanentDistrict', e.target.value)}
                onBlur={() => handleBlur('permanentDistrict')}
                aria-invalid={Boolean(errors.permanentDistrict)}
                className={`${getFieldClass(Boolean(errors.permanentDistrict))} cursor-pointer ${isSameAddress ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : ''}`}
              >
                <option value="">-- Select Permanent District --</option>
                {MAHARASHTRA_DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
              {errors.permanentDistrict && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.permanentDistrict}
                </p>
              )}
            </div>

            {/* Permanent Taluka */}
            <div>
              <label htmlFor="field-permanentTaluka" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5">
                Taluka <span className="text-red-500">*</span>
              </label>
              <select
                id="field-permanentTaluka"
                ref={fieldRefs.permanentTaluka}
                required
                disabled={isSameAddress || !permanentDistrictVal || permanentAvailableTalukas.length === 0}
                value={permanentTalukaVal}
                onChange={e => handleAddressChange('permanentTaluka', e.target.value)}
                onBlur={() => handleBlur('permanentTaluka')}
                aria-invalid={Boolean(errors.permanentTaluka)}
                className={`${getFieldClass(Boolean(errors.permanentTaluka))} cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
              >
                <option value="">
                  {!permanentDistrictVal ? '-- Select District First --' : '-- Select Permanent Taluka --'}
                </option>
                {permanentAvailableTalukas.map(tal => (
                  <option key={tal} value={tal}>
                    {tal}
                  </option>
                ))}
              </select>
              {errors.permanentTaluka && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.permanentTaluka}
                </p>
              )}
            </div>

            {/* Permanent PIN Code */}
            <div>
              <label htmlFor="field-permanentPincode" className="block text-xs font-bold text-[#102a43] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>PIN Code <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-medium text-slate-400">6 digits</span>
              </label>
              <input
                id="field-permanentPincode"
                ref={fieldRefs.permanentPincode}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                maxLength={6}
                readOnly={isSameAddress}
                placeholder="E.G. 411001"
                value={permanentPincodeVal}
                onKeyDown={handlePincodeKeyDown}
                onPaste={e => handlePincodePaste(e, 'permanentPincode')}
                onChange={e => {
                  const raw = e.target.value;
                  const clean = raw.replace(/[^0-9]/g, '').slice(0, 6);
                  if (e.target.value !== clean) {
                    e.target.value = clean;
                  }
                  handleAddressChange('permanentPincode', raw);
                }}
                onBlur={() => handleBlur('permanentPincode')}
                aria-invalid={Boolean(errors.permanentPincode)}
                className={`${getFieldClass(Boolean(errors.permanentPincode))} ${isSameAddress ? 'bg-slate-100 text-slate-700 cursor-not-allowed select-none' : ''}`}
              />
              {errors.permanentPincode && (
                <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.permanentPincode}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Actions */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-100 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelButtonLabel || 'Cancel Application'}
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Personal Details
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 motion-reduce:transform-none motion-reduce:transition-none disabled:opacity-60 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              {submitButtonLabel || 'Save & Continue →'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
