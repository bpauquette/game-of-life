/* namesWorker served from public/ - simple module worker
   This file is copied to public so dev servers serve it with application/javascript
*/
/* eslint-disable */
addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  try { console.log('[public namesWorker] received message', msg); } catch (e) {}
  if (!msg) return;
  if (msg.type === 'start') {
    await runNamesWorkerLoop(msg).catch(err => {
      try { console.error('[public namesWorker] run loop error', err); } catch (e) {}
      postMessage({ type: 'error', message: String(err) });
    });
  }
});

async function runNamesWorkerLoop(msg) {
  const base = msg.base;
  const q = msg.q || '';
  const limit = Number(msg.limit) || 50;
  let offset = 0;
  while (true) {
    const url = new URL('/v1/shapes/names', base).toString() + '?q=' + encodeURIComponent(q) + '&limit=' + limit + '&offset=' + offset;
    try { console.log('[public namesWorker] fetching', url); } catch (e) {}
    const res = await fetch(url);
    if (!res.ok) { postMessage({ type: 'error', message: 'HTTP ' + res.status }); return; }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total) || 0;
    if (items.length > 0) {
      try { console.log('[public namesWorker] posting page', { itemsLength: items.length, offset, total }); } catch (e) {}
      postMessage({ type: 'page', items, total, offset });
    }
    offset += items.length;
    if (!items.length || (total && offset >= total)) break;
    await new Promise(r => setTimeout(r, 30));
  }
  try { console.log('[public namesWorker] done'); } catch (e) {}
  postMessage({ type: 'done' });
}
