# STEP Performance Analysis - Why It's Slow

## Current Implementation (scriptingInterpreter.js, lines 43-82)

```javascript
// CURRENT: STEP command in scriptingInterpreter.js
for (let i = 0; i < n; i++) {
  const cellsArr = Array.from(state.cells).map(s => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  });
  const next = ticks(cellsArr, 1);           // ← Call game stepping function
  state.cells = new Set();
  for (const key of next.keys ? next.keys() : Object.keys(next)) {
    state.cells.add(key);
    // ... dispatch events ...
  }
  if (onStep) onStep(new Set(state.cells));
  emitStepEvent(state.cells);
  // ... dispatch step animation event ...
  await new Promise(res => setTimeout(res, 180 + Math.min(200, 1000 / (i + 1))));
}
```

### Performance Bottlenecks

1. **Artificial Delays (PRIMARY)**
   - `setTimeout(res, 180 + Math.min(200, 1000 / (i + 1)))` - **Intentional 180-380ms delay per step**
   - This is designed for visual animation but makes STEP inherently slow
   - **Cost:** 180-380ms × n steps = 1.8s-3.8s for just 10 steps

2. **Data Format Conversion (SECONDARY)**
   - Converting `Set<"x,y">` → Array → `ticks()` → Object → Set
   - 4 conversions per step
   - **Cost:** ~1-5ms per step for large patterns

3. **Event Dispatch (TERTIARY)**
   - Dispatching multiple CustomEvents per step
   - Debugging output to console
   - **Cost:** ~1-2ms per step

4. **No Batching**
   - Each step independently calculated
   - No opportunity for optimization across multiple steps
   - **Cost:** Lost optimization opportunities

## Main Animation Loop (GameController.js, lines 746-783)

```javascript
startGameLoop() {
  const loop = async (timestamp) => {
    const delta = timestamp - this.lastFrameTime;
    const shouldStep = this.frameInterval <= 0 || delta >= this.frameInterval;
    
    if (shouldStep) {
      await this.model.step();           // ← Call step once per frame
      this.requestRender();
      this.lastFrameTime = timestamp;
    }
    
    this.animationId = requestAnimationFrame(loop);
  };
  this.animationId = requestAnimationFrame(loop);
}
```

### Why This Is Fast

1. **No Artificial Delays**
   - Runs at natural RAF speed (60 FPS)
   - **Cost:** ~16ms per frame

2. **Direct Model Access**
   - No data format conversions
   - Direct Set operations
   - **Cost:** ~0.5-1ms per step

3. **Minimal Events**
   - Only render requests
   - No debugging events
   - **Cost:** ~0.1ms per step

4. **Coalesced Rendering**
   - `requestRender()` handles batching
   - Avoids redundant redraws
   - **Cost:** Amortized over multiple steps

## Performance Comparison

```
STEP 10 (current):
├─ Artificial delay: 180ms × 10 = 1800ms
├─ Data conversions: 3ms × 10 = 30ms
├─ Events: 2ms × 10 = 20ms
└─ Total: ~1850ms (30 seconds for 160 steps!)

Main loop at 60 FPS:
├─ Model stepping: 1ms × 10 = 10ms
├─ Data ops: 0.5ms × 10 = 5ms
├─ Rendering: amortized 2ms
└─ Total: ~17ms (real-time at 60 FPS)
```

**STEP is ~100x slower due to artificial delays!**

## Why the Delays Exist

The delays were added for **visual feedback** - to show each generation animating on screen. But this conflicts with performance.

## Solution: Delegate STEP to Main Loop

### The Problem with Current Approach

STEP re-implements stepping logic instead of delegating to the main game loop:

```javascript
// CURRENT: Inline stepping in scriptingInterpreter.js
const next = ticks(cellsArr, 1);  // ← Separate stepping logic
```

### The Solution

Instead of STEP doing its own stepping, it should:
1. Tell the main loop to step N times
2. Let the main loop handle rendering and timing
3. Wait for completion

### Proposed Implementation

```javascript
// NEW: STEP delegates to main loop
case 'STEP': {
  const n = parseInt(args[0], 10);
  const controller = getGameController(); // ← Reference to main controller
  
  // Tell main loop to run N steps
  const promise = controller.stepNTimes(n, {
    onProgress: (current, total) => {
      emitStepEvent(state.cells);
      // Update visual feedback
    }
  });
  
  await promise;
  // Sync state from model after steps complete
  state.cells = new Set(controller.model.getLiveCells());
  break;
}

// In GameController:
async stepNTimes(n, options = {}) {
  const results = [];
  
  for (let i = 0; i < n; i++) {
    await this.model.step();
    results.push(new Set(this.model.getLiveCells()));
    
    if (options.onProgress) {
      options.onProgress(i + 1, n);
    }
  }
  
  this.requestRender();
  return results;
}
```

### Benefits

| Aspect | Current | Delegated |
|--------|---------|-----------|
| **Speed** | 1850ms for 10 steps | 10-50ms for 10 steps |
| **Code duplication** | Stepping logic in 2 places | Single source of truth |
| **Consistency** | Different code path | Same code path as animation |
| **Rendering** | Manual | Automatic |
| **Optimization** | Not possible | Can use hashlife, etc. |
| **Memory** | Separate state | Shared model |

### Implementation Steps

1. Add `GameController.stepNTimes(n, options)` method
2. Modify STEP handler to call `stepNTimes()`
3. Remove artificial delays (make them optional for "slow motion")
4. Sync scripting state with model after completion
5. Keep event dispatch for progress feedback

### Optional: "Slow Motion" Mode

```javascript
// For visual learning, optional slow mode:
async stepNTimes(n, options = {}) {
  const slowMotion = options.slowMotion || false;
  const delayMs = options.delayMs || 0; // 0 = fast
  
  for (let i = 0; i < n; i++) {
    await this.model.step();
    
    if (slowMotion || delayMs > 0) {
      // Optional: delay for visual effect
      await new Promise(res => setTimeout(res, delayMs));
    }
    
    this.requestRender();
    
    if (options.onProgress) {
      options.onProgress(i + 1, n);
    }
  }
}
```

Users could then do:
```
STEP 100         # Fast: 100 steps instantly
STEP 10 SLOW     # Future: 10 steps with visual animation
```

## Summary

**Why STEP is slow:**
1. **Artificial 180-380ms delays** per step (intentional for animation, but kills performance)
2. Data format conversions (minor)
3. Redundant event dispatch (minor)

**Why main loop is fast:**
1. No artificial delays
2. Direct data operations
3. Efficient rendering

**How to fix:**
1. Delegate STEP to `GameController.stepNTimes(n)`
2. Remove artificial delays (make optional)
3. Reuse main loop's stepping logic
4. Result: ~100x speedup (1850ms → 15ms for 10 steps)

**Trade-off:**
- **Current:** Visual feedback but slow
- **Proposed:** Fast by default, optional slow-motion mode

