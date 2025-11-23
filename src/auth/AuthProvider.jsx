// src/auth/AuthProvider.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import jwt from 'jsonwebtoken';
import logger from '../controller/utils/logger';

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
        const decoded = jwt.decode(stored);
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

  const login = (email, token) => {
    setEmail(email);
    setToken(token);
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('authEmail', email);
  };

  const logout = () => {
    setToken(null);
    setEmail(null);
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authEmail');
  };

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the authentication context.
 * @returns {Object} The auth context with token, email, login, and logout.
 */
export const useAuth = () => useContext(AuthContext);
