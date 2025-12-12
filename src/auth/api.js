// src/auth/api.js
// Compute the base URL for auth endpoints.
// In Docker, REACT_APP_API_BASE is typically the backend origin
// (e.g. http://localhost:55000); we normalize it to include /auth.
export function getAuthApiBase() {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin + '/api/auth';
  }
  const raw = process.env.REACT_APP_API_BASE;
  if (raw) return raw.endsWith('/auth') ? raw : raw.replace(/\/?$/, '/auth');
  return 'http://localhost:55000/auth';
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
