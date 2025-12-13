import logger from '../controller/utils/logger';

export function getBackendApiBase() {
    // Log the computed API base for debugging
    if (typeof window !== 'undefined' && window.location) {
    } else if (typeof process !== 'undefined' && process.env) {
    }
  // If REACT_APP_API_BASE is set, use it (for test or explicit override)
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }
  // Always append /api to window.location.origin in the browser
  if (typeof window !== 'undefined' && window.location) {
    let base = window.location.origin;
    // Avoid double /api if already present
    if (!base.endsWith('/api')) base += '/api';
    return base;
  }
  // Fallback for non-browser/test
  return 'http://localhost:55000/api';
}

function getAuthToken() {
  return sessionStorage.getItem('authToken');
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
    const base = getBackendApiBase();
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
  const response = await fetch(`${getBackendApiBase()}/v1/shapes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(shapeForBackend)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 409 && errorData.duplicate) {
      // Special handling for duplicates - throw an Error instance with metadata
      const err = new Error('Conflict: duplicate shape');
      err.duplicate = true;
      err.existingShape = errorData.existingShape;
      throw err;
    }
    if (errorData.error === 'Invalid or expired token') {
      if (typeof logout === 'function') logout();
      throw new Error('Please log in again to save shapes');
    }
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// Fetch shapes list
export async function fetchShapes(base, q, limit, offset) {
  const url = `${getBackendApiBase()}/v1/shapes?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
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
    // eslint-disable-next-line no-console
  try {
    const url = `${getBackendApiBase()}/v1/shapes/names?q=${encodeURIComponent(q || '')}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
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
    // eslint-disable-next-line no-console
  const url = `${getBackendApiBase()}/v1/shapes/${encodeURIComponent(id)}`;
  const res = await fetch(url);
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
  const url = `${getBackendApiBase()}/v1/shapes/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'DELETE' });
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
    // eslint-disable-next-line no-console
  const url = `${getBackendApiBase()}/v1/shapes`;
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(shape)
  });
  return res.ok;
}

// Health check
export async function checkBackendHealth(backendBase) {
    // eslint-disable-next-line no-console
  try {
    // Always use getBackendApiBase (hardcoded for container)
    const base = getBackendApiBase();
    const healthUrl = base.replace(/\/$/, '') + '/v1/health';
    // Debug log: print the URL being used
    // eslint-disable-next-line no-console
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 3000 // 3 second timeout
    });
    // Debug log: print status
    // eslint-disable-next-line no-console
    return response.ok;
  } catch (error) {
    // Debug log: print error
    // eslint-disable-next-line no-console
    console.error('[checkBackendHealth] Error:', error);
    logger.warn('Backend health check failed:', error);
    return false;
  }
}
