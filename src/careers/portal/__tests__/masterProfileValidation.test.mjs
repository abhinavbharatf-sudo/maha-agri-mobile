import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Validation logic pure functions mirroring Step 1 & Step 2 requirements
function validateFullName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return 'Full name is required. Must match name on Aadhaar Card.';
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

function autoUppercase(input) {
  return (input || '').toUpperCase();
}

function validateDateOfBirth(dobString) {
  const trimmed = (dobString || '').trim();
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

function validateGender(gender) {
  const trimmed = (gender || '').trim();
  if (!trimmed) {
    return 'Please select a gender.';
  }
  const allowed = ['male', 'female', 'other', 'prefer_not_to_say'];
  if (!allowed.includes(trimmed)) {
    return 'Please select a gender.';
  }
  return null;
}

function validateAlternateMobile(altMobile, verifiedMobile) {
  const trimmed = (altMobile || '').trim();
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
  const cleanVerified = (verifiedMobile || '').replace(/\D/g, '').slice(-10);
  if (cleanVerified && cleanDigits === cleanVerified) {
    return 'Alternate mobile number must differ from the verified WhatsApp number.';
  }
  return null;
}

function validateEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) return null; // Optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

function validatePassingYear(yearString, maxYear = 2026) {
  const trimmed = (yearString || '').trim();
  if (!trimmed) {
    return 'Please provide your graduation / passing year.';
  }
  const yearNum = parseInt(trimmed, 10);
  if (isNaN(yearNum) || yearNum < 1980 || yearNum > maxYear) {
    return `Please enter a valid 4-digit passing year (1980 - ${maxYear}).`;
  }
  return null;
}

