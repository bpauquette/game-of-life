/**
 * Simple logger utility - direct passthrough to console
 * Debug uses console.log for visibility
 */

const logger = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.log
};

export default logger;