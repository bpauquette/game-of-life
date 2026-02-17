import { useEffect, useState } from 'react';

import { getBackendApiBase } from '../utils/backendApi.js';
const backendBase = getBackendApiBase();

function setUnauthenticatedState(setUser, setStatus, setError) {
  setUser(null);
  setStatus('unauthenticated');
  setError(null);
}

function setAuthenticatedState(cancelled, setUser, setStatus, data) {
  if (cancelled) return;
  setUser(data);
  setStatus('authenticated');
}

function setErroredState(cancelled, setError, setUser, setStatus, err) {
  if (cancelled) return;
  setError(err);
  setUser(null);
  setStatus('unauthenticated');
}

export function useCurrentUser(token) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | authenticated | unauthenticated
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setUnauthenticatedState(setUser, setStatus, setError);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const res = await fetch(`${backendBase}/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) setUnauthenticatedState(setUser, setStatus, setError);
            return;
          }
          throw new Error(`/v1/me failed with status ${res.status}`);
        }

        const data = await res.json();
        setAuthenticatedState(cancelled, setUser, setStatus, data);
      } catch (err) {
        setErroredState(cancelled, setError, setUser, setStatus, err);
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