describe('Candidate Master Profile Validation Rules', () => {

  describe('Full Name Validation & Auto-Uppercase', () => {
    test('converts lowercase characters to uppercase', () => {
      assert.equal(autoUppercase('rajesh sharma'), 'RAJESH SHARMA');
      assert.equal(autoUppercase("d'souza-patil"), "D'SOUZA-PATIL");
    });

    test('rejects empty or whitespace-only full name', () => {
      assert.equal(validateFullName(''), 'Full name is required. Must match name on Aadhaar Card.');
      assert.equal(validateFullName('   '), 'Full name is required. Must match name on Aadhaar Card.');
      assert.equal(validateFullName(null), 'Full name is required. Must match name on Aadhaar Card.');
    });

    test('rejects names with numbers or special digits', () => {
      assert.equal(validateFullName('RAJESH 123'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
      assert.equal(validateFullName('ANURAG007'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
    });

    test('rejects Marathi / Devanagari script', () => {
      assert.equal(validateFullName('राजेश शर्मा'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
      assert.equal(validateFullName('RAJESH शर्मा'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
    });

    test('rejects disallowed symbols like @, #, $, %', () => {
      assert.equal(validateFullName('RAJESH@SHARMA'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
      assert.equal(validateFullName('PATIL#1'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
      assert.equal(validateFullName('PATIL#'), 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.');
    });

    test('accepts valid uppercase English names with spaces, hyphens, and apostrophes', () => {
      assert.equal(validateFullName('RAJESH KUMAR SHARMA'), null);
      assert.equal(validateFullName('MARY-JANE WATSON'), null);
      assert.equal(validateFullName("O'CONNOR"), null);
    });
  });

  describe('Date of Birth Validation', () => {
    test('rejects empty DOB', () => {
      assert.equal(validateDateOfBirth(''), 'Enter a valid date of birth.');
      assert.equal(validateDateOfBirth(null), 'Enter a valid date of birth.');
    });

    test('rejects future DOB', () => {
      assert.equal(validateDateOfBirth('2099-01-01'), 'Enter a valid date of birth.');
    });

    test('rejects unrealistic DOB before 1940', () => {
      assert.equal(validateDateOfBirth('1920-05-15'), 'Enter a valid date of birth.');
    });

    test('accepts realistic historical DOB', () => {
      assert.equal(validateDateOfBirth('1998-04-12'), null);
      assert.equal(validateDateOfBirth('2003-11-25'), null);
    });
  });

  describe('Gender Validation', () => {
    test('rejects empty gender selection', () => {
      assert.equal(validateGender(''), 'Please select a gender.');
      assert.equal(validateGender(null), 'Please select a gender.');
    });

    test('rejects unsupported gender string', () => {
      assert.equal(validateGender('invalid_choice'), 'Please select a gender.');
    });

    test('accepts all 4 supported gender values', () => {
      assert.equal(validateGender('male'), null);
      assert.equal(validateGender('female'), null);
      assert.equal(validateGender('other'), null);
      assert.equal(validateGender('prefer_not_to_say'), null);
    });
  });

  describe('Alternate Mobile Validation', () => {
    test('is optional when empty or not provided', () => {
      assert.equal(validateAlternateMobile('', '9876543210'), null);
      assert.equal(validateAlternateMobile(null, '9876543210'), null);
      assert.equal(validateAlternateMobile('   ', '9876543210'), null);
    });

    test('rejects invalid format (less than 10 digits or invalid starting digit)', () => {
      assert.equal(validateAlternateMobile('12345', '9876543210'), 'Enter a valid 10-digit alternate mobile number.');
      assert.equal(validateAlternateMobile('5555566666', '9876543210'), 'Enter a valid 10-digit alternate mobile number.'); // Starts with 5
    });

    test('rejects if identical to verified WhatsApp number', () => {
      assert.equal(
        validateAlternateMobile('9876543210', '9876543210'),
        'Alternate mobile number must differ from the verified WhatsApp number.'
      );
      assert.equal(
        validateAlternateMobile('+91 98765 43210', '9876543210'),
        'Alternate mobile number must differ from the verified WhatsApp number.'
      );
    });

    test('accepts valid 10-digit Indian mobile differing from verified WhatsApp', () => {
      assert.equal(validateAlternateMobile('9123456789', '9876543210'), null);
      assert.equal(validateAlternateMobile('8765432109', '9876543210'), null);
      assert.equal(validateAlternateMobile('7000011111', '9876543210'), null);
      assert.equal(validateAlternateMobile('6999988888', '9876543210'), null);
    });
  });

  describe('Optional Email Format Validation', () => {
    test('is optional when empty', () => {
      assert.equal(validateEmail(''), null);
      assert.equal(validateEmail(null), null);
      assert.equal(validateEmail('   '), null);
    });

    test('rejects malformed email addresses', () => {
      assert.equal(validateEmail('invalid-email'), 'Please enter a valid email address.');
      assert.equal(validateEmail('user@'), 'Please enter a valid email address.');
      assert.equal(validateEmail('@domain.com'), 'Please enter a valid email address.');
      assert.equal(validateEmail('user@domain'), 'Please enter a valid email address.');
    });

    test('accepts valid email format', () => {
      assert.equal(validateEmail('candidate@maha-agri.gov.in'), null);
      assert.equal(validateEmail('test.user+tag@gmail.com'), null);
    });
  });

  describe('Position Details Passing Year Validation', () => {
    test('rejects empty passing year', () => {
      assert.equal(validatePassingYear('', 2026), 'Please provide your graduation / passing year.');
    });

    test('rejects passing year before 1980', () => {
      assert.equal(validatePassingYear('1975', 2026), 'Please enter a valid 4-digit passing year (1980 - 2026).');
    });

    test('rejects passing year in future beyond current year', () => {
      assert.equal(validatePassingYear('2030', 2026), 'Please enter a valid 4-digit passing year (1980 - 2026).');
    });

    test('accepts valid passing year between 1980 and current year', () => {
      assert.equal(validatePassingYear('2022', 2026), null);
      assert.equal(validatePassingYear('2026', 2026), null);
      assert.equal(validatePassingYear('1980', 2026), null);
    });
  });
});
