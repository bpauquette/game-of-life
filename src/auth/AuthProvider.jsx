// src/auth/AuthProvider.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import logger from '../controller/utils/logger.js';
import PropTypes from 'prop-types';
import { getBackendApiBase } from '../utils/backendApi.js';

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const AuthContext = createContext(null);

/**
 * Provides authentication context to the application.
 * @param {Object} props - The props.
 * @param {React.ReactNode} props.children - The child components.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = sessionStorage.getItem('authToken');
    if (stored) {
      try {
        const decoded = jwtDecode(stored);
        if (decoded && decoded.exp * 1000 < Date.now()) {
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('authEmail');
          return null;
        }
      } catch (error) {
        logger.error('Invalid token in storage:', error);
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authEmail');
        return null;
      }
    }
    return stored;
  });
  const [email, setEmail] = useState(() => sessionStorage.getItem('authEmail'));
  const [hasDonated, setHasDonated] = useState(false);

  const refreshMe = async () => {
    try {
      const tokenNow = sessionStorage.getItem('authToken');
      if (!tokenNow) return;
      const base = getBackendApiBase();
      const resp = await fetch(`${base}/v1/me?_ts=${Date.now()}`, { headers: { Authorization: `Bearer ${tokenNow}`, 'Cache-Control': 'no-cache' }, cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.hasDonated !== undefined) setHasDonated(!!data.hasDonated);
      if (data && typeof data.email === 'string') setEmail(data.email);
    } catch (e) {
      // ignore refresh errors
    }
  };

  const login = (email, token) => {
    setEmail(email);
    setToken(token);
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('authEmail', email);
    // Refresh current user info to populate hasDonated
    refreshMe();
  };

  const logout = () => {
    setToken(null);
    setEmail(null);
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authEmail');
  };

  useEffect(() => {
    const handleLogout = () => logout();
    globalThis.addEventListener('auth:logout', handleLogout);
    return () => globalThis.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    // Avoid setState-in-effect: schedule refreshMe in a microtask
    Promise.resolve().then(refreshMe);
  }, []);

  return (
    <AuthContext.Provider value={{ token, email, hasDonated, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the authentication context.
 * @returns {Object} The auth context with token, email, login, and logout.
 */
export const useAuth = () => useContext(AuthContext);
