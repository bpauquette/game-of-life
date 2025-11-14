import { useState, useEffect, useRef } from 'react';
import logger from '../controller/utils/logger';
import { putItems, getAllItems } from '../view/idbCatalog';
import { shapes as bundledShapes } from '../model/shapes';

function toShapeArray(shapesObj) {
  // Convert the shapes map into an array of shape objects suitable for IDB
  return Object.keys(shapesObj || {}).map((key) => {
    const pattern = shapesObj[key];
    const cells = Array.isArray(pattern) ? pattern.map(([x, y]) => ({ x, y })) : [];
    return {
      id: key,
      name: key,
      cells,
      meta: { source: 'bundled', originalKey: key, cellCount: cells.length }
    };
  });
}

export default function useInitialShapeLoader({ strategy = 'background', batchSize = 200, autoStart = true } = {}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const aborted = useRef(false);

  const start = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      // If IDB is unavailable, getAllItems will reject; handle that gracefully
      let existing = [];
      try {
        existing = await getAllItems();
      } catch (e) {
        logger.debug('useInitialShapeLoader: IndexedDB unavailable or getAllItems failed', e);
        existing = null; // signal unavailable
      }

      if (Array.isArray(existing) && existing.length > 0) {
        // Nothing to do
        setProgress({ done: existing.length, total: existing.length });
        setLoading(false);
        return;
      }

      // Prepare shapes from bundled source for insertion
      const shapesArr = toShapeArray(bundledShapes);
      // Expose an in-memory cache for fast sync access by UI components
      try {
        if (typeof globalThis !== 'undefined') {
          globalThis.__GOL_SHAPES_CACHE__ = shapesArr;
        }
      } catch (e) {
        logger.debug('Failed to set global shapes cache', e);
      }
      setProgress({ done: 0, total: shapesArr.length });

      // Insert in batches using requestIdleCallback when available to avoid UI jank
      for (let i = 0; i < shapesArr.length && !aborted.current; i += batchSize) {
        const batch = shapesArr.slice(i, i + batchSize);
        try {
          await putItems(batch, { batchSize: batch.length, progressCb: ({ done }) => {
            // putItems reports cumulative done; we'll compute based on i
            const cumulative = Math.min(shapesArr.length, i + done);
            setProgress({ done: cumulative, total: shapesArr.length });
          }});
        } catch (err) {
          logger.error('useInitialShapeLoader: failed to put batch into IDB', err);
          throw err;
        }

        // yield to browser so paint can happen
        await new Promise((resolve) => {
          if (typeof requestIdleCallback === 'function') return requestIdleCallback(resolve);
          return setTimeout(resolve, 0);
        });
      }

      if (!aborted.current) {
        setProgress({ done: shapesArr.length, total: shapesArr.length });
        try {
          if (typeof globalThis !== 'undefined') {
            globalThis.__GOL_SHAPES_CACHE__ = shapesArr;
          }
        } catch (e) {
          logger.debug('Failed to set global shapes cache after insert', e);
        }
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
      // background strategy means we don't block anything; just start
      start();
    }
    return () => { aborted.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, progress, error, start };
}
