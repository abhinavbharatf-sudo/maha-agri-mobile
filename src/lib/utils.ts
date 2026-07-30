/**
 * Centralized utility for mobile number normalization.
 * Strips all non-digit characters and ensures a standard 10-digit format
 * by intelligently removing country codes if present.
 */
export function normalizeMobileNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    // If it's a non-standard length with country code, take the last 10 digits
    return digits.slice(-10);
  }
  
  return digits;
}
