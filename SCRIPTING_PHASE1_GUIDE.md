# Phase 1: Error Handling Implementation Guide

## Current State
- 53 tests passing
- 11 tests skipped (marking future improvements)
- No error reporting with line numbers
- Silent failures on invalid input

## Immediate Goals (This Session)
1. Implement proper error reporting with line numbers
2. Add input validation before execution
3. Create `ScriptError` class with context
4. Update all command handlers to use new error system
5. Add 10-15 new tests for error cases

## Implementation Steps

### Step 1: Create ScriptError Class

Add to `scriptingEngine.js`:

```javascript
export class ScriptError extends Error {
  constructor(lineNumber, command, message, suggestion = '') {
    const fullMessage = [
      `Line ${lineNumber}: ${message}`,
      `  Command: ${command}`,
      suggestion ? `  Hint: ${suggestion}` : ''
    ].filter(Boolean).join('\n');
    
    super(fullMessage);
    this.name = 'ScriptError';
    this.lineNumber = lineNumber;
    this.command = command;
  }
}
```

### Step 2: Update Block Parser

Modify `parseBlocks` in `scriptingInterpreter.js` to preserve line numbers:

```javascript
export function parseBlocks(rawLines) {
  const blocks = [];
  rawLines.forEach((line, originalIndex) => {
    const lineNumber = originalIndex + 1;
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      return; // skip comments and blank lines
    }
    
    const block = {
      command: trimmed,
      indent: line.search(/\S/),
      lineNumber,     // NEW: preserve line number
      raw: line       // NEW: preserve raw line for reference
    };
    blocks.push(block);
  });
  return blocks;
}
```

### Step 3: Validate Commands Before Execution

Create validation rules:

```javascript
// validationRules.js
const VALIDATION_RULES = {
  GOTO: {
    args: { exact: 2, types: ['number', 'number'] },
    message: 'GOTO requires two numeric arguments (x, y)',
    example: 'GOTO 10 20'
  },
  RECT: {
    args: { exact: 2, types: ['number', 'number'] },
    message: 'RECT requires two numeric arguments (width, height)',
    example: 'RECT 5 10'
  },
  IF: {
    args: { min: 1 },
    message: 'IF requires a condition',
    example: 'IF x > 5'
  },
  WHILE: {
    args: { min: 1 },
    message: 'WHILE requires a condition',
    example: 'WHILE x < 100'
  },
  STEP: {
    args: { exact: 1, types: ['number'] },
    message: 'STEP requires a numeric argument',
    example: 'STEP 10'
  }
};

export function validateCommand(command, args, lineNumber) {
  const rule = VALIDATION_RULES[command];
  if (!rule) return []; // unknown command, let execution handle it
  
  const errors = [];
  
  // Check argument count
  if (rule.args.exact !== undefined && args.length !== rule.args.exact) {
    errors.push({
      lineNumber,
      command,
      message: `Expected ${rule.args.exact} argument(s), got ${args.length}`,
      suggestion: `Example: ${rule.example}`
    });
  }
  
  if (rule.args.min !== undefined && args.length < rule.args.min) {
    errors.push({
      lineNumber,
      command,
      message: `Expected at least ${rule.args.min} argument(s), got ${args.length}`,
      suggestion: `Example: ${rule.example}`
    });
  }
  
  // Check argument types
  if (rule.args.types) {
    for (let i = 0; i < rule.args.types.length; i++) {
      const expectedType = rule.args.types[i];
      const argValue = parseValue(args[i], {}); // parse without state
      const actualType = typeof argValue;
      
      if (expectedType === 'number' && actualType !== 'number') {
        errors.push({
          lineNumber,
          command,
          message: `Argument ${i + 1} must be numeric, got "${args[i]}"`,
          suggestion: `Example: ${rule.example}`
        });
      }
    }
  }
  
  return errors;
}
```

### Step 4: Update Command Execution

