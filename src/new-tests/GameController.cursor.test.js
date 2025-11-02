import { GameModel } from '../../src/model/GameModel';
import { GameView } from '../../src/view/GameView';
import { GameController } from '../../src/controller/GameController';

function createMockCanvas({ width = 300, height = 200 } = {}) {
  const ctx = {
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    setTransform: () => {},
    fillRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
  };
  return {
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width, height, left: 0, top: 0 }),
    style: {},
  };
}

describe('Controller cursor/mouse -> model updates', () => {
  let model;
  let view;
  let controller;
  let events;

  beforeEach(() => {
    model = new GameModel();
    view = new GameView(createMockCanvas(), {}, model);
    controller = new GameController(model, view, { defaultSpeed: 30 });
    events = [];
    model.addObserver((event, data) => events.push({ event, data }));
  });

  test('handleMouseMove updates model cursor and emits cursorPositionChanged', () => {
    const pos = { x: 7, y: 9 };
    controller.handleMouseMove(pos, {});

    expect(model.getCursorPosition()).toEqual(pos);
    expect(events.some(e => e.event === 'cursorPositionChanged' && e.data && e.data.x === 7 && e.data.y === 9)).toBe(true);
  });

  test('throttles rapid cursor updates under 16ms', () => {
    const spy = jest.spyOn(performance, 'now');
    let now = 2000;
    spy.mockImplementation(() => now);

    controller.handleMouseMove({ x: 1, y: 1 }, {});

    // Second cursor update within <16ms
    now = 2005;
    controller.handleMouseMove({ x: 2, y: 2 }, {});

    // Position should still be first, and only one event
    expect(model.getCursorPosition()).toEqual({ x: 1, y: 1 });
    const cursorEvents = events.filter(e => e.event === 'cursorPositionChanged');
    expect(cursorEvents.length).toBe(1);

    spy.mockRestore();
  });

  test('emits again when time delta >= 16ms', () => {
    const spy = jest.spyOn(performance, 'now');
    let now = 3000;
    spy.mockImplementation(() => now);

    controller.handleMouseMove({ x: 5, y: 5 }, {});

    now = 3020; // >= 16ms later
    controller.handleMouseMove({ x: 6, y: 6 }, {});

    expect(model.getCursorPosition()).toEqual({ x: 6, y: 6 });
    const cursorEvents = events.filter(e => e.event === 'cursorPositionChanged');
    expect(cursorEvents.length).toBe(2);

    spy.mockRestore();
  });
});
