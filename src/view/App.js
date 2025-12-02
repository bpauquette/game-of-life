
import React, { useState } from 'react';
import GameOfLifeApp from './GameOfLifeApp';
import { AuthProvider } from "../auth/AuthProvider";
import { useAuthStatus } from "../auth/useAuthStatus";
import Login from "../auth/Login";
import Register from "../auth/Register";

function AuthGate({ children }) {
  const { status, isAuthenticated } = useAuthStatus();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  if (status === 'checking') {
    return (
      <div style={{ color: 'white', padding: 16 }}>Checking session…</div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  return (
    <div style={{ color: 'white', padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          disabled={mode === 'login'}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          disabled={mode === 'register'}
          style={{ marginLeft: 8 }}
        >
          Register
        </button>
      </div>
      {mode === 'login' ? <Login /> : <Register />}
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <div style={{ backgroundColor: 'black', minHeight: '100vh', padding: 0 }}>
        <AuthGate>
          <GameOfLifeApp />
        </AuthGate>
      </div>
    </AuthProvider>
  );
};

export default App;


