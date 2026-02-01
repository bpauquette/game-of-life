/**
 * Simple logger utility - direct passthrough to console
 * Debug uses console.log for visibility
 */


// Log levels: error < warn < info < debug
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

// Determine initial level:
// 1) REACT_APP_LOG_LEVEL (CRA env) if present
// 2) globalThis.GOL_LOG_LEVEL if set at runtime
// 3) NODE_ENV fallback: 'debug' for development, 'warn' otherwise (includes test/production)
// Default to debug for now to ensure verbose logs during troubleshooting.
let currentLevel = LEVELS.debug;
const envLevel = typeof process !== 'undefined' && process?.env?.REACT_APP_LOG_LEVEL;
const nodeEnv = typeof process !== 'undefined' && process?.env?.NODE_ENV;
const globalRef = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : undefined);
const runtimeLevel = globalRef && globalRef.GOL_LOG_LEVEL;

if (envLevel && Object.prototype.hasOwnProperty.call(LEVELS, envLevel)) {
  currentLevel = LEVELS[envLevel];
} else if (runtimeLevel && Object.prototype.hasOwnProperty.call(LEVELS, runtimeLevel)) {
  currentLevel = LEVELS[runtimeLevel];
} else if (nodeEnv === 'development') {
  currentLevel = LEVELS.debug;
} else {
  // test/production default to WARN to avoid noisy console output
  currentLevel = LEVELS.warn;
}

// Also expose a simple global toggle to completely silence logging if desired
if (globalRef && globalRef.GOL_LOGGING_ENABLED === undefined) {
  globalRef.GOL_LOGGING_ENABLED = true;
}

function shouldLog(level) {
  const enabled = !globalRef || globalRef.GOL_LOGGING_ENABLED !== false;
  return enabled && LEVELS[level] <= currentLevel;
}

const logger = {
  setLevel: (level) => {
    if (Object.prototype.hasOwnProperty.call(LEVELS, level)) {
      currentLevel = LEVELS[level];
    }
  },
  error: (...args) => { if (shouldLog('error')) console.error(...args); },
  warn: (...args) => { if (shouldLog('warn')) console.warn(...args); },
  info: (...args) => { if (shouldLog('info')) console.info(...args); },
  debug: (...args) => { if (shouldLog('debug')) console.debug(...args); }
};

export default logger;