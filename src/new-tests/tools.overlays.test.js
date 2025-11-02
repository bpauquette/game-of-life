import { circleTool } from '../controller/tools/circleTool';
import { ovalTool } from '../controller/tools/ovalTool';

const makeState = (start, last, preview) => ({ start, last, preview: preview ?? [] });

describe('tool getOverlay descriptors', () => {
  test('circleTool.getOverlay returns cellsHighlight descriptor with preview cells', () => {
    const state = makeState({ x: 1, y: 2 }, { x: 3, y: 4 }, [ [1,2], [2,2], [2,3] ]);
    const overlay = circleTool.getOverlay(state, 10);
    expect(overlay).toBeTruthy();
    expect(overlay.type).toBe('cellsHighlight');
    // cells converted to objects
    expect(Array.isArray(overlay.cells)).toBe(true);
    expect(overlay.cells).toContainEqual({ x: 1, y: 2 });
    expect(overlay.cells).toContainEqual({ x: 2, y: 2 });
    expect(overlay.cells).toContainEqual({ x: 2, y: 3 });
    expect(overlay.style).toBeTruthy();
  });

  test('ovalTool.getOverlay returns cellsHighlight descriptor with preview cells', () => {
    const state = makeState({ x: 5, y: 6 }, { x: 7, y: 8 }, [ [9,10] ]);
    const overlay = ovalTool.getOverlay(state, 10);
    expect(overlay).toBeTruthy();
    expect(overlay.type).toBe('cellsHighlight');
    expect(overlay.cells).toEqual([{ x: 9, y: 10 }]);
  });

  test('getOverlay returns null if not dragging', () => {
    const noStart = makeState(null, null, []);
    expect(circleTool.getOverlay(noStart, 10)).toBeNull();
    expect(ovalTool.getOverlay(noStart, 10)).toBeNull();
  });
});
