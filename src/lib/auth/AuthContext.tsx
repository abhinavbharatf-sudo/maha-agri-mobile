/**
 * AuthContext — session, profile, and permissions for the whole app.
 *
 * Exposes `useAuth()` which returns the current session, the user's profile
 * (with role key), a Set of permission strings, and sign-in/sign-up/sign-out
 * helpers. The onAuthStateChange callback uses the async-IIFE guard from the
 * bolt-database skill to avoid the Supabase deadlock.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Profile, RoleKey, RbacRole } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roleKey: RoleKey | null;
  permissions: Set<string>;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileAndPermissions = useCallback(async (userId: string) => {
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('*, role:rbac_roles(*)')
      .eq('id', userId)
      .maybeSingle();

    if (profErr) {
      console.error('[auth] profile load error', profErr);
      return;
    }
    setProfile(prof as Profile | null);
    const role = (prof as unknown as { role?: RbacRole | null })?.role ?? null;
    setRoleKey((role?.key as RoleKey) ?? null);

    if (role) {
      const { data: perms } = await supabase
        .from('rbac_role_permissions')
        .select('permission:rbac_permissions(key)')
        .eq('role_id', role.id);
      const keys = (perms ?? [])
        .map((p) => (p as { permission?: { key?: string } }).permission?.key)
        .filter((k): k is string => !!k);
      setPermissions(new Set(keys));
    } else {
      setPermissions(new Set());
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfileAndPermissions(session.user.id);
    }
  }, [session?.user?.id, loadProfileAndPermissions]);

  useEffect(() => {
    let mounted = true;

    const checkFallbackSession = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('maha_agri_auth_session');
      } catch {}

      const isLiveSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL);

      // Clean up legacy mock sessions in live Supabase environment
      if (stored && isLiveSupabaseEnv) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.token && (parsed.token === 'demo-token' || parsed.token === 'demo-jwt-access-token')) {
            localStorage.removeItem('maha_agri_auth_session');
            stored = null;
          }
        } catch {
          localStorage.removeItem('maha_agri_auth_session');
          stored = null;
        }
      }

      // Auto-initialize demo session ONLY in offline development when no Supabase URL is set
      if (!stored && !isLiveSupabaseEnv) {
        const defaultSession = {
          sessionId: 'sess_default_super_admin',
          token: 'demo-token',
          user: {
            id: 'usr_super_admin_001',
            employee_code: 'MA-SUP-0001',
            mobile: '9876543210',
            full_name: 'Super Admin Officer',
            email: 'super_admin@abhinavbharat.org',
            status: 'active',
            first_login: false,
            created_at: new Date().toISOString(),
            roles: [
              {
                id: 'role-super-admin',
                key: 'SUPER_ADMIN',
                name: 'Super Admin',
                hierarchy_level: 1,
              }
            ]
          },
          activeRole: {
            id: 'role-super-admin',
            key: 'SUPER_ADMIN',
            name: 'Super Admin',
            hierarchy_level: 1,
          }
        };
        try {
          localStorage.setItem('maha_agri_auth_session', JSON.stringify(defaultSession));
        } catch {}
        stored = JSON.stringify(defaultSession);
      }

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.user) {
            const u = parsed.user;
            const role = parsed.activeRole?.key?.toLowerCase() || 'super_admin';
            
            const mockUser = {
              id: u.id || 'demo-user-id',
              email: u.email || 'super_admin@abhinavbharat.org',
              user_metadata: { full_name: u.full_name || 'Super Admin' }
            } as unknown as User;

            const mockSession = {
              access_token: parsed.token || 'demo-token',
              token_type: 'bearer',
              user: mockUser,
              expires_at: Math.floor(Date.now() / 1000) + 86400,
            } as Session;

            setSession(mockSession);
            setProfile({
              id: u.id || 'demo-user-id',
              email: u.email || 'super_admin@abhinavbharat.org',
              full_name: u.full_name || 'Super Admin',
              created_at: new Date().toISOString()
            } as Profile);
            setRoleKey((role as RoleKey) || 'super_admin');
            setPermissions(new Set(['all', 'admin', 'hr', 'crm', 'super_admin']));

            return true;
          }
        } catch (e) {
          console.warn('[auth] fallback parse error', e);
        }
      }
      return false;
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session?.user) {
        setSession(data.session);
        loadProfileAndPermissions(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        const restored = checkFallbackSession();
        if (mounted) setLoading(false);
      }
    }).catch((err) => {
      console.error('[auth] getSession catch error:', err);
      checkFallbackSession();
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (newSession?.user) {
          setSession(newSession);
          await loadProfileAndPermissions(newSession.user.id);
        } else {
          const restored = checkFallbackSession();
          if (!restored) {
            setSession(null);
            setProfile(null);
            setRoleKey(null);
            setPermissions(new Set());
          }
        }
        if (mounted) setLoading(false);
      })().catch((err) => {
        console.error('[auth] onAuthStateChange catch error:', err);
        checkFallbackSession();
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfileAndPermissions]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      return { error: err.message };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? email } },
    });
    if (err) {
      setError(err.message);
      return { error: err.message };
    }
    if (data.user) {
      await loadProfileAndPermissions(data.user.id);
    }
    return { error: null };
  }, [loadProfileAndPermissions]);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('maha_agri_auth_session');
    } catch {}
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoleKey(null);
    setPermissions(new Set());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    roleKey,
    permissions,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [session, profile, roleKey, permissions, loading, error, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
