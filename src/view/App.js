
import React from 'react';
import GameOfLifeApp from './GameOfLifeApp';

const App = () => {
  return (
    // Remove the default outer padding so the canvas and chrome can align
    // exactly with the viewport edges. This prevents a visible gutter
    // during layout transitions in both Chrome and Firefox.
    <div style={{ backgroundColor: 'black', minHeight: '100vh', padding: 0 }}>
      <GameOfLifeApp />
    </div>
  );
};

export default App;

