/**
 * Simple logger utility for Node.js backend
 * Respects NODE_ENV for production logging
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Configuration - can be set via environment variables
const config = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG,
  enabled: process.env.NODE_ENV !== 'test' // Disable logging in tests
};

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, '..', 'backend.log');

function appendLog(level, message, ...args) {
  function formatArg(a) {
    if (!a && a !== 0) return '';
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }
  const line = `[${new Date().toISOString()}] [${level}] ${message} ${args.map(formatArg).join(' ')}\n`;
  try {
    fs.appendFileSync(logFilePath, line, 'utf8');
  } catch {}
}

const logger = {
  error: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.ERROR) {
      console.error(message, ...args);
      appendLog('ERROR', message, ...args);
    }
  },
  warn: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.WARN) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(message, ...args);
      }
      appendLog('WARN', message, ...args);
    }
  },
  info: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.INFO) {
      console.info(message, ...args);
      appendLog('INFO', message, ...args);
    }
  },
  debug: (message, ...args) => {
    if (config.enabled && config.level >= LOG_LEVELS.DEBUG) {
      console.debug(message, ...args);
      appendLog('DEBUG', message, ...args);
    }
  }
};

export default logger;