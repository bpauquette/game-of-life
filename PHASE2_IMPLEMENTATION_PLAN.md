# Phase 2 Enhancement Plan - Implementation

**Timeline:** 2-3 weeks
**Priority:** AND/OR/NOT operators, ELSE clause, CIRCLE command implementation
**Defer:** FOR loops (WHILE is functionally equivalent)

---

## 1. AND/OR/NOT Logical Operators

### Current State
- Conditions support: `==`, `!=`, `<`, `>`, `<=`, `>=`
- No compound conditions: must use nested IF blocks

### What's Needed

```javascript
// CURRENT (nested IF):
IF x > 5
  IF y < 10
    PRINT "in range"
  END
END

// DESIRED (AND/OR/NOT):
IF x > 5 AND y < 10
  PRINT "in range"
END

IF x < 0 OR x > 100
  PRINT "out of range"
END

IF NOT done
  PRINT "not finished"
END
```

### Implementation

**File:** `src/view/scriptingEngine.js`

**Current `evalCond` function (simple comparison):**
```javascript
export function evalCond(lhs, op, rhs, state) {
  const left = parseValue(lhs, state);
  const right = parseValue(rhs, state);
  
  switch (op) {
    case '==': return left == right;
    case '!=': return left != right;
    case '<': return left < right;
    // ... etc
  }
}
```

**New: `evalCondCompound` function (handles AND/OR/NOT):**
```javascript
export function evalCondCompound(condition, state) {
  // Handle NOT prefix
  const notMatch = condition.match(/^NOT\s+(.+)$/i);
  if (notMatch) {
    return !evalCondCompound(notMatch[1], state);
  }
  
  // Handle OR (lowest precedence)
  const orMatch = condition.match(/^(.+?)\s+OR\s+(.+)$/i);
  if (orMatch) {
    return evalCondCompound(orMatch[1], state) || 
           evalCondCompound(orMatch[2], state);
  }
  
  // Handle AND (higher precedence than OR)
  const andMatch = condition.match(/^(.+?)\s+AND\s+(.+)$/i);
  if (andMatch) {
    return evalCondCompound(andMatch[1], state) && 
           evalCondCompound(andMatch[2], state);
  }
  
  // Simple comparison (fallback)
  const simpleMatch = condition.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
  if (simpleMatch) {
    return evalCond(simpleMatch[1], simpleMatch[2], simpleMatch[3], state);
  }
  
  return false;
}

export function splitCond(cond) {
  // Return raw condition for compound evaluation
  return [cond, 'compound', null];
}
```

**File:** `src/view/scriptingInterpreter.js`

**Update IF/WHILE block handling:**
```javascript
// BEFORE:
const [lhs, op, rhs] = splitCond(condition);
const result = evalCond(lhs, op, rhs, state);

// AFTER:
const result = evalCondCompound(condition, state);
```

### Tests to Add

```javascript
test('should support AND operator', () => {
  const result = evalCondCompound('5 > 3 AND 2 < 4', {});
  expect(result).toBe(true);
});

test('should support OR operator', () => {
  const result = evalCondCompound('5 < 3 OR 2 < 4', {});
  expect(result).toBe(true);
});

test('should support NOT operator', () => {
  const result = evalCondCompound('NOT 5 < 3', {});
  expect(result).toBe(true);
});

test('should support AND/OR precedence (AND higher than OR)', () => {
  // 5 < 3 OR 2 < 4 AND 6 > 5 = false OR true = true
  const result = evalCondCompound('5 < 3 OR 2 < 4 AND 6 > 5', {});
  expect(result).toBe(true);
});

test('should handle mixed operators', () => {
  const state = { x: 10, y: 5 };
  const result = evalCondCompound('NOT x < 5 AND y > 0', state);
  expect(result).toBe(true);
});
```

---

## 2. ELSE Clause for IF Statements

### Current State
- IF/END blocks work
- No ELSE support - must use nested IF/NOT pattern

### What's Needed

```javascript
// CURRENT (workaround):
IF x > 5
  PRINT "x is large"
END
IF NOT x > 5
  PRINT "x is small"
END

// DESIRED (ELSE):
IF x > 5
  PRINT "x is large"
ELSE
  PRINT "x is small"
END
```

### Implementation

**File:** `src/view/scriptingInterpreter.js`

