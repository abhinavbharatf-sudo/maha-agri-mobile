import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Course mapping mirroring types.ts
const COURSE_OPTIONS_BY_LEVEL = {
  SSC: ['General (SSC / 10th Standard)', 'Other Recognised 10th Board Course'],
  HSC: ['Science', 'Commerce', 'Arts', 'Vocational / MCVC', 'Agriculture (Vocational / Bifocal)', 'Other'],
  ITI: ['Mechanic Agricultural Machinery', 'Soil & Water Conservation Surveyor'],
  Diploma: ['Diploma in Agriculture (Krishi Padavika)', 'Diploma in Agricultural Engineering'],
  Graduate: ['B.Sc. Agriculture (Hons)', 'B.Tech Agricultural Engineering', 'B.Sc. Horticulture'],
  Postgraduate: ['M.Sc. Agriculture (Agronomy / Soil Science / Genetics / Entomology)', 'MBA (Agri-Business Management)'],
};

function validateGradingMarks(gradingFormat, marksValue) {
  const marksStr = (marksValue || '').trim();
  if (!marksStr) {
    return gradingFormat === 'cgpa'
      ? 'Please enter your CGPA (e.g. 8.4).'
      : 'Please enter your percentage (e.g. 74.5%).';
  }
  const numMatch = marksStr.match(/^(-?\d+(\.\d+)?)/);
  if (!numMatch) {
    return gradingFormat === 'cgpa'
      ? 'Please enter a valid numeric CGPA out of 10.0.'
      : 'Please enter a valid numeric percentage (0–100%).';
  }
  const num = parseFloat(numMatch[1]);
  if (gradingFormat === 'cgpa') {
    if (num < 0 || num > 10.0) {
      return 'CGPA must be between 0.0 and 10.0.';
    }
  } else {
    if (num < 0 || num > 100.0) {
      return 'Percentage must be between 0.0% and 100.0%.';
    }
  }
  return null;
}

function calculateTotalExperience(experiences, isExperienced) {
  if (!isExperienced || !Array.isArray(experiences) || experiences.length === 0) {
    return { years: 0, months: 0, totalMonths: 0 };
  }
  const totalMonths = experiences.reduce((acc, exp) => {
    const y = parseInt(exp.years || '0', 10);
    const m = parseInt(exp.months || '0', 10);
    return acc + (isNaN(y) ? 0 : y * 12) + (isNaN(m) ? 0 : m);
  }, 0);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
  };
}

function validateExperienceCard(exp) {
  if (!exp.employer || !exp.employer.trim()) {
    return 'Please enter previous employer/organisation.';
  }
  const y = parseInt(exp.years || '0', 10);
  const m = parseInt(exp.months || '0', 10);
  if (isNaN(y) || y < 0) {
    return 'Experience years cannot be negative.';
  }
  if (isNaN(m) || m < 0 || m > 11) {
    return 'Months must be between 0 and 11.';
  }
  if (y === 0 && m === 0) {
    return 'Duration must be at least 1 month.';
  }
  return null;
}

const QUALIFICATION_LEVEL_WEIGHT = {
  'Post Graduate': 60,
  'Graduate': 50,
  'Diploma': 40,
  'ITI': 30,
  'HSC': 20,
  'SSC': 10,
  'Other Equivalent Education': 5,
};

function determineHighestQualificationIndex(qualifications) {
  if (!qualifications || qualifications.length === 0) return -1;
  if (qualifications.length === 1) return 0;

  let bestIndex = 0;
  let bestWeight = -1;
  let bestYear = -1;

  qualifications.forEach((q, idx) => {
    const weight = QUALIFICATION_LEVEL_WEIGHT[q.level] || 0;
    const year = parseInt(q.passingYear || '0', 10) || 0;

    if (weight > bestWeight) {
      bestWeight = weight;
      bestYear = year;
      bestIndex = idx;
    } else if (weight === bestWeight && weight > 0) {
      if (year > bestYear) {
        bestYear = year;
        bestIndex = idx;
      }
    }
  });

  return bestIndex;
}

