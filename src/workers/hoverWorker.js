/* eslint-disable no-console */
// hoverWorker.js - module worker to fetch a single shape preview
// Keep a single active request and support aborting when a new start arrives.
let currentId = null;
let currentAbort = null;

addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  if (!msg) return;
  if (msg.type === 'stop') {
    currentId = null;
    if (currentAbort) try { currentAbort.abort(); } catch (_) {}
    currentAbort = null;
    return;
  }
  if (msg.type === 'start') {
    const id = msg.id;
    // If we're already fetching this id, ignore duplicate start
    if (currentId === id) return;
    currentId = id;
    if (currentAbort) try { currentAbort.abort(); } catch (_) {}
    currentAbort = new AbortController();
    const url = new URL('/v1/shapes/' + encodeURIComponent(id), msg.base).toString();
    try {
      const res = await fetch(url, { signal: currentAbort.signal });
      if (!res.ok) { if (currentId === id) postMessage({ type: 'error', message: 'HTTP ' + res.status }); return; }
      const data = await res.json().catch(() => ({}));
      if (currentId !== id) return; // stale
      const s = data || {};
      const desc = s.description || s.meta?.description || s.meta?.desc || '';
      const cells = Array.isArray(s.cells) ? s.cells : (Array.isArray(s.pattern) ? s.pattern : (Array.isArray(s.liveCells) ? s.liveCells : []));
      postMessage({ type: 'preview', data: { id: s.id, name: s.name || s.meta?.name || '(unnamed)', description: desc, cells } });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (currentId === id) postMessage({ type: 'error', message: String(err) });
    }
  }
});
