
import React from 'react';
import GameOfLifeApp from './GameOfLifeApp.js';
import { AuthProvider } from "../auth/AuthProvider.jsx";

// NOTE: AuthProvider is still mounted so that save flows and
// other explicit auth actions can use authentication, but the
// global AuthGate wrapper has been removed so the main app is
// usable without logging in.


const App = () => {
  return (
    <AuthProvider>
      <div style={{ backgroundColor: 'black', minHeight: '100vh', padding: 0 }}>
        <GameOfLifeApp />
      </div>
    </AuthProvider>
  );
};

export default App;


