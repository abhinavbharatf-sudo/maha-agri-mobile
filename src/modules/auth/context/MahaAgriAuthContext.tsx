/**
 * MahaAgriAuthContext
 * Lightweight React Context maintaining ONLY User, Session, and Active Role.
 * Business logic resides strictly inside AuthService.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { MahaAgriUser, MahaAgriSession, MahaAgriRole, LoginCredentials, AuthResponse } from '../types/auth.types';
import { authService } from '../services/AuthService';
import { storageService } from '../services/StorageService';

interface MahaAgriAuthContextValue {
  session: MahaAgriSession | null;
  user: MahaAgriUser | null;
  activeRole: MahaAgriRole | null;
  roles: MahaAgriRole[];
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse<MahaAgriSession>>;
  switchRole: (newRole: MahaAgriRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const MahaAgriAuthContext = createContext<MahaAgriAuthContextValue | undefined>(undefined);

export function MahaAgriAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MahaAgriSession | null>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;
  const activeRole = session?.activeRole ?? null;
  const roles = session?.user?.roles ?? [];

  const restoreSession = useCallback(async () => {
    try {
      const savedSession = await storageService.getSession();
      if (savedSession) {
        setSession(savedSession);
      }
    } catch (err) {
      console.warn('[MahaAgriAuthContext] Failed to restore session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authService.login(credentials);
    if (res.success && res.data) {
      setSession(res.data);
    }
    return res;
  }, []);

  const switchRole = useCallback(async (newRole: MahaAgriRole) => {
    if (!session) return;
    const updated = await authService.switchRole(session, newRole);
    setSession(updated);
  }, [session]);

  const logout = useCallback(async () => {
    await authService.logout(session);
    setSession(null);
  }, [session]);

  const value = useMemo<MahaAgriAuthContextValue>(
    () => ({
      session,
      user,
      activeRole,
      roles,
      loading,
      login,
      switchRole,
      logout,
      refreshSession: restoreSession,
    }),
    [session, user, activeRole, roles, loading, login, switchRole, logout, restoreSession]
  );

  return (
    <MahaAgriAuthContext.Provider value={value}>
      {children}
    </MahaAgriAuthContext.Provider>
  );
}

export function useMahaAgriAuthContext() {
  const context = useContext(MahaAgriAuthContext);
  if (!context) {
    throw new Error('useMahaAgriAuthContext must be used within a MahaAgriAuthProvider');
  }
  return context;
}
