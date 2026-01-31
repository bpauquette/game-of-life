import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './view/styles/design-tokens.css';
import App from './view/App.js';
import reportWebVitals from './reportWebVitals.js';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider, useTheme } from './view/context/ThemeContext.js';

// Wrapper component to use theme from context
function AppWithTheme() {
  const { getCurrentTheme, themeMode } = useTheme();
  const theme = getCurrentTheme();

  // Sync CSS variables/classes with the active theme for non-MUI surfaces
  useEffect(() => {
    const root = document.documentElement;
    const themeId = themeMode || (theme.palette.mode === 'light' ? 'light' : 'dark');
    root.classList.remove('theme-light', 'theme-dark', 'theme-highContrast', 'theme-oled');
    root.classList.add(`theme-${themeId}`);
    document.body.style.backgroundColor = theme.palette.background?.default || '';
    document.body.style.color = theme.palette.text?.primary || '';
  }, [theme, themeMode]);
  
  return (
    <MuiThemeProvider theme={theme}>
      <App />
    </MuiThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
