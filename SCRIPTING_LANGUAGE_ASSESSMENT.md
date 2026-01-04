# Scripting Language Assessment & Recommendations

## Language Overview

**Name:** GOL Scripting Language (turtle-graphics inspired, imperative DSL)

**Purpose:** Allow Game of Life users to programmatically draw patterns and run simulations

**Status:** Functional but limited; significant UX and feature gaps

**Test Coverage:** 53 tests passing, 11 skipped (marking future work)

---

## What's Confusing or Difficult?

### 1. **Inconsistent Expression Evaluation**
**Problem:** Operator precedence is wrong
- `2 + 3 * 4` evaluates to `20` (left-to-right) instead of `14` (mathematical precedence)
- No support for parentheses to override precedence
- Users expect standard math rules

**Example that breaks:**
```
x = 10
y = 2 + 3 * 4      # Should be 14, but is 20
IF y == 14
  PRINT "correct"  # Never executes
END
```

**Fix Difficulty:** Medium - Need proper expression parser (can use library like `expr-eval`)

---

### 2. **No Error Reporting with Line Numbers**
**Problem:** Scripts fail silently or with cryptic messages
- No indication which line caused the error
- No suggestions for fixes
- Difficult to debug anything beyond trivial scripts

**Example:**
```
PENDOWN
RECT 5            # Error: missing argument, but no feedback
GOTO 10 20
```

**Fix Difficulty:** Easy - Add line tracking to parser and wrap all commands in try/catch

---

### 3. **Awkward Control Flow**
**Problem:** Missing common features
- No `ELSE` clause for `IF` statements
- No `FOR` loops (only `WHILE`)
- No `BREAK` or `CONTINUE`
- Makes simple patterns tedious to write

**Example (current workaround - verbose and error-prone):**
```
# Want to draw 10 boxes
i = 0
WHILE i < 10
  RECT 1 1
  GOTO 10 + i 0
  i = i + 1
END

# Wanted syntax (doesn't exist yet):
FOR i = 0; i < 10; i = i + 1
  RECT 1 1
  GOTO 10 + i 0
END
```

**Fix Difficulty:** Medium - Need syntax parsing and loop semantics

---

### 4. **Limited Data Types**
**Problem:** Only numbers and strings; no arrays or objects
- Can't store collections of coordinates
- Can't iterate over pattern data
- Forces repetitive code

**Example:**
```
# Want: draw multiple gliders
shapes = [glider1, glider2, glider3]
FOR shape IN shapes
  DRAW shape
END

# Current: must repeat code
DRAW glider1
DRAW glider2
DRAW glider3
```

**Fix Difficulty:** High - Need array syntax and iteration

---

### 5. **Verbose and Awkward Conditions**
**Problem:** No logical operators; conditions are clunky
- Can't use `AND`, `OR`, `NOT`
- Requires nested `IF` blocks for multiple conditions
- Very verbose for simple logic

**Example:**
```
# Want:
IF x > 5 AND y < 10
  PRINT "in range"
END

# Current (doesn't work):
IF x > 5
  IF y < 10
    PRINT "in range"
  END
END
```

**Fix Difficulty:** Medium - Add logical operators to condition parser

---

### 6. **Incomplete Turtle Graphics**
**Problem:** Missing core turtle commands
- `FORWARD`, `BACK`, `LEFT`, `RIGHT` are mentioned in docs but not implemented
- `HEADING` command not implemented
- Only absolute positioning (`GOTO`) works; no relative movement
- Confusing for users familiar with Logo/turtle graphics

