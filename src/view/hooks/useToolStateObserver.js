// React hook to subscribe to tool state via the model's observer events
import { useEffect, useState } from 'react';

// Accepts an object: { model, toolStateRef }
export default function useToolStateObserver({ model, toolStateRef } = {}) {
  const initial = toolStateRef?.current ? { ...toolStateRef.current } : {};
  const [toolState, setToolState] = useState(initial);

  // Keep local state in sync with the ref on ref change
  useEffect(() => {
    if (toolStateRef?.current) {
      setToolState({ ...toolStateRef.current });
    }
  }, [toolStateRef]);

  // Subscribe to model observer for 'toolStateChanged'
  useEffect(() => {
    if (!model || typeof model.addObserver !== 'function') return;
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
  }, [model]);

  return toolState;
}
