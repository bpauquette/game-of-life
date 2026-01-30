import { eventToCellFromCanvas } from '../../src/controller/utils/canvasUtils.js';

describe('startPaletteDrag-like behavior', () => {
  it('uses offsetRef.cellSize when computing initial cell and calls controller._setToolState', () => {
    const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) };
    const offsetRef = { current: { x: 1, y: 2, cellSize: 8 } };
    const controller = { _setToolState: jest.fn() };
    const shape = { id: 'shape-1' };

    const startEvent = { clientX: 120, clientY: 100 };

    // Simulate the updateLastFromEvent from startPaletteDrag
    const getEffectiveCellSize = () => (offsetRef?.current?.cellSize || 16);
    const pt = eventToCellFromCanvas(startEvent, canvas, offsetRef, getEffectiveCellSize());
    expect(pt).toBeTruthy();

    controller._setToolState({ selectedShapeData: shape, start: pt, last: pt, dragging: true }, { updateOverlay: true });

    expect(controller._setToolState).toHaveBeenCalledTimes(1);
    const callArg = controller._setToolState.mock.calls[0][0];
    expect(callArg.selectedShapeData).toBe(shape);
    expect(callArg.start).toEqual(pt);
    expect(callArg.last).toEqual(pt);
    expect(callArg.dragging).toBe(true);
  });
});
