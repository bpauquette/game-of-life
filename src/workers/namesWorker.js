 
// namesWorker.js - module worker for incremental names loading
// Allow caller to provide API base; default heuristics route localhost:3000 to backend on 55000

function resolveApiBase(msgBase) {
  if (typeof msgBase === 'string' && msgBase.trim().length) {
    return msgBase.replace(/\/$/, '');
  }
  // When served by CRA on 3000, talk to backend on 55000 to avoid 404s on the dev server
  if (typeof self !== 'undefined' && self.location?.host === 'localhost:3000') {
    return 'http://localhost:55000';
  }
  if (typeof self !== 'undefined' && self.location?.origin) {
    return `${self.location.origin}/api`;
  }
  return '/api';
}

addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  // Debug: indicate worker received a message
  try {
    // no-op for now
  } catch (e) {
    // ignore logging errors
    console.warn('Exception caught in namesWorker (debug):', e);
  }
  if (!msg) return;
  if (msg.type === 'start') {
    await runNamesWorkerLoop(msg).catch(err => {
      try { console.error('[namesWorker] run loop error', err); } catch (e) { console.warn('Exception caught in namesWorker (console.error):', e); }
      postMessage({ type: 'error', message: String(err) });
    });
  }
});

async function runNamesWorkerLoop(msg) {
  const base = resolveApiBase(msg.base);
  const q = msg.q || '';
  const limit = Number(msg.limit) || 50;
  let offset = Math.max(0, Number(msg.offsetStart) || 0);
  const stopAfterFirstPage = !!msg.stopAfterFirstPage;
  while (true) {
    const url = `${base}/v1/shapes/names?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
    try {
      // no-op for now
    } catch (e) {
      console.warn('Exception caught in runNamesWorkerLoop (debug):', e);
    }
    const res = await fetch(url);
    if (!res.ok) { postMessage({ type: 'error', message: 'HTTP ' + res.status }); return; }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    if (items.length > 0) {
      postMessage({ type: 'page', items, total, offset });
    }
    offset += items.length;
    if (stopAfterFirstPage) break;
    if (!items.length || (total && offset >= total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  postMessage({ type: 'done' });
}
