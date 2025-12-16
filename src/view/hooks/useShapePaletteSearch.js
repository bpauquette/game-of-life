import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import logger from '../../controller/utils/logger';
import { createNamesWorker, createFauxNamesWorker } from '../../utils/workerFactories';
import { fetchShapeById, deleteShapeById, createShape } from '../../utils/backendApi';

const DEFAULT_LIMIT = 50;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useShapePaletteSearch({ open, backendBase, limit = DEFAULT_LIMIT, prefetchOnMount = false }) {
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
      if (!id) return null;
      // If we already have the shape in results with cells, return it
      const found = resultsRef.current.find(s => s.id === id);
      if (found && hasShapeCells(found)) return found;
      const res = await fetchShapeById(id, backendBase);
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

  const createShapeInBackend = useCallback(async (shape) => {
    try {
      const created = await createShape(shape, backendBase);
      return created;
    } catch (err) {
      logger.error('[useShapePaletteSearch] createShapeInBackend error', err);
      throw err;
    }
  }, [backendBase]);

  const handleWorkerFailure = useCallback((message) => {
    stopWorker();
    setLoading(false);
    setBackendError(message || 'Shapes catalog worker error');
    setShowBackendDialog(true);
  }, [stopWorker]);

  const startWorker = useCallback(() => {
    stopWorker();
    setLoading(true);
    setResults([]);
    setTotal(0);
    const { getBackendApiBase } = require('../../utils/backendApi');
    const base = getBackendApiBase();
    let worker;
    try {
      worker = createNamesWorker(base, '', limit);
    } catch (err) {
      logger.warn('[useShapePaletteSearch] createNamesWorker failed, using faux worker', err);
      worker = createFauxNamesWorker();
    }
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type === 'page') {
        const items = Array.isArray(payload.items) ? payload.items : [];
        setResults(prev => [...prev, ...items]);
        setTotal(prevTotal => (typeof payload.total === 'number' ? payload.total : prevTotal + items.length));
      } else if (payload.type === 'error') {
        handleWorkerFailure(payload.message || 'Shapes catalog error');
      } else if (payload.type === 'done') {
        setLoading(false);
        stopWorker();
      }
    };

    worker.onerror = (err) => {
      logger.warn('[useShapePaletteSearch] worker runtime error', err);
      try {
        const fallback = createFauxNamesWorker();
        workerRef.current = fallback;
        fallback.onmessage = worker.onmessage;
        fallback.onerror = () => handleWorkerFailure('Shapes catalog worker error');
        fallback.onmessageerror = () => handleWorkerFailure('Shapes catalog worker message error');
        fallback.postMessage({ type: 'start', base, q: '', limit });
        return;
      } catch (fallbackErr) {
        logger.error('[useShapePaletteSearch] faux worker creation failed', fallbackErr);
        handleWorkerFailure(err?.message || 'Shapes catalog worker error');
      }
    };

    worker.onmessageerror = () => handleWorkerFailure('Shapes catalog worker message error');

    try {
      worker.postMessage({ type: 'start', base, q: '', limit });
    } catch (postErr) {
      logger.error('[useShapePaletteSearch] worker.postMessage failed', postErr);
      handleWorkerFailure(postErr?.message || 'Shapes catalog worker error');
    }
  }, [limit, handleWorkerFailure, stopWorker]);

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
    deleteShape,
    createShapeInBackend
  };
}