Modify `execBlock` in `scriptingInterpreter.js`:

```javascript
export function execBlock(block, state) {
  const { lineNumber, command, raw } = block;
  
  try {
    const [cmd, ...args] = command.split(/\s+/);
    const upperCmd = cmd.toUpperCase();
    
    // Validate command
    const validationErrors = validateCommand(upperCmd, args, lineNumber);
    if (validationErrors.length > 0) {
      throw new ScriptError(
        lineNumber,
        upperCmd,
        validationErrors[0].message,
        validationErrors[0].suggestion
      );
    }
    
    // Execute command
    switch (upperCmd) {
      case 'PENDOWN':
        state.penDown = true;
        break;
      case 'PENUP':
        state.penDown = false;
        break;
      case 'GOTO': {
        const x = parseValue(args[0], state);
        const y = parseValue(args[1], state);
        if (!isFinite(x) || !isFinite(y)) {
          throw new ScriptError(
            lineNumber,
            'GOTO',
            'Arguments must be finite numbers',
            `GOTO received: x=${x}, y=${y}`
          );
        }
        state.x = x;
        state.y = y;
        break;
      }
      // ... other commands with similar error handling
      
      default:
        throw new ScriptError(
          lineNumber,
          upperCmd,
          `Unknown command: "${upperCmd}"`,
          `Valid commands: PENDOWN, PENUP, GOTO, RECT, CLEAR, STEP, IF, WHILE, ...`
        );
    }
  } catch (error) {
    if (error instanceof ScriptError) {
      throw error;
    }
    // Wrap unexpected errors
    throw new ScriptError(
      lineNumber,
      command,
      error.message,
      `Debug info: ${error.stack}`
    );
  }
}
```

### Step 5: Update Script Execution Entry Point

Modify `executeScript` in `scriptingInterpreter.js`:

```javascript
export function executeScript(rawLines, worldState) {
  const state = {
    ...worldState,
    cells: new Set(worldState.cells || []),
    vars: { ...worldState.vars }
  };
  
  try {
    // Validate all lines first
    const blocks = parseBlocks(rawLines);
    
    // Check for common mistakes before execution
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const cmd = block.command.split(/\s+/)[0].toUpperCase();
      
      if (cmd === 'IF' || cmd === 'WHILE') {
        const rest = block.command.slice(cmd.length).trim();
        if (!rest) {
          throw new ScriptError(
            block.lineNumber,
            cmd,
            'Missing condition',
            `Example: ${cmd === 'IF' ? 'IF x > 5' : 'WHILE x < 100'}`
          );
        }
      }
      
      if (cmd === 'END') {
        // Check for matching IF/WHILE
        let depth = 1;
        for (let j = i - 1; j >= 0; j--) {
          const prevCmd = blocks[j].command.split(/\s+/)[0].toUpperCase();
          if (prevCmd === 'IF' || prevCmd === 'WHILE') depth--;
          if (prevCmd === 'END') depth++;
          if (depth === 0) break;
          if (j === 0) {
            throw new ScriptError(
              block.lineNumber,
              'END',
              'Unmatched END - no corresponding IF or WHILE',
              'Check that all IF/WHILE blocks have matching END'
            );
          }
        }
      }
    }
    
    // Execute blocks
    for (let i = 0; i < blocks.length; i++) {
      execBlock(blocks[i], state);
    }
    
    return state;
  } catch (error) {
    if (error instanceof ScriptError) {
      console.error(error.message);
      throw error;
    }
    console.error(`Unexpected error at line 1: ${error.message}`);
    throw new ScriptError(1, 'UNKNOWN', error.message);
  }
}
```

### Step 6: Update UI Error Display

Modify `SimpleScriptPanel.js`:

```javascript
const [lastError, setLastError] = useState(null);

const handleExecute = async () => {
  try {
    setLastError(null);
    const lines = script.split('\n');
    const result = executeScript(lines, worldState);
    // ... handle success ...
  } catch (error) {
    if (error instanceof ScriptError) {
      setLastError({
        line: error.lineNumber,
        message: error.message,
        severity: 'error'
      });
      // Highlight error line in editor
      highlightLine(error.lineNumber);
    } else {
      setLastError({
        line: 1,
        message: error.message,
        severity: 'error'
      });
    }
  }
};

return (
  <>
    {lastError && (
      <div className={`error-display error-${lastError.severity}`}>
        <strong>Error on Line {lastError.line}:</strong>
        <pre>{lastError.message}</pre>
      </div>
    )}
    {/* ... rest of UI ... */}
  </>
);
```

### Step 7: Add Error Handling Tests

Add to `scriptingLanguage.comprehensive.test.js`:

```javascript
describe('Error Handling', () => {
  test('should report line number on invalid command', () => {
    const lines = [
      'PENDOWN',
      'GOTO 10 20',
      'INVALID_COMMAND',
      'PENUP'
    ];
    
    expect(() => executeScript(lines, {})).toThrow('Line 3');
  });
  
  test('should report wrong number of arguments', () => {
    const lines = ['GOTO 10'];  // missing y argument
    expect(() => executeScript(lines, {})).toThrow(/Line 1.*argument/i);
  });
  
  test('should report non-numeric argument where number expected', () => {
    const lines = ['GOTO abc def'];
    expect(() => executeScript(lines, {})).toThrow(/Line 1.*numeric/i);
  });
  
  test('should report missing condition', () => {
    const lines = ['IF'];
    expect(() => executeScript(lines, {})).toThrow(/Line 1.*condition/i);
  });
  
  test('should report unmatched END', () => {
    const lines = ['PENDOWN', 'END'];
    expect(() => executeScript(lines, {})).toThrow(/Line 2.*unmatched/i);
  });
  
  test('should report undefined variable in expression', () => {
    const lines = ['x = undefined_var + 5'];
    // This is tricky - might need to opt-in to strict mode
    // For now, just verify it doesn't crash
    const result = executeScript(lines, {});
    expect(result.vars.x).toBe(5); // undefined_var defaults to 0
  });
  
  test('should suggest valid commands on unknown command', () => {
    const lines = ['FORWARD 10'];
    const error = expect(() => executeScript(lines, {})).toThrow();
    // Check that error message contains suggestion
  });
});
```

## Testing Checklist

```bash
# Run just error handling tests
npm test -- scriptingLanguage.comprehensive.test.js -t "Error Handling"

# Run all scripting tests with coverage
npm test -- --coverage --testPathPattern=scripting

# Watch mode for development
npm test -- --watch --testPathPattern=scripting
```

## Success Criteria for Phase 1

- [ ] All 53 existing tests still pass
- [ ] 10+ new error handling tests pass
- [ ] ScriptError class works correctly
- [ ] Line numbers appear in error messages
- [ ] UI displays errors with line highlighting
- [ ] Users get helpful suggestions in error messages
- [ ] Error messages include examples
- [ ] Unknown commands suggest valid alternatives

## Estimated Time
- Implement ScriptError class: 30 min
- Add validation rules: 45 min
- Update command execution: 1 hour
- Update UI: 30 min
- Write tests: 45 min
- **Total: ~3.5 hours**

## Files to Modify
1. `src/view/scriptingEngine.js` - Add ScriptError class
2. `src/view/scriptingInterpreter.js` - Add validation + error handling
3. `src/view/SimpleScriptPanel.js` - Display errors
4. `src/new-tests/scriptingLanguage.comprehensive.test.js` - Add error tests
5. (Optional) Create `src/view/validationRules.js` - Centralize validation

## Next Phase (Phase 2)
Once error handling is solid, implement:
- Operator precedence
- ELSE clause
- Logical operators (AND, OR, NOT)
- FOR loops
- String functions

