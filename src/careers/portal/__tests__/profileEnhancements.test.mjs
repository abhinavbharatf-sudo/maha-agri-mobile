import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ── Verhoeff Algorithm Tables ────────────────────────────────────────────────
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

function maskAadhaar(aadhaar) {
  if (!aadhaar) return '—';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-XXXX';
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
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

function calculateDuration(startDateStr, endDateStr, isCurrent = false) {
  if (!startDateStr) return { years: 0, months: 0, totalMonths: 0 };
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return { years: 0, months: 0, totalMonths: 0 };

  const end = isCurrent ? new Date() : new Date(endDateStr);
  if (isNaN(end.getTime())) return { years: 0, months: 0, totalMonths: 0 };
  if (end < start) return { years: 0, months: 0, totalMonths: 0 };

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) {
    months = Math.max(0, months - 1);
  }

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    totalMonths: months,
  };
}

function calculateMergedTotalExperience(intervals) {
  const validIntervals = [];

  for (const item of intervals) {
    if (!item.startDate) continue;
    const start = new Date(item.startDate);
    if (isNaN(start.getTime())) continue;

    const end = item.isCurrent ? new Date() : item.endDate ? new Date(item.endDate) : new Date();
    if (isNaN(end.getTime())) continue;
    if (end < start) continue;

    validIntervals.push({ start, end });
  }

  if (validIntervals.length === 0) {
    return { years: 0, months: 0, totalMonths: 0 };
  }

  validIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged = [validIntervals[0]];
  for (let i = 1; i < validIntervals.length; i++) {
    const current = validIntervals[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }

  let totalMonths = 0;
  for (const interval of merged) {
    let m = (interval.end.getFullYear() - interval.start.getFullYear()) * 12 + (interval.end.getMonth() - interval.start.getMonth());
    if (interval.end.getDate() < interval.start.getDate()) {
      m = Math.max(0, m - 1);
    }
    totalMonths += m;
  }

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
  };
}

function validatePincode(pincode) {
  if (!pincode || !pincode.trim()) return 'PIN code is required.';
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(pincode.trim())) {
    return 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
  }
  return null;
}

function validateAddressLine1(address) {
  if (!address || !address.trim()) return 'Permanent / current address line 1 is required.';
  if (/[\u0900-\u097F]/.test(address)) {
    return 'Only English letters (A–Z) and numbers are allowed. Please enter address in English CAPITAL letters.';
  }
  const addressRegex = /^[A-Z0-9\s.,'&\(\)\/\\#-]+$/;
  if (!addressRegex.test(address.toUpperCase())) {
    return 'Only English letters (A–Z), digits, and standard punctuation (.,/#-) are allowed.';
  }
  if (address.trim().length < 3) {
    return 'Please enter a complete address (minimum 3 characters).';
  }
  return null;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Candidate Portal Enhancements — Verhoeff & Aadhaar Validation', () => {
  test('generates valid Verhoeff checksum and validates 12-digit Aadhaar numbers', () => {
    // Generate valid Aadhaar numbers by taking 11 digits and computing the Verhoeff checksum
    const base11 = '99999999001';
    const checksum = generateVerhoeffChecksum(base11);
    const validAadhaar = base11 + checksum;

    assert.equal(validateVerhoeff(validAadhaar), true, 'Valid Verhoeff number should pass');

    // Altering any single digit should fail
    const tampered = base11 + ((checksum + 1) % 10);
    assert.equal(validateVerhoeff(tampered), false, 'Tampered digit should fail Verhoeff check');
  });

  test('rejects non-12 digit inputs or non-numeric characters', () => {
    assert.equal(validateVerhoeff('12345'), false);
    assert.equal(validateVerhoeff('1234567890123'), false);
    assert.equal(validateVerhoeff('1234abcd5678'), false);
    assert.equal(validateVerhoeff('१२३४५६७८९०१२'), false, 'Rejects Devanagari digits');
    assert.equal(validateVerhoeff(''), false);
    assert.equal(validateVerhoeff(null), false);
  });

  test('masks Aadhaar number properly for privacy display', () => {
    assert.equal(maskAadhaar('999999990019'), 'XXXX-XXXX-0019');
    assert.equal(maskAadhaar('123456789012'), 'XXXX-XXXX-9012');
    assert.equal(maskAadhaar(''), '—');
  });
});

