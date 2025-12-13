// src/auth/api.js
// Compute the base URL for auth endpoints.
// In Docker, REACT_APP_API_BASE is typically the backend origin
// (e.g. http://localhost:55000); we normalize it to include /auth.
import { getBackendApiBase } from '../utils/backendApi';
export function getAuthApiBase() {
  const base = getBackendApiBase();
  return base.endsWith('/api') ? base + '/auth' : base + '/api/auth';
}

export async function post(path, body) {
  try {
    const res = await fetch(`${getAuthApiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.error === 'Invalid or expired token') {
      // Trigger logout via window event or callback
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return data;
  } catch (error) {
    console.error('API request failed:', error.message);
    throw error;
  }
}

export async function checkEmail(email) {
  return post("/check-email", { email });
}
