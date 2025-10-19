/**
 * Simple logger utility that can be configured for different environments
 * In production, logs can be disabled or sent to proper logging services
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Configuration - can be set via environment variables or build-time constants
const config = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG,
  enabled: process.env.NODE_ENV !== 'test' // Disable logging in tests
};

const logger = {
  error: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.ERROR) {
      // In production, this could send to error tracking service
      // For now, we'll allow error logging even in production
      // eslint-disable-next-line no-console
      console.error(message, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.WARN) {
      // In production, warnings are typically suppressed or sent to monitoring
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(message, ...args);
      }
    }
  },
  
  info: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.INFO) {
      // eslint-disable-next-line no-console
      console.info(message, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.DEBUG) {
      // eslint-disable-next-line no-console
      console.debug(message, ...args);
    }
  }
};

export default logger;