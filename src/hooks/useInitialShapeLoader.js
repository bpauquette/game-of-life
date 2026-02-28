
import { useState, useEffect, useRef } from 'react';
import logger from '../controller/utils/logger.js';
import { fetchShapes, getBackendApiBase } from '../utils/backendApi.js';

// helper: yield to browser to allow paints
function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Fetch the full catalog from the backend in paged requests and write to IDB.

// Move fetchAllPages to outer scope
async function fetchAllPages(base, pageSize, abortedRef, progressCb) {
  let page = 1;
  const all = [];
  const normalizedPageSize = Math.max(1, Number(pageSize) || 200);
  while (!abortedRef.current) {
    // fetchShapes signature: fetchShapes(q, backendBase, page, pageSize)
    const out = await fetchShapes('', base, page, normalizedPageSize);
    if (!out.ok) throw new Error(`Failed to fetch shapes: status ${out.status}`);
    const items = out.items || [];
    const total = out.total || 0;
    if (page === 1 && typeof progressCb === 'function') progressCb({ done: 0, total });
    if (!items.length) break;
    all.push(...items);
    if (typeof progressCb === 'function') progressCb({ done: all.length, total: total || all.length });
    if (all.length >= total && total > 0) break;
    if (items.length < normalizedPageSize) break;
    page += 1;
    await yieldToBrowser();
  }
  return all;
}


function dedupeItems(all) {
  const seen = new Set();
  const deduped = [];
  for (let i = 0; i < (all || []).length; i++) {
    const s = all[i];
    let key = '';
    if (s?.id) key = `id:${s.id}`;
    else if (s) {
      const name = s.name || s.meta?.name || '';
      const cells = s.cells || s.pattern || s.liveCells || [];
      const len = Array.isArray(cells) ? cells.length : 0;
      const first = len > 0 ? cells[0] : null;
      const last = len > 1 ? cells[len - 1] : null;
      const firstX = Array.isArray(first) ? first[0] : first?.x;
      const firstY = Array.isArray(first) ? first[1] : first?.y;
      const lastX = Array.isArray(last) ? last[0] : last?.x;
      const lastY = Array.isArray(last) ? last[1] : last?.y;
      key = `nm:${name}#len:${len}#f:${firstX ?? ''},${firstY ?? ''}#l:${lastX ?? ''},${lastY ?? ''}`;
    }
    if (!seen.has(key)) { seen.add(key); deduped.push(s); }
  }
  return deduped;
}

export default function useInitialShapeLoader({ batchSize = 200, autoStart = false } = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const aborted = useRef(false);

  const start = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    setReady(false);
    try {
      // Ignore backendBase, always use getBackendApiBase
      const base = getBackendApiBase();
      const pageSize = batchSize || 200;
      const all = await fetchAllPages(base, pageSize, aborted, setProgress);
      if (!aborted.current) {
        const deduped = dedupeItems(all);
        setProgress({ done: deduped.length, total: deduped.length });
        // Do not keep an in-memory global cache here; the app should always
        // fetch the catalog from the backend when needed.
        setReady(true);
      }
    } catch (err) {
      logger.error('useInitialShapeLoader: initial load failed', err);
      setError(err);
    } finally {
      if (!aborted.current) setLoading(false);
    }
  };

  useEffect(() => {
    aborted.current = false;
    if (autoStart) {
      // start fetching from backend (only when explicitly requested via autoStart)
      start();
    }
    return () => { aborted.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return { loading, progress, error, ready, start };
}
