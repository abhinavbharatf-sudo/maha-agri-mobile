import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const MARATHI_PIN_ERROR = 'फक्त इंग्रजी अंक (0–9) ग्राह्य आहेत. मराठी अंक स्वीकारले जाणार नाहीत. (Only English digits 0–9 allowed)';

// Validation logic mirrored from Step2MasterProfile.tsx
function validatePincode(pin) {
  const trimmed = (pin || '').trim();
  if (!trimmed) {
    return 'PIN code is required.';
  }
  if (/[\u0900-\u097F]/.test(trimmed) || /[\u0966-\u096F]/.test(trimmed)) {
    return MARATHI_PIN_ERROR;
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

// Input filter and formatting logic mirrored from handleAddressChange
function processPincodeInput(rawVal) {
  let error = null;

  if (/[\u0900-\u097F]/.test(rawVal) || /[\u0966-\u096F]/.test(rawVal)) {
    error = MARATHI_PIN_ERROR;
    return {
      value: rawVal.replace(/[^0-9]/g, '').slice(0, 6),
      error,
    };
  }

  if (/[a-zA-Z]/.test(rawVal) || /[^0-9]/.test(rawVal)) {
    error = 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.';
    return {
      value: rawVal.replace(/[^0-9]/g, '').slice(0, 6),
      error,
    };
  }

  const finalVal = rawVal.replace(/[^0-9]/g, '').slice(0, 6);
  if (finalVal.length === 6 && !/^[1-9][0-9]{5}$/.test(finalVal)) {
    error = 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
  }

  return {
    value: finalVal,
    error,
  };
}

// Paste handling logic mirrored from handlePincodePaste
function processPincodePaste(currentVal, pastedText, selectionStart, selectionEnd) {
  const start = selectionStart ?? 0;
  const end = selectionEnd ?? currentVal.length;

  if (/[\u0900-\u097F]/.test(pastedText) || /[\u0966-\u096F]/.test(pastedText)) {
    return {
      accepted: false,
      value: currentVal, // Previous value completely preserved!
      error: MARATHI_PIN_ERROR,
    };
  }

  if (/[^0-9]/.test(pastedText)) {
    return {
      accepted: false,
      value: currentVal, // Previous value completely preserved!
      error: 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.',
    };
  }

  const resultingLength = currentVal.length - (end - start) + pastedText.length;
  if (pastedText.length > 6 || resultingLength > 6) {
    return {
      accepted: false,
      value: currentVal, // Previous value completely preserved!
      error: 'PIN code must be exactly 6 digits.',
    };
  }

  const newVal = currentVal.slice(0, start) + pastedText + currentVal.slice(end);
  let error = null;
  if (newVal.length === 6 && !/^[1-9][0-9]{5}$/.test(newVal)) {
    error = 'Enter a valid 6-digit Indian PIN code (e.g. 400001).';
  }
  return {
    accepted: true,
    value: newVal,
    error,
  };
}

describe('PIN Code Strict 6-Digit English Only Validation', () => {
  it('1. Accepts valid 6-digit English PIN codes', () => {
    assert.equal(validatePincode('411001'), null);
    assert.equal(validatePincode('400001'), null);
    assert.equal(validatePincode('442001'), null);
    assert.equal(validatePincode('110001'), null);
  });

  it('2. Blocks letters (like user screenshot "QH JGDJ") and reports error', () => {
    const res = processPincodeInput('QH JGDJ');
    assert.equal(res.value, ''); // Letters are stripped from value
    assert.equal(res.error, 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.');

    const validationErr = validatePincode('QH JGDJ');
    assert.equal(validationErr, 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.');
  });

  it('3. Rejects Marathi numerals (e.g. ४११०२८) and reports explicit Marathi numerals error', () => {
    const marathiPin = '४११०२८';
    const res = processPincodeInput(marathiPin);
    assert.equal(res.value, ''); // Marathi digits are stripped from value
    assert.equal(res.error, MARATHI_PIN_ERROR);

    const validationErr = validatePincode(marathiPin);
    assert.equal(validationErr, MARATHI_PIN_ERROR);
  });

  it('4. Rejects mixed Marathi and English digits', () => {
    const mixed = '4110२८';
    const res = processPincodeInput(mixed);
    assert.equal(res.value, '4110'); // Only English digits preserved, Marathi stripped
    assert.equal(res.error, MARATHI_PIN_ERROR);

    const validationErr = validatePincode(mixed);
    assert.equal(validationErr, MARATHI_PIN_ERROR);
  });

  it('5. Strictly limits typing to 6 digits maximum', () => {
    const res = processPincodeInput('4110019999');
    assert.equal(res.value, '411001'); // extra digits truncated to 6
    assert.equal(res.value.length, 6);
    assert.equal(res.error, null);
  });

  it('6. Rejects PIN codes with less than 6 digits on submit', () => {
    assert.equal(validatePincode('4110'), 'PIN code must be exactly 6 digits.');
    assert.equal(validatePincode('41100'), 'PIN code must be exactly 6 digits.');
  });

  it('7. Rejects PIN codes starting with 0', () => {
    const res = processPincodeInput('011001');
    assert.equal(res.error, 'Enter a valid 6-digit Indian PIN code (e.g. 400001).');

    const validationErr = validatePincode('011001');
    assert.equal(validationErr, 'Enter a valid 6-digit Indian PIN code (e.g. 400001).');
  });

  it('8. Rejects empty PIN code with required message', () => {
    assert.equal(validatePincode(''), 'PIN code is required.');
    assert.equal(validatePincode('   '), 'PIN code is required.');
  });

  it('9. Paste mixed content (12ABC345): rejects entire paste and preserves previous input', () => {
    // Current input has '411', candidate pastes '12ABC345'
    const res = processPincodePaste('411', '12ABC345', 3, 3);
    assert.equal(res.accepted, false);
    assert.equal(res.value, '411'); // Previous input value is 100% preserved
    assert.equal(res.error, 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.');

    // Paste into empty input
    const resEmpty = processPincodePaste('', '12ABC345', 0, 0);
    assert.equal(resEmpty.accepted, false);
    assert.equal(resEmpty.value, ''); // Empty preserved, not converted to 12345
    assert.equal(resEmpty.error, 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.');
  });

  it('10. Paste Marathi digits (४११०२८): rejects entire paste and preserves previous input', () => {
    const res = processPincodePaste('4110', '४११०२८', 4, 4);
    assert.equal(res.accepted, false);
    assert.equal(res.value, '4110'); // Previous input preserved
    assert.equal(res.error, MARATHI_PIN_ERROR);
  });

  it('11. Paste mixed English and Marathi digits (4110२८): rejects entire paste and preserves previous input', () => {
    const res = processPincodePaste('41', '4110२८', 2, 2);
    assert.equal(res.accepted, false);
    assert.equal(res.value, '41'); // Previous input preserved
    assert.equal(res.error, MARATHI_PIN_ERROR);
  });

  it('12. Paste with spaces (411 001): rejects entire paste and preserves previous input', () => {
    const res = processPincodePaste('', '411 001', 0, 0);
    assert.equal(res.accepted, false);
    assert.equal(res.value, ''); // Previous input preserved
    assert.equal(res.error, 'Only English digits (0–9) are allowed. Letters and symbols are not accepted.');
  });

  it('13. Paste exceeding 6 digits (4110019): rejects entire paste and preserves previous input', () => {
    const res = processPincodePaste('', '4110019', 0, 0);
    assert.equal(res.accepted, false);
    assert.equal(res.value, ''); // Previous input preserved
    assert.equal(res.error, 'PIN code must be exactly 6 digits.');

    // Existing 4 digits + paste 3 digits = 7 digits -> reject
    const resAppend = processPincodePaste('4110', '001', 4, 4);
    assert.equal(resAppend.accepted, false);
    assert.equal(resAppend.value, '4110');
    assert.equal(resAppend.error, 'PIN code must be exactly 6 digits.');
  });

  it('14. Paste valid 6-digit English PIN (411001): accepts cleanly', () => {
    const res = processPincodePaste('', '411001', 0, 0);
    assert.equal(res.accepted, true);
    assert.equal(res.value, '411001');
    assert.equal(res.error, null);
  });
});
