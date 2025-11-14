import { useState, useEffect, useRef } from 'react';
import logger from '../controller/utils/logger';
import { putItems, getAllItems } from '../view/idbCatalog';
import { fetchShapes, getBaseUrl } from '../utils/backendApi';

// Fetch the full catalog from the backend in paged requests and write to IDB.
export default function useInitialShapeLoader({ strategy = 'background', batchSize = 200, autoStart = true, backendBase } = {}) {
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
      // If IDB is unavailable, getAllItems will reject; handle that gracefully
      let existing = [];
      try {
        existing = await getAllItems();
      } catch (e) {
        logger.debug('useInitialShapeLoader: IndexedDB unavailable or getAllItems failed', e);
        existing = null; // signal unavailable
      }

      // If we already have items in IDB, treat that as ready
      if (Array.isArray(existing) && existing.length > 0) {
        setProgress({ done: existing.length, total: existing.length });
        try { if (typeof globalThis !== 'undefined') globalThis.__GOL_SHAPES_CACHE__ = existing; } catch (e) {}
        setReady(true);
        setLoading(false);
        return;
      }

      // Always fetch the full catalog from backend (one-time startup behavior)
      const base = getBaseUrl(backendBase);
      const page = batchSize || 200;
      let offset = 0;
      let all = [];

      while (!aborted.current) {
        const out = await fetchShapes(base, '', page, offset);
        if (!out.ok) {
          throw new Error(`Failed to fetch shapes: status ${out.status}`);
        }
        const items = out.items || [];
        const total = out.total || 0;
        if (offset === 0) setProgress({ done: 0, total: total });
        if (!items.length) break;
        all = all.concat(items);
        // write batches to IDB as we go to avoid holding everything in memory
        try {
          await putItems(items, { batchSize: items.length, progressCb: ({ done }) => {
            // approximate cumulative done
            setProgress({ done: Math.min(total, all.length), total });
          }});
        } catch (err) {
          logger.error('useInitialShapeLoader: failed to put batch into IDB', err);
          throw err;
        }
        offset += items.length;
        if (all.length >= total) break;
        // yield to browser so paint can happen
        await new Promise((resolve) => {
          if (typeof requestIdleCallback === 'function') return requestIdleCallback(resolve);
          return setTimeout(resolve, 0);
        });
      }

      if (!aborted.current) {
        setProgress({ done: all.length, total: all.length });
        try { if (typeof globalThis !== 'undefined') globalThis.__GOL_SHAPES_CACHE__ = all; } catch (e) {}
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
      // start fetching from backend at startup
      start();
    }
    return () => { aborted.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, progress, error, ready, start };
}