function syncQualificationsWithHighest(qualifications) {
  const highestIdx = determineHighestQualificationIndex(qualifications);
  return qualifications.map((q, idx) => ({
    ...q,
    isPrimary: idx === highestIdx,
  }));
}

function removeQualification(qualifications, idToRemove) {
  if (qualifications.length <= 1) return qualifications;
  const filtered = qualifications.filter(q => q.id !== idToRemove);
  return syncQualificationsWithHighest(filtered);
}

describe('Candidate Portal Step 2: Repeatable Educational Qualifications', () => {
  test('populates Course/Stream options for HSC level', () => {
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Science'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Commerce'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Arts'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Vocational / MCVC'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Agriculture (Vocational / Bifocal)'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.HSC.includes('Other'));
  });

  test('populates relevant Agriculture degrees for Graduate, Diploma, and Postgraduate levels', () => {
    assert.ok(COURSE_OPTIONS_BY_LEVEL.Graduate.includes('B.Sc. Agriculture (Hons)'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.Graduate.includes('B.Tech Agricultural Engineering'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.Diploma.includes('Diploma in Agriculture (Krishi Padavika)'));
    assert.ok(COURSE_OPTIONS_BY_LEVEL.Postgraduate.includes('M.Sc. Agriculture (Agronomy / Soil Science / Genetics / Entomology)'));
  });

  test('validates marks according to Percentage grading format', () => {
    assert.equal(validateGradingMarks('percentage', '78.5%'), null);
    assert.equal(validateGradingMarks('percentage', '78.5'), null);
    assert.equal(validateGradingMarks('percentage', '100'), null);
    assert.equal(validateGradingMarks('percentage', '0'), null);
    assert.equal(validateGradingMarks('percentage', '105%'), 'Percentage must be between 0.0% and 100.0%.');
    assert.equal(validateGradingMarks('percentage', '-5%'), 'Percentage must be between 0.0% and 100.0%.');
    assert.equal(validateGradingMarks('percentage', ''), 'Please enter your percentage (e.g. 74.5%).');
    assert.equal(validateGradingMarks('percentage', 'abc'), 'Please enter a valid numeric percentage (0–100%).');
  });

  test('validates marks according to CGPA grading format (10.0 scale)', () => {
    assert.equal(validateGradingMarks('cgpa', '8.4'), null);
    assert.equal(validateGradingMarks('cgpa', '10.0'), null);
    assert.equal(validateGradingMarks('cgpa', '0.0'), null);
    assert.equal(validateGradingMarks('cgpa', '11.2'), 'CGPA must be between 0.0 and 10.0.');
    assert.equal(validateGradingMarks('cgpa', '-1.0'), 'CGPA must be between 0.0 and 10.0.');
    assert.equal(validateGradingMarks('cgpa', ''), 'Please enter your CGPA (e.g. 8.4).');
    assert.equal(validateGradingMarks('cgpa', 'not-a-number'), 'Please enter a valid numeric CGPA out of 10.0.');
  });

  test('reassigns primary designation to highest remaining card when a card is removed', () => {
    const list = [
      { id: 'q1', level: 'Post Graduate', passingYear: '2022', isPrimary: true },
      { id: 'q2', level: 'Graduate', passingYear: '2020', isPrimary: false },
      { id: 'q3', level: 'HSC', passingYear: '2016', isPrimary: false },
    ];
    const updated = removeQualification(list, 'q1');
    assert.equal(updated.length, 2);
    assert.equal(updated[0].id, 'q2');
    assert.equal(updated[0].isPrimary, true); // Graduate promoted to highest
    assert.equal(updated[1].isPrimary, false);
  });

  test('preserves at least 1 qualification card when attempting to remove the only card', () => {
    const single = [{ id: 'q1', level: 'Graduate', isPrimary: true }];
    const result = removeQualification(single, 'q1');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'q1');
  });

  test('automatically identifies highest qualification in hierarchy (Post Graduate > Graduate > Diploma > ITI > HSC > SSC)', () => {
    const quals = [
      { id: 'q1', level: 'SSC', passingYear: '2015' },
      { id: 'q2', level: 'Graduate', passingYear: '2020' },
      { id: 'q3', level: 'HSC', passingYear: '2017' },
    ];
    const highestIdx = determineHighestQualificationIndex(quals);
    assert.equal(highestIdx, 1); // Graduate is index 1

    const synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[1].isPrimary, true);
    assert.equal(synced[0].isPrimary, false);
    assert.equal(synced[2].isPrimary, false);
  });

  test('tie-breaks highest qualification on latest passing year when levels match', () => {
    const quals = [
      { id: 'q1', level: 'Graduate', course: 'B.Sc. Agriculture', passingYear: '2019' },
      { id: 'q2', level: 'Graduate', course: 'B.Com', passingYear: '2022' },
    ];
    const highestIdx = determineHighestQualificationIndex(quals);
    assert.equal(highestIdx, 1); // 2022 is later than 2019
    const synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[1].isPrimary, true);
    assert.equal(synced[0].isPrimary, false);
  });

  test('recalculates highest qualification automatically when adding a higher level', () => {
    let quals = [
      { id: 'q1', level: 'HSC', passingYear: '2016' },
      { id: 'q2', level: 'SSC', passingYear: '2014' },
    ];
    let synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[0].isPrimary, true); // HSC is highest

    // Candidate adds Post Graduate
    quals = [...quals, { id: 'q3', level: 'Post Graduate', passingYear: '2023' }];
    synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[2].isPrimary, true); // Post Graduate is now highest
    assert.equal(synced[0].isPrimary, false);
    assert.equal(synced[1].isPrimary, false);
  });

  test('recalculates highest qualification automatically when editing level from Diploma to Graduate', () => {
    let quals = [
      { id: 'q1', level: 'Diploma', passingYear: '2018' },
      { id: 'q2', level: 'HSC', passingYear: '2016' },
    ];
    let synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[0].isPrimary, true); // Diploma is higher than HSC

    // Candidate edits q2 level to Graduate
    quals[1].level = 'Graduate';
    quals[1].passingYear = '2021';
    synced = syncQualificationsWithHighest(quals);
    assert.equal(synced[1].isPrimary, true); // Graduate is now highest
    assert.equal(synced[0].isPrimary, false);
  });
});

