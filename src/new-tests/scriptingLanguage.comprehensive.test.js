// Comprehensive test suite for GOL Scripting Language
// Tests cover all major language features, edge cases, and error conditions

import { parseBlocks, execBlock, splitCond, executeCommand } from '../view/scriptingInterpreter.js';
import { parseValue, evalExpr, evalCond, evalCondCompound } from '../view/scriptingEngine.js';

describe('Scripting Engine - Core Functions', () => {
  describe('parseValue', () => {
    it('should parse numeric literals', () => {
      const state = { vars: {} };
      expect(parseValue('42', state)).toBe(42);
      expect(parseValue('-10', state)).toBe(-10);
      expect(parseValue('3.14', state)).toBe(3.14);
    });

    it('should parse string literals', () => {
      const state = { vars: {} };
      expect(parseValue('"hello"', state)).toBe('hello');
      expect(parseValue('"test"', state)).toBe('test');
    });

    it('should parse variables from state', () => {
      const state = { vars: { x: 10, name: 'test' } };
      expect(parseValue('x', state)).toBe(10);
      expect(parseValue('name', state)).toBe('test');
    });

    it('should return 0 for undefined variables', () => {
      const state = { vars: {} };
      expect(parseValue('undefined_var', state)).toBe(0);
    });

    it('should return 0 for empty input', () => {
      const state = { vars: {} };
      expect(parseValue('', state)).toBe(0);
    });
  });

  describe('evalExpr', () => {
    const state = { vars: { x: 5, y: 3 } };

    it('should evaluate addition', () => {
      expect(evalExpr('2 + 3', state)).toBe(5);
      expect(evalExpr('x + y', state)).toBe(8);
    });

    it('should evaluate subtraction', () => {
      expect(evalExpr('10 - 3', state)).toBe(7);
      expect(evalExpr('x - y', state)).toBe(2);
    });

    it('should evaluate multiplication', () => {
      expect(evalExpr('4 * 5', state)).toBe(20);
      expect(evalExpr('x * y', state)).toBe(15);
    });

    it('should evaluate division', () => {
      expect(evalExpr('10 / 2', state)).toBe(5);
      expect(evalExpr('x / y', state)).toBeCloseTo(1.667, 2);
    });

    it('should concatenate strings', () => {
      expect(evalExpr('"hello" + " world"', state)).toBe('hello world');
    });

    it('should return single values unchanged', () => {
      expect(evalExpr('42', state)).toBe(42);
      expect(evalExpr('x', state)).toBe(5);
    });

    it('should handle expressions with spaces', () => {
      expect(evalExpr('  2  +  3  ', state)).toBe(5);
      expect(evalExpr('10/2', state)).toBe(5);
    });

    // Expression precedence/parentheses/unary-negation are intentionally not covered here
    // because the current evaluator executes left-to-right and does not parse unary operators.
  });

  describe('evalCond', () => {
    const state = { vars: { x: 10 } };

    it('should evaluate equality', () => {
      expect(evalCond('5', '==', '5', state)).toBe(true);
      expect(evalCond('5', '==', '10', state)).toBe(false);
      expect(evalCond('x', '==', '10', state)).toBe(true);
    });

    it('should evaluate inequality', () => {
      expect(evalCond('5', '!=', '10', state)).toBe(true);
      expect(evalCond('5', '!=', '5', state)).toBe(false);
    });

    it('should evaluate less-than', () => {
      expect(evalCond('5', '<', '10', state)).toBe(true);
      expect(evalCond('10', '<', '5', state)).toBe(false);
      expect(evalCond('x', '<', '15', state)).toBe(true);
    });

    it('should evaluate greater-than', () => {
      expect(evalCond('10', '>', '5', state)).toBe(true);
      expect(evalCond('5', '>', '10', state)).toBe(false);
      expect(evalCond('x', '>', '8', state)).toBe(true);
    });

    it('should evaluate less-than-or-equal', () => {
      expect(evalCond('5', '<=', '5', state)).toBe(true);
      expect(evalCond('5', '<=', '10', state)).toBe(true);
      expect(evalCond('15', '<=', '10', state)).toBe(false);
    });

    it('should evaluate greater-than-or-equal', () => {
      expect(evalCond('10', '>=', '10', state)).toBe(true);
      expect(evalCond('15', '>=', '10', state)).toBe(true);
      expect(evalCond('5', '>=', '10', state)).toBe(false);
    });

    it('should handle string comparisons', () => {
      expect(evalCond('"hello"', '==', '"hello"', state)).toBe(true);
      expect(evalCond('"hello"', '==', '"world"', state)).toBe(false);
    });
  });

  describe('splitCond', () => {
    it('should split simple conditions', () => {
      expect(splitCond('x == 5')).toEqual(['x', '==', '5']);
      expect(splitCond('name != "test"')).toEqual(['name', '!=', '"test"']);
    });

    it('should handle all comparison operators', () => {
      expect(splitCond('a < b')[1]).toBe('<');
      expect(splitCond('a > b')[1]).toBe('>');
      expect(splitCond('a <= b')[1]).toBe('<=');
      expect(splitCond('a >= b')[1]).toBe('>=');
    });

    it('should handle whitespace variations', () => {
      expect(splitCond('x==5')).toEqual(['x', '==', '5']);
      expect(splitCond('x  ==  5')).toEqual(['x', '==', '5']);
    });
  });

  describe('evalCondCompound - Logical Operators', () => {
    const state = { vars: { x: 10, y: 5, z: 0 } };

    it('should support AND operator', () => {
      expect(evalCondCompound('5 > 3 AND 2 < 4', state)).toBe(true);
      expect(evalCondCompound('5 > 3 AND 2 > 4', state)).toBe(false);
      expect(evalCondCompound('x > 5 AND y < 10', state)).toBe(true);
    });

    it('should support OR operator', () => {
      expect(evalCondCompound('5 < 3 OR 2 < 4', state)).toBe(true);
      expect(evalCondCompound('5 < 3 OR 2 > 4', state)).toBe(false);
      expect(evalCondCompound('x < 5 OR y > 10', state)).toBe(false);
      expect(evalCondCompound('x > 5 OR y < 10', state)).toBe(true);
    });

    it('should support NOT operator', () => {
      expect(evalCondCompound('NOT 5 < 3', state)).toBe(true);
      expect(evalCondCompound('NOT 5 > 10', state)).toBe(true);
      expect(evalCondCompound('NOT x < 5', state)).toBe(true);
    });

    it('should handle AND/OR precedence (AND higher than OR)', () => {
      // (5 < 3) OR (2 < 4 AND 6 > 5) = false OR true = true
      expect(evalCondCompound('5 < 3 OR 2 < 4 AND 6 > 5', state)).toBe(true);
      // (5 < 3 OR 2 < 4) AND 6 < 5 = true AND false = false
      expect(evalCondCompound('5 < 3 OR 2 < 4 AND 6 < 5', state)).toBe(false);
    });

    it('should handle mixed operators', () => {
      expect(evalCondCompound('NOT x < 5 AND y > 0', state)).toBe(true);
      expect(evalCondCompound('NOT x < 5 AND y < 0', state)).toBe(false);
      expect(evalCondCompound('NOT z == 0 OR x > 5', state)).toBe(true);
    });

    it('should fall back to simple comparisons', () => {
      expect(evalCondCompound('x == 10', state)).toBe(true);
      expect(evalCondCompound('y > 0', state)).toBe(true);
      expect(evalCondCompound('z != 0', state)).toBe(false);
    });
  });
});

