// Update shape public/private status
import logger from '../controller/utils/logger.js';
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
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.REACT_APP_API_BASE) {
    return import.meta.env.REACT_APP_API_BASE;
  }
  if (typeof globalThis !== 'undefined' && globalThis.env?.REACT_APP_API_BASE) {
    return globalThis.env.REACT_APP_API_BASE;
  }
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
export async function fetchShapes(q) {
  const url = `${getBackendApiBase()}/v1/shapes?q=${encodeURIComponent(q)}`;
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
export async function fetchShapeNames(q = '', signal = null) {
     
  try {
    const url = `${getBackendApiBase()}/v1/shapes/names?q=${encodeURIComponent(q || '')}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return { ok: false, items: [], total: 0 };
    const items = await res.json().catch(() => []);
    return { ok: true, items, total: items.length };
  } catch (err) {
    logger.warn('fetchShapeNames failed:', err);
    return { ok: false, items: [], total: 0 };
  }
}

// Fetch shape by ID
export async function fetchShapeById(id) {
     
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
export async function deleteShapeById(id) {
  const url = `${getBackendApiBase()}/v1/shapes/${encodeURIComponent(id)}`;
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
export async function createShape(shape) {
     
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
