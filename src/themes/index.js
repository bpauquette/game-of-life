import { createTheme } from '@mui/material/styles';

// Dark theme (current default)
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
    text: { primary: '#ffffff', secondary: '#b0bec5' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});

// Light theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc3545' },
    background: { default: '#fafafa', paper: '#ffffff' },
    text: { primary: '#212121', secondary: '#757575' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});

// High Contrast theme (accessibility)
export const highContrastTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffff00' },
    secondary: { main: '#00ffff' },
    background: { default: '#000000', paper: '#1a1a1a' },
    text: { primary: '#ffffff', secondary: '#cccccc' },
    error: { main: '#ff0000' },
    warning: { main: '#ffff00' },
    info: { main: '#00ffff' },
    success: { main: '#00ff00' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightBold: 700,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          border: '2px solid',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '2px solid',
          borderColor: '#ffff00'
        }
      }
    }
  }
});

// OLED theme (pure black for OLED displays)
export const oledTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#64b5f6' },
    secondary: { main: '#ff6e40' },
    background: { default: '#000000', paper: '#0a0a0a' },
    text: { primary: '#ffffff', secondary: '#b3b3b3' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});