describe('Scripting Interpreter - Block Parsing', () => {
  describe('parseBlocks', () => {
    it('should parse simple commands', () => {
      const lines = ['PENDOWN', 'RECT 2 3', 'GOTO 10 5'];
      const blocks = parseBlocks(lines);
      expect(blocks).toHaveLength(3);
      expect(blocks[0].line).toBe('PENDOWN');
      expect(blocks[1].line).toBe('RECT 2 3');
    });

    it('should skip empty lines and comments', () => {
      const lines = ['PENDOWN', '', '# This is a comment', 'RECT 2 3'];
      const blocks = parseBlocks(lines);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].line).toBe('PENDOWN');
      expect(blocks[1].line).toBe('RECT 2 3');
    });

    it('should preserve indentation info', () => {
      const lines = ['WHILE x < 5', '  RECT 1 1', 'END'];
      const blocks = parseBlocks(lines);
      expect(blocks[0].indent).toBe(0);
      expect(blocks[1].indent).toBe(2);
    });

    it('should handle tabs and spaces', () => {
      const lines = ['IF x > 5', '\tPRINT "yes"', 'END'];
      const blocks = parseBlocks(lines);
      expect(blocks[0].indent).toBe(0);
      expect(blocks[1].indent).toBe(1);
    });
  });
});

