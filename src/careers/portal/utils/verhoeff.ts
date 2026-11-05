/**
 * MAHA-AGRI Recruitment Portal — Verhoeff Algorithm & Demographic Utilities
 *
 * Provides:
 * 1. Verhoeff algorithm validation for 12-digit Indian Aadhaar numbers.
 * 2. Aadhaar masking and SHA-256 hashing (for duplicate checks without storing plaintext).
 * 3. Client & session duplicate registry management.
 * 4. Precise Age calculation (in completed years) from DOB string.
 * 5. Work experience date calculation and interval-merging (no double-counting).
 */

// ── Verhoeff Multiplication Table (d) ────────────────────────────────────────
const VERHOEFF_D: number[][] = [
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

// ── Verhoeff Permutation Table (p) ──────────────────────────────────────────
const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// ── Verhoeff Inverse Table (inv) ─────────────────────────────────────────────
const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a 12-digit Indian Aadhaar number using the Verhoeff checksum algorithm.
 * Accepts English digits (0-9) only.
 */
export function validateVerhoeff(aadhaar: string): boolean {
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

/**
 * Generates the Verhoeff checksum digit for an 11-digit number.
 */
export function generateVerhoeffChecksum(numStr: string): number {
  let c = 0;
  const digits = numStr.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  }
  return VERHOEFF_INV[c];
}

/**
 * Returns today's date in local YYYY-MM-DD format using local time components.
 * Prevents UTC timezone shift/offset issues in India (IST / UTC+5:30).
 */
export function getLocalTodayIso(refDate: Date = new Date()): string {
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, '0');
  const d = String(refDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a raw or partial Aadhaar digit string into NNNN-NNNN-NNNN display format.
 */
export function formatAadhaarDisplay(digits: string): string {
  const d = (digits || '').replace(/\D/g, '').slice(0, 12);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

/**
 * Masks an Aadhaar number to XXXX-XXXX-1234 for privacy-compliant UI display.
 */
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar) return '—';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX-XXXX-XXXX';
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

export interface AgeDetails {
  years: number;
  months: number;
  formatted: string;
  is18OrAbove: boolean;
}

/**
 * Calculates candidate's age in completed years and completed months from Date of Birth string (YYYY-MM-DD or DD/MM/YYYY).
 * Recalculates accurately based on current day and month.
 */
export function calculateAgeWithMonths(dobStr: string, referenceDate: Date = new Date()): AgeDetails | null {
  if (!dobStr) return null;
  const trimmed = dobStr.trim();
  let dob: Date;
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

/**
 * Calculates candidate's age in completed years from Date of Birth string (YYYY-MM-DD).
 * Recalculates accurately based on current day and month.
 */
export function calculateAge(dobStr: string): number | null {
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

/**
 * Secure Server-Side Aadhaar HMAC Tokenization.
 *
 * All secret-based HMAC generation occurs EXCLUSIVELY on the PostgreSQL server
 * inside SECURITY DEFINER functions. No secret pepper or encryption key exists
 * in the client bundle.
 */
export async function computeAadhaarHmac(
  aadhaar: string
): Promise<string> {
  const clean = (aadhaar || '').replace(/\D/g, '').trim();
  if (!clean || clean.length !== 12) return '';

  try {
    const { supabase, candidateSupabase } = await import('../../../lib/supabase/client');
    const client = (await candidateSupabase.auth.getSession()).data.session ? candidateSupabase : supabase;
    const { data, error } = await (client.rpc as any)('rms_secure_get_aadhaar_hmac', {
      p_aadhaar: clean,
    });
    if (!error && data) {
      return String(data);
    }
  } catch {}

  return '';
}

/**
 * Computes a server-derived tokenized hash of an Aadhaar number to ensure uniqueness
 * without storing or exposing plaintext Aadhaar numbers.
 */
export async function hashAadhaarNumber(aadhaar: string): Promise<string> {
  return computeAadhaarHmac(aadhaar);
}

const REGISTRY_STORAGE_KEY = 'maha_registered_aadhaar_hashes';

interface AadhaarRegistryEntry {
  hash: string;
  candidateKey: string; // bound to candidate user_id or mobile
  registeredAt: string;
}

/**
 * Verifies whether an Aadhaar hash is already claimed by a DIFFERENT candidate.
 * Allows the same candidate (by candidateKey) to update their own profile.
 */
export function checkAadhaarDuplicate(
  aadhaarHash: string,
  currentCandidateKey: string
): { isDuplicate: boolean; message?: string } {
  if (!aadhaarHash) return { isDuplicate: false };

  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(REGISTRY_STORAGE_KEY) || sessionStorage.getItem(REGISTRY_STORAGE_KEY);
      if (raw) {
        const registry: Record<string, AadhaarRegistryEntry> = JSON.parse(raw);
        const existing = registry[aadhaarHash];
        if (existing && existing.candidateKey && existing.candidateKey !== currentCandidateKey) {
          return {
            isDuplicate: true,
            message: 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.',
          };
        }
      }
    }
  } catch {
    // storage fallback
  }

  return { isDuplicate: false };
}

/**
 * Server-side & Multi-tier Aadhaar Duplicate Check:
 * Verifies whether the computed Aadhaar HMAC/hash is registered by another candidate/mobile.
 */
export async function checkAadhaarDuplicateServer({
  aadhaarHash,
  aadhaarNumber,
  userId,
  mobile,
}: {
  aadhaarHash?: string;
  aadhaarNumber?: string;
  userId?: string;
  mobile?: string;
}): Promise<{ isDuplicate: boolean; message?: string }> {
  const queryParam = (aadhaarNumber || '').replace(/\D/g, '').slice(0, 12) || aadhaarHash || '';
  if (!queryParam) return { isDuplicate: false };

  const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);

  // 1. Check via PostgreSQL RPC if available
  try {
    const { supabase, candidateSupabase } = await import('../../../lib/supabase/client');
    const client = (await candidateSupabase.auth.getSession()).data.session ? candidateSupabase : supabase;
    const { data, error } = await (client.rpc as any)('rms_check_aadhaar_duplicate', {
      p_aadhaar_hash: queryParam,
    });

    if (error) {
      if (error.message?.includes('Too many') || error.message?.includes('wait')) {
        return {
          isDuplicate: true,
          message: error.message,
        };
      }
    }

    if (!error && data) {
      if (data.is_duplicate) {
        return {
          isDuplicate: true,
          message: data.message || 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.',
        };
      }
      return { isDuplicate: false };
    }
  } catch {}

  // 2. Direct table lookup fallback (if client session has access)
  try {
    const { supabase, candidateSupabase } = await import('../../../lib/supabase/client');
    const client = (await candidateSupabase.auth.getSession()).data.session ? candidateSupabase : supabase;
    const { data: rows, error } = await client
      .from('rms_candidate_profiles' as never)
      .select('id, user_id, mobile' as never)
      .eq('aadhaar_hash' as never, queryParam)
      .limit(5);

    if (!error && Array.isArray(rows) && rows.length > 0) {
      const collision = (rows as any[]).find(r => {
        const rowMob = (r.mobile || '').replace(/\D/g, '').slice(-10);
        return (r.user_id && r.user_id !== userId) || (rowMob && rowMob !== cleanMobile);
      });
      if (collision) {
        return {
          isDuplicate: true,
          message: 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.',
        };
      }
    }
  } catch {}

  // 3. Client & Cross-Tab Registry fallback
  const localCheck = checkAadhaarDuplicate(queryParam, cleanMobile || userId || '');
  if (localCheck.isDuplicate) {
    return {
      isDuplicate: true,
      message: 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.',
    };
  }

  return { isDuplicate: false };
}

/**
 * Registers an Aadhaar hash to the current candidate identity in local storage.
 */
export function registerAadhaarHash(
  aadhaarHash: string,
  candidateKey: string
): void {
  if (!aadhaarHash || !candidateKey) return;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(REGISTRY_STORAGE_KEY) || sessionStorage.getItem(REGISTRY_STORAGE_KEY);
      const registry: Record<string, AadhaarRegistryEntry> = raw ? JSON.parse(raw) : {};
      registry[aadhaarHash] = {
        hash: aadhaarHash,
        candidateKey,
        registeredAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(registry);
      localStorage.setItem(REGISTRY_STORAGE_KEY, serialized);
      sessionStorage.setItem(REGISTRY_STORAGE_KEY, serialized);
    }
  } catch {
    // storage fallback
  }
}

