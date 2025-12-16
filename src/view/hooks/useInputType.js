import { useEffect, useState } from 'react';

export function detectInputTypeOnce() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return 'touch';
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return 'touch';
  return 'mouse';
}

export default function useInputType() {
  const getInitial = () => detectInputTypeOnce();
  const [inputType, setInputType] = useState(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onPointer = (e) => {
      // Pointer events: e.pointerType is 'mouse' | 'touch' | 'pen'
      const t = e && e.pointerType ? e.pointerType : (e && e.touches ? 'touch' : (e.type === 'touchstart' ? 'touch' : 'mouse'));
      setInputType(t);
    };

    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('touchstart', onPointer, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('touchstart', onPointer);
    };
  }, []);

  return inputType; // 'mouse' | 'touch' | 'pen'
}
