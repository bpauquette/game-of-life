// Update shape public/private status
import logger from '../controller/utils/logger.js';
import { getEnvValue } from './runtimeEnv.js';
export async function updateShapePublic(id, isPublic) {
  const url = `${getBackendApiBase()}/v1/shapes/${encodeURIComponent(id)}/public`;
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ public: !!isPublic })
  });
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch (e) { /* ignore error */ }
    throw new Error(`Failed to update shape public status: ${res.status} ${msg}`);
  }
  return await res.json();
}


export function getBackendApiBase() {
  const envBase = getEnvValue('REACT_APP_API_BASE');
  if (typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, '');
  }
  // Dev heuristic: when running CRA on localhost:3000 with no env override,
  // talk directly to the backend on port 55000 (no /api prefix — the backend
  // routes are rooted at /v1 and /auth).
  if (typeof globalThis !== 'undefined' && globalThis.location?.host === 'localhost:3000') {
    return 'http://localhost:55000';
  }
  // Default: assume backend is mounted under /api behind a reverse proxy.
  if (typeof globalThis !== 'undefined' && globalThis.location?.origin) {
    return `${globalThis.location.origin}/api`;
  }
  return '/api';
}

function getAuthToken() {
  return sessionStorage.getItem('authToken');
}



function buildShapeForBackend(shapeData) {
  return {
    name: shapeData.name,
    cells: Array.isArray(shapeData.pattern) ? shapeData.pattern : [],
    width: shapeData.width,
    height: shapeData.height,
    rule: shapeData.rule,
    public: shapeData.public,
    createdAt: shapeData.createdAt,
    updatedAt: shapeData.updatedAt,
    ...(shapeData.userId ? { userId: shapeData.userId } : {}),
    ...(shapeData.userEmail ? { userEmail: shapeData.userEmail } : {})
  };
}

async function checkDuplicateShapeName(shapeForBackend) {
  const base = getBackendApiBase();
  const nameToCheck = (shapeForBackend.name || '').trim();
  if (nameToCheck.length === 0) return;
  const nameRes = await fetchShapeNames(base, nameToCheck, 1, 0);
  if (nameRes.ok && Array.isArray(nameRes.items) && nameRes.items.length > 0) {
    const exists = nameRes.items.some(it => (it.name||'').toLowerCase() === nameToCheck.toLowerCase());
    if (exists) {
      throw new Error(`DUPLICATE_NAME:${nameToCheck}`);
    }
  }
}

function handleSaveError(response, errorData, logout) {
  if (response.status === 409 && errorData.duplicate) {
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

export async function saveCapturedShapeToBackend(shapeData, logout) {
  const shapeForBackend = buildShapeForBackend(shapeData);
  try {
    await checkDuplicateShapeName(shapeForBackend);
  } catch (e) {
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
    handleSaveError(response, errorData, logout);
  }
  return await response.json();
}

// Fetch shapes list
export async function fetchShapes(q, backendBase = null, page = 1, pageSize = 100) {
  const base = (typeof backendBase === 'string' && backendBase.trim().length) ? backendBase : getBackendApiBase();
  const params = new URLSearchParams();
  if (q) params.set('searchTerm', q);
  params.set('page', page);
  params.set('pageSize', pageSize);
  const url = `${base}/v1/shapes?${params.toString()}`;
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
// Support legacy signature (q, signal) and new signature (base, q, limit, offset, signal).
export async function fetchShapeNames(baseOrQ = '', qMaybe = '', limitMaybe = 50, offsetMaybe = 0, signalMaybe = null) {
  const usingOldSignature = typeof qMaybe === 'object' || (typeof limitMaybe === 'undefined' && typeof offsetMaybe === 'undefined');
  const q = usingOldSignature ? baseOrQ : qMaybe;
  const base = usingOldSignature ? null : baseOrQ;
  const limit = Number(usingOldSignature ? 50 : limitMaybe) || 50;
  const offset = Number(usingOldSignature ? 0 : offsetMaybe) || 0;
  const signal = usingOldSignature ? (qMaybe || null) : signalMaybe;

  try {
    const apiBase = (typeof base === 'string' && base.trim().length) ? base : getBackendApiBase();
    const params = new URLSearchParams();
    params.set('q', q || '');
    params.set('limit', limit);
    params.set('offset', offset);
    const url = `${apiBase}/v1/shapes/names?${params.toString()}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return { ok: false, items: [], total: 0 };
    const data = await res.json().catch(() => null);
    let items = [];
    let totalCount = 0;
    if (Array.isArray(data)) {
      items = data;
      totalCount = data.length;
    } else if (data && Array.isArray(data.items)) {
      items = data.items;
      totalCount = Number(data.total) || data.items.length;
    }
    return { ok: true, items, total: totalCount };
  } catch (err) {
    logger.warn('fetchShapeNames failed:', err);
    return { ok: false, items: [], total: 0 };
  }
}

// Fetch shape by ID
export async function fetchShapeById(id, backendBase = null) {
  const base = (typeof backendBase === 'string' && backendBase.trim().length) ? backendBase : getBackendApiBase();
  const url = `${base}/v1/shapes/${encodeURIComponent(id)}`;
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
export async function deleteShapeById(id, backendBase = null) {
  const base = (typeof backendBase === 'string' && backendBase.trim().length) ? backendBase : getBackendApiBase();
  const url = `${base}/v1/shapes/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'DELETE' });
  let bodyText = '';
  try { bodyText = await res.text(); } catch (e) { /* ignore error */ }
  return {
    ok: res.ok,
    status: res.status,
    details: `DELETE ${url.toString()}\nStatus: ${res.status}\nBody: ${bodyText}`
  };
}

// Create shape
export async function createShape(shape, backendBase = null) {
  const base = (typeof backendBase === 'string' && backendBase.trim().length) ? backendBase : getBackendApiBase();
  const url = `${base}/v1/shapes`;
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
export async function checkBackendHealth() {
     
  try {
    // Always use getBackendApiBase (hardcoded for container)
    const base = getBackendApiBase();
    const healthUrl = base.replace(/\/$/, '') + '/v1/health';
    // Debug log: print the URL being used
     
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 3000 // 3 second timeout
    });
    // Debug log: print status
     
    return response.ok;
  } catch (error) {
    // Debug log: print error
     
    console.error('[checkBackendHealth] Error:', error);
    logger.warn('Backend health check failed:', error);
    return false;
  }
}
