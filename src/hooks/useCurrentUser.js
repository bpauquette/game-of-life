import { useEffect, useState } from 'react';

// Simple helper to resolve backend base URL.
// Adjust if you already have a central backend config.
function resolveBackendBase() {
  const env = process.env;
  if (env.REACT_APP_GOL_BACKEND_BASE) return env.REACT_APP_GOL_BACKEND_BASE;
  const port = env.REACT_APP_GOL_BACKEND_PORT || env.GOL_BACKEND_PORT || '55000';
  return `http://localhost:${port}`;
}

export function useCurrentUser(token) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | authenticated | unauthenticated
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const base = resolveBackendBase();
        const res = await fetch(`${base}/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) {
              setUser(null);
              setStatus('unauthenticated');
            }
            return;
          }
          throw new Error(`/v1/me failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) {
          setUser(data);
          setStatus('authenticated');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return { user, status, error, isAuthenticated: status === 'authenticated' };
}