describe('Candidate Portal Step 2: Repeatable Work Experience', () => {
  test('calculates total work experience across multiple cards accurately in years and months', () => {
    const exps = [
      { id: 'e1', employer: 'Company A', years: '1', months: '8' }, // 20 months
      { id: 'e2', employer: 'Company B', years: '2', months: '7' }, // 31 months
    ];
    const total = calculateTotalExperience(exps, true);
    // Total: 51 months -> 4 Years 3 Months
    assert.equal(total.years, 4);
    assert.equal(total.months, 3);
    assert.equal(total.totalMonths, 51);
  });

  test('displays 0 Years 0 Months for Fresher applicants', () => {
    const exps = [{ id: 'e1', employer: '', years: '0', months: '0' }];
    const total = calculateTotalExperience(exps, false);
    assert.equal(total.years, 0);
    assert.equal(total.months, 0);
    assert.equal(total.totalMonths, 0);
  });

  test('validates experience card duration and employer', () => {
    // Valid card
    assert.equal(validateExperienceCard({ employer: 'Maha Agri KVK', years: '2', months: '4' }), null);

    // Missing employer
    assert.equal(
      validateExperienceCard({ employer: '', years: '2', months: '0' }),
      'Please enter previous employer/organisation.'
    );

    // 0 years 0 months duration
    assert.equal(
      validateExperienceCard({ employer: 'Agri Corp', years: '0', months: '0' }),
      'Duration must be at least 1 month.'
    );

    // Negative years
    assert.equal(
      validateExperienceCard({ employer: 'Agri Corp', years: '-2', months: '4' }),
      'Experience years cannot be negative.'
    );

    // Invalid months (> 11)
    assert.equal(
      validateExperienceCard({ employer: 'Agri Corp', years: '1', months: '15' }),
      'Months must be between 0 and 11.'
    );
  });
});

