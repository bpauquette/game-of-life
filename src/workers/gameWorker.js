// src/workers/gameWorker.js

let timerId = null;
let isRunning = false;
let stepInterval = 1000 / 30; // Default to 30 GPS

function startLoop() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    // Notify main thread to perform a step
    self.postMessage({ command: 'step' });
    // Also post a lightweight debug message so main thread can confirm stepping
    try { self.postMessage({ command: 'debug', msg: 'worker-step' }); } catch (e) { console.warn('Exception caught in startLoop (worker-step):', e); }
  }, stepInterval);
}

globalThis.onmessage = function(e) {
  const { command, payload } = e.data || {};
  try { console.debug('[GameWorker] onmessage', command, payload); } catch (e) { console.warn('Exception caught in onmessage (debug):', e); }

  switch (command) {
    case 'start':
      if (!isRunning) {
        isRunning = true;
        startLoop();
        try { self.postMessage({ command: 'debug', msg: 'worker-started' }); } catch (e) { console.warn('Exception caught in onmessage (worker-started):', e); }
      }
      break;
    case 'stop':
      if (isRunning) {
        isRunning = false;
        clearInterval(timerId);
        timerId = null;
        try { self.postMessage({ command: 'debug', msg: 'worker-stopped' }); } catch (e) { console.warn('Exception caught in onmessage (worker-stopped):', e); }
      }
      break;
    case 'set-interval':
      stepInterval = payload || stepInterval;
      if (isRunning) {
        startLoop();
        try { self.postMessage({ command: 'debug', msg: 'worker-interval-updated', payload: stepInterval }); } catch (e) { console.warn('Exception caught in onmessage (worker-interval-updated):', e); }
      }
      break;
    default:
      // Acknowledge unknown commands, but don't throw an error.
      try { console.log(`[GameWorker] Unknown command: ${command}`); } catch (e) { console.warn('Exception caught in onmessage (unknown-command log):', e); }
      try { self.postMessage({ command: 'debug', msg: 'unknown-command', payload: command }); } catch (e) { console.warn('Exception caught in onmessage (unknown-command postMessage):', e); }
  }
};
