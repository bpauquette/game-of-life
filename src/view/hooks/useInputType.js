import { useEffect, useState } from 'react';

export function detectInputTypeOnce() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return 'touch';
  if (typeof globalThis !== 'undefined' && globalThis.matchMedia && globalThis.matchMedia('(pointer: coarse)').matches) return 'touch';
  return 'mouse';
}

export default function useInputType() {
  const getInitial = () => detectInputTypeOnce();
  const [inputType, setInputType] = useState(getInitial);

  useEffect(() => {
    if (typeof globalThis === 'undefined') return undefined;

    const onPointer = (e) => {
      // Pointer events: e.pointerType is 'mouse' | 'touch' | 'pen'
      const t = e && e.pointerType ? e.pointerType : (e && e.touches ? 'touch' : (e.type === 'touchstart' ? 'touch' : 'mouse'));
      setInputType(t);
    };

    globalThis.addEventListener('pointerdown', onPointer, { passive: true });
    globalThis.addEventListener('touchstart', onPointer, { passive: true });

    return () => {
      globalThis.removeEventListener('pointerdown', onPointer);
      globalThis.removeEventListener('touchstart', onPointer);
    };
  }, []);

  return inputType; // 'mouse' | 'touch' | 'pen'
}
