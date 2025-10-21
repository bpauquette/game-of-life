
import React from 'react';
import GameOfLifeMVC from '../controller/GameOfLifeMVC';

const App = () => {
return React.createElement(
'div',
{ style: { backgroundColor: 'black', minHeight: '100vh', padding: '16px' } },
React.createElement(GameOfLifeMVC, null)
);
}

export default App;

