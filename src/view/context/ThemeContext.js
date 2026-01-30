import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { lightTheme, darkTheme, highContrastTheme, oledTheme } from '../../themes/index.js';
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Create context
export const ThemeContext = createContext();

// Theme provider component
export function ThemeProvider({ children }) {

  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const stored = globalThis.localStorage?.getItem('themeMode');
      return stored || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Persist theme preference
  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
   
    globalThis.localStorage?.setItem('themeMode', mode);
   
  }, []);

  // Get current MUI theme object
  const getCurrentTheme = useCallback(() => {
    switch (themeMode) {
      case 'light':
        return lightTheme;
      case 'highContrast':
        return highContrastTheme;
      case 'oled':
        return oledTheme;
      case 'dark':
      default:
        return darkTheme;
    }
  }, [themeMode]);

  const value = {
    themeMode,
    setThemeMode,
    getCurrentTheme,
    availableThemes: [
      { id: 'dark', label: 'Dark (Default)' },
      { id: 'light', label: 'Light' },
      { id: 'highContrast', label: 'High Contrast' },
      { id: 'oled', label: 'OLED (Pure Black)' }
    ]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
