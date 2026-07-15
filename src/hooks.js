import { useCallback, useEffect, useRef, useState } from 'react';

// Runs `loader` on mount and on every vault change. Returns { data, error, reload }.
// A null vault (nothing selected) surfaces as an error so widgets can prompt to pick one.
export function useVaultData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(false);
    } catch (e) {
      setError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
    const off = window.api.onVaultChange(reload);
    return off;
  }, [reload]);

  return { data, error, reload };
}

// Fires `cb` whenever this window gains focus (and once on mount).
export function useWindowFocus(cb) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    const handler = () => cbRef.current();
    window.addEventListener('focus', handler);
    handler();
    return () => window.removeEventListener('focus', handler);
  }, []);
}