describe('Candidate Portal Enhancements — Aadhaar Auto-Format Display', () => {
  // Mirrors formatAadhaarDisplay() in Step1MasterProfile.tsx
  function formatAadhaarDisplay(digits) {
    const d = (digits || '').replace(/\D/g, '').slice(0, 12);
    if (d.length <= 4) return d;
    if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
  }

  test('formats 12 digits into NNNN-NNNN-NNNN pattern', () => {
    assert.equal(formatAadhaarDisplay('123456789012'), '1234-5678-9012');
    assert.equal(formatAadhaarDisplay('999999990019'), '9999-9999-0019');
    assert.equal(formatAadhaarDisplay('000000000000'), '0000-0000-0000');
  });

  test('formats partial input during typing', () => {
    assert.equal(formatAadhaarDisplay(''), '');
    assert.equal(formatAadhaarDisplay('1'), '1');
    assert.equal(formatAadhaarDisplay('1234'), '1234');
    assert.equal(formatAadhaarDisplay('12345'), '1234-5');
    assert.equal(formatAadhaarDisplay('12345678'), '1234-5678');
    assert.equal(formatAadhaarDisplay('123456789'), '1234-5678-9');
  });

  test('strips pasted hyphens or non-numeric characters before formatting', () => {
    assert.equal(formatAadhaarDisplay('1234-5678-9012'), '1234-5678-9012');
    assert.equal(formatAadhaarDisplay('1234 5678 9012'), '1234-5678-9012');
    assert.equal(formatAadhaarDisplay('1234abcd5678'), '1234-5678');
  });

  test('truncates at 12 digits ignoring extra input', () => {
    assert.equal(formatAadhaarDisplay('12345678901234'), '1234-5678-9012');
    assert.equal(formatAadhaarDisplay('9999999900191234'), '9999-9999-0019');
  });

  test('stored value remains clean 12 digits (no hyphens) after stripping', () => {
    // Simulates handleInputChange('aadhaarNumber', formattedString):
    // formatted display -> strip non-digits -> stored value = clean 12 digits
    const simulateStore = (displayVal) => displayVal.replace(/\D/g, '').slice(0, 12);

    assert.equal(simulateStore('1234-5678-9012'), '123456789012');
    assert.equal(simulateStore('1234-5678-90'), '1234567890');
    assert.equal(simulateStore('9999-9999-0019'), '999999990019');
  });
});

describe('Candidate Portal Enhancements — Age Calculation', () => {
  test('calculates completed age accurately taking into account month and day', () => {
    const today = new Date();
    const twentyFiveYearsAgo = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const dobStr = twentyFiveYearsAgo.toISOString().split('T')[0];
    assert.equal(calculateAge(dobStr), 25);

    // If birthday has not arrived yet this year
    const futureMonth = today.getMonth() === 11 ? 11 : today.getMonth() + 1;
    const testDob = `${today.getFullYear() - 25}-${String(futureMonth + 1).padStart(2, '0')}-28`;
    const computed = calculateAge(testDob);
    if (futureMonth > today.getMonth()) {
      assert.equal(computed, 24, 'Age should be 24 since birthday has not arrived this year');
    }
  });

  test('handles invalid or empty DOB', () => {
    assert.equal(calculateAge(''), null);
    assert.equal(calculateAge('invalid-date'), null);
  });
});

describe('Candidate Portal Enhancements — Address Line 1 & PIN Code', () => {
  test('validates 6-digit Indian PIN code', () => {
    assert.equal(validatePincode('400001'), null, 'Valid PIN code passes');
    assert.equal(validatePincode('411001'), null, 'Valid PIN code passes');
    assert.notEqual(validatePincode('011001'), null, 'PIN code cannot start with 0');
    assert.notEqual(validatePincode('40001'), null, '5 digits must fail');
    assert.notEqual(validatePincode('4000001'), null, '7 digits must fail');
    assert.notEqual(validatePincode('40000A'), null, 'Non-digits must fail');
  });

  test('validates Address Line 1 (English only, uppercase, min 3 chars)', () => {
    assert.equal(validateAddressLine1('FLAT 102, GREEN ACRES, SHIVAJI NAGAR'), null);
    assert.notEqual(validateAddressLine1(''), null, 'Empty address fails');
    assert.notEqual(validateAddressLine1('शिवाजी नगर'), null, 'Devanagari address fails');
    assert.notEqual(validateAddressLine1('AB'), null, 'Under 3 chars fails');
  });
});

describe('Candidate Portal Enhancements — Work Experience Duration & Merged Total', () => {
  test('calculates duration between start date and end date', () => {
    const dur = calculateDuration('2022-01-01', '2024-01-01', false);
    assert.equal(dur.years, 2);
    assert.equal(dur.months, 0);

    const durPart = calculateDuration('2023-01-01', '2023-07-01', false);
    assert.equal(durPart.years, 0);
    assert.equal(durPart.months, 6);
  });

  test('merges overlapping work experience periods without double counting', () => {
    // Two overlapping employments:
    // Job 1: 2022-01-01 to 2023-01-01 (12 months)
    // Job 2: 2022-06-01 to 2024-01-01 (overlapped with Job 1 from June to Jan)
    // Merged span: 2022-01-01 to 2024-01-01 = 24 months = 2 Years 0 Months
    const intervals = [
      { startDate: '2022-01-01', endDate: '2023-01-01', isCurrent: false },
      { startDate: '2022-06-01', endDate: '2024-01-01', isCurrent: false },
    ];

    const merged = calculateMergedTotalExperience(intervals);
    assert.equal(merged.years, 2);
    assert.equal(merged.months, 0);
    assert.equal(merged.totalMonths, 24);
  });

  test('sums separate non-overlapping periods accurately', () => {
    // Job 1: 2020-01-01 to 2021-01-01 (12 months = 1 year)
    // Job 2: 2022-01-01 to 2023-01-01 (12 months = 1 year)
    // Total = 2 years
    const intervals = [
      { startDate: '2020-01-01', endDate: '2021-01-01', isCurrent: false },
      { startDate: '2022-01-01', endDate: '2023-01-01', isCurrent: false },
    ];

    const merged = calculateMergedTotalExperience(intervals);
    assert.equal(merged.years, 2);
    assert.equal(merged.months, 0);
  });
});