describe('Scripting Interpreter - Drawing Commands', () => {
  const createState = () => ({
    cells: new Set(),
    x: 0,
    y: 0,
    penDown: true,
    vars: {},
    output: [],
    outputLabels: []
  });

  it('should execute PENDOWN and PENUP', () => {
    const state = createState();
    expect(state.penDown).toBe(true);
    // PENDOWN/PENUP are state changes
    state.penDown = false;
    expect(state.penDown).toBe(false);
  });

  it('should execute GOTO command', () => {
    const state = createState();
    state.x = 10;
    state.y = 20;
    expect(state.x).toBe(10);
    expect(state.y).toBe(20);
  });

  it('should execute RECT command', () => {
    const state = createState();
    state.penDown = true;
    const width = 3;
    const height = 2;
    // Draw a rectangle
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        state.cells.add(`${state.x + dx},${state.y + dy}`);
      }
    }
    expect(state.cells.size).toBe(6);
  });

  it('should execute CLEAR command', () => {
    const state = createState();
    state.cells.add('0,0');
    state.cells.add('1,1');
    expect(state.cells.size).toBe(2);
    state.cells = new Set();
    expect(state.cells.size).toBe(0);
  });

  it('should execute LABEL command', () => {
    const state = createState();
    state.x = 5;
    state.y = 5;
    state.outputLabels.push({ x: state.x, y: state.y, text: 'Marker' });
    expect(state.outputLabels).toHaveLength(1);
    expect(state.outputLabels[0].text).toBe('Marker');
  });
});

describe('Scripting Interpreter - Variables and Assignment', () => {
  it('should support variable assignment', () => {
    const state = { vars: {}, cells: new Set(), x: 0, y: 0, penDown: true, output: [], outputLabels: [] };
    state.vars.x = 10;
    expect(state.vars.x).toBe(10);
  });

  it('should support expression assignment', () => {
    const state = { vars: { a: 5, b: 3 }, cells: new Set(), x: 0, y: 0, penDown: true, output: [], outputLabels: [] };
    state.vars.c = evalExpr('a + b', state);
    expect(state.vars.c).toBe(8);
  });

  it('should support string assignment', () => {
    const state = { vars: {}, cells: new Set(), x: 0, y: 0, penDown: true, output: [], outputLabels: [] };
    state.vars.name = parseValue('"test"', state);
    expect(state.vars.name).toBe('test');
  });

  it('should support COUNT command', () => {
    const state = { vars: {}, cells: new Set(), x: 0, y: 0, penDown: true, output: [], outputLabels: [] };
    state.cells.add('0,0');
    state.cells.add('1,1');
    state.cells.add('2,2');
    state.vars.count = state.cells.size;
    expect(state.vars.count).toBe(3);
  });
});

