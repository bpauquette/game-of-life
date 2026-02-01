import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

/**
 * GameContext: Model-First State Management
 *
 * - All core game state (e.g., tool selection, running state, grid state) is managed by the model/controller (GameModel/GameController).
 * - UI components never set core state directly; they dispatch requests via callbacks (e.g., requestToolChange) that call controller/model methods.
 * - UI state is updated only in response to model/controller events (e.g., selectedToolChanged), never by direct setState or Zustand set* calls for core state.
 * - This ensures a single source of truth and prevents UI/model divergence.
 *
 * Context shape:
 *   - canvasRef
 *   - drawWithOverlay
 *   - gameRef
 *   - controlsProps
 *   - selectedTool (string)
 *   - requestToolChange (function)
 */
export const GameContext = createContext({
  canvasRef: null,
  drawWithOverlay: () => {},
  gameRef: null,
  controlsProps: null,
  selectedTool: 'draw',
  requestToolChange: () => {},
});

export function useGameContext() {
  return useContext(GameContext);
}


export function GameProvider({ canvasRef, drawWithOverlay, gameRef, controlsProps, selectedTool, requestToolChange, children }) {
  const value = { canvasRef, drawWithOverlay, gameRef, controlsProps, selectedTool, requestToolChange };
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
  selectedTool: PropTypes.string,
  requestToolChange: PropTypes.func,
  children: PropTypes.node,
};