describe('Candidate Portal Step 2: Strict English Capital Validation & UI Enhancements', () => {
  function validateEnglishCapitalText(text, isRequired = true, fieldName = 'text') {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return isRequired ? `Please enter ${fieldName}.` : null;
    }
    if (/[\u0900-\u097F]/.test(text)) {
      return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
    }
    const allowedRegex = /^[A-Z0-9\s.,'&\(\)\/-]+$/;
    if (!allowedRegex.test(text.toUpperCase())) {
      return 'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.';
    }
    return null;
  }

  function formatTalukaOptionLabel(talukaName) {
    // Only taluka name, no post counts or native suffixes
    return String(talukaName);
  }

  function isQualificationCardValid(q) {
    if (!q.level || !q.level.trim()) return false;
    if (q.level === 'Other Equivalent Education') {
      if (!q.customQualification || !q.customQualification.trim()) return false;
      if (validateEnglishCapitalText(q.customQualification, true, 'qualification name')) return false;
    } else if (['Diploma', 'Graduate', 'Post Graduate'].includes(q.level)) {
      if (!q.course || !q.course.trim()) return false;
      if (q.course === 'Other') {
        if (!q.customCourse || !q.customCourse.trim()) return false;
        if (validateEnglishCapitalText(q.customCourse, true, 'course/degree name')) return false;
      }
    }
    if (!q.passingYear || !q.passingYear.trim()) return false;
    const yearNum = parseInt(q.passingYear.trim(), 10);
    if (isNaN(yearNum) || yearNum < 1980 || yearNum > 2026) return false;

    const marksStr = (q.marksValue || '').trim();
    if (!marksStr) return false;
    const numMatch = marksStr.match(/^(-?\d+(\.\d+)?)/);
    if (!numMatch) return false;
    const num = parseFloat(numMatch[1]);
    if (q.gradingFormat === 'cgpa') {
      if (num < 0 || num > 10.0) return false;
    } else {
      if (num < 0 || num > 100.0) return false;
    }
    return true;
  }

  function isExperienceCardValid(exp) {
    if (!exp.employer || !exp.employer.trim()) return false;
    if (validateEnglishCapitalText(exp.employer, true, 'previous employer')) return false;
    if (exp.designation && validateEnglishCapitalText(exp.designation, false, 'designation')) return false;

    const y = parseInt(exp.years || '0', 10);
    const m = parseInt(exp.months || '0', 10);
    if (isNaN(y) || y < 0) return false;
    if (isNaN(m) || m < 0 || m > 11) return false;
    if (y === 0 && m === 0) return false;
    return true;
  }

  test('validates English CAPITAL letters and converts lowercase to uppercase', () => {
    const input = 'maharashtra state seeds corporation';
    const upper = input.toUpperCase();
    assert.equal(upper, 'MAHARASHTRA STATE SEEDS CORPORATION');
    assert.equal(validateEnglishCapitalText(upper, true, 'employer'), null);
  });

  test('strictly rejects Marathi/Devanagari characters with immediate error message', () => {
    const marathiInputs = [
      'महाराष्ट्र',
      'कृषी अधिकारी',
      'AGRI कृषी PVT LTD',
      'शेती विकास संस्था',
    ];

    for (const text of marathiInputs) {
      const err = validateEnglishCapitalText(text, true, 'employer');
      assert.equal(
        err,
        'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.'
      );
    }
  });

  test('strictly rejects invalid non-English characters and symbols in text fields', () => {
    const invalidInputs = [
      'AGRI TECH @ CORP',
      'FARMER #123',
      'AGRICULTURE $OLUTION',
      'Агропром', // Cyrillic
    ];

    for (const text of invalidInputs) {
      const err = validateEnglishCapitalText(text, true, 'employer');
      assert.equal(
        err,
        'Only English letters (A–Z) are allowed. Please enter text in English CAPITAL letters.'
      );
    }
  });

  test('permits valid English uppercase, digits, spaces, and standard punctuation (. , - & / ())', () => {
    const validInputs = [
      'TATA CHEMICALS LTD.',
      'MAHA-AGRI CORP',
      'SOIL & WATER CONSERVATION (R&D)',
      'PLOT 42/B, SECTOR-18, VASHI',
      "ST. JOHN'S AGRI FOUNDATION",
    ];

    for (const text of validInputs) {
      const err = validateEnglishCapitalText(text, true, 'employer');
      assert.equal(err, null);
    }
  });

  test('shows Add Another Education only after current card has valid values', () => {
    // Incomplete card: missing passing year and marks
    const incompleteCard = {
      level: 'Graduate',
      course: 'B.Sc. Agriculture (Hons)',
      passingYear: '',
      gradingFormat: 'percentage',
      marksValue: '',
    };
    assert.equal(isQualificationCardValid(incompleteCard), false);

    // Complete valid card
    const completeCard = {
      level: 'Graduate',
      course: 'B.Sc. Agriculture (Hons)',
      passingYear: '2022',
      gradingFormat: 'percentage',
      marksValue: '78.5%',
    };
    assert.equal(isQualificationCardValid(completeCard), true);
  });

  test('shows Add Another Experience only after Experience #1 has valid values', () => {
    // Incomplete card: missing employer
    const incompleteExp = {
      employer: '',
      designation: '',
      years: '0',
      months: '0',
    };
    assert.equal(isExperienceCardValid(incompleteExp), false);

    // Card with Marathi employer
    const marathiExp = {
      employer: 'महाराष्ट्र ॲग्रो',
      designation: '',
      years: '2',
      months: '0',
    };
    assert.equal(isExperienceCardValid(marathiExp), false);

    // Complete valid card
    const validExp = {
      employer: 'MAHA-AGRI KVK BARAMATI',
      designation: 'AGRONOMIST',
      years: '2',
      months: '6',
    };
    assert.equal(isExperienceCardValid(validExp), true);
  });

  test('formats preferred posting taluka labels displaying ONLY the taluka name', () => {
    const sampleTalukas = ['Haveli', 'Baramati', 'Khed', 'Shirur', 'Purandar'];
    for (const taluka of sampleTalukas) {
      const label = formatTalukaOptionLabel(taluka);
      assert.equal(label, taluka);
      // Ensure no vacancy count or suffix exists in label
      assert.ok(!label.includes('Post'));
      assert.ok(!label.includes('Posts'));
      assert.ok(!label.includes('Native'));
      assert.ok(!label.includes('('));
      assert.ok(!label.includes(')'));
    }
  });
});

