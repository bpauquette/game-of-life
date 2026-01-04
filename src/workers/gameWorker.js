// src/workers/gameWorker.js

let timerId = null;
let isRunning = false;
let stepInterval = 1000 / 30; // Default to 30 GPS

self.onmessage = function(e) {
  const { command, payload } = e.data;

  switch (command) {
    case 'start':
      if (!isRunning) {
        isRunning = true;
        timerId = setInterval(() => {
          self.postMessage({ command: 'step' });
        }, stepInterval);
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
      stepInterval = payload;
      if (isRunning) {
        clearInterval(timerId);
        timerId = setInterval(() => {
          self.postMessage({ command: 'step' });
        }, stepInterval);
      }
      break;
    default:
      // Acknowledge unknown commands, but don't throw an error.
      // This allows for future expansion without breaking older workers.
      console.log(`[GameWorker] Unknown command: ${command}`);
  }
};
