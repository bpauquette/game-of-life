import runScript from '../view/ScriptPanel';

describe('Script Language - Basic Commands', () => {
  it('should draw a rectangle with RECT', () => {
    const script = 'PENDOWN\nRECT 3 2';
    const state = runScript(script);
    expect(state.cells.size).toBeGreaterThan(0);
  });

  it('should move pen with FORWARD and BACK', () => {
    const script = 'PENDOWN\nFORWARD 5\nBACK 2';
    const state = runScript(script);
    expect(state.x).not.toBe(0);
  });

  it('should support variables and assignment', () => {
    const script = 'x = 5\nPENDOWN\nFORWARD x';
    const state = runScript(script);
    expect(state.x).toBe(5);
  });

  it('should support while loops', () => {
    const script = 'x = 0\nwhile x < 3\n  x = x + 1\nend\nPENDOWN\nFORWARD x';
    const state = runScript(script);
    expect(state.x).toBe(3);
  });

  it('should support STEP n and advance generations', () => {
    const script = 'PENDOWN\nRECT 2 2\nSTEP 3';
    const state = runScript(script);
    expect(state.cells.size).toBeGreaterThan(0);
  });
});
