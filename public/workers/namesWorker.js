/* namesWorker served from public/ - simple module worker
   This file is copied to public so dev servers serve it with application/javascript
*/
 
console.log('[namesWorker] Initialized');
addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  console.log('[namesWorker] Received message:', msg);
  if (!msg) return;
  if (msg.type === 'start') {
    console.log('[namesWorker] Starting worker loop with message:', msg);
    await runNamesWorkerLoop(msg).catch(err => {
      console.error('[namesWorker] run loop error', err);
      postMessage({ type: 'error', message: String(err) });
    });
  }
});

async function runNamesWorkerLoop(msg) {
  const q = msg.q || '';
  const limit = Number(msg.limit) || 50;
  let offset = 0;
  while (true) {
    const url = `/api/v1/shapes/names?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
    console.log('[namesWorker] Fetching:', url);
    const res = await fetch(url);
    if (!res.ok) { 
      console.error('[namesWorker] Fetch error: HTTP ' + res.status);
      postMessage({ type: 'error', message: 'HTTP ' + res.status }); 
      return; 
    }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    if (items.length > 0) {
      console.log('[namesWorker] Posting page', { itemsLength: items.length, offset, total });
      postMessage({ type: 'page', items, total, offset });
    }
    offset += items.length;
    if (!items.length || (total && offset >= total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  console.log('[namesWorker] done');
  postMessage({ type: 'done' });
}
