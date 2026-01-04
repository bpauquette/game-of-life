# Phase 3 - Implementation Plan & Progress

**Status:** 🚀 **PHASE 3 STARTED**  
**Start Date:** January 4, 2026  
**Target Completion:** 7-10 days  
**Priority Order:** FOR → String Functions → BREAK/CONTINUE → HEADING → Error Messages

---

## Phase 3 Objectives

### Priority 1: FOR Loops (HIGH PRIORITY - DEFERRED FEATURE)
**Estimated Effort:** 3-4 hours  
**Complexity:** Medium (nested loop handling, step variables)  

**Syntax:**
```
FOR variable FROM start TO end
  commands...
END

FOR variable FROM start TO end STEP step_size
  commands...
END
```

**Examples:**
```
FOR i FROM 1 TO 10
  PRINT i
END

FOR x FROM 0 TO 100 STEP 10
  GOTO x 50
  CIRCLE 5
END
```

**Implementation Plan:**
1. Add FOR pattern matching in execBlock
2. Parse FROM, TO, and optional STEP clauses
3. Support numeric and variable values
4. Handle negative steps (counting down)
5. Add comprehensive test cases

**Test Cases to Add:** 6-8 tests
- Basic FOR loop execution
- Variable updates in iterations
- STEP parameter (custom increment)
- Nested FOR loops
- FOR with drawing commands
- FOR with WHILE inside
- Edge cases (empty range, single iteration)

---

### Priority 2: String Functions (MEDIUM PRIORITY)
**Estimated Effort:** 2-3 hours  
**Complexity:** Low (mostly utility functions)

**Functions:**
```
STRLEN "text"          → returns string length
SUBSTRING str 0 5      → returns substring
TOUPPER "text"         → returns uppercase
TOLOWER "TEXT"         → returns lowercase
TRIM "  text  "        → removes whitespace
INDEX str "pattern"    → finds substring index
REPLACE old new str    → replaces all occurrences
```

**Examples:**
```
len = STRLEN "Hello"          # len = 5
sub = SUBSTRING name 0 3      # first 3 chars
upper = TOUPPER "hello"       # "HELLO"
pos = INDEX "hello" "l"       # pos = 2
```

**Implementation Plan:**
1. Add function parsing to evalExpr
2. Implement each string function
3. Support string variables and literals
4. Error handling for invalid arguments

**Test Cases to Add:** 5-6 tests
- STRLEN with various strings
- SUBSTRING with bounds
- TOUPPER/TOLOWER with mixed case
- Function composition
- Error handling (invalid indices)

---

### Priority 3: BREAK/CONTINUE (MEDIUM PRIORITY)
**Estimated Effort:** 2-3 hours  
**Complexity:** Medium (loop state tracking)

**Syntax:**
```
BREAK      # Exit current loop
CONTINUE   # Skip to next iteration
```

**Examples:**
```
WHILE true
  IF counter > 10
    BREAK
  END
  counter = counter + 1
END

FOR i FROM 1 TO 10
  IF i % 2 == 0
    CONTINUE
  END
  PRINT i
END
```

**Implementation Plan:**
1. Add special control flow flags to state
2. Implement BREAK detection in loop handlers
3. Implement CONTINUE detection in loop handlers
4. Handle nested loops correctly
5. Add comprehensive test cases

**Test Cases to Add:** 5-6 tests
- BREAK in WHILE loop
- CONTINUE in FOR loop
- Nested loop control
- BREAK with multiple nesting levels
- CONTINUE with drawing commands

---

### Priority 4: HEADING/DIRECTION (LOW PRIORITY - NICE TO HAVE)
**Estimated Effort:** 2-3 hours  
**Complexity:** Medium (turtle graphics state)

**Commands:**
```
HEADING angle           # Set direction (0-360°)
HEADING?               # Query current heading
FORWARD distance       # Move in heading direction
PENDOWN
PENUP
```

**Implementation Plan:**
1. Add heading to state object (x, y, heading, penDown)
2. Implement HEADING setter/getter
3. Implement FORWARD command
4. Update drawing to follow heading
5. Add trigonometry for direction calculation

---

