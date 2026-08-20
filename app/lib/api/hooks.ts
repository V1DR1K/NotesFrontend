import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ApiError } from "./client";

export type AsyncState<T> = { data: T | null; loading: boolean; error: ApiError | null };

export function useApiQuery<T>(key: string, loader: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((current) => current + 1), []);
  const load = useEffectEvent(loader);

  useEffect(() => {
    let active = true;
    load().then((data) => { if (active) setState({ data, loading: false, error: null }); }).catch((error: unknown) => {
      if (active) setState((current) => ({ ...current, loading: false, error: error instanceof ApiError ? error : new ApiError("No se pudo cargar la información.", 0) }));
    });
    return () => { active = false; };
  }, [key, revision]);

  return { ...state, reload };
}

export function useMutationError() {
  const [error, setError] = useState<ApiError | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const captureError = useCallback((reason: unknown) => {
    const apiError = reason instanceof ApiError ? reason : new ApiError("No se pudo completar el cambio.", 0);
    setError(apiError);
    return apiError;
  }, []);
  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    try { return await action(); } catch (reason) {
      const apiError = captureError(reason);
      throw apiError;
    }
  }, [captureError]);
  return { error, clearError, captureError, run };
}
