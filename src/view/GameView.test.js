import { GameView } from './GameView.js';

describe('GameView', () => {
  let canvas;
  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    document.body.removeChild(canvas);
  });

  it('can be constructed and renders without error', () => {
    const view = new GameView(canvas);
    expect(view).toBeDefined();
    expect(typeof view.render).toBe('function');
  });

  it('converts screen to cell and back', () => {
    const view = new GameView(canvas);
    const cell = view.screenToCell(10, 10);
    const screen = view.cellToScreen(cell.x, cell.y);
    expect(screen).toHaveProperty('x');
    expect(screen).toHaveProperty('y');
  });

  it('emits and handles events', () => {
    const view = new GameView(canvas);
    const handler = jest.fn();
    view.on('test', handler);
    view.emit('test', { foo: 1 });
    expect(handler).toHaveBeenCalledWith({ foo: 1 });
    view.off('test', handler);
    view.emit('test', { foo: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('registers non-passive wheel listeners', () => {
    const addEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
    const view = new GameView(canvas);
    view.setupMouseEvents();

    const wheelCalls = addEventListenerSpy.mock.calls.filter(call => call[0] === 'wheel');
    expect(wheelCalls.length).toBeGreaterThan(0);
    for (const call of wheelCalls) {
      expect(call[2]).toMatchObject({ passive: false });
    }
    addEventListenerSpy.mockRestore();
  });
});
