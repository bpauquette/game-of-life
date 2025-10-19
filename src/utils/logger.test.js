import logger from './logger';

// Mock console methods
const originalConsole = global.console;
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

describe('logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    global.console = mockConsole;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.console = originalConsole;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('in test environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should not log anything in test environment (disabled)', () => {
      logger.error('test error');
      logger.warn('test warn');
      logger.info('test info');
      logger.debug('test debug');

      expect(mockConsole.error).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
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
      
      logger.error('test error', 'arg1', 'arg2');
      
      expect(mockConsole.error).toHaveBeenCalledWith('test error', 'arg1', 'arg2');
    });

    it('should log warn messages', () => {
      const logger = require('./logger').default;
      
      logger.warn('test warn', 'extra');
      
      expect(mockConsole.warn).toHaveBeenCalledWith('test warn', 'extra');
    });

    it('should log info messages', () => {
      const logger = require('./logger').default;
      
      logger.info('test info');
      
      expect(mockConsole.info).toHaveBeenCalledWith('test info');
    });

    it('should log debug messages', () => {
      const logger = require('./logger').default;
      
      logger.debug('test debug', { data: 'object' });
      
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
      
      logger.error('production error');
      
      expect(mockConsole.error).toHaveBeenCalledWith('production error');
    });

    it('should not log warn messages in production', () => {
      const logger = require('./logger').default;
      
      logger.warn('production warn');
      
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('should not log info messages in production', () => {
      const logger = require('./logger').default;
      
      logger.info('production info');
      
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should not log debug messages in production', () => {
      const logger = require('./logger').default;
      
      logger.debug('production debug');
      
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