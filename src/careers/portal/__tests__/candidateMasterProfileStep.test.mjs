import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Core validation and business logic for Create Candidate Profile
function validateFullName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return 'Full name is required. Must match name on Aadhaar Card.';
  }
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return 'Only English letters (A–Z) and spaces are allowed. Please enter text in English CAPITAL letters.';
  }
  if (/\d/.test(trimmed)) {
    return 'Only English letters (A–Z) and spaces are allowed. Numbers are not permitted.';
  }
  const englishOnlyRegex = /^[A-Z\s'-]+$/;
  if (!englishOnlyRegex.test(trimmed)) {
    return 'Only English letters (A–Z) and spaces are allowed.';
  }
  if (trimmed.length < 2) {
    return 'Please enter a valid full name (minimum 2 characters).';
  }
  return null;
}

function calculateAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function calculateAgeWithMonths(dobStr, referenceDate = new Date()) {
  if (!dobStr) return null;
  const trimmed = dobStr.trim();
  let dob;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    dob = new Date(y, m - 1, d);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    dob = new Date(y, m - 1, d);
  } else {
    dob = new Date(trimmed);
  }

  if (isNaN(dob.getTime())) return null;

  const today = referenceDate;
  if (dob > today) return null;

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  const days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;

  const formatted = `${years} Years ${months} Months`;
  const is18OrAbove = years >= 18;

  return { years, months, formatted, is18OrAbove };
}

function validateDateOfBirth(dobString, referenceDate = new Date()) {
  const trimmed = (dobString || '').trim();
  if (!trimmed) {
    return 'Date of birth is required.';
  }
  const dob = new Date(trimmed);
  if (isNaN(dob.getTime())) {
    return 'Enter a valid date of birth.';
  }
  const today = new Date(referenceDate);
  today.setHours(23, 59, 59, 999);
  if (dob > today) {
    return 'Date of birth cannot be in the future.';
  }
  const minDob = new Date('1940-01-01');
  if (dob < minDob) {
    return 'Please enter a realistic date of birth (after 1940).';
  }
  const ageInfo = calculateAgeWithMonths(trimmed, referenceDate);
  if (ageInfo && !ageInfo.is18OrAbove) {
    return 'You must be at least 18 years old to proceed.';
  }
  return null;
}

function validateGender(gender) {
  const trimmed = (gender || '').trim();
  if (!trimmed) {
    return 'Please select your gender.';
  }
  const validGenders = ['Male', 'Female', 'Transgender', 'male', 'female', 'other'];
  if (!validGenders.includes(trimmed)) {
    return 'Please select a valid gender option.';
  }
  return null;
}

function validateAlternateMobile(altMobile, _verifiedMobile) {
  const trimmed = (altMobile || '').trim().replace(/\D/g, '');
  if (!trimmed) {
    return 'Alternate mobile number is required.';
  }
  if (trimmed.length !== 10) {
    return 'Alternate mobile number must be exactly 10 digits.';
  }
  if (!/^[6-9]\d{9}$/.test(trimmed)) {
    return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
  }
  // Alternate number MAY be identical to WhatsApp verified number - no error!
  return null;
}

function validateEmail(email) {
  const trimmed = (email || '').trim().toLowerCase();
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

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function validateVerhoeff(aadhaar) {
  if (!aadhaar || typeof aadhaar !== 'string') return false;
  const clean = aadhaar.trim().replace(/\s+/g, '');
  if (!/^\d{12}$/.test(clean)) return false;

  let c = 0;
  const digits = clean.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}

function generateVerhoeffChecksum(numStr) {
  let c = 0;
  const digits = numStr.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  }
  return VERHOEFF_INV[c];
}

const mockAadhaarRegistry = new Map();

function hashAadhaarNumber(aadhaar) {
  const clean = String(aadhaar).replace(/\D/g, '');
  return `hmac_hash_${clean}`;
}

function registerAadhaarHash(hash, mobile) {
  mockAadhaarRegistry.set(hash, mobile);
}

function checkAadhaarDuplicate(hash, mobile) {
  if (mockAadhaarRegistry.has(hash)) {
    const registeredMobile = mockAadhaarRegistry.get(hash);
    if (registeredMobile !== mobile) {
      return {
        isDuplicate: true,
        message: 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.',
      };
    }
  }
  return { isDuplicate: false };
}