**Update block parsing to recognize ELSE:**
```javascript
function parseIfElseBlock(blocks, startIdx) {
  // Find matching ELSE and END
  let elseIdx = null;
  let endIdx = null;
  let depth = 0;
  
  for (let i = startIdx + 1; i < blocks.length; i++) {
    const cmd = blocks[i].line.split(/\s+/)[0].toUpperCase();
    
    if (cmd === 'IF' || cmd === 'WHILE') depth++;
    else if (cmd === 'ELSE' && depth === 0) {
      elseIdx = i;
    }
    else if (cmd === 'END') {
      if (depth === 0) {
        endIdx = i;
        break;
      }
      depth--;
    }
  }
  
  return { elseIdx, endIdx };
}

// In execBlock, when handling IF:
const { elseIdx, endIdx } = parseIfElseBlock(blocks, i);
const condition = blocks[i].line.slice(2).trim(); // "IF condition"

if (evalCondCompound(condition, state)) {
  // Execute IF block
  const ifEnd = elseIdx || endIdx;
  execBlock(blocks.slice(i + 1, ifEnd), state, ...);
} else if (elseIdx) {
  // Execute ELSE block
  execBlock(blocks.slice(elseIdx + 1, endIdx), state, ...);
}

i = endIdx; // Skip to END
```

### Tests to Add

```javascript
test('should support ELSE clause', () => {
  const script = [
    'x = 3',
    'IF x > 5',
    '  result = "large"',
    'ELSE',
    '  result = "small"',
    'END'
  ];
  
  const state = executeScript(script, {});
  expect(state.vars.result).toBe('small');
});

test('should skip ELSE when IF is true', () => {
  const script = [
    'x = 10',
    'IF x > 5',
    '  result = "large"',
    'ELSE',
    '  result = "small"',
    'END'
  ];
  
  const state = executeScript(script, {});
  expect(state.vars.result).toBe('large');
});

test('should handle nested IF/ELSE', () => {
  const script = [
    'x = 10',
    'y = 3',
    'IF x > 5',
    '  IF y > 5',
    '    result = "both large"',
    '  ELSE',
    '    result = "x large"',
    '  END',
    'ELSE',
    '  result = "both small"',
    'END'
  ];
  
  const state = executeScript(script, {});
  expect(state.vars.result).toBe('x large');
});
```

---

## 3. CIRCLE Command Implementation

### Current State
- Documented in `languageDefinition.js` but not implemented
- OVAL exists but requires bounding box: `OVAL x1 y1 x2 y2`
- CIRCLE should be simpler: `CIRCLE x y radius` or `CIRCLE radius` (at current position)

### What's Needed

```javascript
// DESIRED (two variants):
GOTO 10 10
CIRCLE 5            // Circle at (10,10) with radius 5

// Or explicit:
CIRCLE 10 10 5      // x=10, y=10, radius=5
```

### Implementation

**File:** `src/view/scriptingInterpreter.js`

**Add CIRCLE command handler:**
```javascript
// CIRCLE command (with radius only - uses current position)
let circleMatch1 = line.match(/^circle\s+(\S+)$/i);
if (circleMatch1) {
  pauseForDrawing();
  const radius = Math.floor(parseValue(circleMatch1[1], state));
  const cx = state.x || 0;
  const cy = state.y || 0;
  
  // Use Midpoint Circle Algorithm
  const points = computeCircle(cx, cy, radius);
  for (const [x, y] of points) {
    state.cells.add(`${x},${y}`);
  }
  i++;
  continue;
}

// CIRCLE command (with x, y, radius)
let circleMatch2 = line.match(/^circle\s+(\S+)\s+(\S+)\s+(\S+)$/i);
if (circleMatch2) {
  pauseForDrawing();
  const cx = Math.floor(parseValue(circleMatch2[1], state));
  const cy = Math.floor(parseValue(circleMatch2[2], state));
  const radius = Math.floor(parseValue(circleMatch2[3], state));
  
  const points = computeCircle(cx, cy, radius);
  for (const [x, y] of points) {
    state.cells.add(`${x},${y}`);
  }
  i++;
  continue;
}
```

**Add Midpoint Circle Algorithm:**
```javascript
function computeCircle(cx, cy, radius) {
  const points = [];
  let x = radius;
  let y = 0;
  let decisionParam = 3 - 2 * radius;
  
  while (x >= y) {
    // All 8 octants
    points.push([cx + x, cy + y]);
    points.push([cx - x, cy + y]);
    points.push([cx + x, cy - y]);
    points.push([cx - x, cy - y]);
    points.push([cx + y, cy + x]);
    points.push([cx - y, cy + x]);
    points.push([cx + y, cy - x]);
    points.push([cx - y, cy - x]);
    
    y++;
    if (decisionParam <= 0) {
      decisionParam = decisionParam + 4 * y + 6;
    } else {
      x--;
      decisionParam = decisionParam + 4 * (y - x) + 10;
    }
  }
  
  return [...new Set(points.map(p => p.join(',')))].map(s => s.split(',').map(Number));
}
```

### Update Language Definition

