/* eslint-env worker */
import LiveCellIndex from '../model/liveCellIndex';
import { step as gameStep } from '../model/gameLogic';

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