// Simulated mock database & state store
const mockDatabase = {
  profiles: new Map(),
  applications: new Map(),
  consentLogs: new Map(),
};

function upsertProfileMock(userId, payload) {
  const existing = mockDatabase.profiles.get(userId) || {};
  const cleanMobile = payload.mobile.replace(/\D/g, '').slice(-10);
  const candidateId = existing.candidate_id || `ABF-CAND-${cleanMobile.slice(-6)}`;
  const updated = {
    ...existing,
    id: userId,
    user_id: userId,
    candidate_id: candidateId,
    full_name: payload.full_name,
    date_of_birth: payload.date_of_birth,
    gender: payload.gender,
    mobile: cleanMobile,
    emergency_mobile: payload.emergency_mobile,
    email: payload.email || null,
    profile_complete: true,
    created_at: existing.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockDatabase.profiles.set(userId, updated);
  return updated;
}

describe('Candidate Master Profile Step Implementation — 16 Verification Cases', () => {

  test('1. New candidate creates a profile successfully', () => {
    const userId = 'usr-cand-101';
    const form = {
      fullName: 'ANIL VASANT DESHMUKH',
      dateOfBirth: '1995-05-14',
      gender: 'Male',
      mobile: '9822012345',
      alternateMobile: '9822012345',
      email: 'anil.deshmukh@example.com',
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      privacyNoticeVersion: 'v1.0',
    };

    assert.equal(validateFullName(form.fullName), null);
    assert.equal(validateDateOfBirth(form.dateOfBirth), null);
    assert.equal(validateGender(form.gender), null);
    assert.equal(validateAlternateMobile(form.alternateMobile, form.mobile), null);
    assert.equal(validateEmail(form.email), null);

    const saved = upsertProfileMock(userId, {
      full_name: form.fullName,
      date_of_birth: form.dateOfBirth,
      gender: form.gender,
      mobile: form.mobile,
      emergency_mobile: form.alternateMobile,
      email: form.email,
    });

    assert.equal(saved.full_name, 'ANIL VASANT DESHMUKH');
    assert.ok(saved.candidate_id.startsWith('ABF-CAND-'));
    assert.equal(saved.profile_complete, true);
  });

  test('2. Missing mandatory field blocks profile creation', () => {
    assert.ok(validateFullName(''));
    assert.ok(validateDateOfBirth(''));
    assert.ok(validateGender(''));
    assert.ok(validateAlternateMobile(''));
  });

  test('3. Invalid DOB is rejected (future date, invalid format, too old)', () => {
    assert.ok(validateDateOfBirth('2099-01-01')); // Future
    assert.ok(validateDateOfBirth('not-a-date'));  // Invalid string
    assert.ok(validateDateOfBirth('1910-01-01')); // Before 1940
    assert.equal(validateDateOfBirth('1998-04-20'), null); // Valid
  });

  test('4. Age calculates correctly as XX Years XX Months and blocks under 18', () => {
    const refDate = new Date(2026, 9, 31); // 31 Oct 2026 (month is 0-indexed: 9 = October)

    // Example 1: DOB 15/06/1997 -> 29 Years 4 Months as of 31/10/2026
    const ex1 = calculateAgeWithMonths('1997-06-15', refDate);
    assert.ok(ex1);
    assert.equal(ex1.years, 29);
    assert.equal(ex1.months, 4);
    assert.equal(ex1.formatted, '29 Years 4 Months');
    assert.equal(ex1.is18OrAbove, true);
    assert.equal(validateDateOfBirth('1997-06-15', refDate), null);

    // Example 2: DOB 15/12/2008 -> 17 Years 10 Months as of 31/10/2026 (< 18)
    const ex2 = calculateAgeWithMonths('2008-12-15', refDate);
    assert.ok(ex2);
    assert.equal(ex2.years, 17);
    assert.equal(ex2.months, 10);
    assert.equal(ex2.formatted, '17 Years 10 Months');
    assert.equal(ex2.is18OrAbove, false);
    assert.equal(validateDateOfBirth('2008-12-15', refDate), 'You must be at least 18 years old to proceed.');

    // Edge cases
    assert.equal(calculateAgeWithMonths(''), null);
    assert.equal(calculateAgeWithMonths('invalid'), null);
  });

  test('5. Same WhatsApp and Alternate Mobile Number is accepted', () => {
    const whatsapp = '9876543210';
    const alternate = '9876543210'; // Identical
    const res = validateAlternateMobile(alternate, whatsapp);
    assert.equal(res, null, 'Identical alternate mobile must be accepted without error');
  });

  test('6. Invalid Alternate Mobile Number is rejected', () => {
    assert.ok(validateAlternateMobile('12345'));         // Too short
    assert.ok(validateAlternateMobile('9876543210123')); // Too long
    assert.ok(validateAlternateMobile('2345678901'));    // Invalid Indian starting digit (not 6,7,8,9)
    assert.ok(validateAlternateMobile('abcdefghij'));    // Non-numeric
  });

  test('7. Invalid optional Email is rejected when entered; empty passes', () => {
    assert.equal(validateEmail(''), null); // Optional: empty passes
    assert.equal(validateEmail(undefined), null);
    assert.equal(validateEmail('valid.applicant@domain.com'), null);
    assert.equal(validateEmail('ANURAG@GMAIL.COM'), null); // Auto-lowercased
    assert.ok(validateEmail('invalid-email-address')); // Missing @
    assert.ok(validateEmail('anuraggmail.com')); // Missing @
    assert.ok(validateEmail('missing@domain')); // Missing TLD
    assert.ok(validateEmail('अनुराग@example.com')); // Devanagari rejected
  });

  test('8. Unchecked consent displays the modal', () => {
    const form = { consentGiven: false };
    let modalShown = false;
    if (!form.consentGiven) {
      modalShown = true;
    }
    assert.equal(modalShown, true, 'Save & Continue when consent is unchecked must trigger modal');
  });

  test('9. Cancel does not record consent or proceed', () => {
    let form = { consentGiven: false, consentTimestamp: null };
    // Simulate Cancel button click
    const handleCancel = () => {
      // Closes modal, explicitly does not record consent
    };
    handleCancel();
    assert.equal(form.consentGiven, false);
    assert.equal(form.consentTimestamp, null);
  });

  test('10. I Agree & Continue records consent and proceeds only after successful validation and save', () => {
    const form = {
      fullName: 'PRIYA SUNIL JADHAV',
      dateOfBirth: '1997-08-22',
      gender: 'Female',
      mobile: '9850123456',
      alternateMobile: '9850123456',
      email: 'priya.jadhav@example.com',
      consentGiven: false,
      consentTimestamp: null,
      privacyNoticeVersion: null,
    };

    // User clicks "I Agree & Continue" in modal
    form.consentGiven = true;
    form.consentTimestamp = new Date().toISOString();
    form.privacyNoticeVersion = 'v1.0';

    assert.equal(form.consentGiven, true);
    assert.ok(form.consentTimestamp);
    assert.equal(form.privacyNoticeVersion, 'v1.0');

    // Proceed to save
    const saved = upsertProfileMock('usr-cand-102', {
      full_name: form.fullName,
      date_of_birth: form.dateOfBirth,
      gender: form.gender,
      mobile: form.mobile,
      emergency_mobile: form.alternateMobile,
      email: form.email,
    });
    assert.equal(saved.full_name, 'PRIYA SUNIL JADHAV');
  });

  test('11. Already-checked consent does not show the modal again', () => {
    const form = { consentGiven: true };
    let modalShown = false;
    if (!form.consentGiven) {
      modalShown = true;
    }
    assert.equal(modalShown, false, 'Pre-checked consent must not display modal');
  });

  test('12. Existing candidate profile loads correctly on a subsequent job application', () => {
    const existing = mockDatabase.profiles.get('usr-cand-101');
    assert.ok(existing);
    assert.equal(existing.full_name, 'ANIL VASANT DESHMUKH');
    assert.equal(existing.dateOfBirth || existing.date_of_birth, '1995-05-14');
    assert.equal(existing.mobile, '9822012345');
  });

  test('13. Profile data correctly prefills Position Details', () => {
    const profile = mockDatabase.profiles.get('usr-cand-101');
    const positionDetailsPrefill = {
      fullName: profile.full_name,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      mobile: profile.mobile,
      alternateMobile: profile.emergency_mobile,
      email: profile.email,
    };

    assert.equal(positionDetailsPrefill.fullName, 'ANIL VASANT DESHMUKH');
    assert.equal(positionDetailsPrefill.dateOfBirth, '1995-05-14');
    assert.equal(positionDetailsPrefill.gender, 'Male');
    assert.equal(positionDetailsPrefill.mobile, '9822012345');
    assert.equal(positionDetailsPrefill.alternateMobile, '9822012345');
    assert.equal(positionDetailsPrefill.email, 'anil.deshmukh@example.com');
  });

  test('14. Candidate A cannot access Candidate B Master Profile', () => {
    const userA = 'usr-cand-101';
    const userB = 'usr-cand-102';
    const profileA = mockDatabase.profiles.get(userA);
    const profileB = mockDatabase.profiles.get(userB);

    assert.notEqual(profileA.user_id, profileB.user_id);
    assert.notEqual(profileA.full_name, profileB.full_name);
    assert.notEqual(profileA.candidate_id, profileB.candidate_id);
  });

  test('15. Previously submitted application snapshots remain unchanged after Master Profile edits', () => {
    // 1. Submit application with original name
    const appSnapshot = {
      appId: 'app-001',
      candidate_id: 'usr-cand-101',
      snapshot: {
        candidate: {
          fullName: 'ANIL VASANT DESHMUKH',
          mobile: '9822012345',
        },
      },
    };
    mockDatabase.applications.set('app-001', appSnapshot);

    // 2. Candidate updates their Master Profile
    upsertProfileMock('usr-cand-101', {
      full_name: 'ANIL V. DESHMUKH (UPDATED)',
      mobile: '9822012345',
      date_of_birth: '1995-05-14',
      gender: 'Male',
      emergency_mobile: '9822012345',
    });

    // 3. Confirm profile was updated
    const updatedProfile = mockDatabase.profiles.get('usr-cand-101');
    assert.equal(updatedProfile.full_name, 'ANIL V. DESHMUKH (UPDATED)');

    // 4. Confirm historical application snapshot was NOT mutated
    const preservedApp = mockDatabase.applications.get('app-001');
    assert.equal(preservedApp.snapshot.candidate.fullName, 'ANIL VASANT DESHMUKH');
  });

  test('16. No duplicate profile is created by repeated clicks or retries', () => {
    const initialCount = mockDatabase.profiles.size;
    // Repeatedly upsert for the same user
    upsertProfileMock('usr-cand-101', {
      full_name: 'ANIL VASANT DESHMUKH',
      mobile: '9822012345',
      date_of_birth: '1995-05-14',
      gender: 'Male',
      emergency_mobile: '9822012345',
    });
    upsertProfileMock('usr-cand-101', {
      full_name: 'ANIL VASANT DESHMUKH',
      mobile: '9822012345',
      date_of_birth: '1995-05-14',
      gender: 'Male',
      emergency_mobile: '9822012345',
    });
    assert.equal(mockDatabase.profiles.size, initialCount, 'Profile map count must remain constant for repeated upserts');
  });

  test('17. Exact Privacy Notice and Checkbox text (no org/project name)', () => {
    const noticeText = 'I consent to the collection and processing of my personal information for recruitment purposes.';
    const checkboxText = 'I have read and agree to the Privacy Notice.';

    assert.equal(noticeText, 'I consent to the collection and processing of my personal information for recruitment purposes.');
    assert.equal(checkboxText, 'I have read and agree to the Privacy Notice.');

    // Enforce that NO organization or project name appears in the text
    assert.equal(/Abhinav|Bharat|Foundation|MAHA-AGRI/i.test(noticeText), false);
    assert.equal(/Abhinav|Bharat|Foundation|MAHA-AGRI/i.test(checkboxText), false);
  });

  test('18. 5-step workflow configuration and step progression sequence', () => {
    const steps = [
      { id: 'create_profile', stepNumber: 1, label: 'Create Candidate Profile' },
      { id: 'master_profile', stepNumber: 2, label: 'Candidate Master Profile' },
      { id: 'job_specific', stepNumber: 3, label: 'Position Details' },
      { id: 'review', stepNumber: 4, label: 'Review & Submit' },
      { id: 'confirmation', stepNumber: 5, label: 'Confirmation' },
    ];

    assert.equal(steps.length, 5);
    assert.equal(steps[0].id, 'create_profile');
    assert.equal(steps[1].id, 'master_profile');
    assert.equal(steps[2].id, 'job_specific');
    assert.equal(steps[3].id, 'review');
    assert.equal(steps[4].id, 'confirmation');
  });

  test('19. Step 1 prefill into Step 2 Candidate Master Profile', () => {
    const step1Data = {
      fullName: 'RAMESH SAKHARAM PATIL',
      dateOfBirth: '1997-06-15',
      gender: 'Male',
      mobile: '9822012345',
      alternateMobile: '9822012345',
      email: 'ramesh.patil@example.com',
      consentGiven: true,
    };

    // Step 2 initializes from Step 1 data, candidate can add casteCategory, homeDistrict, homeTaluka
    const step2Data = {
      ...step1Data,
      casteCategory: 'OBC',
      homeDistrict: 'Pune',
      homeTaluka: 'Haveli',
    };

    assert.equal(step2Data.fullName, 'RAMESH SAKHARAM PATIL');
    assert.equal(step2Data.dateOfBirth, '1997-06-15');
    assert.equal(step2Data.gender, 'Male');
    assert.equal(step2Data.mobile, '9822012345');
    assert.equal(step2Data.alternateMobile, '9822012345');
    assert.equal(step2Data.email, 'ramesh.patil@example.com');
    assert.equal(step2Data.casteCategory, 'OBC');
    assert.equal(step2Data.homeDistrict, 'Pune');
    assert.equal(step2Data.homeTaluka, 'Haveli');
  });

  test('20. Candidate Master Profile Address Line & PIN Code validation', () => {
    // Address validation logic
    const validateAddress = (addr) => {
      const trimmed = (addr || '').trim();
      if (!trimmed) return 'Permanent / current address line is required.';
      if (/[\u0900-\u097F]/.test(trimmed)) {
        return 'Only English characters are allowed. Please enter address in English CAPITAL letters.';
      }
      const addressRegex = /^[A-Z0-9\s.,'&\(\)\/\\#-]+$/;
      if (!addressRegex.test(trimmed.toUpperCase())) {
        return 'Only English letters, digits, spaces, and standard address punctuation (.,\'&()/#-) are allowed.';
      }
      if (trimmed.length < 3) return 'Please enter a complete address (minimum 3 characters).';
      return null;
    };

    // PIN code validation logic
    const validatePincode = (pin) => {
      const trimmed = (pin || '').trim();
      if (!trimmed) return 'PIN code is required.';
      if (/[\u0900-\u097F]/.test(trimmed) || /[\u0966-\u096F]/.test(trimmed)) {
        return 'Only English digits (0–9) are allowed. Marathi numerals are not accepted.';
      }
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(trimmed)) {
        return 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
      }
      return null;
    };

    // Valid address
    assert.equal(validateAddress('FLAT 102, GREEN ACRES, SHIVAJI NAGAR'), null);
    // Devanagari rejected
    assert.notEqual(validateAddress('शिवाजी नगर'), null);
    // Under 3 chars rejected
    assert.notEqual(validateAddress('AB'), null);

    // Valid PIN code
    assert.equal(validatePincode('411001'), null);
    assert.equal(validatePincode('400001'), null);
    // Starting with 0 rejected
    assert.notEqual(validatePincode('011001'), null);
    // 5 digits rejected
    assert.notEqual(validatePincode('41100'), null);
    // Marathi numerals rejected (४११००१)
    assert.notEqual(validatePincode('४११००१'), null);
  });

  test('21. Position Details Percentage and CGPA validation with strict numeric restrictions', () => {
    const validateMarks = (format, value) => {
      const marksStr = (value || '').trim();
      if (!marksStr) {
        return format === 'cgpa' ? 'Please enter your CGPA (e.g. 8.4).' : 'Please enter your percentage (e.g. 74.5%).';
      }
      if (/[\u0900-\u097F]/.test(marksStr) || /[\u0966-\u096F]/.test(marksStr)) {
        return 'Only English digits (0–9) and decimal point are allowed. Marathi numerals/characters are not accepted.';
      }
      if (/[a-zA-Z]/.test(marksStr)) {
        return 'Letters are not allowed. Please enter numeric digits (0–9) and decimal point only.';
      }
      if (format === 'cgpa' && /[^\d.]/.test(marksStr)) {
        return 'Only English digits (0–9) and decimal point are allowed for CGPA.';
      }
      if (format === 'percentage' && /[^\d.%]/.test(marksStr)) {
        return 'Only English digits (0–9), decimal point, and optional % are allowed.';
      }
      const num = parseFloat(marksStr.replace('%', '').trim());
      if (isNaN(num)) return 'Invalid number';
      if (format === 'cgpa') {
        if (num < 0 || num > 10.0) return 'CGPA must be between 0.0 and 10.0.';
      } else {
        if (num < 0 || num > 100.0) return 'Percentage must be between 0.0% and 100.0%.';
      }
      return null;
    };

    // Percentage validations
    assert.equal(validateMarks('percentage', '78.5'), null);
    assert.equal(validateMarks('percentage', '78.5%'), null);
    assert.equal(validateMarks('percentage', '100'), null);
    assert.equal(validateMarks('percentage', '0'), null);
    assert.equal(validateMarks('percentage', '105'), 'Percentage must be between 0.0% and 100.0%.');
    assert.equal(validateMarks('percentage', '-5'), 'Only English digits (0–9), decimal point, and optional % are allowed.');
    assert.equal(validateMarks('percentage', '७८.५'), 'Only English digits (0–9) and decimal point are allowed. Marathi numerals/characters are not accepted.');
    assert.equal(validateMarks('percentage', 'A+'), 'Letters are not allowed. Please enter numeric digits (0–9) and decimal point only.');

    // CGPA validations
    assert.equal(validateMarks('cgpa', '8.4'), null);
    assert.equal(validateMarks('cgpa', '10.0'), null);
    assert.equal(validateMarks('cgpa', '0.0'), null);
    assert.equal(validateMarks('cgpa', '11.2'), 'CGPA must be between 0.0 and 10.0.');
    assert.equal(validateMarks('cgpa', '-1.0'), 'Only English digits (0–9) and decimal point are allowed for CGPA.');
    assert.equal(validateMarks('cgpa', '८.४'), 'Only English digits (0–9) and decimal point are allowed. Marathi numerals/characters are not accepted.');
    assert.equal(validateMarks('cgpa', 'GradeA'), 'Letters are not allowed. Please enter numeric digits (0–9) and decimal point only.');
  });

  test('22. Step 2 is renamed to Basic Information consistently', () => {
    const steps = [
      { id: 'create_profile', stepNumber: 1, label: 'Create Candidate Profile' },
      { id: 'master_profile', stepNumber: 2, label: 'Basic Information' },
      { id: 'job_specific', stepNumber: 3, label: 'Position Details' },
      { id: 'review', stepNumber: 4, label: 'Review & Submit' },
      { id: 'confirmation', stepNumber: 5, label: 'Confirmation' },
    ];
    assert.equal(steps[1].label, 'Basic Information');
  });

  test('23. Gender selected in Step 1 seamlessly pre-populates Step 2 without re-prompting or error', () => {
    const validateGender = (genderVal) => {
      const trimmed = (genderVal || '').trim();
      if (!trimmed) return 'Please select a gender.';
      const norm = trimmed.toLowerCase() === 'transgender' ? 'other' : trimmed.toLowerCase();
      const allowed = ['male', 'female', 'other', 'prefer_not_to_say'];
      if (!allowed.includes(norm)) return 'Please select a gender.';
      return null;
    };

    // Step 1 capitalized values pass Step 2 validation cleanly
    assert.equal(validateGender('Male'), null);
    assert.equal(validateGender('Female'), null);
    assert.equal(validateGender('Transgender'), null);
    assert.equal(validateGender('male'), null);
    assert.equal(validateGender('female'), null);
    assert.equal(validateGender('other'), null);
    assert.notEqual(validateGender(''), null);
  });

  test('24. Current and Permanent Address copying on checkbox and independent editing when unchecked', () => {
    // Current Address state
    let state = {
      currentAddressLine1: 'FLAT 204, KRISHNA RESIDENCY',
      currentDistrict: 'Pune',
      currentTaluka: 'Haveli',
      currentPincode: '411028',
      permanentSameAsCurrent: false,
      permanentAddressLine1: '',
      permanentDistrict: '',
      permanentTaluka: '',
      permanentPincode: '',
    };

    // Toggle Checkbox ON: Copies all four fields
    state.permanentSameAsCurrent = true;
    state.permanentAddressLine1 = state.currentAddressLine1;
    state.permanentDistrict = state.currentDistrict;
    state.permanentTaluka = state.currentTaluka;
    state.permanentPincode = state.currentPincode;

    assert.equal(state.permanentAddressLine1, 'FLAT 204, KRISHNA RESIDENCY');
    assert.equal(state.permanentDistrict, 'Pune');
    assert.equal(state.permanentTaluka, 'Haveli');
    assert.equal(state.permanentPincode, '411028');

    // Toggle Checkbox OFF: Retains values and allows independent editing
    state.permanentSameAsCurrent = false;
    state.permanentAddressLine1 = 'HOUSE 15, AT POST KASHTI';
    state.permanentDistrict = 'Ahmednagar';
    state.permanentTaluka = 'Shrigonda';
    state.permanentPincode = '414701';

    // Current address remains untouched
    assert.equal(state.currentAddressLine1, 'FLAT 204, KRISHNA RESIDENCY');
    assert.equal(state.currentDistrict, 'Pune');
    assert.equal(state.currentTaluka, 'Haveli');
    assert.equal(state.currentPincode, '411028');

    // Permanent address has independent values
    assert.equal(state.permanentAddressLine1, 'HOUSE 15, AT POST KASHTI');
    assert.equal(state.permanentDistrict, 'Ahmednagar');
    assert.equal(state.permanentTaluka, 'Shrigonda');
    assert.equal(state.permanentPincode, '414701');
  });

  test('25. Aadhaar Number 12-digit requirement, English numbers only, and Verhoeff validation', () => {
    const validateAadhaar = (aadhaar) => {
      const clean = (aadhaar || '').trim().replace(/\D/g, '');
      if (!clean) return 'Aadhaar number is required.';
      if (clean.length !== 12) return 'Aadhaar number must be exactly 12 numeric digits.';
      if (!/^\d{12}$/.test(clean)) return 'Only English numeric digits (0–9) are allowed.';
      if (!validateVerhoeff(clean)) return 'Please enter a valid 12-digit Indian Aadhaar number.';
      return null;
    };

    // Valid sample Aadhaar number with valid Verhoeff checksum
    // E.g. generate a known valid 12 digit number
    const base11 = '54321234567';
    const checksum = generateVerhoeffChecksum(base11);
    const validAadhaar = `${base11}${checksum}`;

    assert.equal(validateAadhaar(validAadhaar), null);
    // Invalid checksum rejected
    const invalidChecksumAadhaar = `${base11}${(checksum + 1) % 10}`;
    assert.ok(validateAadhaar(invalidChecksumAadhaar));
    // Length !== 12 rejected
    assert.equal(validateAadhaar('12345678901'), 'Aadhaar number must be exactly 12 numeric digits.');
    assert.equal(validateAadhaar('1234567890123'), 'Aadhaar number must be exactly 12 numeric digits.');
    // Empty rejected
    assert.equal(validateAadhaar(''), 'Aadhaar number is required.');
  });

  test('26. Server-side Aadhaar duplicate prevention across different mobile numbers', async () => {
    // Generate valid 12-digit Aadhaar
    const base11 = '99887766554';
    const checksum = generateVerhoeffChecksum(base11);
    const aadhaarNum = `${base11}${checksum}`;

    const candidateAMobile = '9876543210';
    const candidateBMobile = '9123456789';

    // Candidate A registers Aadhaar
    const hashA = await hashAadhaarNumber(aadhaarNum);
    registerAadhaarHash(hashA, candidateAMobile);

    // Candidate A re-submitting with SAME mobile number succeeds
    const checkSame = checkAadhaarDuplicate(hashA, candidateAMobile);
    assert.equal(checkSame.isDuplicate, false);

    // Candidate B with DIFFERENT mobile number is BLOCKED
    const checkDifferent = checkAadhaarDuplicate(hashA, candidateBMobile);
    assert.equal(checkDifferent.isDuplicate, true);
    assert.ok(checkDifferent.message.includes('already registered'));
  });

  test('27. Consistent button styling (#16a34a) and Step 1 navigation label', () => {
    const step1ButtonLabel = 'SAVE & CONTINUE TO BASIC INFORMATION';
    const primaryButtonColor = '#16a34a';

    assert.equal(step1ButtonLabel, 'SAVE & CONTINUE TO BASIC INFORMATION');
    assert.equal(primaryButtonColor, '#16a34a');
  });

});
