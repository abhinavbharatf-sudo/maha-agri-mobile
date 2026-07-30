/**
 * Authentication Validators
 * V1 Login enforces Mobile Number (10 digits Indian format / +91) + Password.
 */

export function normalizeMobileNumber(input: string): string {
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  return digitsOnly;
}

export function validateMobileNumber(mobile: string): { isValid: boolean; error?: string } {
  const cleaned = normalizeMobileNumber(mobile);
  if (!cleaned) {
    return { isValid: false, error: 'Mobile number is required.' };
  }
  if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
  }
  return { isValid: true };
}

export function validateOtpCode(otp: string): { isValid: boolean; error?: string } {
  const digits = otp.replace(/\D/g, '');
  if (digits.length !== 6) {
    return { isValid: false, error: 'OTP must be a 6-digit number.' };
  }
  return { isValid: true };
}
