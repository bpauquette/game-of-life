// src/auth/useAuthStatus.js
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

import { getBackendApiBase } from '../utils/backendApi.js';
const API_BASE = getBackendApiBase();

export function useAuthStatus() {
  const { token } = useAuth();
  const [status, setStatus] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'
  const [me, setMe] = useState(null);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setStatus('unauthenticated');
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function checkMe() {
      setStatus('checking');
      try {
        const url = API_BASE.endsWith('/') ? API_BASE + 'v1/me' : API_BASE + '/v1/me';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) {
              setMe(null);
              setStatus('unauthenticated');
            }
            return;
          }
          throw new Error(`/v1/me failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) {
          setMe(data);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          setMe(null);
          setStatus('unauthenticated');
        }
      }
    }

    checkMe();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return { status, me, isAuthenticated: status === 'authenticated' };
}
