// src/model/stepping/runUntil.js
// Generic helpers to run the simulation until a condition is met.

/**
 * Run an asynchronous step function until predicate indicates completion
 * or maxSteps is reached.
 * @param {{
 *  step: (n?: number) => Promise<void>,
 *  getHash?: () => string,
 *  isStable?: () => boolean,
 *  maxSteps?: number,
 *  onProgress?: (info: { current: number, total: number }) => void
 * }} opts
 */
export async function runUntil(opts = {}) {
  const step = opts.step;
  if (typeof step !== 'function') throw new Error('runUntil requires a step function');
  const getHash = typeof opts.getHash === 'function' ? opts.getHash : null;
  const isStable = typeof opts.isStable === 'function' ? opts.isStable : null;
  const maxSteps = Math.max(1, Number(opts.maxSteps) || 200);
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

  const seen = getHash ? new Set() : null;
  let steps = 0;
  let steady = false;

  while (steps < maxSteps) {
    if (getHash) {
      const h = getHash();
      if (seen.has(h)) { steady = true; break; }
      seen.add(h);
    } else if (isStable && isStable()) {
      steady = true;
      break;
    }

    await step(1);
    steps += 1;

    if (onProgress) {
      try { onProgress({ current: steps, total: maxSteps }); } catch (_) { /* ignore progress errors */ }
    }

    if (getHash) {
      const nh = getHash();
      // unchanged implies still life
      if (nh && seen.has(nh)) { steady = true; break; }
    } else if (isStable && isStable()) {
      steady = true;
      break;
    }
  }

  return { steady, steps };
}

/**
 * Convenience: run main model/controller until a steady state or repeat.
 * Uses model.getStateHash() to detect repeats, avoiding coupling to history globalThiss.
 */
export async function runUntilSteadyModel(model, controller, opts = {}) {
  if (!model || !controller) throw new Error('runUntilSteadyModel requires model and controller');
  return runUntil({
    step: async () => controller.step(),
    getHash: () => model.getStateHash(),
    maxSteps: opts.maxSteps || 200,
    onProgress: opts.onProgress,
  });
}

const exported = { runUntil, runUntilSteadyModel };
export default exported;