/**
 * Calculates difference between two dates in years, months and days.
 */
export function calculateDuration(
  startDateStr: string,
  endDateStr: string,
  isCurrent = false
): { years: number; months: number; days: number; totalMonths: number } {
  if (!startDateStr) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  let start: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr.trim())) {
    const [y, m, d] = startDateStr.trim().split('-').map(Number);
    start = new Date(y, m - 1, d);
  } else {
    start = new Date(startDateStr);
  }
  if (isNaN(start.getTime())) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  if (!isCurrent && !endDateStr) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  let end: Date;
  if (isCurrent) {
    const now = new Date();
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (/^\d{4}-\d{2}-\d{2}$/.test((endDateStr || '').trim())) {
    const [y, m, d] = (endDateStr || '').trim().split('-').map(Number);
    end = new Date(y, m - 1, d);
  } else {
    end = new Date(endDateStr);
  }
  if (isNaN(end.getTime())) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  if (end < start) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = Math.max(0, years * 12 + months);

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    totalMonths,
  };
}

export interface DateInterval {
  start: Date;
  end: Date;
}

/**
 * Merges overlapping or contiguous date intervals and returns non-overlapping total experience in years, months and days.
 * Prevents double-counting concurrent employment periods.
 */
export function calculateMergedTotalExperience(
  intervals: { startDate: string; endDate?: string; isCurrent?: boolean }[]
): { years: number; months: number; days: number; totalMonths: number } {
  const validIntervals: DateInterval[] = [];

  for (const item of intervals) {
    if (!item.startDate) continue;
    if (!item.isCurrent && !item.endDate) continue;

    let start: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.startDate.trim())) {
      const [y, m, d] = item.startDate.trim().split('-').map(Number);
      start = new Date(y, m - 1, d);
    } else {
      start = new Date(item.startDate);
    }
    if (isNaN(start.getTime())) continue;

    let end: Date;
    if (item.isCurrent) {
      const now = new Date();
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (/^\d{4}-\d{2}-\d{2}$/.test((item.endDate || '').trim())) {
      const [y, m, d] = (item.endDate || '').trim().split('-').map(Number);
      end = new Date(y, m - 1, d);
    } else {
      end = new Date(item.endDate!);
    }
    if (isNaN(end.getTime())) continue;
    if (end < start) continue;

    validIntervals.push({ start, end });
  }

  if (validIntervals.length === 0) {
    return { years: 0, months: 0, days: 0, totalMonths: 0 };
  }

  // Sort intervals by start date
  validIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge intervals
  const merged: DateInterval[] = [validIntervals[0]];

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

  // Calculate sum of merged durations in years, months, and days
  let sumYears = 0;
  let sumMonths = 0;
  let sumDays = 0;

  for (const interval of merged) {
    let y = interval.end.getFullYear() - interval.start.getFullYear();
    let m = interval.end.getMonth() - interval.start.getMonth();
    let d = interval.end.getDate() - interval.start.getDate();

    if (d < 0) {
      m -= 1;
      const prevMonthDays = new Date(interval.end.getFullYear(), interval.end.getMonth(), 0).getDate();
      d += prevMonthDays;
    }
    if (m < 0) {
      y -= 1;
      m += 12;
    }

    sumYears += Math.max(0, y);
    sumMonths += Math.max(0, m);
    sumDays += Math.max(0, d);
  }

  if (sumDays >= 30) {
    sumMonths += Math.floor(sumDays / 30);
    sumDays = sumDays % 30;
  }

  if (sumMonths >= 12) {
    sumYears += Math.floor(sumMonths / 12);
    sumMonths = sumMonths % 12;
  }

  return {
    years: sumYears,
    months: sumMonths,
    days: sumDays,
    totalMonths: sumYears * 12 + sumMonths,
  };
}
