/* eslint-disable */
// namesWorker.js - module worker for incremental names loading
addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  // Debug: indicate worker received a message
  try {
    console.log('[namesWorker] received message', msg);
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
  const base = (typeof self !== 'undefined' && self.location && self.location.origin)
    ? self.location.origin + '/api'
    : (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ? process.env.REACT_APP_API_BASE : 'http://localhost:55000';
  const q = msg.q || '';
  const limit = Number(msg.limit) || 50;
  let offset = 0;
  while (true) {
    const url = new URL('/v1/shapes/names', base).toString() + '?q=' + encodeURIComponent(q) + '&limit=' + limit + '&offset=' + offset;
    try {
      console.log('[namesWorker] fetching', url);
    } catch (e) {}
    const res = await fetch(url);
    if (!res.ok) { postMessage({ type: 'error', message: 'HTTP ' + res.status }); return; }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    if (items.length > 0) {
      try { console.log('[namesWorker] posting page', { itemsLength: items.length, offset, total }); } catch (e) {}
      postMessage({ type: 'page', items, total, offset });
    }
    offset += items.length;
    if (!items.length || (total && offset >= total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  try { console.log('[namesWorker] done'); } catch (e) {}
  postMessage({ type: 'done' });
}
