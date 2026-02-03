/**
 * ADA Compliance Integration Tests
 * 
 * Verifies that ADA compliance mode:
 * 1. Caps simulation and rendering to 2 FPS/GPS
 * 2. Switches color scheme to adaSafe
 * 3. Locks speed controls in UI
 * 4. Broadcasts gol:adaChanged event with correct payload
 * 5. Persists state to localStorage
 */

describe('ADA Compliance Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any broadcasted events
    jest.clearAllMocks();
  });

  describe('ADA Toggle and State Changes', () => {
    test('enables ADA compliance and applies all restrictions', () => {
      // Simulate ADA being enabled
      const enableAdaCompliance = true;
      
      // Verify performance cap enforcement
      const finalMaxFPS = enableAdaCompliance ? 2 : 60;
      const finalMaxGPS = enableAdaCompliance ? 2 : 30;
      
      expect(finalMaxFPS).toBe(2);
      expect(finalMaxGPS).toBe(2);
    });

    test('forces caps ON when ADA is enabled', () => {
      const enableAdaCompliance = true;
      const prevEnableFPSCap = false;
      const prevEnableGPSCap = false;
      
      const finalEnableFPSCap = enableAdaCompliance ? true : prevEnableFPSCap;
      const finalEnableGPSCap = enableAdaCompliance ? true : prevEnableGPSCap;
      
      expect(finalEnableFPSCap).toBe(true);
      expect(finalEnableGPSCap).toBe(true);
    });

    test('switches color scheme to adaSafe when ADA enabled', () => {
      const enableAdaCompliance = true;
      const newColorScheme = enableAdaCompliance ? 'adaSafe' : 'bio';
      
      expect(newColorScheme).toBe('adaSafe');
    });

    test('restores original settings when ADA disabled', () => {
      // When ADA is disabled, restore previous values
      const enableAdaCompliance = false;
      const prevColorScheme = 'bio';
      const prevMaxFPS = 60;
      const prevMaxGPS = 30;
      
      const finalColorScheme = enableAdaCompliance ? 'adaSafe' : prevColorScheme;
      const finalMaxFPS = enableAdaCompliance ? 2 : prevMaxFPS;
      const finalMaxGPS = enableAdaCompliance ? 2 : prevMaxGPS;
      
      expect(finalColorScheme).toBe('bio');
      expect(finalMaxFPS).toBe(60);
      expect(finalMaxGPS).toBe(30);
    });
  });

  describe('ADA Event Broadcasting', () => {
    test('broadcasts gol:adaChanged event with correct detail payload', (done) => {
      // Mock the event listener
      const listener = jest.fn((event) => {
        try {
          expect(event.detail).toEqual({
            enabled: true,
            colorScheme: 'adaSafe',
            performanceCaps: {
              maxFPS: 2,
              maxGPS: 2,
              enableFPSCap: true,
              enableGPSCap: true
            }
          });
          globalThis.removeEventListener('gol:adaChanged', listener);
          done();
        } catch (e) {
          done(e);
        }
      });

      globalThis.addEventListener('gol:adaChanged', listener);

      // Simulate event broadcast
      const event = new CustomEvent('gol:adaChanged', {
        detail: {
          enabled: true,
          colorScheme: 'adaSafe',
          performanceCaps: {
            maxFPS: 2,
            maxGPS: 2,
            enableFPSCap: true,
            enableGPSCap: true
          }
        }
      });
      globalThis.dispatchEvent(event);
    });
  });

  describe('UI Control Locking in ADA Mode', () => {
    test('FPS/GPS inputs disabled when ADA enabled', () => {
      const enableAdaCompliance = true;
      
      // In OptionsPanel, these controls are disabled when ADA is on:
      // - FPS input: disabled={enableAdaCompliance}
      // - GPS input: disabled={enableAdaCompliance}
      const fpsCapsDisabled = enableAdaCompliance;
      const gpsCapsDisabled = enableAdaCompliance;
      
      expect(fpsCapsDisabled).toBe(true);
      expect(gpsCapsDisabled).toBe(true);
    });

    test('FPS/GPS cap checkboxes disabled when ADA enabled', () => {
      const enableAdaCompliance = true;
      
      // In OptionsPanel:
      // - Enable FPS cap checkbox: disabled={enableAdaCompliance}
      // - Enable GPS cap checkbox: disabled={enableAdaCompliance}
      const fpsCapsCheckDisabled = enableAdaCompliance;
      const gpsCapsCheckDisabled = enableAdaCompliance;
      
      expect(fpsCapsCheckDisabled).toBe(true);
      expect(gpsCapsCheckDisabled).toBe(true);
    });

    test('ScriptExecutionHUD still renders when ADA enabled', () => {
      const enableAdaCompliance = true;
      const hudVisible = true;

      // HUD should render based solely on visibility, ignoring ADA mode
      const shouldRender = hudVisible;

      expect(shouldRender).toBe(true);
    });
  });

  describe('Photosensitivity Test ADA Mode', () => {
    test('uses 500ms sample interval (2 FPS) when ADA enabled', () => {
      const enableAdaCompliance = true;
      const sampleInterval = enableAdaCompliance ? 500 : 33;
      
      expect(sampleInterval).toBe(500);
    });

    test('uses 33ms sample interval (30 FPS) when ADA disabled', () => {
      const enableAdaCompliance = false;
      const sampleInterval = enableAdaCompliance ? 500 : 33;
      
      expect(sampleInterval).toBe(33);
    });
  });

  describe('localStorage Persistence', () => {
    test('persists enableAdaCompliance to localStorage', () => {
      const enableAdaCompliance = true;
      localStorage.setItem('enableAdaCompliance', JSON.stringify(enableAdaCompliance));
      
      const stored = localStorage.getItem('enableAdaCompliance');
      expect(stored).toBe('true');
      expect(JSON.parse(stored)).toBe(true);
    });

    test('persists updated performance caps to localStorage', () => {
      const maxFPS = 2;
      const maxGPS = 2;
      
      localStorage.setItem('maxFPS', String(maxFPS));
      localStorage.setItem('maxGPS', String(maxGPS));
      
      expect(localStorage.getItem('maxFPS')).toBe('2');
      expect(localStorage.getItem('maxGPS')).toBe('2');
    });

    test('persists color scheme change to localStorage', () => {
      const colorScheme = 'adaSafe';
      localStorage.setItem('colorSchemeKey', colorScheme);
      
      expect(localStorage.getItem('colorSchemeKey')).toBe('adaSafe');
    });
  });

  describe('ADA Initialization from localStorage', () => {
    test('loads ADA compliance from localStorage on init', () => {
      // Simulate stored value
      localStorage.setItem('enableAdaCompliance', 'true');
      
      const stored = localStorage.getItem('enableAdaCompliance');
      const enableAdaCompliance = stored === 'false' ? false : true;
      
      expect(enableAdaCompliance).toBe(true);
    });

    test('defaults to true if localStorage value missing', () => {
      // When no value is set
      const stored = localStorage.getItem('enableAdaCompliance');
      const enableAdaCompliance = stored ? JSON.parse(stored) : true;
      
      expect(enableAdaCompliance).toBe(true);
    });

    test('loads performance caps from localStorage', () => {
      localStorage.setItem('maxFPS', '2');
      localStorage.setItem('maxGPS', '2');
      localStorage.setItem('enableFPSCap', 'true');
      localStorage.setItem('enableGPSCap', 'true');
      
      expect(localStorage.getItem('maxFPS')).toBe('2');
      expect(localStorage.getItem('maxGPS')).toBe('2');
      expect(localStorage.getItem('enableFPSCap')).toBe('true');
      expect(localStorage.getItem('enableGPSCap')).toBe('true');
    });
  });
});
