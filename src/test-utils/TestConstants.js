/**
 * Test-specific constants to centralize repeated literals in tests.
 * Import like:
 *   import { TEST_IDS, TEST_TEXT } from 'src/test-utils/TestConstants';
 */
export const TEST_IDS = {
  CANVAS: 'game-canvas',
  CONTROLS_BAR: 'controls-bar',
  OPTIONS_PANEL: 'options-panel',
  SAVE_GRID_DIALOG: 'save-grid-dialog',
  LOAD_GRID_DIALOG: 'load-grid-dialog',
  RECENT_SHAPES_STRIP: 'recent-shapes-strip',
  SHAPE_PALETTE: 'shape-palette',
};

export const TEST_TEXT = {
  DEFAULT_GRID_NAME: 'Untitled',
  DEFAULT_SHAPE_NAME: 'Unnamed',
  SAVE_BUTTON: 'Save',
  LOAD_BUTTON: 'Load',
  CANCEL_BUTTON: 'Cancel',
  CLOSE_BUTTON: 'Close',
  OK_BUTTON: 'OK',
  LOAD_MORE: 'Load more',
  SEARCH_GRIDS_PLACEHOLDER: 'Search grids...',
  DELETE_BUTTON: 'Delete',
  UNDO_TEXT: 'UNDO',
  RESTORE_FAILED: 'Restore failed',
  PREVIEW_TEXT: 'Preview',
  SEARCH_SHAPES_PLACEHOLDER: 'Type 3+ chars to search'
};

const TestConstants = { TEST_IDS, TEST_TEXT };
export default TestConstants;