### Priority 5: Error Messages (POLISH - LOW PRIORITY)
**Estimated Effort:** 2 hours  
**Complexity:** Low (error handling)

**Improvements:**
- Line number tracking in parser
- Helpful error suggestions
- Validation of command syntax
- Argument count checking

---

## Detailed Implementation: FOR Loops (Phase 3.1)

### 1. Parser Enhancement

**Location:** `src/view/scriptingInterpreter.js`, `execBlock()` function

**Pattern Matching:**
```javascript
// FOR variable FROM start TO end [STEP step]
const forMatch = line.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+))?$/i);
```

**Parsing Logic:**
1. Extract variable name (loop counter)
2. Parse FROM expression (start value)
3. Parse TO expression (end value)
4. Parse optional STEP expression (increment)
5. Find matching END token
6. Handle nested FOR loops with nesting counter

### 2. Execution Logic

**Algorithm:**
```javascript
if (forMatch) {
  const varName = forMatch[1];
  const startExpr = forMatch[2];
  const endExpr = forMatch[3];
  const stepExpr = forMatch[4] || '1';
  
  const start = Math.floor(evalExpr(startExpr, state));
  const end = Math.floor(evalExpr(endExpr, state));
  const step = Math.floor(evalExpr(stepExpr, state));
  
  if (step === 0) throw new Error('FOR loop STEP cannot be zero');
  
  const blockStart = i + 1;
  const blockEnd = findMatchingEnd(blocks, i);
  
  if (step > 0) {
    for (let val = start; val <= end; val += step) {
      state.vars[varName] = val;
      execBlock(blocks.slice(blockStart, blockEnd), state, ...args);
      if (state.loopBreak) break;
      state.loopContinue = false;
    }
  } else {
    for (let val = start; val >= end; val += step) {
      state.vars[varName] = val;
      execBlock(blocks.slice(blockStart, blockEnd), state, ...args);
      if (state.loopBreak) break;
      state.loopContinue = false;
    }
  }
  
  state.loopBreak = false;
  i = blockEnd + 1;
  continue;
}
```

### 3. Test Coverage

**File:** `src/new-tests/scriptingLanguage.comprehensive.test.js`

