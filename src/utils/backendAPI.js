// Centralized backend API helpers for Game of Life frontend
import logger from '../controller/utils/logger';
export function resolveBackendBase() {
  const envBase = process.env.REACT_APP_BACKEND_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) return envBase;
  const { protocol, hostname } = globalThis.window?.location || { protocol: 'http:', hostname: 'localhost' };
  const port = process.env.REACT_APP_BACKEND_PORT || '55000';
  return `${protocol}//${hostname}:${port}`;
}

export async function saveCapturedShapeToBackend(shapeData) {
  const shapeForBackend = {
    ...shapeData,
    cells: shapeData.pattern,
    meta: { capturedAt: new Date().toISOString(), source: 'capture-tool' }
  };
  delete shapeForBackend.pattern;
  const response = await fetch(`${resolveBackendBase()}/v1/shapes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shapeForBackend)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
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
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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


export function resolveBackendBase() {
  const envBase = process.env.REACT_APP_BACKEND_BASE;
  if (envBase && typeof envBase === 'string' && envBase.trim().length > 0) return envBase;
  const { protocol, hostname } = globalThis.window?.location || { protocol: 'http:', hostname: 'localhost' };
  const port = process.env.REACT_APP_BACKEND_PORT || '55000';
  return `${protocol}//${hostname}:${port}`;
}

export async function saveCapturedShapeToBackend(shapeData) {
  const shapeForBackend = {
    ...shapeData,
    cells: shapeData.pattern,
    meta: { capturedAt: new Date().toISOString(), source: 'capture-tool' }
  };
  delete shapeForBackend.pattern;
  const response = await fetch(`${resolveBackendBase()}/v1/shapes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shapeForBackend)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}