**File:** `src/view/languageDefinition.js`

Move CIRCLE from "NOT YET SUPPORTED" to main command list:
```javascript
- CIRCLE radius - Draw circle at cursor (uses current position x, y)
- CIRCLE x y radius - Draw circle at (x, y) with given radius
```

### Tests to Add

```javascript
test('should execute CIRCLE with radius only', () => {
  const script = [
    'GOTO 10 10',
    'CIRCLE 5'
  ];
  
  const state = executeScript(script, {});
  expect(state.cells.size).toBeGreaterThan(0); // Circle should have cells
  expect(state.cells.has('10,5')).toBe(true); // Points on circle
});

test('should execute CIRCLE with x, y, radius', () => {
  const script = [
    'CIRCLE 10 10 5'
  ];
  
  const state = executeScript(script, {});
  expect(state.cells.size).toBeGreaterThan(0);
  // Verify some key points
  expect(state.cells.has('15,10')).toBe(true); // Right point
  expect(state.cells.has('10,5')).toBe(true);   // Top point
});

test('should handle circle with zero radius', () => {
  const script = ['CIRCLE 10 10 0'];
  const state = executeScript(script, {});
  // Circle with r=0 should just be the center point
  expect(state.cells.has('10,10')).toBe(true);
});

test('should handle circle with large radius', () => {
  const script = ['CIRCLE 0 0 100'];
  const state = executeScript(script, {});
  expect(state.cells.size).toBeGreaterThan(100); // Many cells for large circle
});
```

---

## 4. STEP Performance Optimization (New Priority)

See: `STEP_PERFORMANCE_ANALYSIS.md`

### Quick Summary
- Current: 1850ms for 10 steps (artificial delays)
- Proposed: 15ms for 10 steps (delegate to main loop)
- Improvement: ~100x faster

### Implementation
1. Add `GameController.stepNTimes(n, options)` method
2. Modify STEP handler to call `stepNTimes()`
3. Remove artificial delays
4. Optional: add slow-motion mode for learning

---

## Implementation Sequence

### Week 1: AND/OR/NOT Operators
1. Implement `evalCondCompound()` in `scriptingEngine.js`
2. Update IF/WHILE handlers to use `evalCondCompound()`
3. Add tests (5 test cases)
4. Update docs
5. **Estimated time:** 4-6 hours

### Week 2: ELSE Clause + CIRCLE Command
1. Implement ELSE parsing in `scriptingInterpreter.js` (2-3 hours)
2. Implement CIRCLE command with Midpoint Circle Algorithm (2-3 hours)
3. Add tests (8 test cases)
4. Update `languageDefinition.js`
5. Update docs
6. **Estimated time:** 6-8 hours

### Week 3: STEP Performance (Optional First, Time Permitting)
1. Add `GameController.stepNTimes()` method (2-3 hours)
2. Update STEP handler to delegate (1-2 hours)
3. Test performance improvement (1 hour)
4. Add slow-motion mode if time permits (1 hour)
5. **Estimated time:** 5-7 hours

---

## Success Criteria

- [ ] All existing tests continue to pass (53 tests)
- [ ] AND/OR/NOT tests pass (5+ new tests)
- [ ] ELSE tests pass (4+ new tests)
- [ ] CIRCLE tests pass (4+ new tests)
- [ ] STEP performance improves from 1850ms to ~50ms per 10 steps (stretch goal)
- [ ] No regressions in main game loop
- [ ] Documentation updated
- [ ] Commit with clear message

---

## Risk Assessment

| Enhancement | Risk | Mitigation |
|-------------|------|-----------|
| AND/OR/NOT | Condition parser complexity | Add comprehensive tests; start simple |
| ELSE | Block parsing complexity | Careful indent/nesting handling; test nested cases |
| CIRCLE | Algorithm correctness | Use well-known Midpoint Circle Algorithm; verify visually |
| STEP perf | Main loop interaction | Careful state sync; test with various STEP counts |

---

## Files to Modify

1. `src/view/scriptingEngine.js` - Add `evalCondCompound()`
2. `src/view/scriptingInterpreter.js` - ELSE, CIRCLE, STEP improvements
3. `src/view/languageDefinition.js` - Update docs
4. `src/new-tests/scriptingLanguage.comprehensive.test.js` - Add tests
5. `src/controller/GameController.js` - Add `stepNTimes()` (optional, stretch)

---

## Branch Strategy

Create feature branch for clean history:
```bash
git checkout -b feat/phase2-enhancements
# ... implement changes ...
git commit -m "feat: Implement Phase 2 enhancements (AND/OR/NOT, ELSE, CIRCLE)"
git push origin feat/phase2-enhancements
# Create PR for review
```

