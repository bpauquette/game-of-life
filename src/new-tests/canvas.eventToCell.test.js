import { eventToCellFromCanvas } from '../../src/controller/utils/canvasUtils.js';

describe('eventToCellFromCanvas', () => {
  it('calculates integer cell coordinates from client event', () => {
    const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) };
    const offsetRef = { current: { x: 2, y: 3 } };
    const cellSize = 10;
    const ev = { clientX: 60, clientY: 80 };
    const result = eventToCellFromCanvas(ev, canvas, offsetRef, cellSize);
    // manual compute: center = 100,100; (client - left - center)/cellSize = (60-100)/10 = -4
    // x = floor(offset.x + (-4)) = floor(2 -4) = -2
    // similarly for y: (80-100)/10 = -2 => 3 -2 = 1
    expect(result).toMatchObject({ x: -2, y: 1 });
  });
});
