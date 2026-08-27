import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ApiError } from "./client";

export type AsyncState<T> = { data: T | null; loading: boolean; refreshing: boolean; error: ApiError | null };

const cache = new Map<string, { data: unknown; updatedAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 100;
let cacheGeneration = 0;

export function clearApiQueryCache() {
  cache.clear();
  inFlight.clear();
  cacheGeneration += 1;
}

function storeCache<T>(key: string, data: T) {
  cache.set(key, { data, updatedAt: Date.now() });
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export function useApiQuery<T>(key: string, loader: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const cacheKey = `${cacheGeneration}:${key}`;
  const cached = cache.get(cacheKey);
  const [state, setState] = useState<AsyncState<T> & { key: string }>({ key: cacheKey, data: cached ? cached.data as T : null, loading: !cached, refreshing: false, error: null });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setState((current) => ({ ...current, refreshing: current.data !== null, loading: current.data === null }));
    setRevision((current) => current + 1);
  }, []);
  const load = useEffectEvent(loader);

  useEffect(() => {
    let active = true;
    const existing = inFlight.get(cacheKey);
    const request: Promise<T> = existing ? existing as Promise<T> : load();
    if (!existing) inFlight.set(cacheKey, request);
    request.then((data) => {
      if (cacheKey.startsWith(`${cacheGeneration}:`)) storeCache(cacheKey, data);
      if (active) setState({ key: cacheKey, data, loading: false, refreshing: false, error: null });
    }).catch((error: unknown) => {
      if (active) setState({ key: cacheKey, data: null, loading: false, refreshing: false, error: error instanceof ApiError ? error : new ApiError("No se pudo cargar la información.", 0) });
    }).finally(() => {
      if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey);
    });
    return () => { active = false; };
  }, [cacheKey, revision]);

  const visibleState = state.key === cacheKey ? state : { key: cacheKey, data: null, loading: true, refreshing: false, error: null };
  return { data: visibleState.data, loading: visibleState.loading, refreshing: visibleState.refreshing, error: visibleState.error, reload };
}

export function useMutationError() {
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const clearError = useCallback(() => setError(null), []);
  const captureError = useCallback((reason: unknown) => {
    const apiError = reason instanceof ApiError ? reason : new ApiError("No se pudo completar el cambio.", 0);
    setError(apiError);
    return apiError;
  }, []);
  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    setPending(true);
    try { return await action(); } catch (reason) {
      const apiError = captureError(reason);
      throw apiError;
    } finally {
      setPending(false);
    }
  }, [captureError]);
  return { error, pending, clearError, captureError, run };
}