**Test Cases:**
```javascript
describe('FOR Loops', () => {
  it('should execute FOR loop with numeric range', () => {
    const script = `FOR i FROM 1 TO 5
  x = x + i
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { x: 0 }, cells: new Set() };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.x).toBe(15); // 1+2+3+4+5 = 15
  });

  it('should support FOR loop with STEP parameter', () => {
    const script = `FOR i FROM 0 TO 10 STEP 2
  count = count + 1
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(6); // 0,2,4,6,8,10 = 6 iterations
  });

  it('should support negative STEP (counting down)', () => {
    const script = `FOR i FROM 10 TO 1 STEP -1
  sum = sum + i
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { sum: 0 }, cells: new Set() };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.sum).toBe(55); // 10+9+...+1 = 55
  });

  it('should support nested FOR loops', () => {
    const script = `FOR x FROM 1 TO 3
  FOR y FROM 1 TO 3
    count = count + 1
  END
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(9); // 3x3 nested loop
  });

  it('should support FOR with drawing commands', () => {
    const script = `FOR i FROM 0 TO 4
  RECT 5 5
  x = x + 10
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { x: 0 }, cells: new Set(), penDown: true };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.x).toBe(40);
    expect(state.cells.size).toBe(125); // 5x5 rectangles × 5 iterations
  });

  it('should handle empty FOR range (no iterations)', () => {
    const script = `FOR i FROM 5 TO 1
  count = count + 1
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(0); // No iterations (5 > 1 with step +1)
  });
});
```

---

## Implementation Roadmap (Phase 3)

### Week 1
| Day | Task | Est. Time | Status |
|-----|------|-----------|--------|
| Mon | FOR loops implementation | 3-4h | ⏳ |
| Tue | FOR tests + string functions | 3-4h | ⏳ |
| Wed | BREAK/CONTINUE implementation | 2-3h | ⏳ |
| Thu | Error handling & polish | 2-3h | ⏳ |
| Fri | Documentation & validation | 2h | ⏳ |

### Commits Expected
1. `feat: Implement FOR loops with STEP support`
2. `feat: Add string utility functions (STRLEN, SUBSTRING, etc.)`
3. `feat: Add BREAK/CONTINUE loop control`
4. `feat: Add HEADING/DIRECTION turtle graphics support`
5. `improve: Enhanced error messages with line numbers`

---

## Success Criteria

- ✅ All FOR loop variants working (basic, STEP, nested)
- ✅ String functions implemented and tested
- ✅ BREAK/CONTINUE working in nested loops
- ✅ Optional: HEADING support for turtle graphics
- ✅ All tests passing (target: 85+ out of 90+)
- ✅ Zero regressions from Phase 2 work
- ✅ Performance maintained (no slowdowns)
- ✅ Code quality consistent with existing patterns

---

## Phase 3 Progress Tracker

### Phase 3.1: FOR Loops
- [ ] Add FOR pattern matching
- [ ] Implement FOR execution logic
- [ ] Handle STEP parameter
- [ ] Support nested FOR loops
- [ ] Add 6-8 test cases
- [ ] Commit changes
- [ ] Update documentation

### Phase 3.2: String Functions
- [ ] Add string function parsing to evalExpr
- [ ] Implement STRLEN, SUBSTRING, TOUPPER, TOLOWER
- [ ] Add TRIM, INDEX, REPLACE functions
- [ ] Add 5-6 test cases
- [ ] Commit changes
- [ ] Update documentation

### Phase 3.3: BREAK/CONTINUE
- [ ] Add control flow state tracking
- [ ] Implement BREAK in loop handlers
- [ ] Implement CONTINUE in loop handlers
- [ ] Handle nested loops
- [ ] Add 5-6 test cases
- [ ] Commit changes
- [ ] Update documentation

### Phase 3.4: Polish & Validation
- [ ] Full test suite validation
- [ ] Performance benchmarking
- [ ] Error message improvements
- [ ] Documentation updates
- [ ] Final commit and Phase 3 completion report

---

## Known Challenges & Solutions

### Challenge 1: Nested Loop Control
**Problem:** BREAK/CONTINUE should only affect immediate loop, not outer loops  
**Solution:** Track loop depth in state, check depth before processing break/continue

### Challenge 2: Variable Scoping
**Problem:** FOR loop variables should be available after loop  
**Solution:** Keep variables in global scope (simple approach), consider local scope in Phase 4

### Challenge 3: String Function Parsing
**Problem:** Need to parse function calls within expressions  
**Solution:** Extend evalExpr to recognize function patterns before arithmetic operators

### Challenge 4: Performance with Large Ranges
**Problem:** FOR i FROM 1 TO 1000000 could be slow  
**Solution:** Implement efficiently, test with large ranges, consider optimization if needed

---

## Dependencies

- **Phase 2 Prerequisites:** ✅ All complete
  - AND/OR/NOT operators
  - ELSE clause
  - CIRCLE command
  - STEP optimization

- **External Dependencies:** None (using existing JavaScript features)

- **Test Infrastructure:** ✅ Ready
  - Jest test suite
  - parseBlocks/execBlock infrastructure
  - Test utilities

---

## Quick Links to Key Files

- **Main Interpreter:** [src/view/scriptingInterpreter.js](src/view/scriptingInterpreter.js)
- **Expression Engine:** [src/view/scriptingEngine.js](src/view/scriptingEngine.js)
- **Test Suite:** [src/new-tests/scriptingLanguage.comprehensive.test.js](src/new-tests/scriptingLanguage.comprehensive.test.js)
- **Phase 2 Complete Report:** [PHASE2_COMPLETION_REPORT.md](PHASE2_COMPLETION_REPORT.md)

---

## Next Steps

1. ✅ Create Phase 3 implementation plan (this document)
2. ⏳ Begin FOR loops implementation
3. ⏳ Add comprehensive FOR loop tests
4. ⏳ Implement string functions
5. ⏳ Implement BREAK/CONTINUE
6. ⏳ Polish and finalize Phase 3

**Ready to begin FOR loop implementation!**

---

**Plan Created:** January 4, 2026  
**Status:** 🚀 **READY TO IMPLEMENT**  
**Next Task:** FOR loops implementation (Phase 3.1)