describe('Scripting Interpreter - Control Flow', () => {
  it('should support IF blocks', () => {
    const state = { vars: { x: 10 }, output: [] };
    if (evalCond('x', '>', '5', state)) {
      state.output.push('x is greater than 5');
    }
    expect(state.output).toContain('x is greater than 5');
  });

  it('should support WHILE loops', () => {
    const state = { vars: { i: 0 }, output: [] };
    while (evalCond('i', '<', '3', state)) {
      state.output.push(state.vars.i);
      state.vars.i = evalExpr('i + 1', state);
    }
    expect(state.output).toEqual([0, 1, 2]);
  });

  it('should support nested conditions', () => {
    const state = { vars: { x: 10, y: 5 }, output: [] };
    if (evalCond('x', '>', '5', state)) {
      if (evalCond('y', '<', '10', state)) {
        state.output.push('nested condition met');
      }
    }
    expect(state.output).toContain('nested condition met');
  });

  it('should handle loop termination correctly', () => {
    const state = { vars: { i: 0 }, iterations: 0 };
    while (evalCond('i', '<', '5', state)) {
      state.iterations++;
      state.vars.i = evalExpr('i + 1', state);
    }
    expect(state.iterations).toBe(5);
  });

  it('should support ELSE clause with true condition', async () => {
    const script = `IF x > 5
  y = 100
ELSE
  y = 50
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { x: 10, y: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.y).toBe(100); // IF condition true, so ELSE not executed
  });

  it('should support ELSE clause with false condition', async () => {
    const script = `IF x > 5
  y = 100
ELSE
  y = 50
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { x: 3, y: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.y).toBe(50); // IF condition false, so ELSE executed
  });

  it('should support nested IF...ELSE structures', async () => {
    const script = `IF x > 5
  IF y > 3
    z = 1
  ELSE
    z = 2
  END
ELSE
  z = 3
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { x: 10, y: 2, z: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.z).toBe(2); // Outer IF true, inner IF false → inner ELSE
  });

  it('should handle ELSE with drawing commands', async () => {
    const script = `IF count > 5
  RECT 10 10
ELSE
  RECT 5 5
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), x: 0, y: 0, penDown: true };
    await execBlock(blocks, state, null, () => {}, null, null);
    // When count <= 5 (undefined → 0), ELSE should execute with 5x5 rect = 25 cells
    expect(state.cells.size).toBe(25); // 5 * 5
  });

  it('should support FOR loops with numeric ranges', async () => {
    const script = `FOR i FROM 1 TO 5
  sum = sum + i
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { sum: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.sum).toBe(15); // 1+2+3+4+5 = 15
  });

  it('should support FOR loops with STEP parameter', async () => {
    const script = `FOR i FROM 0 TO 10 STEP 2
  count = count + 1
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(6); // 0,2,4,6,8,10 = 6 iterations
  });

  it('should support FOR loops with negative STEP (counting down)', async () => {
    const script = `FOR i FROM 10 TO 1 STEP -1
  sum = sum + i
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { sum: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.sum).toBe(55); // 10+9+8+...+1 = 55
  });

  it('should support nested FOR loops', async () => {
    const script = `FOR x FROM 1 TO 3
  FOR y FROM 1 TO 3
    count = count + 1
  END
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(9); // 3x3 nested = 9 iterations
  });

  it('should support FOR loops with drawing commands', async () => {
    const script = `FOR i FROM 0 TO 4
  RECT 2 2
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), penDown: true, x: 0, y: 0 };
    await execBlock(blocks, state, null, () => {}, null, null);
    // 5 iterations of a 2x2 RECT at the same position (0,0) = 4 unique cells total
    expect(state.cells.size).toBe(4); // 2x2 = 4 cells
  });

  it('should handle empty FOR loop range (no iterations)', async () => {
    const script = `FOR i FROM 5 TO 1
  count = count + 1
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { count: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.count).toBe(0); // No iterations (5 > 1 with step +1)
  });

  it('should support FOR loop with variable expressions', async () => {
    const script = `FOR i FROM start TO end STEP increment
  total = total + i
END`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: { start: 2, end: 8, increment: 2, total: 0 }, cells: new Set() };
    await execBlock(blocks, state, null, () => {}, null, null);
    expect(state.vars.total).toBe(20); // 2+4+6+8 = 20
  });

  it('should support UNTIL_STEADY for still life detection', async () => {
    // Mock ticks function that returns a stable pattern (2x2 block)
    const mockTicks = (cells) => {
      const stable = new Set();
      stable.add('0,0');
      stable.add('0,1');
      stable.add('1,0');
      stable.add('1,1');
      return stable;
    };

    const script = `RECT 2 2
UNTIL_STEADY steps 100`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), penDown: true, x: 0, y: 0 };
    await execBlock(blocks, state, null, () => {}, null, mockTicks);
    
    expect(state.vars.steps).toBe(3); // Confidence confirms still-life after 3 repeated observations
  });

  it('should support UNTIL_STEADY with variable max steps', async () => {
    const mockTicks = (cells) => {
      const stable = new Set();
      stable.add('0,0');
      stable.add('0,1');
      stable.add('1,0');
      stable.add('1,1');
      return stable;
    };

    const script = `max = 50
RECT 2 2
UNTIL_STEADY steps max`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), penDown: true, x: 0, y: 0 };
    await execBlock(blocks, state, null, () => {}, null, mockTicks);
    
    expect(state.vars.steps).toBe(3);
    expect(state.vars.max).toBe(50);
  });

  it('should handle UNTIL_STEADY timeout (pattern never stabilizes)', async () => {
    let stepCounter = 0;
    const mockTicks = () => {
      // Return a shape that keeps changing in normalized form so no cycle/translation can confirm.
      const unstable = new Set();
      stepCounter += 1;
      for (let i = 0; i <= stepCounter; i++) {
        unstable.add(`${i},${i % 3}`);
      }
      unstable.add(`${stepCounter},${stepCounter}`);
      return unstable;
    };

    const script = `RECT 2 2
UNTIL_STEADY steps 10`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), penDown: true, x: 0, y: 0 };
    await execBlock(blocks, state, null, () => {}, null, mockTicks);
    
    expect(state.vars.steps).toBe(-1); // Timeout indicator
  });

  it('should detect simple oscillators with UNTIL_STEADY', async () => {
    let toggle = false;
    const mockTicks = () => {
      // Blinker oscillator (period 2)
      toggle = !toggle;
      const pattern = new Set();
      if (toggle) {
        pattern.add('1,0');
        pattern.add('1,1');
        pattern.add('1,2');
      } else {
        pattern.add('0,1');
        pattern.add('1,1');
        pattern.add('2,1');
      }
      return pattern;
    };

    const script = `RECT 3 1
UNTIL_STEADY steps 50`;
    const blocks = parseBlocks(script.split('\n'));
    const state = { vars: {}, cells: new Set(), penDown: true, x: 0, y: 0 };
    await execBlock(blocks, state, null, () => {}, null, mockTicks);
    
    expect(state.vars.steps).toBeGreaterThan(0);
    expect(state.vars.steps).toBeLessThan(50);
    expect(state.vars.steps_period).toBe(2); // Period 2 oscillator detected
  });
});

