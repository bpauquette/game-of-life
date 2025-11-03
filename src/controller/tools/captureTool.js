import logger from '../utils/logger';
import { makeCellsHighlightOverlay } from '../../overlays/overlayTypes';
// Rectangular area capture tool for shapes catalog
// Uses eyedropper metaphor for sampling/capturing patterns from the grid

// Visual constants for capture tool
const SELECTION_STROKE_COLOR = 'rgba(0, 255, 136, 0.8)';
const SELECTION_FILL_COLOR = 'rgba(0, 255, 136, 0.1)';
const CAPTURED_CELL_COLOR = 'rgba(255, 255, 0, 0.6)';
const SELECTION_LINE_WIDTH = 2;
const DASH_PATTERN = [5, 5];

export const captureTool = {
  getOverlay(toolState /*, cellSize */) {
    // Provide a descriptor overlay so GameRenderer can draw it during main render
    if (!toolState.start || !toolState.end) return null;
    const cells = Array.isArray(toolState.preview) ? toolState.preview : [];
    // Use a subtle greenish highlight similar to the tool's canvas overlay
    return makeCellsHighlightOverlay(cells, { color: 'rgba(0,255,136,0.28)', alpha: 0.6 });
  },
  onMouseDown(toolState, x, y) {
    // Start rectangle selection
    toolState.start = { x, y };
    toolState.end = { x, y };
    toolState.preview = [];
    toolState.capturedCells = [];
  },

  onMouseMove(toolState, x, y, setCellAlive, getLiveCells) {
    if (!toolState.start) return;
    
    // Update end position
    toolState.end = { x, y };
    
    // Generate preview rectangle outline
    const minX = Math.min(toolState.start.x, x);
    const maxX = Math.max(toolState.start.x, x);
    const minY = Math.min(toolState.start.y, y);
    const maxY = Math.max(toolState.start.y, y);
    
  // Create rectangle perimeter for preview (absolute cell coords)
  toolState.preview = [];
    
  // Add top and bottom edges
    const topBottomEdges = [];
    for (let px = minX; px <= maxX; px++) {
      topBottomEdges.push([px, minY], [px, maxY]);
    }
    toolState.preview.push(...topBottomEdges);
    
  // Add left and right edges
    const leftRightEdges = [];
    for (let py = minY + 1; py < maxY; py++) {
      leftRightEdges.push([minX, py], [maxX, py]);
    }
    toolState.preview.push(...leftRightEdges);
    
    // Capture live cells within the selection area
    if (getLiveCells) {
      const liveCells = getLiveCells();
      toolState.capturedCells = [];
      
      for (const [key] of liveCells.entries()) {
        const [cellX, cellY] = key.split(',').map(Number);
        if (cellX >= minX && cellX <= maxX && cellY >= minY && cellY <= maxY) {
          toolState.capturedCells.push([cellX, cellY]);
        }
      }
    }
  },

  onMouseUp(toolState, x, y, setCellAlive, getLiveCells, tool) {
    if (!toolState.start) return;
    
    // Final capture of the selected area
    const minX = Math.min(toolState.start.x, x);
    const maxX = Math.max(toolState.start.x, x);
    const minY = Math.min(toolState.start.y, y);
    const maxY = Math.max(toolState.start.y, y);
    
    // Extract live cells and normalize coordinates
    let capturedCells = [];
    
    if (getLiveCells) {
      const liveCells = getLiveCells();
      
      for (const [key] of liveCells.entries()) {
        const [cellX, cellY] = key.split(',').map(Number);
        if (cellX >= minX && cellX <= maxX && cellY >= minY && cellY <= maxY) {
          // Normalize coordinates relative to top-left of selection
          capturedCells.push({ 
            x: cellX - minX, 
            y: cellY - minY 
          });
        }
      }
    }
    
    // Store capture data for dialog
    const captureData = {
      cells: capturedCells,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      originalBounds: { minX, maxX, minY, maxY },
      cellCount: capturedCells.length
    };
    
  logger.debug('Capture tool generated data:', captureData);
    
    // Reset selection state
    toolState.start = null;
    toolState.end = null;
    toolState.preview = [];
    toolState.capturedCells = [];
    
    // Trigger capture dialog if callback is available
  tool?.onCaptureComplete?.(captureData) || logger.info('Captured shape:', captureData);
  },

  drawOverlay(ctx, toolState, cellSize, offset) {
    if (!toolState.start || !toolState.end) return;
    
    const minX = Math.min(toolState.start.x, toolState.end.x);
    const maxX = Math.max(toolState.start.x, toolState.end.x);
    const minY = Math.min(toolState.start.y, toolState.end.y);
    const maxY = Math.max(toolState.start.y, toolState.end.y);
    
    // Calculate screen coordinates
    const screenMinX = minX * cellSize - offset.x;
    const screenMinY = minY * cellSize - offset.y;
    const screenMaxX = (maxX + 1) * cellSize - offset.x;
    const screenMaxY = (maxY + 1) * cellSize - offset.y;
    
    ctx.save();
    
    // Draw selection rectangle with dashed border
    ctx.strokeStyle = SELECTION_STROKE_COLOR;
    ctx.lineWidth = SELECTION_LINE_WIDTH;
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeRect(
      screenMinX, 
      screenMinY, 
      screenMaxX - screenMinX, 
      screenMaxY - screenMinY
    );
    
    // Fill selection area with semi-transparent overlay
    ctx.fillStyle = SELECTION_FILL_COLOR;
    ctx.fillRect(
      screenMinX, 
      screenMinY, 
      screenMaxX - screenMinX, 
      screenMaxY - screenMinY
    );
    
    // Highlight captured cells
    if (toolState.capturedCells && toolState.capturedCells.length > 0) {
      ctx.fillStyle = CAPTURED_CELL_COLOR;
      for (const [cellX, cellY] of toolState.capturedCells) {
        const screenX = cellX * cellSize - offset.x;
        const screenY = cellY * cellSize - offset.y;
        ctx.fillRect(screenX, screenY, cellSize, cellSize);
      }
    }
    
    // Draw cell count indicator
    if (toolState.capturedCells) {
      const cellCount = toolState.capturedCells.length;
      const text = `${cellCount} cells`;
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      
      // Position text near the selection
      const textX = screenMinX;
      const textY = screenMinY - 8;
      
      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }
    
    ctx.restore();
  }
};