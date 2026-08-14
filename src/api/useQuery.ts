import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './client';

export interface QueryState<T> {
  data: T | undefined;
  /** True only on the first load; a refetch leaves existing data on screen. */
  loading: boolean;
  refreshing: boolean;
  error: ApiError | Error | undefined;
  refetch: () => void;
}

/**
 * Minimal async data hook: run a fetcher, expose data/loading/error, refetch on
 * demand. Deliberately dependency-free while the backend is unknown.
 *
 * If the API turns out to need caching across screens, deduping, or background
 * refetching, swap this for TanStack Query — call sites take the same shape, so
 * the change stays inside this module and the hook's consumers.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | Error | undefined>(undefined);

  // Guards against setting state after unmount, and against a slow first
  // response overwriting a newer one.
  const alive = useRef(true);
  const runId = useRef(0);
  const run = useRef(fetcher);
  run.current = fetcher;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (isRefresh: boolean) => {
    const id = ++runId.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(undefined);

    try {
      const result = await run.current();
      if (alive.current && id === runId.current) setData(result);
    } catch (cause) {
      if (alive.current && id === runId.current) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    } finally {
      if (alive.current && id === runId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => void load(true), [load]);

  return { data, loading, refreshing, error, refetch };
}
