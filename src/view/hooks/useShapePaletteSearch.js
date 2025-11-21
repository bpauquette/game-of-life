import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import logger from '../../controller/utils/logger';
import { getBaseUrl } from '../../utils/backendApi';
import { createNamesWorker, createFauxNamesWorker } from '../../utils/workerFactories';

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
    const base = getBaseUrl(backendBase);
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
  }, [backendBase, limit, handleWorkerFailure, stopWorker]);

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
    retry: startWorker
  };
}
