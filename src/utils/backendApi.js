// src/utils/backendApi.js
// Centralized backend API helper for shapes catalog

import logger from '../controller/utils/logger';

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
