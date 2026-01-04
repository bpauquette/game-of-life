# GOL Scripting Language Analysis & Improvement Plan

## Language Overview
The current scripting language is a **turtle-graphics inspired, imperative language** with:
- Cursor-based drawing (PENDOWN/PENUP, GOTO, RECT, etc.)
- Procedural flow control (IF/WHILE with simple conditions)
- Variable assignment and basic expressions
- Simulation control (STEP, CLEAR, CAPTURE)
- Geometric drawing commands (LINE, OVAL, RECTPERIMETER)

## Critical Issues & Confusing Aspects

### 1. **Incomplete Implementation of Turtle Graphics**
**Problem:** The language claims turtle graphics (FORWARD, BACK, LEFT, RIGHT) but these are poorly documented and incomplete.
- `FORWARD`/`BACK` should track direction (angle)
- `LEFT`/`RIGHT` should rotate the heading
- Current implementation doesn't maintain heading state properly

**Impact:** Users expect classic turtle graphics but get inconsistent behavior.

**Fix:** Fully implement turtle heading (0-360°) and direction-aware movement.

---

### 2. **Inconsistent Expression Evaluation**
**Problem:** `evalExpr()` only supports binary operators (+, -, *, /) with no:
- Operator precedence
- Parentheses support
- Unary operators (negation)
- Modulo, power, or other arithmetic
- Function calls (sin, cos, sqrt, etc.)

**Impact:** Complex calculations fail silently or produce wrong results.

**Example:** `x = 2 + 3 * 4` evaluates left-to-right as 20 instead of 14.

**Fix:** Implement proper expression parser with operator precedence or use a parser combinator library.

---

### 3. **No Error Handling or Validation**
**Problem:** 
- Invalid syntax produces silent failures
- No line numbers in error messages
- Stack traces don't identify problematic commands
- Type mismatches silently coerce to 0 or ""

**Impact:** Debugging scripts is nearly impossible.

**Example:**
```
RECT width height  # If width/height are undefined, silently uses 0
```

**Fix:** Implement comprehensive error reporting with line numbers, context, and suggestions.

---

### 4. **Awkward Control Flow Syntax**
**Problem:**
- `END` keyword is ambiguous (ends what? while or if?)
- No `ELSE` clause for IF statements
- No `FOR` loop (only WHILE)
- No `BREAK` or `CONTINUE` for loops
- Indentation is ignored (source of confusion)

**Impact:** Users must track nesting manually; easy to create unterminated blocks.

**Example:**
```
IF x > 5
  IF y < 10
    PRINT "nested"
  END
  # Which END closes what?
END
```

**Fix:** 
- Add `ELSE` for IF statements
- Add `FOR i FROM start TO end` or `FOR i = start; i < end; i++`
- Better block delimiters (e.g., BEGIN...END or indentation-based like Python)
- Add BREAK and CONTINUE

---

### 5. **Limited Data Types & No Collections**
**Problem:**
- Only numbers and strings (no arrays/lists)
- No way to store multiple shapes or patterns
- Can't iterate over collections
- No dictionary/map structures

**Impact:** Can't build complex patterns or reuse shapes efficiently.

**Fix:** Add arrays/lists and iterators.

---

### 6. **Condition Syntax is Verbose & Limited**
**Problem:**
- No logical operators (AND, OR, NOT)
- No membership testing (IN, NOT IN)
- Conditions must be explicit comparisons
- No regex or string operations beyond concatenation

**Impact:**
```
# Current (verbose):
IF x > 5
  IF y < 10
    ...
  END
END

# Desired (cleaner):
IF x > 5 AND y < 10
  ...
END
```

**Fix:** Add boolean operators, string operations, and advanced conditions.

---

### 7. **No Pattern Library or Reusability**
**Problem:**
- Can't define reusable patterns or subroutines
- Can't parameterize drawing operations
- CAPTURE saves but doesn't allow later drawing that capture

**Impact:** Must repeat code; can't build modular patterns.

**Fix:** Add function definitions (FUNCTION/END with parameters) and pattern references.

---

### 8. **Turtle Direction State Not Visible**
**Problem:**
- Heading/direction is hidden internal state
- No way to query or reset direction
- LEFT/RIGHT commands unclear without seeing current direction

**Impact:** Debugging turtle graphics becomes a guessing game.

**Fix:** Add HEADING command to query/set direction, visible in debug output.

---

### 9. **Inconsistent Command Naming & Capitalization**
**Problem:**
- Mix of camelCase and CAPS_SNAKE_CASE
- Some commands are aliases (FORWARD vs forward)
- Inconsistent parameter ordering

**Impact:** Users get errors because they used wrong capitalization.

**Fix:** Standardize on consistent naming (recommend CAPS_SNAKE_CASE for clarity).

---

### 10. **No String Manipulation**
**Problem:**
- Strings can be concatenated but not split, indexed, or searched
- No length function
- No substring operations

**Impact:** Can't build dynamic labels or patterns based on string patterns.

**Fix:** Add string functions (LENGTH, SUBSTR, INDEX, UPPER, LOWER, etc.).

---

## Recommendations for Improvement

### Short Term (Quick Wins)
1. **Add error reporting with line numbers and context**
2. **Implement proper expression parser** with operator precedence
3. **Add ELSE clause** to IF statements
4. **Add FOR loops** with standard syntax
5. **Add BREAK and CONTINUE** for loop control
6. **Validate input** and warn on undefined variables

### Medium Term (Significant Improvements)
1. **Fully implement turtle graphics** with heading tracking
2. **Add arrays/lists** and iteration
3. **Add logical operators** (AND, OR, NOT)
4. **Add string functions** (LENGTH, SUBSTR, etc.)
5. **Add function definitions** (FUNCTION/END with parameters)
6. **Add HEADING query/set**
7. **Better error messages** with suggestions

### Long Term (Language Evolution)
1. **Consider a proper domain-specific language (DSL)** - move away from ad-hoc regex parsing
2. **Add a visual debugger** - step through code with breakpoints
3. **Add pattern library/import system**
4. **Consider Lua or TypeScript as a scripting layer** instead of custom language
5. **Add recursion support**

---

## Monaco Editor Question

**Was Monaco Editor Rolled Back?** Yes, likely due to:
- Complexity of integrating CodeMirror/Monaco into React
- Performance concerns (large bundle size)
- Feature bloat without clear ROI

**Current Recommendation:**
- **Keep simple textarea for now** - it works fine for short scripts
- **If syntax highlighting needed later:** Use lightweight alternatives like **PrismJS** or **Highlight.js** (10-50KB vs Monaco's 500KB+)
- **For autocomplete:** Implement custom lightweight solution focused on GOL commands only
- **Don't use Monaco** unless you need full IDE features (go-to-definition, refactoring, etc.)

---

## Testing Strategy

The test file [scriptLanguage.test.js](../src/new-tests/scriptLanguage.test.js) needs:
1. **Unit tests** for each command
2. **Integration tests** for complex programs
3. **Error handling tests** to ensure graceful failure
4. **Edge case tests** (empty input, huge numbers, etc.)
5. **Performance tests** for large scripts

See `SCRIPTING_TESTS.md` for comprehensive test suite.
