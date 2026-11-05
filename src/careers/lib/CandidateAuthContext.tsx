import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { candidateSupabase } from '../../lib/supabase/client';
import { normalizeMobileNumber } from '../../lib/utils';
import type { RmsCandidateProfile } from '../lib/types';
import { getCandidateProfile } from '../lib/api';
import { ensureLeadExists } from '../../crm/lib/api';
import { sendOTP, verifyCustomOtp } from '../../services/whatapi';
import { sendWelcomeTemplate, isWelcomeMessageInCooldown } from '../../services/whatsappService';
import { isDummyOtpMode } from './dummyOtp';

interface CandidateAuthContextValue {
  session: Session | null;
  user: User | null;
  profile: RmsCandidateProfile | null;
  verifiedMobile: string;
  loading: boolean;
  profileLoading: boolean;
  requestOtp: (mobile: string) => Promise<{ error: string | null }>;
  verifyOtp: (mobile: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>;
  setVerifiedMobile: (mobile: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: (targetMobile?: string) => Promise<void>;
}

const CandidateAuthContext = createContext<CandidateAuthContextValue | undefined>(undefined);

export function CandidateAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RmsCandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [storedMobile, setStoredMobile] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizeMobileNumber(
        sessionStorage.getItem('maha_candidate_verified_mobile') ||
        localStorage.getItem('maha_candidate_verified_mobile') ||
        ''
      );
    }
    return '';
  });

  const loadProfile = useCallback(async (userId: string, targetMobile?: string) => {
    setProfileLoading(true);
    const expectedMobile = targetMobile || storedMobile;
    const { data } = await getCandidateProfile(userId);
    // Strict mobile match guard: never bind a profile from an old session to a different verified mobile
    if (expectedMobile) {
      const dataMobile = (data?.mobile || '').replace(/\D/g, '').slice(-10);
      if (!dataMobile || dataMobile !== expectedMobile) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
    }
    setProfile(data);
    setProfileLoading(false);
  }, [storedMobile]);

  const setVerifiedMobile = useCallback((mobile: string) => {
    const clean = normalizeMobileNumber(mobile);
    if (typeof window !== 'undefined') {
      try {
        if (clean) {
          sessionStorage.setItem('maha_candidate_verified_mobile', clean);
          localStorage.setItem('maha_candidate_verified_mobile', clean);
        } else {
          sessionStorage.removeItem('maha_candidate_verified_mobile');
          localStorage.removeItem('maha_candidate_verified_mobile');
        }
      } catch {
        // storage fallback
      }
    }
    setStoredMobile(clean);

    // If profile in memory belongs to a different mobile number, immediately clear it
    setProfile(prev => {
      if (!prev) return null;
      const prevMobile = (prev.mobile || '').replace(/\D/g, '').slice(-10);
      if (clean && prevMobile !== clean) {
        return null;
      }
      return prev;
    });

    // If session in memory belongs to a different mobile number, clear it and sign out stale Supabase session
    setSession(prev => {
      if (!prev?.user?.phone) return prev;
      const sessionPhone = (prev.user.phone || '').replace(/\D/g, '').slice(-10);
      if (clean && sessionPhone !== clean) {
        return null;
      }
      return prev;
    });

    if (clean) {
      loadProfile(`dummy-candidate-${clean}`, clean);
    }
  }, [loadProfile]);

  const refreshProfile = useCallback(async (targetMobile?: string) => {
    const activeMob = targetMobile || storedMobile;
    if (session?.user?.id) {
      await loadProfile(session.user.id, activeMob);
    } else if (activeMob) {
      await loadProfile(`dummy-candidate-${activeMob}`, activeMob);
    }
  }, [session?.user?.id, storedMobile, loadProfile]);

  useEffect(() => {
    let mounted = true;

    candidateSupabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sess = data.session;
      const sessPhone = (sess?.user?.phone || '').replace(/\D/g, '').slice(-10);

      // Strict Candidate Session Isolation:
      // A candidate session MUST have a verified 10-digit phone number, confirmed via WhatsApp OTP
      // (phone_confirmed_at is set), and MUST NOT be an email-based admin/staff account.
      // Admin/staff email sessions MUST NEVER leak into the candidate portal.
      const isCandidatePhoneSession = Boolean(
        sess?.user &&
        sessPhone &&
        sessPhone.length === 10 &&
        sess.user.phone_confirmed_at &&
        !sess.user.email
      );

      if (!isCandidatePhoneSession) {
        setSession(null);
        setProfile(null);
        if (isDummyOtpMode() && storedMobile) {
          loadProfile(`dummy-candidate-${storedMobile}`, storedMobile).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
        return;
      }

      // Valid candidate phone session: synchronize stored mobile and hydrate profile
      if (storedMobile !== sessPhone) {
        setStoredMobile(sessPhone);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('maha_candidate_verified_mobile', sessPhone);
            localStorage.setItem('maha_candidate_verified_mobile', sessPhone);
          } catch {}
        }
      }

      setSession(sess);
      loadProfile(sess.user.id, sessPhone).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: sub } = candidateSupabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        const sessPhone = (newSession?.user?.phone || '').replace(/\D/g, '').slice(-10);

        const isCandidatePhoneSession = Boolean(
          newSession?.user &&
          sessPhone &&
          sessPhone.length === 10 &&
          newSession.user.phone_confirmed_at &&
          !newSession.user.email
        );

        if (!isCandidatePhoneSession) {
          setSession(null);
          setProfile(null);
          if (mounted) setLoading(false);
          return;
        }

        if (storedMobile !== sessPhone) {
          setStoredMobile(sessPhone);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('maha_candidate_verified_mobile', sessPhone);
              localStorage.setItem('maha_candidate_verified_mobile', sessPhone);
            } catch {}
          }
        }

        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id, sessPhone);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, storedMobile]);

  const requestOtp = useCallback(async (mobile: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[FRONTEND LOG] ${timestamp} - User clicked Send OTP. Triggering requestOtp()`);
    const phone = `+91${normalizeMobileNumber(mobile)}`;
    
    console.log(`[FRONTEND LOG] ${timestamp} - Calling sendOTP() from whatapi.ts (which triggers action: 'generateOtp')`);
    const res = await sendOTP(phone);
    console.log(`[FRONTEND LOG] ${timestamp} - Edge function returned:`, res);
    
    return { error: res.success ? null : (res.error || 'Failed to send OTP') };
  }, []);

  const verifyOtp = useCallback(async (mobile: string, token: string) => {
    const cleanMobile = normalizeMobileNumber(mobile);
    const phone = `+91${cleanMobile}`;
    
    // 0. Reset previous profile and session to prevent cross-account bleeding during auth switch
    setProfile(null);
    setSession(null);
    setVerifiedMobile(cleanMobile);

    // 1. Verify against Edge Function securely
    const verifyRes = await verifyCustomOtp(phone, token);

    if (!verifyRes.success || !verifyRes.password) {
      return { error: verifyRes.error || 'Invalid OTP', isNewUser: false };
    }

    console.log(`[${new Date().toISOString()}] 1. OTP Verified`);
      
    // 2. Establish isolated Supabase Candidate Session using the cryptographically secure password
    const { data, error } = await candidateSupabase.auth.signInWithPassword({ 
      phone, 
      password: verifyRes.password 
    });

    console.log(`[verifyOtp] signInWithPassword() response: Data=${JSON.stringify(data)}, Error=${error ? JSON.stringify(error) : 'null'}`);

    if (error) {
       return { error: error.message, isNewUser: false };
    }

    // Persist verified mobile across reloads and multi-tab candidate flows
    setVerifiedMobile(cleanMobile);

    const userId = data.user?.id;
    if (!userId) return { error: 'Authentication failed', isNewUser: false };

    // CRM Integration: Ensure a lead record exists.
    try {
      console.log(`[CandidateAuth] Ensuring CRM lead exists for mobile: ***${normalizeMobileNumber(mobile).slice(-4)}`);
      const lead = await ensureLeadExists(phone, userId);
      console.log(`[CandidateAuth] CRM Lead confirmed: ID=${lead.id}, CandidateCode=${lead.internal_candidate_id || 'PENDING'}`);
    } catch (err: any) {
      console.error('[CandidateAuth] ensureLeadExists error details:', {
        message: err?.message || String(err),
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
    }

    // Trigger Welcome WhatsApp Message (Trigger 2: After successful OTP verification)
    // Server-side 24-hour cooldown: Only dispatches if no welcome message was sent to this normalized mobile in the last 24h
    try {
      const inCooldown = await isWelcomeMessageInCooldown(phone);
      if (!inCooldown) {
        console.log(`[verifyOtp] Sending welcome template to ${phone} (server-side cooldown check passed)...`);
        const sendRes = await sendWelcomeTemplate(phone);
        console.log(`[verifyOtp] Welcome template response:`, sendRes);
      } else {
        console.log(`[verifyOtp] Welcome message cooldown active (< 24h) for ${phone}, skipping duplicate.`);
      }
    } catch (err) {
      console.error('Failed to dispatch welcome WhatsApp message:', err);
    }

    const { data: existing } = await getCandidateProfile(userId);
    setProfile(existing || null);
    if (data.session) {
      setSession(data.session);
    }

    console.log(`[${new Date().toISOString()}] 5. Navigation Started`);
    return { error: null, isNewUser: !existing };
  }, [setVerifiedMobile]);

  const verifiedMobile = useMemo(() => {
    // 1. Authoritative: Authenticated Supabase candidate phone session
    if (session?.user?.phone) {
      return normalizeMobileNumber(session.user.phone);
    }
    // 2. Local test simulation fallback: only in DEV dummy mode
    if (isDummyOtpMode() && storedMobile) {
      return normalizeMobileNumber(storedMobile);
    }
    return '';
  }, [session?.user?.phone, storedMobile]);

  const effectiveUser = useMemo<User | null>(() => {
    if (session?.user) return session.user;
    if (isDummyOtpMode() && storedMobile) {
      return {
        id: `dummy-candidate-${storedMobile}`,
        phone: `+91${storedMobile}`,
        app_metadata: { provider: 'phone' },
        user_metadata: { phone: `+91${storedMobile}` },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;
    }
    return null;
  }, [session?.user, storedMobile]);

  useEffect(() => {
    if (verifiedMobile && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('maha_candidate_verified_mobile', verifiedMobile);
        localStorage.setItem('maha_candidate_verified_mobile', verifiedMobile);
      } catch {
        // storage quota fallback
      }
    }
  }, [verifiedMobile]);

  const signOut = useCallback(async () => {
    // 1. Immediately reset React in-memory states and local storage synchronously
    setProfile(null);
    setSession(null);
    setStoredMobile('');
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('maha_candidate_verified_mobile');
        localStorage.removeItem('maha_candidate_verified_mobile');
      }
    } catch {
      // storage fallback
    }

    // 2. Terminate isolated Candidate Supabase Auth session cleanly
    await candidateSupabase.auth.signOut().catch(() => {});
  }, []);

  const value = useMemo<CandidateAuthContextValue>(() => ({
    session,
    user: effectiveUser,
    profile,
    verifiedMobile,
    loading,
    profileLoading,
    requestOtp,
    verifyOtp,
    setVerifiedMobile,
    signOut,
    refreshProfile,
  }), [session, effectiveUser, profile, verifiedMobile, loading, profileLoading, requestOtp, verifyOtp, setVerifiedMobile, signOut, refreshProfile]);

  return (
    <CandidateAuthContext.Provider value={value}>
      {children}
    </CandidateAuthContext.Provider>
  );
}

export function useCandidateAuth(): CandidateAuthContextValue {
  const ctx = useContext(CandidateAuthContext);
  if (!ctx) throw new Error('useCandidateAuth must be used within <CandidateAuthProvider>');
  return ctx;
}
