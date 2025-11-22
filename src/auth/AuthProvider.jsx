// src/auth/AuthProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [email, setEmail] = useState(() => localStorage.getItem("authEmail"));

  const login = (email, token) => {
    setEmail(email);
    setToken(token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authEmail", email);
  };

  const logout = () => {
    setToken(null);
    setEmail(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authEmail");
  };

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
