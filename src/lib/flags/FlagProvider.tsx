/**
 * FeatureFlagProvider — loads flags once and exposes useFeatureFlag().
 *
 * Flags are stored in the feature_flags table (readable by anon + authenticated).
 * The provider fetches them on mount and caches in memory. useFeatureFlag(key)
 * returns true only if the flag is enabled (rollout percentage is respected
 * via a stable hash of the user id when available).
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
import { supabaseUntyped } from '../supabase/client';
import type { FeatureFlag } from '../types/database';
import { useAuth } from '../auth/AuthContext';

interface FlagContextValue {
  flags: Map<string, FeatureFlag>;
  loading: boolean;
  isEnabled: (key: string) => boolean;
  refresh: () => void;
}

const FlagContext = createContext<FlagContextValue | undefined>(undefined);

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Map<string, FeatureFlag>>(new Map());
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const { user } = useAuth();

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabaseUntyped
      .from('feature_flags')
      .select('*')
      .then(({ data, error }: any) => {
        if (!active) return;
        if (error) {
          console.error('[flags] load error', error);
        }
        const map = new Map<string, FeatureFlag>();
        ((data ?? []) as FeatureFlag[]).forEach((f) => map.set(f.key, f));
        setFlags(map);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error('[flags] catch error', err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [nonce]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      const flag = flags.get(key);
      if (!flag || !flag.is_enabled) return false;
      if (flag.rollout_percentage >= 100) return true;
      if (flag.rollout_percentage <= 0) return false;
      const bucket = stableHash(`${key}:${user?.id ?? 'anon'}`) % 100;
      return bucket < flag.rollout_percentage;
    },
    [flags, user?.id]
  );

  const value = useMemo<FlagContextValue>(
    () => ({ flags, loading, isEnabled, refresh }),
    [flags, loading, isEnabled, refresh]
  );

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

export function useFeatureFlags(): FlagContextValue {
  const ctx = useContext(FlagContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within <FeatureFlagProvider>');
  return ctx;
}

export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
