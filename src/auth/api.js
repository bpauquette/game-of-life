// src/auth/api.js
const getApiBase = () => process.env.REACT_APP_API_BASE || "http://localhost:55000/auth";

export async function post(path, body) {
  try {
    const res = await fetch(`${getApiBase()}${path}`, {
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
