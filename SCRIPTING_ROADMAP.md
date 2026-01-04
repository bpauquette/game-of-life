# GOL Scripting Language - Improvement Roadmap

## Executive Summary

The GOL scripting language is a **turtle-graphics inspired, imperative DSL** with significant potential but critical limitations that impede usability and expressiveness. This document outlines a concrete path to improve the language.

## Phase 1: Quality & Reliability (Week 1-2)
**Goal:** Fix critical bugs and improve error handling without breaking existing scripts.

### 1.1 Error Reporting with Line Numbers
**Current:** Silent failures; no indication what went wrong
**Improvement:**
```javascript
// Instead of:
function evalExpr(expr, state) {
  // ... fails silently ...
}

// Do this:
function evalExpr(expr, state, lineNumber) {
  try {
    // ... evaluation ...
  } catch (e) {
    throw new ScriptError(
      `Line ${lineNumber}: Invalid expression "${expr}"\n` +
      `  Reason: ${e.message}\n` +
      `  Hint: Expressions support +, -, *, / operators only`
    );
  }
}
```

### 1.2 Operator Precedence
**Current:** `2 + 3 * 4` evaluates to 20 (left-to-right) instead of 14
**Improvement:** Implement proper expression parser

```javascript
// Use a proper expression parser
import { parse } from 'expr-eval'; // or implement Pratt parser

function evalExpr(expr, state) {
  try {
    return parse(expr).evaluate(state.vars);
  } catch (e) {
    throw new ScriptError(`Invalid expression: ${expr}`);
  }
}
```

### 1.3 Comprehensive Test Suite
**Status:** Added `scriptingLanguage.comprehensive.test.js`
**Next:** Run tests and fix failures

```bash
npm test -- scriptingLanguage.comprehensive.test.js --coverage
```

### 1.4 Input Validation
```javascript
function validateScript(rawLines) {
  const errors = [];
  let i = 0;
  for (const line of rawLines) {
    i++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for common mistakes
    if (/\bFORWARD\b/.test(trimmed) && !trimmed.match(/FORWARD\s+\S+/i)) {
      errors.push(`Line ${i}: FORWARD requires a distance argument`);
    }
    if (/\bRECT\b/.test(trimmed) && !trimmed.match(/RECT\s+\S+\s+\S+/i)) {
      errors.push(`Line ${i}: RECT requires width and height arguments`);
    }
  }
  return errors;
}
```

---

## Phase 2: Language Improvements (Week 3-4)
**Goal:** Add missing control flow and operators without breaking syntax.

### 2.1 Add ELSE Clause
```
IF condition
  ... code ...
ELSE
  ... alternative ...
END
```

**Implementation:**
```javascript
function parseIfElse(blocks, i) {
  // find corresponding ELSE and END
  // execute one or the other
}
```

### 2.2 Add FOR Loop
```
FOR i = 0; i < 10; i = i + 1
  RECT 1 1
  GOTO x + i y
END
```

**Alternative simpler syntax:**
```
FOR i FROM 0 TO 10
  RECT 1 1
END
```

### 2.3 Add Logical Operators
```
IF x > 5 AND y < 10
  PRINT "both conditions true"
END

IF x < 0 OR x > 100
  PRINT "out of range"
END

IF NOT done
  PRINT "not finished"
END
```

**Implementation:**
```javascript
function evalCond(lhs, op, rhs, state) {
  // Handle compound conditions
  if (op === 'AND') {
    const [left, rightOp, rightLhs, rightRhs] = parseCompound(rhs);
    return evalCond(lhs, leftOp, left, state) && 
           evalCond(rightLhs, rightOp, rightRhs, state);
  }
  // ... similar for OR, NOT
}
```

### 2.4 Add BREAK and CONTINUE
```
i = 0
WHILE i < 100
  IF i == 50
    BREAK
  END
  IF i % 2 == 0
    CONTINUE
  END
  PRINT i
  i = i + 1
END
```

### 2.5 Add String Functions
```javascript
LENGTH(string) -> number
SUBSTR(string, start, length) -> string
INDEX(string, substring) -> number
UPPER(string) -> string
LOWER(string) -> string
TRIM(string) -> string

# Usage:
name = "hello world"
len = LENGTH(name)  # 11
first = SUBSTR(name, 0, 5)  # "hello"
```

---

## Phase 3: Advanced Features (Week 5-6)
**Goal:** Add function definitions and arrays for complex patterns.

### 3.1 Function Definitions
```
FUNCTION drawBox(x, y, size)
  GOTO x y
  RECT size size
END

drawBox(0, 0, 5)
drawBox(10, 10, 3)
```

**Implementation:**
```javascript
const functions = {};

function registerFunction(name, params, body) {
  functions[name] = { params, body };
}

function callFunction(name, args, state) {
  const fn = functions[name];
  if (!fn) throw new Error(`Undefined function: ${name}`);
  
  const newState = { ...state, vars: { ...state.vars } };
  for (let i = 0; i < fn.params.length; i++) {
    newState.vars[fn.params[i]] = args[i];
  }
  
  execBlock(fn.body, newState);
}
```

### 3.2 Arrays and Iteration
```
shapes = [shape1, shape2, shape3]
FOR shape IN shapes
  GOTO shape.x shape.y
  DRAW shape
END

# Or simpler:
widths = [2, 3, 5, 8]
FOR w IN widths
  RECT w w
  GOTO x + w + 1 y
END
```

### 3.3 Turtle Graphics - Full Implementation
```
# Turtle state: (x, y, heading)
FORWARD 10      # Move forward in current direction
BACK 5          # Move backward
LEFT 45         # Turn left
RIGHT 90        # Turn right
HEADING         # Query current heading

# Heading values: 0=right, 90=down, 180=left, 270=up
```

