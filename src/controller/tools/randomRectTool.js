import logger from '../utils/logger';
let createRandomRectWorker;
if (globalThis.window !== undefined && globalThis.Worker !== undefined) {
  // In browser, use a static string for the worker URL
  createRandomRectWorker = function() {
    return new globalThis.Worker(new URL('./randomRectWorker.js', globalThis.window.location.href));
  };
} else {
  // In Node/Jest, provide a mock that never references import.meta.url
  createRandomRectWorker = function() {
    return { postMessage: () => {}, terminate: () => {}, onmessage: null };
  };
}
export { flushRandomRectBuffer };

// Randomize cells within a dragged rectangle. Commits on mouseup.
export const randomRectTool = {
  // Optionally accept a probability in state.prob (0..1)
  onMouseDown(state, x, y) {
    state.start = { x, y };
    state.last = { x, y };
    // initialize preview array for tests and UI
    state.preview = [];
    if (state.prob == null) state.prob = 0.5;
  },

  onMouseMove(state, x, y) {
    if (!state.start) return;
    // Update last position and compute preview rectangle
    state.last = { x, y };
    const pts = computeRect(state.start.x, state.start.y, x, y);
    state.preview = pts;
  },

  onMouseUp(state, x, y, setCellAlive) {
    if (!state.start) return;
    const pts = computeRect(state.start.x, state.start.y, x, y);
    const p = Math.max(0, Math.min(1, state.prob ?? 0.5));

    // Always use controller buffer for double buffering
    if (pts.length > 500 && globalThis.window !== undefined && globalThis.Worker !== undefined && state._controller) {
      drawInWorker(state, x, y, p, pts, setCellAlive);
    }
    else {
      // Small rectangles: synchronous
      drawSynchronous(pts, p, setCellAlive, state);
    }
  },
  drawOverlay(ctx, state, cellSize, offset) {
    if (!(state?.preview?.length)) return;
    // semi-transparent white fill similar to other tools
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const pt of state.preview) {
      const px = pt[0] * cellSize - offset.x;
      const py = pt[1] * cellSize - offset.y;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }
};

const computeRect = (x0, y0, x1, y1) => {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const pts = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      pts.push([x, y]);
    }
  }
  return pts;
};

function drawSynchronous(pts, p, setCellAlive, state) {
  for (const point of pts) {
    const px = point[0];
    const py = point[1];
    const shouldBeAlive = Math.random() < p;
    setCellAlive(px, py, shouldBeAlive);
  }
  state.start = null;
  state.last = null;
  state.preview = [];
}

function drawInWorker(state, x, y, p, pts, setCellAlive) {
  let isJest = typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined;
  try {
    let worker;
    if (isJest) {
      // In Jest, mock the Worker to avoid import.meta.url issues
      worker = { postMessage: () => { }, terminate: () => { }, onmessage: null };
    } else {
      worker = createRandomRectWorker();
    }
    worker.postMessage({ x0: state.start.x, y0: state.start.y, x1: x, y1: y, prob: p });
    // Clear previous buffer before starting
    state._controller.randomRectBuffer = null;
    worker.onmessage = function (e) {
      const { cells } = e.data;
      state._controller.randomRectBuffer = cells;
      worker.terminate();
    };
  } catch (err) {
    logger.error('Failed to start randomRectWorker:', err);
    // Fallback to synchronous
    for (const point of pts) {
      const px = point[0];
      const py = point[1];
      const shouldBeAlive = Math.random() < p;
      setCellAlive(px, py, shouldBeAlive);
    }
  }
  // Do not apply cells yet; wait for buffer
  state.start = null;
  state.last = null;
  state.preview = [];
}

/**
 * Apply any buffered random-rect cells into the grid via setCellAlive and clear the buffer.
 * Accepts flexible buffer item shapes returned by the worker: [x,y,alive], [x,y], or {x,y,alive}.
 */
function flushRandomRectBuffer(state, setCellAlive) {
  // Prefer controller buffer if available
  const controller = state?._controller;
  const buf = controller?.randomRectBuffer ?? state?.randomRectBuffer;
  if (!buf || typeof setCellAlive !== 'function') return;
  for (const item of buf) {
    if (Array.isArray(item)) {
      const [px, py, alive] = item;
      const shouldAlive = alive === undefined ? true : !!alive;
      setCellAlive(px, py, shouldAlive);
    } else if (item && typeof item === 'object' && 'x' in item && 'y' in item) {
      setCellAlive(item.x, item.y, !!item.alive);
    }
  }
  // Clear both controller and toolState buffers
  if (controller) controller.randomRectBuffer = null;
  state.randomRectBuffer = null;
}