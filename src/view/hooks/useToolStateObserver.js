// React hook to subscribe to tool state via the model's observer events
import { useEffect, useState } from 'react';

// Accepts an object: { model, toolStateRef }
function useSyncFromRef(toolStateRef, setToolState) {
  // Keep local state in sync with the ref on ref change
  useEffect(() => {
    const current = toolStateRef?.current;
    if (current) {
      setToolState({ ...current });
    }
  }, [toolStateRef, setToolState]);
}

function useSubscribeToolState(model, setToolState) {
  // Subscribe to model observer for 'toolStateChanged'
  useEffect(() => {
    if (!model || typeof model.addObserver !== 'function') return undefined;
    const handler = (event, data) => {
      if (event === 'toolStateChanged') {
        setToolState(data ? { ...data } : {});
      }
    };
    model.addObserver(handler);
    return () => {
      if (typeof model.removeObserver === 'function') {
        model.removeObserver(handler);
      }
    };
  }, [model, setToolState]);
}

export default function useToolStateObserver({ model, toolStateRef } = {}) {
  const initial = toolStateRef?.current ? { ...toolStateRef.current } : {};
  const [toolState, setToolState] = useState(initial);

  useSyncFromRef(toolStateRef, setToolState);
  useSubscribeToolState(model, setToolState);

  return toolState;
}
