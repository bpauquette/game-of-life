/* eslint-disable */
// namesWorker.js - module worker for incremental names loading
// Hardcode API base to always use proxy
const API_BASE = '/api';

addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  // Debug: indicate worker received a message
  try {
  } catch (e) {
    // ignore logging errors
  }
  if (!msg) return;
  if (msg.type === 'start') {
    await runNamesWorkerLoop(msg).catch(err => {
      try { console.error('[namesWorker] run loop error', err); } catch (e) {}
      postMessage({ type: 'error', message: String(err) });
    });
  }
});

async function runNamesWorkerLoop(msg) {
  const base = API_BASE;
  const q = msg.q || '';
  const limit = Number(msg.limit) || 50;
  let offset = 0;
  while (true) {
    const url = `${base}/v1/shapes/names?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
    try {
    } catch (e) {}
    const res = await fetch(url);
    if (!res.ok) { postMessage({ type: 'error', message: 'HTTP ' + res.status }); return; }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    if (items.length > 0) {
      postMessage({ type: 'page', items, total, offset });
    }
    offset += items.length;
    if (!items.length || (total && offset >= total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  postMessage({ type: 'done' });
}
