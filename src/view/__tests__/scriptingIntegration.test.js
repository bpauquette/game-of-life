import { parseBlocks, execBlock } from '../scriptingInterpreter.js';

describe('ScriptPanelIntegration', () => {
  test('script with variables creates dynamic patterns', async () => {
    const script = `
      size = 4
      x = 5
      y = 5
      PENDOWN
      GOTO x y
      RECT size size
    `;
    
    let gameState = {
      cells: new Set(),
      vars: {},
      outputLabels: [],
      x: 0,
      y: 0,
      penDown: false
    };

    const blocks = parseBlocks(script.split('\n').map(l => l.trim()).filter(l => l));
    await execBlock(blocks, gameState, null, null, null, null);
    
    // Should have created a 4x4 rectangle at position (5,5)
    expect(gameState.vars.size).toBe(4);
    expect(gameState.vars.x).toBe(5);
    expect(gameState.vars.y).toBe(5);
    expect(gameState.x).toBe(5);
    expect(gameState.y).toBe(5);
    expect(gameState.cells.size).toBe(16); // 4x4 = 16 cells
    expect(gameState.cells.has('5,5')).toBe(true);
    expect(gameState.cells.has('8,8')).toBe(true); // top-right corner
  });

  test('conditional script execution based on variables', async () => {
    const script = `
      mode = 1
      IF mode == 1
        PENDOWN
        RECT 2 2
      END
      IF mode == 2
        PENDOWN  
        CIRCLE 3
      END
    `;
    
    let gameState = {
      cells: new Set(),
      vars: {},
      outputLabels: [],
      x: 0,
      y: 0,
      penDown: false
    };

    const blocks = parseBlocks(script.split('\n').map(l => l.trim()).filter(l => l));
    await execBlock(blocks, gameState, null, null, null, null);
    
    // Should have executed the first IF block (mode == 1)
    expect(gameState.vars.mode).toBe(1);
    expect(gameState.cells.size).toBe(4); // 2x2 rectangle
    expect(gameState.cells.has('0,0')).toBe(true);
    expect(gameState.cells.has('1,1')).toBe(true);
  });

  test('complex script with loops and evolution', async () => {
    const script = `
      PENDOWN
      i = 0
      WHILE i < 3
        GOTO i i
        RECT 1 1
        i = i + 1
      END
      STEP 2
    `;
    
    let gameState = {
      cells: new Set(),
      vars: {},
      outputLabels: [],
      x: 0,
      y: 0,
      penDown: false
    };

    const mockTicks = jest.fn().mockImplementation((liveCells) => {
      // For testing, just return the same pattern
      const result = new Map();
      liveCells.forEach(cell => {
        result.set(`${cell.x},${cell.y}`, true);
      });
      return result;
    });

    const blocks = parseBlocks(script.split('\n').map(l => l.trim()).filter(l => l));
    await execBlock(blocks, gameState, null, null, null, mockTicks);
    
    // Should have created cells at (0,0), (1,1), (2,2) from the loop
    expect(gameState.vars.i).toBe(3);
    expect(gameState.cells.size).toBe(3);
    expect(gameState.cells.has('0,0')).toBe(true);
    expect(gameState.cells.has('1,1')).toBe(true);
    expect(gameState.cells.has('2,2')).toBe(true);
  });
});
