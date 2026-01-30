/* global self */
import LiveCellIndex from '../model/liveCellIndex.js';
import { step as gameStep } from '../model/gameLogic.js';

let currentState = new LiveCellIndex();

const buildStateFromCells = (cells) => {
  if (!Array.isArray(cells)) {
    return currentState;
  }
  currentState = LiveCellIndex.fromCells(cells);
  return currentState;
};

const performStep = (generations = 1) => {
  const iterations = Math.max(1, Number(generations) || 1);
  for (let i = 0; i < iterations; i += 1) {
    if (currentState.size === 0) {
      currentState = new LiveCellIndex();
      continue;
    }
    currentState = gameStep(currentState);
  }
  return { cells: currentState.toArray(), generations: iterations, population: currentState.size };
};

self.addEventListener('message', (event) => {
  // Only accept messages from the same origin (if origin is defined)
  if (event.origin && event.origin !== self.origin) {
    self.postMessage({ type: 'log', level: 'warn', message: `simulationWorker: rejected message from origin ${event.origin}` });
    return;
  }
  const msg = event.data || {};
  switch (msg.type) {
    case 'hydrate':
      buildStateFromCells(msg.cells);
      self.postMessage({ type: 'hydrated', population: currentState.size });
      break;
    case 'step': {
      if (Array.isArray(msg.cells)) {
        buildStateFromCells(msg.cells);
      }
      const result = performStep(msg.generations || 1);
      self.postMessage({ type: 'stepResult', ...result });
      break;
    }
    case 'reset':
      currentState = new LiveCellIndex();
      self.postMessage({ type: 'resetAck' });
      break;
    default:
      self.postMessage({ type: 'log', level: 'warn', message: `simulationWorker: unknown message ${msg.type}` });
      break;
  }
});
