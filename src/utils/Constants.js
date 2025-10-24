/**
 * Shared application constants to reduce duplicated strings across the app.
 * Import specific named constants where helpful, e.g.:
 *   import { BUTTONS, CONTROLS } from 'src/utils/Constants';
 */
export const APP = {
  TITLE: "Conway's Game of Life",
  DEFAULT_GRID_NAME: 'Untitled',
};

export const BUTTONS = {
  SAVE: 'Save',
  LOAD: 'Load',
  LOAD_MORE: 'Load more',
  DELETE: 'Delete',
  CANCEL: 'Cancel',
  OK: 'OK',
  IMPORT: 'Import',
  EXPORT: 'Export',
  CLOSE: 'Close',
};

export const TOOLS = {
  PEN: 'Pen',
  ERASER: 'Eraser',
  RECTANGLE: 'Rectangle',
  LINE: 'Line',
  RANDOM: 'Random',
};

export const CONTROLS = {
  PLAY: 'Play',
  PAUSE: 'Pause',
  STEP: 'Step',
  CLEAR: 'Clear',
  RANDOMIZE: 'Randomize',
  SPEED: 'Speed',
  ZOOM_IN: 'Zoom in',
  ZOOM_OUT: 'Zoom out',
};

export const MESSAGES = {
  ERROR_LOADING: 'Error loading',
  WARNING: 'Warning',
  INFO: 'Info',
  NO_SHAPES: 'No shapes available',
};

export const STATUS = {
  SAVING: 'Saving...',
  LOADING: 'Loading...'
};

export const PLACEHOLDERS = {
  SEARCH_GRIDS: 'Search grids...'
};

// default export for convenience
const AppConstants = {
  APP,
  BUTTONS,
  TOOLS,
  CONTROLS,
  MESSAGES,
  STATUS,
  PLACEHOLDERS
};

export default AppConstants;