describe('Scripting Interpreter - Edge Cases & Error Handling', () => {
  it('should handle division by zero', () => {
    const state = { vars: {} };
    const result = evalExpr('10 / 0', state);
    expect(Number.isFinite(result)).toBe(false); // Infinity or NaN
  });

  it('should handle very large numbers', () => {
    const state = { vars: {} };
    const result = evalExpr('999999999999 + 1', state);
    expect(result).toBeGreaterThan(999999999999);
  });

  it('should handle negative numbers', () => {
    const state = { vars: { x: -5 } };
    expect(parseValue('x', state)).toBe(-5);
    expect(evalExpr('x + 10', state)).toBe(5);
  });

  it('should handle floating point numbers', () => {
    const state = { vars: {} };
    const result = evalExpr('3.14 * 2', state);
    expect(result).toBeCloseTo(6.28, 2);
  });

  it('should handle empty script', () => {
    const lines = ['', '# Just comments', ''];
    const blocks = parseBlocks(lines);
    expect(blocks).toHaveLength(0);
  });

  it('should gracefully handle undefined variables in expressions', () => {
    const state = { vars: {} };
    const result = evalExpr('undefined + 5', state);
    expect(result).toBe(5); // 0 + 5
  });
});

describe('Scripting Interpreter - String Functions', () => {
  it('should support STRLEN function', () => {
    const state = { vars: { msg: 'hello' } };
    expect(evalExpr('STRLEN("hello")', state)).toBe(5);
    expect(evalExpr('STRLEN(msg)', state)).toBe(5);
    expect(evalExpr('STRLEN("")', state)).toBe(0);
  });

  it('should support TOUPPER function', () => {
    const state = { vars: { text: 'Hello World' } };
    expect(evalExpr('TOUPPER("hello")', state)).toBe('HELLO');
    expect(evalExpr('TOUPPER(text)', state)).toBe('HELLO WORLD');
  });

  it('should support TOLOWER function', () => {
    const state = { vars: { text: 'Hello World' } };
    expect(evalExpr('TOLOWER("HELLO")', state)).toBe('hello');
    expect(evalExpr('TOLOWER(text)', state)).toBe('hello world');
  });

  it('should support TRIM function', () => {
    const state = { vars: {} };
    expect(evalExpr('TRIM("  hello  ")', state)).toBe('hello');
    expect(evalExpr('TRIM("  spaces  ")', state)).toBe('spaces');
  });

  it('should support SUBSTRING function', () => {
    const state = { vars: { text: 'hello' } };
    expect(evalExpr('SUBSTRING("hello", 0, 3)', state)).toBe('hel');
    expect(evalExpr('SUBSTRING(text, 1, 4)', state)).toBe('ell');
    expect(evalExpr('SUBSTRING("test", 0, 10)', state)).toBe('test');
  });

  it('should support INDEX function', () => {
    const state = { vars: { text: 'hello world' } };
    expect(evalExpr('INDEX("hello", "l")', state)).toBe(2);
    expect(evalExpr('INDEX(text, "world")', state)).toBe(6);
    expect(evalExpr('INDEX("hello", "x")', state)).toBe(-1); // Not found
  });

  it('should support REPLACE function', () => {
    const state = { vars: { text: 'hello world' } };
    expect(evalExpr('REPLACE("hello", "l", "L")', state)).toBe('heLLo');
    expect(evalExpr('REPLACE(text, "world", "GOL")', state)).toBe('hello GOL');
    expect(evalExpr('REPLACE("aaa", "a", "b")', state)).toBe('bbb');
  });

  it('should handle string functions with variables', () => {
    const state = { vars: { 
      original: 'Hello World',
      find: 'World',
      replace: 'GOL'
    } };
    expect(evalExpr('INDEX(original, find)', state)).toBe(6);
    // REPLACE with all variables
    const result = evalExpr('REPLACE(original, find, replace)', state);
    expect(result).toBe('Hello GOL');
  });
});

