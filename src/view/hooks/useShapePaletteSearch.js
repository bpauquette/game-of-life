import { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import logger from '../../controller/utils/logger.js';
import { fetchShapeById, deleteShapeById, getBackendApiBase, fetchShapeNames } from '../../utils/backendApi.js';

const DEFAULT_LIMIT = 50; // Default limit for pagination

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useShapePaletteSearch({ open, backendBase, limit = DEFAULT_LIMIT, page = 0, prefetchOnMount = false }) {
  const [inputValue, setInputValue] = useState('');
  const debouncedFilter = useDebouncedValue(inputValue || '', 200);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [showBackendDialog, setShowBackendDialog] = useState(false);
  const workerRef = useRef(null);
  const resultsRef = useRef(results);

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        workerRef.current.terminate();
      } catch (e) {
        logger.warn('[useShapePaletteSearch] worker terminate failed', e);
      }
      workerRef.current = null;
    }
  }, []);

  // keep a stable ref of results for async helpers
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const hasShapeCells = useCallback((shape) => {
    if (!shape) return false;
    const has = (cells) => Array.isArray(cells) && cells.length > 0;
    return has(shape.cells) || has(shape.pattern) || has(shape.liveCells);
  }, []);

  const hydrateShape = useCallback(async (shapeOrId) => {
    try {
      const id = typeof shapeOrId === 'string' || typeof shapeOrId === 'number' ? shapeOrId : shapeOrId?.id;
      logger.debug('[useShapePaletteSearch] hydrateShape called', { id, backendBase });
      if (!id) return null;
      // If we already have the shape in results with cells, return it
      const found = resultsRef.current.find(s => s.id === id);
      if (found && hasShapeCells(found)) {
        logger.debug('[useShapePaletteSearch] hydrateShape: found in results with cells', { id });
        return found;
      }
      const res = await fetchShapeById(id, backendBase);
      logger.debug('[useShapePaletteSearch] hydrateShape: fetch result', { id, ok: !!res?.ok, hasData: !!res?.data, cellsLen: Array.isArray(res?.data?.cells) ? res.data.cells.length : null });
      if (res?.ok && res.data && hasShapeCells(res.data)) return res.data;
      return null;
    } catch (err) {
      logger.warn('[useShapePaletteSearch] hydrateShape failed', err);
      return null;
    }
  }, [backendBase, hasShapeCells]);

  const deleteShape = useCallback(async (id) => {
    if (!id) throw new Error('missing id');
    const snapshot = resultsRef.current.slice();
    // optimistic removal
    setResults(prev => prev.filter(r => r.id !== id));
    try {
      const outcome = await deleteShapeById(id, backendBase);
      if (!outcome || !outcome.ok) {
        // restore
        setResults(snapshot);
        throw new Error(outcome?.details || 'delete failed');
      }
      return outcome;
    } catch (err) {
      setResults(snapshot);
      logger.warn('[useShapePaletteSearch] deleteShape error', err);
      throw err;
    }
  }, [backendBase]);

  const startWorker = useCallback(() => {
    stopWorker();
    setLoading(true);

    const base = (typeof backendBase === 'string' && backendBase.trim().length) ? backendBase : getBackendApiBase();
    const offsetStart = Math.max(0, page) * limit;
    const query = (debouncedFilter || '').trim();

    // Fetch the current page directly (first 50) to avoid worker issues
    (async () => {
      try {
        const pageResult = await fetchShapeNames(base, query, limit, offsetStart);
        if (pageResult && pageResult.ok) {
          const items = Array.isArray(pageResult.items) ? pageResult.items : [];
          logger.debug('[useShapePaletteSearch] fetched names page', { itemsLen: items.length, total: pageResult.total, offsetStart, query });
          startTransition(() => {
            setResults(items);
            setTotal(Number(pageResult.total) || items.length);
            setLoading(false);
          });
        } else {
          throw new Error('Shapes catalog error');
        }
      } catch (err) {
        logger.warn('[useShapePaletteSearch] direct fetch failed', err);
        startTransition(() => {
          setBackendError('Shapes catalog error');
          setShowBackendDialog(true);
          setLoading(false);
        });
      }
    })();
  }, [backendBase, debouncedFilter, limit, page, stopWorker]);

  const shouldStartWorker = open || prefetchOnMount;

  useEffect(() => {
    if (!shouldStartWorker) {
      stopWorker();
      setInputValue('');
      setResults([]);
      setTotal(0);
      setLoading(false);
      setBackendError('');
      setShowBackendDialog(false);
      return undefined;
    }
    startWorker();
    return () => {
      if (!prefetchOnMount) {
        stopWorker();
      }
    };
  }, [shouldStartWorker, backendBase, startWorker, stopWorker, prefetchOnMount]);

  const displayedResults = useMemo(() => {
    if (!debouncedFilter.trim()) return results;
    const query = debouncedFilter.trim().toLowerCase();
    return results.filter(item => (item?.name || '').toLowerCase().includes(query));
  }, [results, debouncedFilter]);

  return {
    inputValue,
    setInputValue,
    results,
    setResults,
    displayedResults,
    loading,
    total,
    backendError,
    setBackendError,
    showBackendDialog,
    setShowBackendDialog,
    retry: startWorker,
    hydrateShape,
    deleteShape
  };
}
