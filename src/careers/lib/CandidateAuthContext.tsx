import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';
import { normalizeMobileNumber } from '../../lib/utils';
import type { RmsCandidateProfile } from '../lib/types';
import { getCandidateProfile } from '../lib/api';
import { ensureLeadExists, hasSentWelcomeTemplate, logWhatsAppSent } from '../../crm/lib/api';
import { sendOTP, verifyCustomOtp } from '../../services/whatapi';

interface CandidateAuthContextValue {
  session: Session | null;
  user: User | null;
  profile: RmsCandidateProfile | null;
  loading: boolean;
  profileLoading: boolean;
  requestOtp: (mobile: string) => Promise<{ error: string | null }>;
  verifyOtp: (mobile: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CandidateAuthContext = createContext<CandidateAuthContextValue | undefined>(undefined);

export function CandidateAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RmsCandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data } = await getCandidateProfile(userId);
    setProfile(data);
    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

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
    const phone = `+91${normalizeMobileNumber(mobile)}`;
    
    // 1. Verify against Edge Function securely
    const verifyRes = await verifyCustomOtp(phone, token);

    if (!verifyRes.success || !verifyRes.password) {
      return { error: verifyRes.error || 'Invalid OTP', isNewUser: false };
    }

    console.log(`[${new Date().toISOString()}] 1. OTP Verified`);
      
    // 2. Establish Supabase Session using the cryptographically secure password
    const { data, error } = await supabase.auth.signInWithPassword({ 
      phone, 
      password: verifyRes.password 
    });

    console.log(`[verifyOtp] signInWithPassword() response: Data=${JSON.stringify(data)}, Error=${error ? JSON.stringify(error) : 'null'}`);

    let isNewUser = false; // We can't strictly tell without querying, but session is established

    if (error) {
       return { error: error.message, isNewUser: false };
    }

    const userId = data.user?.id;
    if (!userId) return { error: 'Authentication failed', isNewUser: false };

    // CRM Integration: Ensure a lead record exists.
    try {
      await ensureLeadExists(phone, userId);
    } catch (err) {
      console.error('Error ensuring lead exists:', err);
    }

    const { data: existing } = await getCandidateProfile(userId);

    console.log(`[${new Date().toISOString()}] 5. Navigation Started`);
    return { error: null, isNewUser: !existing };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<CandidateAuthContextValue>(() => ({
    session, user: session?.user ?? null, profile, loading, profileLoading,
    requestOtp, verifyOtp, signOut, refreshProfile,
  }), [session, profile, loading, profileLoading, requestOtp, verifyOtp, signOut, refreshProfile]);

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