**Example (doesn't work):**
```
PENDOWN
FORWARD 10    # Should move 10 units in current direction
LEFT 90       # Should turn left 90 degrees
FORWARD 5
```

**Fix Difficulty:** High - Need turtle state tracking (x, y, heading)

---

### 7. **Hidden/Implicit State**
**Problem:** Turtle state is not visible or queryable
- Users don't know current pen state (up/down?)
- Don't know current position
- Don't know heading
- Makes debugging nearly impossible

**Fix Difficulty:** Easy-Medium - Add PRINT/QUERY commands to inspect state

---

### 8. **No Function Definitions**
**Problem:** Can't reuse code; no function abstraction
- Every pattern must be written inline
- No way to encapsulate logic
- Large scripts become unmaintainable

**Example (desired):**
```
FUNCTION drawBox(x, y, size)
  GOTO x y
  RECT size size
END

drawBox(0, 0, 5)
drawBox(10, 10, 3)
```

**Fix Difficulty:** High - Need AST and call stack

---

### 9. **Inconsistent Command Naming**
**Problem:** Commands use different patterns
- Some use imperative verbs (`PENDOWN`, `GOTO`)
- Some use nouns (`RECT`, `OVAL`)
- Some are abbreviations (`COUNT`)
- Some are full words (`CAPTURE`, `CLEAR`)
- Unpredictable for new users

**Example:**
```
PENDOWN    # Imperative
RECT 5 5   # Noun
STEP 10    # Noun that's also a verb
CAPTURE    # Verb imperative
COUNT x y  # Noun used as verb
```

**Fix Difficulty:** Low-Medium - Standardize naming in docs; migration requires deprecation period

---

### 10. **No String Manipulation**
**Problem:** Limited string operations
- Can concatenate with `+` but that's it
- No `LENGTH`, `SUBSTR`, `UPPER`, `LOWER`, `TRIM`
- Can't build dynamic labels or queries

**Example (limited):**
```
name = "pattern"
label = name + "_v2"  # Works
length = LENGTH(name) # Doesn't exist

LABEL label           # Would be useful
```

**Fix Difficulty:** Medium - Add string function library

---

## Assessment Summary

| Issue | Severity | Impact | Difficulty |
|-------|----------|--------|------------|
| Wrong operator precedence | 🔴 Critical | Breaks math logic | Medium |
| No error reporting | 🔴 Critical | Debugging impossible | Easy |
| No ELSE/FOR/BREAK | 🟠 High | Verbose code | Medium |
| No logical operators | 🟠 High | Awkward conditions | Medium |
| Limited data types | 🟠 High | Can't handle collections | High |
| Incomplete turtle graphics | 🟡 Medium | Confusing API | High |
| Hidden state | 🟡 Medium | Hard to debug | Easy |
| No functions | 🟡 Medium | Not scalable | High |
| Inconsistent naming | 🟡 Medium | Hard to learn | Low |
| No string functions | 🟡 Medium | Limited text capability | Medium |

---

## Recommended Implementation Order

### Phase 1: Quality & Reliability (1-2 weeks)
1. ✅ Add comprehensive test suite (DONE)
2. Add error reporting with line numbers
3. Add input validation
4. Implement proper operator precedence
5. Add suggestions for common mistakes

**Why first:** These don't break existing scripts; they make language usable for debugging.

### Phase 2: Control Flow (2-3 weeks)
6. Add `ELSE` clause to `IF`
7. Add `FOR` loops (`FOR i = 0; i < 10; i = i + 1`)
8. Add logical operators (`AND`, `OR`, `NOT`)
9. Add `BREAK` and `CONTINUE`
10. Add string functions (`LENGTH`, `SUBSTR`, etc.)

**Why next:** High-impact quality-of-life improvements; moderate complexity.

### Phase 3: Advanced Features (3-4 weeks)
11. Full turtle graphics implementation (FORWARD, BACK, LEFT, RIGHT, HEADING)
12. Function definitions and calls
13. Arrays and iteration (`FOR shape IN shapes`)
14. Better debugging tools (step-through, variable inspection)

**Why later:** Higher complexity; can build advanced patterns without these.

### Phase 4: Developer Experience (1-2 weeks)
15. Syntax highlighting (PrismJS or CodeMirror)
16. Autocomplete
17. Documentation viewer
18. Pattern library/templates

**Why last:** Nice-to-have; language features are more important than UI.

---

## Monaco Editor Assessment

### Question
> Is the monocoEditor necessary?

### Answer
**No. Actively recommend against it.**

### Why Monaco Was Rolled Back
1. **Bundle size:** ~500 KB (huge for 50-line scripts)
2. **Complexity:** Hard to integrate; lots of config needed
3. **Overkill:** Full IDE features aren't needed
4. **Performance:** Can be slow on lower-end machines
5. **Maintenance:** Large dependency to maintain; frequent updates

### Current Solution: Textarea + PrismJS
- **Size:** < 1 KB (textarea) + ~10 KB (PrismJS) = ~11 KB total
- **Features:** Basic syntax highlighting, clean simple interface
- **Performance:** Instant; no noticeable lag
- **Maintainability:** Minimal external dependencies

### Recommendation Matrix

```
┌─────────────────┬───────────┬───────────┬─────────────────────────┐
│ Editor          │ Bundle    │ Features  │ Recommendation          │
├─────────────────┼───────────┼───────────┼─────────────────────────┤
│ Plain textarea  │ 0 KB      │ Basic     │ ✅ Keep for now         │
│ + PrismJS       │ 10 KB     │ Highlight │ ✅ Use if highlighting  │
│ CodeMirror 5    │ 50 KB     │ Full IDE  │ ⚠️  Only if needed       │
│ Ace Editor      │ 80 KB     │ Full IDE  │ ⚠️  Only if needed       │
│ Monaco          │ 500 KB    │ Full IDE  │ ❌ Do NOT use           │
└─────────────────┴───────────┴───────────┴─────────────────────────┘
```

### If Syntax Highlighting Becomes Important
**Use PrismJS, not Monaco:**

```html
<pre><code class="language-gol">
PENDOWN
GOTO 10 20
RECT 5 10
</code></pre>
<script src="https://cdn.jsdelivr.net/npm/prism@latest/components/prism-core.min.js"></script>
<link rel="stylesheet" href="...prism.css" />
```

**Size:** 10 KB (vs Monaco's 500 KB)
**Setup:** 2 lines of HTML
**Result:** Nice syntax highlighting without bloat

### If Autocomplete Becomes Important
**Build lightweight GOL-specific autocomplete:**

```javascript
const commands = [
  'PENDOWN', 'PENUP', 'GOTO', 'RECT', 'CLEAR',
  'IF', 'WHILE', 'FOR', 'END', 'ELSE',
  'STEP', 'CAPTURE', 'COUNT', 'PRINT'
];

function autocomplete(text) {
  const partial = text.split(/\s+/).pop().toUpperCase();
  return commands.filter(cmd => cmd.startsWith(partial));
}
```

**Size:** ~1 KB
**Setup:** ~50 lines of code
**Result:** Lightweight, domain-specific autocomplete

### Verdict
**Skip Monaco. Keep textarea. Add PrismJS only if highlighting is requested.**

---

## Example: Current Limitations in Action

Here's a complex pattern someone might want to draw:

```javascript
// Goal: Draw Gosper Glider Gun pattern
// Current state: Nearly impossible without full Turtle graphics + functions
// With Phase 1-3 improvements: Straightforward

// Phase 1-3 Improvements Enable This:
FUNCTION drawBlock(x, y)
  GOTO x y
  RECT 1 1
END

FUNCTION drawGlider(x, y)
  GOTO x y
  PENDOWN
  drawBlock(x, y)
  drawBlock(x + 1, y)
  drawBlock(x + 2, y)
  drawBlock(x + 2, y + 1)
  drawBlock(x + 1, y + 2)
END

# Main pattern
FOR i = 0; i < 5; i = i + 1
  FOR j = 0; j < 5; j = j + 1
    IF (i + j) % 2 == 0
      drawGlider(i * 10, j * 10)
    END
  END
END
```

**Current state:** This is impossible (no functions, no FOR loops, no multidimensional iteration)

**After Phase 1:** Still impossible (need functions and proper loops)

**After Phase 2-3:** Works exactly as written

---

## Next Steps

1. **Run test suite** - Establish baseline (✅ DONE: 53 tests pass)
2. **Implement Phase 1** - Error handling + validation
3. **Add Phase 1 tests** - 10-15 new error handling tests
4. **Review with users** - Get feedback on error messages
5. **Prioritize Phase 2** - Based on user feedback
6. **Plan iterations** - Address one phase per 1-2 weeks

---

## Conclusion

The GOL scripting language has strong foundational ideas (turtle-graphics, imperative, simple syntax) but needs **significant quality-of-life improvements** to be production-ready:

1. **Critical:** Error reporting (easy win)
2. **Important:** Operator precedence + control flow
3. **Valuable:** Functions and arrays
4. **Nice-to-have:** Syntax highlighting and autocomplete

**Do NOT add Monaco Editor.** It's overkill and will make the codebase harder to maintain.

**Focus on language features first.** Users care about what they can express, not what editor they type in.

