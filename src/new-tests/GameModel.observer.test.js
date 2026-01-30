import { GameModel } from '../../src/model/GameModel.js';

// Lightweight helper to capture events
function createObserverCapture() {
  const events = [];
  const handler = (event, data) => {
    events.push({ event, data });
  };
  return { handler, events };
}

describe('GameModel observer events', () => {
  let model;
  let capture;

  beforeEach(() => {
    model = new GameModel();
    capture = createObserverCapture();
    model.addObserver(capture.handler);
  });

  afterEach(() => {
    if (model && capture) model.removeObserver(capture.handler);
  });

  test('overlayChanged fires when overlay updated', () => {
    expect(model.getOverlay()).toBeNull();
    model.setOverlay({ type: 'shapePreview', cells: [] });
    const evt = capture.events.find(e => e.event === 'overlayChanged');
    expect(evt).toBeTruthy();
    expect(evt.data).toEqual({ type: 'shapePreview', cells: [] });
  });

  test('selectedToolChanged, selectedShapeChanged fire on set', () => {
    model.setSelectedToolModel('rect');
    model.setSelectedShapeModel({ id: 'glider' });
    const toolEvt = capture.events.find(e => e.event === 'selectedToolChanged');
    const shapeEvt = capture.events.find(e => e.event === 'selectedShapeChanged');
    expect(toolEvt?.data || toolEvt).toBe('rect');
    expect(shapeEvt?.data || shapeEvt).toEqual({ id: 'glider' });
  });

  test('cursorPositionChanged is throttled but fires on change', () => {
    model.setCursorPositionModel({ x: 1, y: 2 });
    const evt = capture.events.find(e => e.event === 'cursorPositionChanged');
    expect(evt).toBeTruthy();
    expect(evt.data).toEqual({ x: 1, y: 2 });
  });

  test('viewportChanged fires on setViewportModel', () => {
    model.setViewportModel(5, 7, 10, 1);
    const evt = capture.events.find(e => e.event === 'viewportChanged');
    expect(evt).toBeTruthy();
    expect(evt.data).toMatchObject({ offsetX: 5, offsetY: 7, cellSize: 10 });
  });

  test('runningStateChanged fires on setRunningModel', () => {
    model.setRunningModel(true);
    const evt = capture.events.find(e => e.event === 'runningStateChanged');
    expect(evt).toBeTruthy();
    expect(evt.data).toEqual({ isRunning: true });
  });

  test('toolStateChanged can be forwarded via notifyObservers', () => {
    model.notifyObservers('toolStateChanged', { start: { x: 1, y: 1 } });
    const evt = capture.events.find(e => e.event === 'toolStateChanged');
    expect(evt).toBeTruthy();
    expect(evt.data).toEqual({ start: { x: 1, y: 1 } });
  });
});
