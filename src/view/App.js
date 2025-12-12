
import React from 'react';
import GameOfLifeApp from './GameOfLifeApp';
import { AuthProvider } from "../auth/AuthProvider";
import { FRONTEND_VERSION, FRONTEND_TIMESTAMP } from '../version';

// NOTE: AuthProvider is still mounted so that save flows and
// other explicit auth actions can use authentication, but the
// global AuthGate wrapper has been removed so the main app is
// usable without logging in.


const App = () => {
  return (
    <AuthProvider>
      <div style={{ backgroundColor: 'black', minHeight: '100vh', padding: 0 }}>
        <div style={{position: 'fixed', top: 0, left: 0, background: '#eee', color: '#333', zIndex: 9999, padding: '2px 8px', fontSize: 12}}>
          Version: {FRONTEND_VERSION} | Built: {FRONTEND_TIMESTAMP}
        </div>
        <GameOfLifeApp />
      </div>
    </AuthProvider>
  );
};

export default App;