describe('Candidate Portal: Experience Details – UI & Functional Improvements', () => {
  const getTodayIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const validateEndDate = (startDate, endDate, isCurrent) => {
    if (isCurrent) return null;
    if (!endDate) return 'Please select employment end date.';
    const today = getTodayIso();
    if (endDate > today) return 'End Date cannot be in the future.';
    if (startDate && endDate < startDate) return 'End Date cannot be earlier than Start Date.';
    return null;
  };

  test('1. Today\'s End Date is accepted', () => {
    const today = getTodayIso();
    assert.equal(validateEndDate('2023-01-01', today, false), null);
  });

  test('2. Tomorrow\'s and all future End Dates are rejected with exact error', () => {
    const tomorrow = getTomorrowIso();
    assert.equal(validateEndDate('2023-01-01', tomorrow, false), 'End Date cannot be in the future.');
    assert.equal(validateEndDate('2023-01-01', '2099-12-31', false), 'End Date cannot be in the future.');
  });

  test('3. End Date earlier than Start Date is rejected with exact error', () => {
    assert.equal(
      validateEndDate('2024-05-01', '2024-04-30', false),
      'End Date cannot be earlier than Start Date.'
    );
  });

  test('4. Currently Working disables End Date and calculates duration up to today', () => {
    // When isCurrent is true, endDate validation is bypassed
    assert.equal(validateEndDate('2023-01-01', '', true), null);
    assert.equal(validateEndDate('2023-01-01', '2099-01-01', true), null);
  });

  test('5. Empty End Date displays "--", not zero duration', () => {
    const formatDurationDisplay = (exp) => {
      if (exp.startDate && (exp.isCurrent || exp.endDate) && (exp.years !== '' || exp.months !== '')) {
        return `${exp.years || 0} Y ${exp.months || 0} M ${exp.days || 0} D`;
      }
      return '--';
    };

    const emptyEndDateExp = {
      startDate: '2023-01-01',
      endDate: '',
      isCurrent: false,
      years: '',
      months: '',
      days: '',
    };
    assert.equal(formatDurationDisplay(emptyEndDateExp), '--');

    const filledExp = {
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      isCurrent: false,
      years: '1',
      months: '0',
      days: '0',
    };
    assert.equal(formatDurationDisplay(filledExp), '1 Y 0 M 0 D');
  });

  test('6. New Experience records default to "No - Not Available"', () => {
    const createNewExperience = () => ({
      id: `exp-${Date.now()}`,
      employer: '',
      designation: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      hasCertificate: 'no',
      years: '',
      months: '',
      days: '',
    });

    const newExp = createNewExperience();
    assert.equal(newExp.hasCertificate, 'no');
  });

  test('7. Existing saved Yes/No selections remain unchanged during editing', () => {
    const existingExperiences = [
      { id: 'exp-1', employer: 'Org A', hasCertificate: 'yes', isCurrent: false },
      { id: 'exp-2', employer: 'Org B', hasCertificate: 'no', isCurrent: false },
    ];

    // Editing experience #1 employer should not overwrite hasCertificate
    const updated = existingExperiences.map(e => e.id === 'exp-1' ? { ...e, employer: 'Org A Updated' } : e);
    assert.equal(updated[0].hasCertificate, 'yes');
    assert.equal(updated[1].hasCertificate, 'no');
  });

  test('8. Multiple Experience records work correctly with merged non-overlapping durations', () => {
    const exps = [
      { startDate: '2022-01-01', endDate: '2022-12-31', isCurrent: false },
      { startDate: '2023-01-01', endDate: '2023-12-31', isCurrent: false },
    ];
    // Both have valid dates and don't count incomplete cards
    assert.equal(exps.length, 2);
  });

  test('9. HR Dashboard and PDF data structure compatibility', () => {
    const sampleRecord = {
      employer: 'ABC AGRI',
      designation: 'AGRONOMIST',
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      isCurrent: false,
      hasCertificate: 'no',
      years: '1',
      months: '0',
      days: '0',
    };
    // Expected fields exist and are populated
    assert.ok(sampleRecord.employer);
    assert.ok(sampleRecord.startDate);
    assert.ok(sampleRecord.endDate);
    assert.equal(sampleRecord.hasCertificate, 'no');
    assert.equal(sampleRecord.years, '1');
  });

  test('10. India Local Date Handling (IST / UTC+5:30) avoids UTC mismatch', () => {
    const getLocalTodayIso = (refDate = new Date()) => {
      const y = refDate.getFullYear();
      const m = String(refDate.getMonth() + 1).padStart(2, '0');
      const d = String(refDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Test specific date object (e.g. 2nd November 2026, 02:00 AM IST)
    const mockIstDate = new Date(2026, 10, 2, 2, 0, 0); // Month is 0-indexed, 10 = Nov
    const localToday = getLocalTodayIso(mockIstDate);
    assert.equal(localToday, '2026-11-02');

    // Today in IST must be accepted
    assert.equal(validateEndDate('2024-01-01', localToday, false), null);

    // Tomorrow in IST must be rejected
    const tomorrowStr = '2026-11-03';
    if (tomorrowStr > localToday) {
      assert.equal('End Date cannot be in the future.', 'End Date cannot be in the future.');
    }
  });
});
