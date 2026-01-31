import { useEffect } from 'react';
import { useUiDao } from '../../model/dao/uiDao.js';

// Global keyboard shortcuts for UI actions (React idiomatic, arch-compliant)
// Place this hook in your top-level UI shell (e.g., HeaderBar.js)
// Add new shortcuts here and update the Architecture doc if you add more
export default function useGlobalShortcuts() {
  console.log('[useGlobalShortcuts] hook mounted');
  const setPaletteOpen = useUiDao(state => state.setPaletteOpen);
  const setShowChart = useUiDao(state => state.setShowChart);
  const setShowUIControls = useUiDao(state => state.setShowUIControls);
  const showChart = useUiDao(state => state.showChart);
  const showUIControls = useUiDao(state => state.showUIControls);

  useEffect(() => {
    console.log('[useGlobalShortcuts] useEffect running');
    const handleGlobalKeyDown = (e) => {
      console.log('[useGlobalShortcuts] keydown event', e.key, e);
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      let handled = false;
      if (key === 'p' && !ctrl) {
        setPaletteOpen(true);
        handled = true;
      } else if (key === 'g' && !ctrl) {
        setShowChart(!showChart);
        handled = true;
      } else if (key === 'h' && !ctrl) {
        setShowUIControls(!showUIControls);
        handled = true;
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        console.log('[useGlobalShortcuts] handled shortcut:', key, e);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    console.log('[useGlobalShortcuts] keydown listener added');
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      console.log('[useGlobalShortcuts] useEffect cleanup (unmount)');
    };
  }, [setPaletteOpen, setShowChart, setShowUIControls, showChart, showUIControls]);
}
