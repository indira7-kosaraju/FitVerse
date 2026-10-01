import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/axios';

/**
 * Runs an async fetcher and tracks { data, loading, error }.
 *
 *   const { data, loading, error, refetch, setData } =
 *     useFetch(() => getClasses({ from, to }), [from, to]);
 *
 * - Re-runs whenever `deps` change (unless `immediate: false`).
 * - Ignores stale responses when deps change mid-flight.
 * - `setData` allows optimistic local updates.
 */
export default function useFetch(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [state, setState] = useState({ data: initialData, loading: immediate, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (mounted.current && id === requestId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      if (mounted.current && id === requestId.current) {
        setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
      }
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    []
  );

  return { ...state, refetch: run, setData };
}
