// src/workers/gameWorker.js

let timerId = null;
let isRunning = false;
let stepInterval = 1000 / 30; // Default to 30 GPS

function startLoop() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    // Notify main thread to perform a step
    self.postMessage({ command: 'step' });
  }, stepInterval);
}

globalThis.onmessage = function(e) {
  const { command, payload } = e.data || {};

  switch (command) {
    case 'start':
      if (!isRunning) {
        isRunning = true;
        startLoop();
      }
      break;
    case 'stop':
      if (isRunning) {
        isRunning = false;
        clearInterval(timerId);
        timerId = null;
      }
      break;
    case 'set-interval':
      stepInterval = payload || stepInterval;
      if (isRunning) {
        startLoop();
      }
      break;
    default:
      // Unknown command: no-op for performance.
  }
};
