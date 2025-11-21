import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '../../controller/utils/logger';
import { getBaseUrl } from '../../utils/backendApi';
import { createHoverWorker } from '../../utils/workerFactories';

function normalizePreview(shape) {
  if (!shape) return null;
  const description = shape.description || shape.meta?.description || shape.meta?.desc || '';
  const name = shape.name || shape.meta?.name || '(unnamed)';
  const cells = Array.isArray(shape.cells)
    ? shape.cells
    : (Array.isArray(shape.pattern)
      ? shape.pattern
      : (Array.isArray(shape.liveCells) ? shape.liveCells : []));
  return { id: shape.id, name, description, cells };
}

export function useHoverPreview(backendBase) {
  const [preview, setPreview] = useState(null);
  const workerRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef(new Map());

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      try { workerRef.current.terminate(); } catch (e) {}
      workerRef.current = null;
    }
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  const fetchDirect = useCallback(async (id) => {
    if (!id) return;
    if (cacheRef.current.has(id)) {
      setPreview(cacheRef.current.get(id));
      return;
    }
    try {
      const res = await fetch(`${getBaseUrl(backendBase)}/v1/shapes/${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = await res.json();
      const normalized = normalizePreview(data);
      cacheRef.current.set(id, normalized);
      setPreview(normalized);
    } catch (err) {
      logger.warn('[useHoverPreview] direct fetch failed', err);
    }
  }, [backendBase]);

  const ensureWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = createHoverWorker(getBaseUrl(backendBase));
    }
    return workerRef.current;
  }, [backendBase]);

  const startWorker = useCallback((id) => {
    if (!id) return;
    if (cacheRef.current.has(id)) {
      setPreview(cacheRef.current.get(id));
      return;
    }
    const worker = ensureWorker();
    worker.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type === 'preview') {
        const normalized = normalizePreview(payload.data);
        cacheRef.current.set(id, normalized);
        setPreview(normalized);
      } else if (payload.type === 'error') {
        fetchDirect(id);
      }
    };
    worker.onerror = () => fetchDirect(id);
    worker.onmessageerror = () => fetchDirect(id);
    try {
      worker.postMessage({ type: 'start', id, base: getBaseUrl(backendBase) });
    } catch (err) {
      logger.warn('[useHoverPreview] worker.postMessage failed', err);
      fetchDirect(id);
    }
  }, [backendBase, ensureWorker, fetchDirect]);

  const handleHover = useCallback((id) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!id) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(() => startWorker(id), 120);
  }, [startWorker]);

  return { preview, handleHover };
}