**Implementation:**
```javascript
const turtle = {
  x: 0,
  y: 0,
  heading: 0, // degrees, 0 = right
  penDown: true,
  
  forward(distance) {
    const rad = (this.heading * Math.PI) / 180;
    this.x += distance * Math.cos(rad);
    this.y += distance * Math.sin(rad);
    if (this.penDown) this.draw();
  },
  
  left(angle) {
    this.heading = (this.heading + angle) % 360;
  },
  
  right(angle) {
    this.heading = (this.heading - angle + 360) % 360;
  }
};
```

---

## Phase 4: Developer Experience (Week 7)
**Goal:** Add debugging tools and better editor support.

### 4.1 Syntax Highlighting
**Current:** Plain textarea
**Option A (Lightweight):** Use PrismJS
```html
<pre><code class="language-gol">{script}</code></pre>
```

**Option B (Better):** Use CodeMirror (lighter than Monaco, 100KB vs 500KB)
```javascript
import CodeMirror from 'codemirror';

const editor = CodeMirror.fromTextArea(textarea, {
  mode: 'gol', // custom mode
  lineNumbers: true,
  autofocus: true
});
```

### 4.2 Autocomplete
```javascript
const autocomplete = [
  'PENDOWN', 'PENUP', 'GOTO', 'RECT', 'CLEAR',
  'IF', 'WHILE', 'FOR', 'END', 'ELSE', 'BREAK',
  'START', 'STOP', 'STEP', 'PRINT', 'CAPTURE'
];

// Implement custom autocomplete (no Monaco needed)
```

### 4.3 Step-Through Debugger
```javascript
class ScriptDebugger {
  breakpoints = new Set(); // line numbers
  currentLine = 0;
  
  step() {
    if (this.breakpoints.has(this.currentLine)) {
      this.pause();
    }
    this.execute(this.blocks[this.currentLine]);
    this.currentLine++;
  }
  
  getVariables() { return this.state.vars; }
  getCells() { return this.state.cells; }
}
```

### 4.4 Visual Pattern Preview
```javascript
// Show live canvas preview as script runs
// Highlight current line being executed
// Show variable values on right side
```

---

## Phase 5: Long-Term Evolution (Month 2+)

### 5.1 Consider DSL Migration
**Current:** Regex-based, fragile parsing
**Option 1:** Use Peggy (parser generator)
```javascript
import { parse } from 'gol-grammar.peggy';
const ast = parse(script);
const result = execute(ast);
```

**Option 2:** Use an existing language (Lua, Python subset)
- Pros: Smaller parser, more features
- Cons: Larger runtime, less domain-specific

### 5.2 Pattern Library/Import System
```
IMPORT "patterns" AS p
p.glider()
p.blinker()

# or

PATTERN glider
  PENDOWN
  RECT 1 1
  ...
END

CALL glider AT 10 10
```

### 5.3 Advanced Simulation Control
```
MONITOR cellCount EVERY 5 STEPS PRINT cellCount
WHEN cellCount == 0 STOP
ON oscillation(2) CAPTURE "blinker"
```

---

## Monaco Editor Assessment

**Question:** Is Monaco Editor necessary?

**Answer:** **No, not at this stage.**

### Why Monaco Was Rolled Back
1. **Bundle Size:** ~500KB (Monaco alone)
2. **Integration Complexity:** Hard to integrate with React properly
3. **Feature Overkill:** Full IDE features not needed for short scripts
4. **Performance:** Laggy on older machines
5. **Maintenance Burden:** Large dependency to maintain

### Recommended Alternatives (in order)

| Option | Size | Features | Recommendation |
|--------|------|----------|-----------------|
| Plain textarea | 0KB | None | **Current (fine for now)** |
| PrismJS | 10KB | Syntax highlighting | ✅ Good if highlighting needed |
| CodeMirror 5 | 50KB | Highlighting + line numbers | ✅ Lightweight alternative |
| Ace Editor | 80KB | Full IDE features | ⚠️ Overkill unless needed |
| Monaco | 500KB | Full IDE features | ❌ Too heavy for this use case |

### Recommendation
- **Keep textarea for now** - works fine for 50-200 line scripts
- **If highlighting needed in future:** Add **PrismJS** (10KB, syntax highlighting only)
- **Skip Monaco completely** - not worth the complexity and bundle size
- **Focus on scripting language quality first** before investing in editor UX

---

## Implementation Priority Matrix

```
High Impact, Low Effort (Do First):
1. Error messages with line numbers
2. Input validation
3. Operator precedence
4. ELSE clause
5. Logical operators (AND, OR, NOT)
6. String functions (LENGTH, SUBSTR)
7. Comprehensive tests

Medium Impact, Medium Effort (Do Next):
8. FOR loops
9. BREAK/CONTINUE
10. HEADING query/set
11. Lightweight syntax highlighting (PrismJS)
12. Better debug output

Lower Priority (Later):
13. Function definitions
14. Arrays/iteration
15. Step-through debugger
16. Full turtle graphics
17. Pattern library
```

---

## Success Metrics

1. ✅ All tests pass (100% coverage of core language)
2. ✅ Error messages identify problems clearly
3. ✅ Users can build complex patterns without trial-and-error
4. ✅ Scripts are readable and maintainable
5. ✅ Debugging is straightforward

---

## Next Steps

1. Run the comprehensive test suite
2. Implement Phase 1 improvements (error handling, validation)
3. Add ELSE and FOR loop syntax
4. Add logical operators
5. Document language clearly
6. Gather user feedback
7. Iterate on Phase 2+

