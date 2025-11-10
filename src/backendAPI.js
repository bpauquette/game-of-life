// Centralized backend API helpers for Game of Life frontend

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
