/**
 * Simple logger utility - direct passthrough to console
 * Debug uses console.log for visibility
 */


// Log levels: error < warn < info < debug
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let currentLevel = LEVELS.debug;

// Global toggle (can be set from anywhere)
if (typeof window !== 'undefined') {
  window.GOL_LOGGING_ENABLED = true;
}

function shouldLog(level) {
  const enabled = (typeof window === 'undefined' || window.GOL_LOGGING_ENABLED !== false);
  return enabled && LEVELS[level] <= currentLevel;
}

const logger = {
  setLevel: (level) => {
    if (LEVELS.hasOwnProperty(level)) {
      currentLevel = LEVELS[level];
    }
  },
  error: (...args) => { if (shouldLog('error')) console.error(...args); },
  warn: (...args) => { if (shouldLog('warn')) console.warn(...args); },
  info: (...args) => { if (shouldLog('info')) console.info(...args); },
  debug: (...args) => { if (shouldLog('debug')) console.debug(...args); }
};

export default logger;