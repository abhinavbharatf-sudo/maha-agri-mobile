import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure Validation and Logic Emulators for Step 2 ──────────────────────────

const QUALIFICATION_LEVELS = [
  'SSC',
  'HSC',
  'ITI',
  'Diploma',
  'Graduate',
  'Postgraduate',
  'Other',
];

function generatePassingYears(currentYear = new Date().getFullYear(), minYear = 1980) {
  const years = [];
  for (let y = currentYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

function validateMarksPercentage(val) {
  const trimmed = (val || '').trim();
  if (!trimmed) {
    return 'Please enter your marks percentage or CGPA.';
  }
  const numericMatch = trimmed.match(/^(\d+(\.\d+)?)/);
  if (!numericMatch) {
    return 'Please enter a valid numeric percentage (e.g. 74.5%) or CGPA (e.g. 8.2).';
  }
  const num = parseFloat(numericMatch[1]);
  if (isNaN(num)) {
    return 'Please enter a valid marks percentage or CGPA.';
  }
  const isCgpaExplicit = /cgpa/i.test(trimmed);
  const isPercentExplicit = /%/i.test(trimmed);

  if (isCgpaExplicit) {
    if (num < 0 || num > 10) {
      return 'CGPA must be between 0.0 and 10.0.';
    }
  } else if (isPercentExplicit) {
    if (num < 0 || num > 100) {
      return 'Percentage must be between 0% and 100%.';
    }
  } else {
    if (num > 100 || num < 0) {
      return 'Value must be a valid percentage (0–100%) or CGPA (0–10.0).';
    }
  }
  return null;
}

function validateExperience(type, years, months, responsibilities) {
  if (type === 'fresher') {
    return null; // No experience validation required for freshers
  }
  const yrs = parseInt(years || '0', 10);
  const mos = parseInt(months || '0', 10);
  if (isNaN(yrs) || yrs < 0) {
    return 'Experience years cannot be negative.';
  }
  if (isNaN(mos) || mos < 0 || mos > 11) {
    return 'Experience months must be between 0 and 11.';
  }
  if (yrs === 0 && mos === 0) {
    return 'Please specify your total experience duration (at least 1 month).';
  }
  const resp = (responsibilities || '').trim();
  if (!resp || resp.length < 5) {
    return 'Please provide a brief summary of your work experience and responsibilities.';
  }
  return null;
}

function computeLocationDifference(nativeDistrict, nativeTaluka, preferredDistrict, preferredTaluka) {
  if (!nativeDistrict) return false;
  const districtDiffers = Boolean(preferredDistrict && preferredDistrict !== nativeDistrict);
  const talukaDiffers = Boolean(
    preferredDistrict === nativeDistrict &&
    nativeTaluka &&
    preferredTaluka &&
    preferredTaluka !== nativeTaluka
  );
  return districtDiffers || talukaDiffers;
}

function validateStep2Submission({
  highestQualification,
  passingYear,
  marksPercentage,
  experienceType,
  experienceYears,
  experienceMonths,
  jobResponsibilities,
  preferredDistrict,
  preferredTaluka,
  locationConfirmed,
  nativeDistrict,
  nativeTaluka,
  allowedDistricts,
}) {
  const errors = {};

  if (!highestQualification || !highestQualification.trim()) {
    errors.highestQualification = 'Please select your highest educational qualification.';
  }

  if (!passingYear || !passingYear.trim()) {
    errors.passingYear = 'Please select your graduation / passing year.';
  }

  const marksErr = validateMarksPercentage(marksPercentage);
  if (marksErr) {
    errors.marksPercentage = marksErr;
  }

  const expErr = validateExperience(experienceType, experienceYears, experienceMonths, jobResponsibilities);
  if (expErr) {
    errors.experience = expErr;
  }

  if (!preferredDistrict || !allowedDistricts.includes(preferredDistrict)) {
    errors.preferredDistrict = 'Please select an eligible posting district.';
  }

  if (!preferredTaluka) {
    errors.preferredTaluka = 'Please select your preferred posting taluka.';
  }

  const isDiff = computeLocationDifference(nativeDistrict, nativeTaluka, preferredDistrict, preferredTaluka);
  if (isDiff && !locationConfirmed) {
    errors.locationConfirmed = 'Please confirm your willingness to work at the selected posting location.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

describe('Step 2: Educational Qualifications & Passing Year', () => {
  test('dynamic passing years generation always includes 1980 through current year, newest first', () => {
    const currentYear = new Date().getFullYear();
    const years = generatePassingYears(currentYear);
    assert.ok(years.length > 40);
    assert.equal(years[0], currentYear);
    assert.equal(years[years.length - 1], 1980);
    assert.ok(years.includes(2023));
    assert.ok(years.includes(2000));
  });

  test('validates marks percentage correctly for standard percentages and CGPAs', () => {
    assert.equal(validateMarksPercentage('74.5%'), null);
    assert.equal(validateMarksPercentage('68.0'), null);
    assert.equal(validateMarksPercentage('8.4 CGPA'), null);
    assert.equal(validateMarksPercentage('9.2'), null);
  });

  test('rejects empty or out-of-range marks percentage', () => {
    assert.equal(validateMarksPercentage(''), 'Please enter your marks percentage or CGPA.');
    assert.equal(validateMarksPercentage('   '), 'Please enter your marks percentage or CGPA.');
    assert.equal(validateMarksPercentage('150%'), 'Percentage must be between 0% and 100%.');
    assert.equal(validateMarksPercentage('12.5 CGPA'), 'CGPA must be between 0.0 and 10.0.');
    assert.equal(validateMarksPercentage('not-a-number'), 'Please enter a valid numeric percentage (e.g. 74.5%) or CGPA (e.g. 8.2).');
  });
});

describe('Step 2: Work Experience (Fresher vs Experienced)', () => {
  test('fresher does not require experience duration or responsibilities', () => {
    const err = validateExperience('fresher', '0', '0', '');
    assert.equal(err, null);
  });

  test('experienced requires at least 1 month/year and non-empty responsibilities', () => {
    assert.equal(
      validateExperience('experienced', '0', '0', 'Handled field crop scouting'),
      'Please specify your total experience duration (at least 1 month).'
    );
    assert.equal(
      validateExperience('experienced', '2', '0', ''),
      'Please provide a brief summary of your work experience and responsibilities.'
    );
    assert.equal(
      validateExperience('experienced', '2', '0', 'abc'),
      'Please provide a brief summary of your work experience and responsibilities.'
    );
    assert.equal(
      validateExperience('experienced', '1', '6', 'Supervised 50 farmer clusters in soil health testing.'),
      null
    );
  });

  test('rejects negative experience years or invalid months', () => {
    assert.equal(
      validateExperience('experienced', '-1', '2', 'Responsibilities here'),
      'Experience years cannot be negative.'
    );
    assert.equal(
      validateExperience('experienced', '1', '15', 'Responsibilities here'),
      'Experience months must be between 0 and 11.'
    );
  });
});

describe('Step 2: Preferred Posting Location & Mobility Confirmation', () => {
  test('no confirmation required when preferred district and taluka match native location', () => {
    const isDiff = computeLocationDifference('Pune', 'Haveli', 'Pune', 'Haveli');
    assert.equal(isDiff, false);
  });

  test('confirmation required when preferred district differs from native district', () => {
    const isDiff = computeLocationDifference('Pune', 'Haveli', 'Satara', 'Karad');
    assert.equal(isDiff, true);
  });

  test('confirmation required when preferred taluka differs within the same native district', () => {
    const isDiff = computeLocationDifference('Pune', 'Haveli', 'Pune', 'Baramati');
    assert.equal(isDiff, true);
  });

  test('confirmation requirement is removed if candidate switches back to native location', () => {
    let preferredDistrict = 'Satara';
    let preferredTaluka = 'Karad';
    assert.equal(computeLocationDifference('Pune', 'Haveli', preferredDistrict, preferredTaluka), true);

    // Candidate switches back to native location
    preferredDistrict = 'Pune';
    preferredTaluka = 'Haveli';
    assert.equal(computeLocationDifference('Pune', 'Haveli', preferredDistrict, preferredTaluka), false);
  });

  test('form submission blocks progression if confirmation checkbox is required but unchecked', () => {
    const res = validateStep2Submission({
      highestQualification: 'Graduate',
      passingYear: '2023',
      marksPercentage: '75%',
      experienceType: 'fresher',
      experienceYears: '0',
      experienceMonths: '0',
      jobResponsibilities: '',
      preferredDistrict: 'Satara',
      preferredTaluka: 'Karad',
      locationConfirmed: false, // Unchecked!
      nativeDistrict: 'Pune',
      nativeTaluka: 'Haveli',
      allowedDistricts: ['Pune', 'Satara'],
    });

    assert.equal(res.valid, false);
    assert.equal(res.errors.locationConfirmed, 'Please confirm your willingness to work at the selected posting location.');
  });

  test('form submission succeeds when confirmation is checked for differing location', () => {
    const res = validateStep2Submission({
      highestQualification: 'Graduate',
      passingYear: '2023',
      marksPercentage: '75%',
      experienceType: 'fresher',
      experienceYears: '0',
      experienceMonths: '0',
      jobResponsibilities: '',
      preferredDistrict: 'Satara',
      preferredTaluka: 'Karad',
      locationConfirmed: true, // Checked!
      nativeDistrict: 'Pune',
      nativeTaluka: 'Haveli',
      allowedDistricts: ['Pune', 'Satara'],
    });

    assert.equal(res.valid, true);
    assert.deepEqual(res.errors, {});
  });
});
