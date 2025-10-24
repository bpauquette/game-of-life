/* eslint-disable sonarjs/no-duplicate-string */
import { colorSchemes } from './colorSchemes';

describe('colorSchemes', () => {
  const SPECTRUM_NAME = 'Spectrum Pulse';
  const SPECTRUM_BG = '#000';
  const NEON_NAME = 'Neon Grid';
  const NEON_BG = '#0a0a1a';
  const BIO_NAME = 'BioLife';
  const BIO_BG = '#0e1a12';
  const EMBER_NAME = 'Ember Field';
  const EMBER_BG = '#1a0b0b';
  const RETRO_NAME = 'Retro Vector';
  const RETRO_BG = '#001f3f';
  describe('spectrum', () => {
    it('should have correct name and background', () => {
  expect(colorSchemes.spectrum.name).toBe(SPECTRUM_NAME);
  expect(colorSchemes.spectrum.background).toBe(SPECTRUM_BG);
    });

    it('should generate HSL color based on position and time', () => {
      const mockTime = 1000;
      const result = colorSchemes.spectrum.getCellColor(5, 3, mockTime);
      
      // Expected: (1000/20 + 5*10 + 3*5) % 360 = (50 + 50 + 15) % 360 = 115
      expect(result).toBe('hsl(115, 100%, 50%)');
    });

    it('should use current time when no time parameter provided', () => {
      // Mock Date.now()
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 2000);

      const result = colorSchemes.spectrum.getCellColor(0, 0);
      
      // Expected: (2000/20 + 0*10 + 0*5) % 360 = 100
      expect(result).toBe('hsl(100, 100%, 50%)');

      // Restore Date.now()
      Date.now = originalDateNow;
    });

    it('should handle wrap-around for hue values', () => {
      const result = colorSchemes.spectrum.getCellColor(36, 0, 0);
      
      // Expected: (0/20 + 36*10 + 0*5) % 360 = 360 % 360 = 0
      expect(result).toBe('hsl(0, 100%, 50%)');
    });
  });

  describe('neon', () => {
    it('should have correct name and background', () => {
      expect(colorSchemes.neon.name).toBe(NEON_NAME);
      expect(colorSchemes.neon.background).toBe(NEON_BG);
    });

    it('should generate HSL color based on position', () => {
      const result = colorSchemes.neon.getCellColor(2, 1);
      
      // Expected: (2*50 + 1*90) % 360 = (100 + 90) % 360 = 190
      expect(result).toBe('hsl(190, 100%, 60%)');
    });

    it('should handle wrap-around for large coordinates', () => {
      const result = colorSchemes.neon.getCellColor(8, 0);
      
      // Expected: (8*50 + 0*90) % 360 = 400 % 360 = 40
      expect(result).toBe('hsl(40, 100%, 60%)');
    });
  });

  describe('bio', () => {
    it('should have correct name and background', () => {
      expect(colorSchemes.bio.name).toBe(BIO_NAME);
      expect(colorSchemes.bio.background).toBe(BIO_BG);
    });

    it('should return constant green color regardless of position', () => {
      expect(colorSchemes.bio.getCellColor(0, 0)).toBe('#4aff6c');
      expect(colorSchemes.bio.getCellColor(10, 5)).toBe('#4aff6c');
      expect(colorSchemes.bio.getCellColor(-5, 20)).toBe('#4aff6c');
    });
  });

  describe('ember', () => {
    it('should have correct name and background', () => {
      expect(colorSchemes.ember.name).toBe(EMBER_NAME);
      expect(colorSchemes.ember.background).toBe(EMBER_BG);
    });

    it('should generate HSL color based on position sum', () => {
      const result = colorSchemes.ember.getCellColor(3, 5);
      
      // Expected: 20 + ((3 + 5) % 20) = 20 + 8 = 28
      expect(result).toBe('hsl(28, 90%, 50%)');
    });

    it('should handle wrap-around with modulo operation', () => {
      const result = colorSchemes.ember.getCellColor(15, 10);
      
      // Expected: 20 + ((15 + 10) % 20) = 20 + (25 % 20) = 20 + 5 = 25
      expect(result).toBe('hsl(25, 90%, 50%)');
    });

    it('should handle exact modulo boundary', () => {
      const result = colorSchemes.ember.getCellColor(10, 10);
      
      // Expected: 20 + ((10 + 10) % 20) = 20 + (20 % 20) = 20 + 0 = 20
      expect(result).toBe('hsl(20, 90%, 50%)');
    });
  });

  describe('retro', () => {
    it('should have correct name and background', () => {
      expect(colorSchemes.retro.name).toBe(RETRO_NAME);
      expect(colorSchemes.retro.background).toBe(RETRO_BG);
    });

    it('should return constant green color regardless of position', () => {
      expect(colorSchemes.retro.getCellColor(0, 0)).toBe('#39ff14');
      expect(colorSchemes.retro.getCellColor(100, -50)).toBe('#39ff14');
      expect(colorSchemes.retro.getCellColor(999, 999)).toBe('#39ff14');
    });
  });

  it('should have all expected color schemes', () => {
    const expectedSchemes = ['spectrum', 'neon', 'bio', 'ember', 'retro'];
    const actualSchemes = Object.keys(colorSchemes);
    
    expect(actualSchemes).toEqual(expect.arrayContaining(expectedSchemes));
    expect(actualSchemes.length).toBe(expectedSchemes.length);
  });

  it('should have consistent structure across all schemes', () => {
    Object.entries(colorSchemes).forEach(([key, scheme]) => {
      expect(scheme).toHaveProperty('name');
      expect(scheme).toHaveProperty('background');
      expect(scheme).toHaveProperty('getCellColor');
      expect(typeof scheme.name).toBe('string');
      expect(typeof scheme.background).toBe('string');
      expect(typeof scheme.getCellColor).toBe('function');
    });
  });
});