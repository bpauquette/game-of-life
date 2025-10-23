/* eslint-disable testing-library/no-debugging-utils */
import logger from './logger';

// Mock console methods
const originalConsole = globalThis.console;
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

describe('logger', () => {
  const MSG_TEST_ERROR = 'test error';
  const MSG_TEST_WARN = 'test warn';
  const MSG_TEST_INFO = 'test info';
  const MSG_TEST_DEBUG = 'test debug';
  const MSG_PRODUCTION_ERROR = 'production error';
  const MSG_PRODUCTION_WARN = 'production warn';
  const MSG_PRODUCTION_INFO = 'production info';
  const MSG_PRODUCTION_DEBUG = 'production debug';
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    globalThis.console = mockConsole;
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.console = originalConsole;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('in test environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should not log anything in test environment (disabled)', () => {
  logger.error(MSG_TEST_ERROR);
  logger.warn(MSG_TEST_WARN);
  logger.info(MSG_TEST_INFO);
  logger.debug(MSG_TEST_DEBUG);

  expect(mockConsole.error).not.toHaveBeenCalled();
  expect(mockConsole.warn).not.toHaveBeenCalled();
  expect(mockConsole.info).not.toHaveBeenCalled();
  // eslint-disable-next-line testing-library/no-debugging-utils
  expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('in development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      // Need to reimport to get updated config
      jest.resetModules();
    });

    it('should log error messages', () => {
      const logger = require('./logger').default;
      
  logger.error(MSG_TEST_ERROR, 'arg1', 'arg2');
      
  expect(mockConsole.error).toHaveBeenCalledWith(MSG_TEST_ERROR, 'arg1', 'arg2');
    });

    it('should log warn messages', () => {
      const logger = require('./logger').default;
      
  logger.warn(MSG_TEST_WARN, 'extra');
      
  expect(mockConsole.warn).toHaveBeenCalledWith(MSG_TEST_WARN, 'extra');
    });

    it('should log info messages', () => {
      const logger = require('./logger').default;
      
  logger.info(MSG_TEST_INFO);
      
  expect(mockConsole.info).toHaveBeenCalledWith(MSG_TEST_INFO);
    });

    it('should log debug messages', () => {
      const logger = require('./logger').default;
      
  logger.debug(MSG_TEST_DEBUG, { data: 'object' });
      
      // eslint-disable-next-line testing-library/no-debugging-utils
      expect(mockConsole.debug).toHaveBeenCalledWith('test debug', { data: 'object' });
    });
  });

  describe('in production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
    });

    it('should log error messages even in production', () => {
      const logger = require('./logger').default;
      
  logger.error(MSG_PRODUCTION_ERROR);
      
  expect(mockConsole.error).toHaveBeenCalledWith(MSG_PRODUCTION_ERROR);
    });

    it('should not log warn messages in production', () => {
      const logger = require('./logger').default;
      
  logger.warn(MSG_PRODUCTION_WARN);
      
  expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('should not log info messages in production', () => {
      const logger = require('./logger').default;
      
  logger.info(MSG_PRODUCTION_INFO);
      
  expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should not log debug messages in production', () => {
      const logger = require('./logger').default;
      
  logger.debug(MSG_PRODUCTION_DEBUG);
      
      // eslint-disable-next-line testing-library/no-debugging-utils
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('logger methods', () => {
    it('should have all required logging methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should handle multiple arguments', () => {
      process.env.NODE_ENV = 'development';
      const logger = require('./logger').default;
      
  logger.error('message', 1, 2, 3, { obj: true }, [1, 2, 3]);
      
  expect(mockConsole.error).toHaveBeenCalledWith('message', 1, 2, 3, { obj: true }, [1, 2, 3]);
    });

    it('should handle no arguments', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('./logger').default;
      
      logger.info();
      
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle empty string messages', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('./logger').default;
      
      logger.debug('');
      
      // eslint-disable-next-line testing-library/no-debugging-utils
      expect(mockConsole.debug).toHaveBeenCalledWith('');
    });
  });

  describe('log level hierarchy', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
    });

    it('should respect log level configuration', () => {
      // This tests that the configuration is working as expected
      // In development, all levels should be enabled (DEBUG level)
      const logger = require('./logger').default;
      
      logger.error('error');
      logger.warn('warn');
      logger.info('info');
      logger.debug('debug');
      
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      // eslint-disable-next-line testing-library/no-debugging-utils
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should be disabled in test environment by default', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const logger = require('./logger').default;
      
      logger.error('should not appear');
      
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should be enabled in non-test environments', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('./logger').default;
      
      logger.error('should appear');
      
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });
});