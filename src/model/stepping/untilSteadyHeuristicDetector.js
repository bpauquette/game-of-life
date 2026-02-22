const UNTIL_STEADY_DEFAULTS = {
  confirmationsNeeded: 3,
  maxShipPeriod: 512,
  maxHistoryPerShape: 4096,
  emissionMinHistory: 48,
  emissionMaxPeriod: 64,
  minGrowthPerPeriod: 2,
  minAreaGrowthPerPeriod: 2
};

export class UntilSteadyHeuristicDetector {
  constructor(config = {}) {
    this.cfg = {
      ...UNTIL_STEADY_DEFAULTS,
      ...config
    };
    this.snapshotsByNormalized = new Map();
    this.candidates = new Map();
    this.populationHistory = [];
    this.areaHistory = [];
    this.stepHistory = [];
  }

  observe(step, cells) {
    const summary = this.summarizeSnapshot(step, cells);
    const cycle = this.detectCycle(summary);
    this.storeSnapshot(summary);
    if (cycle) return cycle;
    return this.detectPeriodicEmission(summary.step);
  }

  detectCycle(summary) {
    const matches = this.snapshotsByNormalized.get(summary.normalizedSignature);
    if (!Array.isArray(matches) || matches.length === 0) return null;

    let best = null;

    for (let idx = matches.length - 1; idx >= 0; idx -= 1) {
      const previous = matches[idx];
      const period = summary.step - previous.step;
      if (period <= 0 || period > this.cfg.maxShipPeriod) continue;

      if (summary.absoluteSignature === previous.absoluteSignature) {
        const exactCandidate = {
          key: `exact:${summary.normalizedSignature}:${period}`,
          mode: period === 1 ? 'still-life' : 'oscillator',
          period,
          expectedGap: period,
          dx: 0,
          dy: 0
        };
        best = this.pickPreferredCandidate(best, exactCandidate);
      } else {
        const dx = summary.anchorX - previous.anchorX;
        const dy = summary.anchorY - previous.anchorY;
        if (dx === 0 && dy === 0) continue;
        const shipCandidate = {
          key: `ship:${summary.normalizedSignature}:${period}:${dx}:${dy}`,
          mode: 'spaceship',
          period,
          expectedGap: period,
          dx,
          dy
        };
        best = this.pickPreferredCandidate(best, shipCandidate);
      }

      if (period === 1) break;
    }

    if (!best) return null;

    const confidence = this.bumpCandidate(best.key, summary.step, best.expectedGap);
    if (confidence < this.cfg.confirmationsNeeded) return null;

    const reason = best.mode === 'spaceship'
      ? `translation repeat confirmed (period=${best.period}, dx=${best.dx}, dy=${best.dy})`
      : `exact repeat confirmed (period=${best.period})`;

    return {
      mode: best.mode,
      step: summary.step,
      period: best.period,
      dx: best.dx,
      dy: best.dy,
      confidence,
      reason
    };
  }

  detectPeriodicEmission(step) {
    if (this.populationHistory.length < this.cfg.emissionMinHistory) return null;
    const maxPeriod = Math.min(
      this.cfg.emissionMaxPeriod,
      Math.floor((this.populationHistory.length - 1) / 3)
    );
    if (maxPeriod < 1) return null;

    for (let period = 1; period <= maxPeriod; period += 1) {
      if (!this.hasRepeatingPopulationDeltas(period)) continue;

      const last = this.populationHistory.length - 1;
      const growth = this.populationHistory[last] - this.populationHistory[last - period];
      const areaGrowth = this.areaHistory[last] - this.areaHistory[last - period];
      if (
        growth < this.cfg.minGrowthPerPeriod &&
        areaGrowth < this.cfg.minAreaGrowthPerPeriod
      ) {
        continue;
      }

      const confidence = this.bumpCandidate(`emit:${period}`, step, 1);
      if (confidence < this.cfg.confirmationsNeeded) continue;

      return {
        mode: 'periodic-with-emission',
        step,
        period,
        dx: 0,
        dy: 0,
        confidence,
        reason: `population/bounding growth repeats every ${period} steps`
      };
    }

    return null;
  }

  hasRepeatingPopulationDeltas(period) {
    const n = this.populationHistory.length;
    if (n < (period * 3) + 1) return false;

    for (let i = 0; i < period; i += 1) {
      const d0 = this.populationHistory[n - 1 - i] - this.populationHistory[n - 2 - i];
      const d1 = this.populationHistory[n - 1 - period - i] - this.populationHistory[n - 2 - period - i];
      const d2 = this.populationHistory[n - 1 - (period * 2) - i] - this.populationHistory[n - 2 - (period * 2) - i];
      if (d0 !== d1 || d1 !== d2) return false;
    }

    return true;
  }

  bumpCandidate(key, step, expectedGap) {
    const current = this.candidates.get(key);
    let nextScore = 1;

    if (
      current &&
      current.expectedGap === expectedGap &&
      (step - current.lastStep) === expectedGap
    ) {
      nextScore = current.score + 1;
    }

    this.candidates.set(key, {
      score: nextScore,
      lastStep: step,
      expectedGap
    });

    return nextScore;
  }

  pickPreferredCandidate(current, next) {
    if (!current) return next;
    if (next.period < current.period) return next;
    if (next.period > current.period) return current;
    if (current.mode === 'spaceship' && next.mode !== 'spaceship') return next;
    return current;
  }

  storeSnapshot(summary) {
    const normalizedBucket = this.snapshotsByNormalized.get(summary.normalizedSignature) || [];
    normalizedBucket.push(summary);
    if (normalizedBucket.length > this.cfg.maxHistoryPerShape) {
      normalizedBucket.shift();
    }
    this.snapshotsByNormalized.set(summary.normalizedSignature, normalizedBucket);

    this.populationHistory.push(summary.population);
    this.areaHistory.push(summary.area);
    this.stepHistory.push(summary.step);
    const historyLimit = Math.max(128, this.cfg.maxHistoryPerShape);
    while (this.populationHistory.length > historyLimit) this.populationHistory.shift();
    while (this.areaHistory.length > historyLimit) this.areaHistory.shift();
    while (this.stepHistory.length > historyLimit) this.stepHistory.shift();
  }

  summarizeSnapshot(step, cells) {
    const coords = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const key of cells) {
      const [xText, yText] = String(key).split(',');
      const x = Number(xText);
      const y = Number(yText);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      coords.push({ x: ix, y: iy });
      minX = Math.min(minX, ix);
      minY = Math.min(minY, iy);
      maxX = Math.max(maxX, ix);
      maxY = Math.max(maxY, iy);
    }

    if (coords.length === 0) {
      return {
        step,
        population: 0,
        area: 0,
        anchorX: 0,
        anchorY: 0,
        absoluteSignature: '',
        normalizedSignature: ''
      };
    }

    const absoluteSignature = coords
      .map((cell) => `${cell.x},${cell.y}`)
      .sort()
      .join('|');
    const normalizedSignature = coords
      .map((cell) => `${cell.x - minX},${cell.y - minY}`)
      .sort()
      .join('|');
    const width = (maxX - minX) + 1;
    const height = (maxY - minY) + 1;

    return {
      step,
      population: coords.length,
      area: width * height,
      anchorX: minX,
      anchorY: minY,
      absoluteSignature,
      normalizedSignature
    };
  }
}

export const untilSteadyDefaults = UNTIL_STEADY_DEFAULTS;
