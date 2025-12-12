// src/auth/useAuthStatus.js
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

const API_BASE = (typeof window !== 'undefined' && window.location)
  ? window.location.origin + '/api'
  : process.env.REACT_APP_API_BASE || 'http://localhost:55000';

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
        const res = await fetch(`${API_BASE}/v1/me`, {
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
