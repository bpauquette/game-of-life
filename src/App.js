import React from 'react';

// ...existing imports...

const FRONTEND_VERSION = 'deployed-2025-12-12-1';
const FRONTEND_TIMESTAMP = new Date().toISOString();

function App() {
  // ...existing code...
  return (
    <div>
      <div style={{position: 'fixed', top: 0, left: 0, background: '#eee', color: '#333', zIndex: 9999, padding: '2px 8px', fontSize: 12}}>
        Version: {FRONTEND_VERSION} | Built: {FRONTEND_TIMESTAMP}
      </div>
      {/* ...existing app code... */}
    </div>
  );
}

export default App;