import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

// Define the shape of the context
export const GameContext = createContext({
  canvasRef: null,
  drawWithOverlay: () => {},
  gameRef: null,
  controlsProps: null,
});

export function useGameContext() {
  return useContext(GameContext);
}

export function GameProvider({ canvasRef, drawWithOverlay, gameRef, controlsProps, children }) {
  const value = { canvasRef, drawWithOverlay, gameRef, controlsProps };
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

GameProvider.propTypes = {
  canvasRef: PropTypes.any,
  drawWithOverlay: PropTypes.func,
  gameRef: PropTypes.any,
  controlsProps: PropTypes.any,
  children: PropTypes.node,
};