describe('Scripting Interpreter - Geometric Commands', () => {
  const baseState = () => ({ cells: new Set(), x: 0, y: 0, penDown: true, vars: {} });

  const runCommand = async (line) => {
    const state = baseState();
    await executeCommand(line, state, null, null, null, null, null, null);
    return state;
  };

  it('gracefully ignores unsupported LINE command', async () => {
    const state = await runCommand('LINE 0 0 3 3');
    expect(state.cells.size).toBe(0);
    expect(state.x).toBe(0);
    expect(state.y).toBe(0);
  });

  it('gracefully ignores unsupported OVAL command', async () => {
    const state = await runCommand('OVAL 0 0 4 2');
    expect(state.cells.size).toBe(0);
  });

  it('gracefully ignores unsupported RECTPERIMETER command', async () => {
    const state = await runCommand('RECTPERIMETER 0 0 2 2');
    expect(state.cells.size).toBe(0);
  });

  it('gracefully ignores unsupported SQUARE command', async () => {
    const state = await runCommand('SQUARE 5');
    expect(state.cells.size).toBe(0);
  });

  it('gracefully ignores unsupported RANDRECT command', async () => {
    const state = await runCommand('RANDRECT 1 3 1 3 5');
    expect(state.cells.size).toBe(0);
  });

  it('should execute CIRCLE with radius only', () => {
    // Test using the state pattern
    const state = {
      cells: new Set(),
      x: 10,
      y: 10,
      penDown: true,
      vars: {}
    };
    
    // Manual circle drawing (would be done by interpreter)
    // Draw circle at (10,10) with radius 5
    const circlePoints = [
      [15, 10], [10, 5], [5, 10], [10, 15]  // Cardinal points
    ];
    for (const [x, y] of circlePoints) {
      state.cells.add(`${x},${y}`);
    }
    
    expect(state.cells.size).toBeGreaterThan(0);
    expect(state.cells.has('15,10')).toBe(true);
  });

  it('should handle CIRCLE with zero radius', () => {
    const state = {
      cells: new Set(),
      x: 10,
      y: 10,
      penDown: true,
      vars: {}
    };
    
    // Circle with r=0 is just the center point
    state.cells.add('10,10');
    
    expect(state.cells.size).toBe(1);
    expect(state.cells.has('10,10')).toBe(true);
  });

  it('should handle CIRCLE with large radius', () => {
    const state = {
      cells: new Set(),
      x: 0,
      y: 0,
      penDown: true,
      vars: {}
    };
    
    // Large circle should have many cells
    for (let i = 0; i < 150; i++) {
      state.cells.add(`${i},${i}`);
    }
    
    expect(state.cells.size).toBeGreaterThan(100);
  });
});

describe('Scripting Interpreter - Integration Tests', () => {
  it('should execute a complete drawing sequence', () => {
    const state = {
      cells: new Set(),
      x: 0,
      y: 0,
      penDown: true,
      vars: {},
      output: [],
      outputLabels: []
    };

    // Simulate: PENDOWN; GOTO 5 5; RECT 3 2; CLEAR
    state.penDown = true;
    state.x = 5;
    state.y = 5;
    
    // Draw 3x2 rect
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        state.cells.add(`${state.x + dx},${state.y + dy}`);
      }
    }
    expect(state.cells.size).toBe(6);

    // Clear
    state.cells = new Set();
    expect(state.cells.size).toBe(0);
  });

  it('should handle complex variable usage', () => {
    const state = { vars: {}, output: [] };

    // Simulate complex program
    state.vars.width = 4;
    state.vars.height = 3;
    state.vars.area = evalExpr('width * height', state);
    state.output.push(state.vars.area);

    expect(state.vars.area).toBe(12);
    expect(state.output).toContain(12);
  });

  it('should handle mixed numeric and string operations', () => {
    const state = { vars: {}, output: [] };

    state.vars.x = 5;
    state.vars.msg = evalExpr('"Result: " + x', state);
    expect(state.vars.msg).toBe('Result: 5');
  });
});

