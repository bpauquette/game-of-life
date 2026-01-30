import { useState, useRef, useCallback, useEffect } from 'react';
import adapter from '../model/hashlife/adapter.js';

// React hook that wraps the hashlife adapter/worker and exposes a small API
function useHashlife() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const progCb = (p) => { if (mountedRef.current) setProgress(p); };
    adapter.onProgress(progCb);
    return () => {
      mountedRef.current = false;
      adapter.onProgress(null);
    };
  }, []);

  const run = useCallback(async (cells, generations, opts = {}) => {
    setIsRunning(true);
    setProgress(null);
    try {
      const res = await adapter.run(cells, generations, opts);
      if (mountedRef.current) setLastResult(res);
      return res;
    } finally {
      if (mountedRef.current) setIsRunning(false);
    }
  }, []);

  const cancel = useCallback(() => {
    adapter.cancel();
    setIsRunning(false);
  }, []);

  const clearCache = useCallback(() => adapter.clearCache(), []);

  return {
    run,
    cancel,
    clearCache,
    isRunning,
    progress,
    lastResult
  };
}

module.exports = useHashlife;
