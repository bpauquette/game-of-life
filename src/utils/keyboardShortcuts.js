/**
 * Centralized keyboard shortcut definitions for ADA compliance
 * All GUI actions should have corresponding keyboard shortcuts
 */

export const SHORTCUTS = {
  // Playback controls
  PLAY_PAUSE: { key: ' ', ctrl: false, shift: false, alt: false, label: 'Space', description: 'Play/Pause simulation' },
  STEP: { key: 's', ctrl: false, shift: false, alt: false, label: 'S', description: 'Step one generation' },
  CLEAR: { key: 'c', ctrl: true, shift: false, alt: false, label: 'Ctrl+C', description: 'Clear grid' },
  
  // View controls
  ZOOM_IN: { key: '=', ctrl: false, shift: false, alt: false, label: '=', description: 'Zoom in' },
  ZOOM_OUT: { key: '-', ctrl: false, shift: false, alt: false, label: '-', description: 'Zoom out' },
  CENTER: { key: 'f', ctrl: false, shift: false, alt: false, label: 'F', description: 'Center on live cells' },
  TOGGLE_CHROME: { key: 'h', ctrl: false, shift: false, alt: false, label: 'H', description: 'Toggle Focus Mode (minimal run bar + grid)' },
  
  // Tools
  TOOL_DRAW: { key: '1', ctrl: false, shift: false, alt: false, label: '1', description: 'Select Draw tool' },
  TOOL_ERASER: { key: '2', ctrl: false, shift: false, alt: false, label: '2', description: 'Select Eraser tool' },
  TOOL_PAN: { key: '3', ctrl: false, shift: false, alt: false, label: '3', description: 'Select Pan tool' },
  TOOL_SHAPES: { key: '4', ctrl: false, shift: false, alt: false, label: '4', description: 'Select Shapes tool' },
  TOOL_RECT: { key: '5', ctrl: false, shift: false, alt: false, label: '5', description: 'Select Rectangle tool' },
  TOOL_LINE: { key: '6', ctrl: false, shift: false, alt: false, label: '6', description: 'Select Line tool' },
  TOOL_CIRCLE: { key: '7', ctrl: false, shift: false, alt: false, label: '7', description: 'Select Circle tool' },
  TOOL_CAPTURE: { key: '8', ctrl: false, shift: false, alt: false, label: '8', description: 'Select Capture tool' },
  
  // Undo/Redo
  UNDO: { key: 'z', ctrl: true, shift: false, alt: false, label: 'Ctrl+Z', description: 'Undo last action' },
  REDO: { key: 'z', ctrl: true, shift: true, alt: false, label: 'Ctrl+Shift+Z', description: 'Redo action' },
  REDO_ALT: { key: 'y', ctrl: true, shift: false, alt: false, label: 'Ctrl+Y', description: 'Redo action (alternate)' },
  
  // Dialogs
  OPEN_PALETTE: { key: 'p', ctrl: false, shift: false, alt: false, label: 'P', description: 'Open shape palette' },
  OPEN_OPTIONS: { key: 'o', ctrl: false, shift: false, alt: false, label: 'O', description: 'Open options' },
  OPEN_HELP: { key: '?', ctrl: false, shift: false, alt: false, label: '?', description: 'Open help' },
  OPEN_CHART: { key: 'g', ctrl: false, shift: false, alt: false, label: 'G', description: 'Toggle population chart' },
  OPEN_SAVE: { key: 's', ctrl: true, shift: false, alt: false, label: 'Ctrl+S', description: 'Save grid' },
  OPEN_LOAD: { key: 'l', ctrl: true, shift: false, alt: false, label: 'Ctrl+L', description: 'Load grid' },
  
  // Speed controls
  SPEED_UP: { key: ']', ctrl: false, shift: false, alt: false, label: ']', description: 'Increase speed' },
  SPEED_DOWN: { key: '[', ctrl: false, shift: false, alt: false, label: '[', description: 'Decrease speed' },
  
  // Navigation
  PAN_LEFT: { key: 'ArrowLeft', ctrl: false, shift: false, alt: false, label: '←', description: 'Pan left' },
  PAN_RIGHT: { key: 'ArrowRight', ctrl: false, shift: false, alt: false, label: '→', description: 'Pan right' },
  PAN_UP: { key: 'ArrowUp', ctrl: false, shift: false, alt: false, label: '↑', description: 'Pan up' },
  PAN_DOWN: { key: 'ArrowDown', ctrl: false, shift: false, alt: false, label: '↓', description: 'Pan down' },
  
  // Color schemes
  NEXT_COLOR_SCHEME: { key: 't', ctrl: false, shift: false, alt: false, label: 'T', description: 'Next color scheme' },
  PREV_COLOR_SCHEME: { key: 't', ctrl: false, shift: true, alt: false, label: 'Shift+T', description: 'Previous color scheme' },
  
  // Miscellaneous
  ESCAPE: { key: 'Escape', ctrl: false, shift: false, alt: false, label: 'Esc', description: 'Close dialog/cancel action' },
};

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function matchesShortcut(event, shortcut) {
  if (!event || !shortcut) return false;
  
  const key = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();
  
  return (
    key === shortcutKey &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.altKey === !!shortcut.alt
  );
}

/**
 * Get a list of all shortcuts grouped by category
 */
export function getShortcutsByCategory() {
  return {
    'Playback': [
      SHORTCUTS.PLAY_PAUSE,
      SHORTCUTS.STEP,
      SHORTCUTS.CLEAR,
      SHORTCUTS.SPEED_UP,
      SHORTCUTS.SPEED_DOWN,
    ],
    'View': [
      SHORTCUTS.ZOOM_IN,
      SHORTCUTS.ZOOM_OUT,
      SHORTCUTS.CENTER,
      SHORTCUTS.TOGGLE_CHROME,
      SHORTCUTS.PAN_LEFT,
      SHORTCUTS.PAN_RIGHT,
      SHORTCUTS.PAN_UP,
      SHORTCUTS.PAN_DOWN,
    ],
    'Tools': [
      SHORTCUTS.TOOL_DRAW,
      SHORTCUTS.TOOL_ERASER,
      SHORTCUTS.TOOL_PAN,
      SHORTCUTS.TOOL_SHAPES,
      SHORTCUTS.TOOL_RECT,
      SHORTCUTS.TOOL_LINE,
      SHORTCUTS.TOOL_CIRCLE,
      SHORTCUTS.TOOL_CAPTURE,
    ],
    'Editing': [
      SHORTCUTS.UNDO,
      SHORTCUTS.REDO,
    ],
    'Dialogs': [
      SHORTCUTS.OPEN_PALETTE,
      SHORTCUTS.OPEN_OPTIONS,
      SHORTCUTS.OPEN_HELP,
      SHORTCUTS.OPEN_CHART,
      SHORTCUTS.OPEN_SAVE,
      SHORTCUTS.OPEN_LOAD,
      SHORTCUTS.ESCAPE,
    ],
    'Color': [
      SHORTCUTS.NEXT_COLOR_SCHEME,
      SHORTCUTS.PREV_COLOR_SCHEME,
    ],
  };
}

/**
 * Format shortcut for display (e.g., "Ctrl+S")
 */
export function formatShortcut(shortcut) {
  return shortcut.label;
}
