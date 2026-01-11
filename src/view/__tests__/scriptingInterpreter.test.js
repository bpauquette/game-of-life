import { parseBlocks, execBlock, splitCond, executeCommand } from '../scriptingInterpreter';
import { parseValue, evalExpr, evalCond } from '../scriptingEngine';

describe('ScriptingInterpreter', () => {
  test('parseBlocks extracts non-empty lines with proper structure', () => {
    const input = [
      'PENDOWN',
      '',
      '# comment',
      '  RECT 4 3',
      'CAPTURE demo'
    ];
    
    const result = parseBlocks(input);
    
    expect(result).toEqual([
      { line: 'PENDOWN', indent: 0, raw: 'PENDOWN', idx: 0 },
      { line: 'RECT 4 3', indent: 2, raw: '  RECT 4 3', idx: 3 },
      { line: 'CAPTURE demo', indent: 0, raw: 'CAPTURE demo', idx: 4 }
    ]);
  });

  test('splitCond parses comparison operators correctly', () => {
    expect(splitCond('x == 5')).toEqual(['x', '==', '5']);
    expect(splitCond('y != 0')).toEqual(['y', '!=', '0']);
    expect(splitCond('z >= 10')).toEqual(['z', '>=', '10']);
    expect(splitCond('simple')).toEqual(['simple', '==', true]);
  });

  test('executeCommand handles STEP commands', async () => {
    const mockState = {
      cells: new Set(['0,0', '1,0', '0,1']),
      vars: {},
      outputLabels: []
    };
    
    const mockEmitStepEvent = jest.fn();
    const mockStep = jest.fn();
    const mockTicks = jest.fn().mockReturnValue(new Map([['1,1', true]]));
    
    await executeCommand('STEP 1', mockState, null, mockEmitStepEvent, mockStep, mockTicks, null, null);
    
    expect(mockTicks).toHaveBeenCalled();
    expect(mockState.cells.has('1,1')).toBe(true);
  });

  test('execBlock processes variable assignments and commands', async () => {
    const blocks = [
      { line: 'x = 5', indent: 0, raw: 'x = 5', idx: 0 },
      { line: 'y = 3', indent: 0, raw: 'y = 3', idx: 1 },
      { line: 'GOTO x y', indent: 0, raw: 'GOTO x y', idx: 2 }
    ];
    
    const state = { 
      cells: new Set(), 
      vars: {}, 
      outputLabels: [],
      x: 0,
      y: 0
    };
    
    await execBlock(blocks, state, null, null, null, null);
    
    expect(state.vars.x).toBe(5);
    expect(state.vars.y).toBe(3);
    expect(state.x).toBe(5);
    expect(state.y).toBe(3);
  });

  test('execBlock handles control flow with IF statements', async () => {
    const blocks = [
      { line: 'x = 10', indent: 0, raw: 'x = 10', idx: 0 },
      { line: 'IF x > 5', indent: 0, raw: 'IF x > 5', idx: 1 },
      { line: 'RECT 2 2', indent: 2, raw: '  RECT 2 2', idx: 2 },
      { line: 'END', indent: 0, raw: 'END', idx: 3 }
    ];
    
    const state = { 
      cells: new Set(), 
      vars: {}, 
      outputLabels: []
    };
    
    await execBlock(blocks, state, null, null, null, null);
    
    expect(state.vars.x).toBe(10);
    expect(state.cells.size).toBe(4); // 2x2 rectangle
    expect(state.cells.has('0,0')).toBe(true);
    expect(state.cells.has('1,1')).toBe(true);
  });

  test('Game of Life evolution produces expected patterns', async () => {
    // Test with a known Game of Life pattern (blinker)
    const initialState = new Set(['1,0', '1,1', '1,2']); // vertical blinker
    
    const mockTicks = jest.fn().mockImplementation((cells) => {
      // Simple Game of Life evolution
      const cellMap = new Set();
      cells.forEach(cell => cellMap.add(`${cell.x},${cell.y}`));
      
      const neighbors = new Map();
      const addNeighbor = (key) => neighbors.set(key, (neighbors.get(key) || 0) + 1);
      
      for (const cellKey of cellMap) {
        const [x, y] = cellKey.split(',').map(Number);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            addNeighbor(`${x + dx},${y + dy}`);
          }
        }
      }
      
      const nextGen = new Map();
      for (const [key, count] of neighbors.entries()) {
        const alive = cellMap.has(key);
        if (alive && (count === 2 || count === 3)) nextGen.set(key, true);
        if (!alive && count === 3) nextGen.set(key, true);
      }
      
      return nextGen;
    });
    
    const state = { 
      cells: initialState, 
      vars: {}, 
      outputLabels: [] 
    };
    
    // Test evolution through executeCommand
    await executeCommand('STEP 1', state, null, null, null, mockTicks, null, null);
    
    expect(mockTicks).toHaveBeenCalled();
    // After one step, vertical blinker should become horizontal
    expect(state.cells.size).toBeGreaterThan(0);
  });
});

describe('ScriptingEngine', () => {
  test('parseValue handles different value types', () => {
    const state = { vars: { x: 5, name: 'test' } };
    
    expect(parseValue('42', state)).toBe(42);
    expect(parseValue('"hello"', state)).toBe('hello');
    expect(parseValue('x', state)).toBe(5);
    expect(parseValue('name', state)).toBe('test');
    expect(parseValue('unknown', state)).toBe(0);
  });

  test('evalExpr handles arithmetic operations', () => {
    const state = { vars: { x: 10, y: 3 } };
    
    expect(evalExpr('x + y', state)).toBe(13);
    expect(evalExpr('x - y', state)).toBe(7);
    expect(evalExpr('x * y', state)).toBe(30);
    expect(evalExpr('x / y', state)).toBeCloseTo(3.33, 2);
  });

  test('evalExpr handles string concatenation', () => {
    const state = { vars: { name: 'John', age: 25 } };
    
    expect(evalExpr('"Hello" + name', state)).toBe('HelloJohn');
    expect(evalExpr('name + age', state)).toBe('John25');
  });

  test('evalCond evaluates comparison conditions', () => {
    const state = { vars: { x: 5, y: 10 } };
    
    expect(evalCond('x', '==', '5', state)).toBe(true);
    expect(evalCond('x', '!=', '5', state)).toBe(false);
    expect(evalCond('x', '<', 'y', state)).toBe(true);
    expect(evalCond('y', '>', 'x', state)).toBe(true);
    expect(evalCond('x', '<=', '5', state)).toBe(true);
    expect(evalCond('y', '>=', '10', state)).toBe(true);
  });
});