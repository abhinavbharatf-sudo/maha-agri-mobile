/**
 * useQuery / useMutation — thin data hooks over Supabase.
 *
 * useQuery runs a selector function on mount and when deps change, returning
 * { data, error, loading, refetch }.
 * useMutation returns [mutate, { data, error, loading }] for one-shot writes.
 *
 * Both unwrap the Supabase { data, error } shape so callers get a flat result.
 */

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import type { PostgrestResponse } from '@supabase/postgrest-js';

type QueryFn<T> = () => Promise<PostgrestResponse<T>>;

interface QueryResult<T> {
  data: T[] | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useQuery<T>(fn: QueryFn<T>, deps: DependencyList = []): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fnRef.current().then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error.message);
        setData(null);
      } else {
        setError(null);
        setData(res.data);
      }
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, refetch };
}

type MutationFn<T> = () => Promise<PostgrestResponse<T>>;

interface MutationResult<T> {
  data: T[] | null;
  error: string | null;
  loading: boolean;
}

export function useMutation<T>(): [(fn: MutationFn<T>) => Promise<MutationResult<T>>, MutationResult<T>] {
  const [state, setState] = useState<MutationResult<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const mutate = useCallback(async (fn: MutationFn<T>): Promise<MutationResult<T>> => {
    setState({ data: null, error: null, loading: true });
    const res = await fn();
    const next: MutationResult<T> = res.error
      ? { data: null, error: res.error.message, loading: false }
      : { data: res.data, error: null, loading: false };
    setState(next);
    return next;
  }, []);

  return [mutate, state];
}
