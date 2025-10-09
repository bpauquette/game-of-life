
import React from 'react';
import GameOfLife from './GameOfLife';

function App() {
return React.createElement(
'div',
{ style: { backgroundColor: 'black', minHeight: '100vh', padding: '16px' } },
React.createElement('h1', { style: { color: 'white' } }, "Conway's Game of Life"),
React.createElement(GameOfLife, null)
);
}

export default App;

