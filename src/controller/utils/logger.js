/**
 * Simple logger utility that can be configured for different environments
 * In tests we intentionally make the logger a no-op to avoid noisy console
 * output from tests. This file keeps the same API (error/warn/info/debug).
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const isTest = process.env.NODE_ENV === 'test';

const noop = () => {};

let logger;

if (isTest) {
  // Minimal, safe no-op logger for tests
  logger = {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop
  };
} else {
  // Configuration - can be set via environment variables or build-time constants
  const config = {
    level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG,
    enabled: true
  };

  logger = {
    error: (message, ...args) => {
      if (config.enabled && config.level >= LOG_LEVELS.ERROR) {
        // In production, this could send to error tracking service
        // eslint-disable-next-line no-console
        console.error(message, ...args);
      }
    },

    warn: (message, ...args) => {
      if (config.enabled && config.level >= LOG_LEVELS.WARN && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(message, ...args);
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
}

export default logger;