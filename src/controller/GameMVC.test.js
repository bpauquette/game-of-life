import { GameMVC } from './GameMVC';

describe('GameMVC', () => {
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

  it('can be constructed and exposes model, view, controller', () => {
    const mvc = new GameMVC(canvas);
    expect(mvc.model).toBeDefined();
    expect(mvc.view).toBeDefined();
    expect(mvc.controller).toBeDefined();
  });

  it('can set and get cell size and offset', () => {
    const mvc = new GameMVC(canvas);
    mvc.setCellSize(12);
    expect(mvc.getCellSize()).toBe(12);
    mvc.setOffset(5, 7);
    expect(mvc.getOffset()).toEqual({ x: 5, y: 7 });
  });

  it('can set running state', () => {
    const mvc = new GameMVC(canvas);
    expect(() => mvc.setRunning(true)).not.toThrow();
  });
});
