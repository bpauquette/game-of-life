// src/auth/api.js
// Compute the base URL for auth endpoints.
// In Docker, REACT_APP_API_BASE is typically the backend origin
// (e.g. http://localhost:55000); we normalize it to include /auth.
import { getBackendApiBase } from '../utils/backendApi.js';
export function getAuthApiBase() {
  const base = getBackendApiBase();
  return base.endsWith('/api') ? base + '/auth' : base + '/api/auth';
}

export async function post(path, body) {
  try {
    const headers = { "Content-Type": "application/json" };
    // Propagate existing X-Request-Id if present on globalThis for end-to-end correlation
    const existingReqId = (typeof globalThis !== 'undefined' && globalThis.__REQUEST_ID__) ? globalThis.__REQUEST_ID__ : null;
    if (existingReqId) headers['X-Request-Id'] = existingReqId;

    const res = await fetch(`${getAuthApiBase()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // ignore JSON parse errors; we'll still throw below with status
    }
    if (!res.ok) {
      const serverMsg = data && data.error ? data.error : (data && typeof data === 'string' ? data : res.statusText || `HTTP ${res.status}`);
      const err = new Error(`HTTP ${res.status}: ${serverMsg}`);
      err.status = res.status;
      err.body = data;
      console.error('API request failed:', err.message, err.body);
      throw err;
    }
    const parsed = data || {};
    if (data.error === 'Invalid or expired token') {
      // Trigger logout via globalThis event or callback (guard for non-browser envs)
      if (typeof globalThis !== 'undefined' && typeof globalThis.dispatchEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    return parsed;
  } catch (error) {
    console.error('API request failed:', error.message);
    throw error;
  }
}

export async function checkEmail(email) {
  return post("/check-email", { email });
}
