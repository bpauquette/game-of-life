import logger from '../controller/utils/logger';
// Helper to get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}
export function resolveBackendBase() {
  const envBase = process.env.REACT_APP_BACKEND_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) return envBase;
  const { protocol, hostname } = globalThis.window?.location || { protocol: 'http:', hostname: 'localhost' };
  const port = process.env.REACT_APP_BACKEND_PORT || '55000';
  return `${protocol}//${hostname}:${port}`;
}

export async function saveCapturedShapeToBackend(shapeData, logout) {
  const shapeForBackend = {
    ...shapeData,
    cells: shapeData.pattern,
    meta: { capturedAt: new Date().toISOString(), source: 'capture-tool' }
  };
  delete shapeForBackend.pattern;
  // Check for duplicate name first (prefer client-side validation to avoid confusion)
  try {
    const base = resolveBackendBase();
    const nameToCheck = (shapeForBackend.name || '').trim();
    if (nameToCheck.length > 0) {
      const nameRes = await fetchShapeNames(base, nameToCheck, 1, 0);
      if (nameRes.ok && Array.isArray(nameRes.items) && nameRes.items.length > 0) {
        // if an exact (case-insensitive) name match exists, signal duplicate
        const exists = nameRes.items.some(it => (it.name||'').toLowerCase() === nameToCheck.toLowerCase());
        if (exists) {
          // throw a special error that the caller can interpret
          throw new Error(`DUPLICATE_NAME:${nameToCheck}`);
        }
      }
    }
  } catch (e) {
    // If the fetchShapeNames call failed for some reason, continue to attempt save
    // unless it was a duplicate-name signal we threw above.
    if (e.message && e.message.startsWith('DUPLICATE_NAME:')) throw e;
    // otherwise ignore and continue
  }

  const token = getAuthToken();
    const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const response = await fetch(`${resolveBackendBase()}/v1/shapes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(shapeForBackend)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error === 'Invalid or expired token') {
      if (typeof logout === 'function') logout();
      throw new Error('Please log in again to save shapes');
    }
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}
// Helper to resolve base URL
export function getBaseUrl(backendBase) {
  if (typeof backendBase === 'string' && backendBase.length > 0) {
    return backendBase;
  }
  return globalThis.window?.location?.origin 
    ? String(globalThis.window.location.origin) 
    : 'http://localhost';
}

// Fetch shapes list
export async function fetchShapes(base, q, limit, offset) {
  const url = new URL('/v1/shapes', base);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  const res = await fetch(url.toString());
  if (!res.ok) {
    return { ok: false, status: res.status, items: [], total: 0 };
  }
  try {
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    return { ok: true, items, total };
  } catch (e) {
    logger.warn('Failed to parse JSON response:', e?.message);
    return { ok: true, items: [], total: 0 };
  }
}

// Fetch only shape names (id + name) in a single call when supported by the backend.
// Falls back to fetching a large page of shapes and mapping to minimal metadata.
export async function fetchShapeNames(base, q = '', limit = 50, offset = 0) {
  try {
    const url = new URL('/v1/shapes/names', base);
    url.searchParams.set('q', q || '');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    const res = await fetch(url.toString());
    if (!res.ok) return { ok: false, items: [], total: 0 };
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    return { ok: true, items, total: Number(data.total) || items.length };
  } catch (err) {
    logger.warn('fetchShapeNames failed:', err);
    return { ok: false, items: [], total: 0 };
  }
}

// Fetch shape by ID
export async function fetchShapeById(id, backendBase) {
  const base = getBaseUrl(backendBase);
  const url = new URL(`/v1/shapes/${encodeURIComponent(id)}`, base);
  const res = await fetch(url.toString());
  if (!res.ok) return { ok: false };
  try {
    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    logger.warn('Failed to parse shape JSON:', e?.message);
    return { ok: false };
  }
}

// Delete shape by ID
export async function deleteShapeById(id, backendBase) {
  const base = getBaseUrl(backendBase);
  const url = new URL(`/v1/shapes/${encodeURIComponent(id)}`, base);
  const res = await fetch(url.toString(), { method: 'DELETE' });
  let bodyText = '';
  try { bodyText = await res.text(); } catch { /* ignore */ }
  return {
    ok: res.ok,
    status: res.status,
    details: `DELETE ${url.toString()}\nStatus: ${res.status}\nBody: ${bodyText}`
  };
}

// Create shape
export async function createShape(shape, backendBase) {
  const base = getBaseUrl(backendBase);
  const url = new URL('/v1/shapes', base);
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(shape)
  });
  return res.ok;
}

// Health check
export async function checkBackendHealth(backendBase) {
  try {
    const base = getBaseUrl(backendBase);
    const healthUrl = new URL('/v1/health', base);
    const response = await fetch(healthUrl.toString(), {
      method: 'GET',
      timeout: 3000 // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    logger.warn('Backend health check failed:', error);
    return false;
  }
}
