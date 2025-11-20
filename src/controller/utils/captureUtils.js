// Utility functions for capturing rectangular areas and extracting shapes
// Used by captureTool for processing cell data

/**
 * Extracts live cells from a rectangular area and normalizes coordinates
 * @param {Object} start - Starting corner {x, y}
 * @param {Object} end - Ending corner {x, y}
 * @param {Function} getLiveCells - Function to get live cells Map
 * @returns {Object} Capture data with normalized cells and metadata
 */
export function captureCellsInArea(start, end, getLiveCells) {
  // Calculate bounding rectangle
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  
  // Extract live cells within bounds
  const liveCells = getLiveCells();
  const capturedCells = [];
  
  const addIfWithinBounds = (x, y) => {
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      capturedCells.push({
        x: x - minX,
        y: y - minY
      });
    }
  };

  if (typeof liveCells?.forEachCell === 'function') {
    liveCells.forEachCell(addIfWithinBounds);
  } else if (typeof liveCells?.entries === 'function') {
    for (const [key] of liveCells.entries()) {
      const [x, y] = key.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        addIfWithinBounds(x, y);
      }
    }
  }
  
  return {
    cells: capturedCells,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    cellCount: capturedCells.length,
    originalBounds: { minX, maxX, minY, maxY },
    isEmpty: capturedCells.length === 0
  };
}

/**
 * Converts normalized cell data to shape format for backend API
 * @param {Object} captureData - Data from captureCellsInArea
 * @param {string} name - Shape name
 * @param {string} description - Optional description
 * @returns {Object} Shape object ready for backend submission
 */
export function formatCaptureAsShape(captureData, name, description = '') {
  const { cells, width, height } = captureData;
  
  return {
    name: name.trim(),
    width,
    height,
    cells,
    meta: {
      name: name.trim(),
      description: description.trim(),
      width,
      height,
      capturedAt: new Date().toISOString(),
      source: 'area-capture'
    }
  };
}

/**
 * Validates if a capture area contains any live cells
 * @param {Object} captureData - Data from captureCellsInArea
 * @returns {Object} Validation result with isValid flag and message
 */
export function validateCapture(captureData) {
  if (!captureData || captureData.isEmpty) {
    return {
      isValid: false,
      message: 'No live cells found in the selected area'
    };
  }
  
  if (captureData.cellCount > 1000) {
    return {
      isValid: false,
      message: 'Selection too large (max 1000 cells)'
    };
  }
  
  if (captureData.width > 100 || captureData.height > 100) {
    return {
      isValid: false,
      message: 'Selection dimensions too large (max 100x100)'
    };
  }
  
  return {
    isValid: true,
    message: `Ready to capture ${captureData.cellCount} cells`
  };
}

/**
 * Generates a preview grid for the captured shape
 * @param {Object} captureData - Data from captureCellsInArea
 * @returns {Array} 2D array representing the shape grid
 */
export function generateCapturePreview(captureData) {
  const { cells, width, height } = captureData;
  
  // Initialize empty grid
  const grid = new Array(height).fill(null).map(() => new Array(width).fill(false));
  
  // Fill in live cells
  for (const cell of cells) {
    if (cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height) {
      grid[cell.y][cell.x] = true;
    }
  }
  
  return grid;
}

/**
 * Calculates center point of captured shape for positioning
 * @param {Object} captureData - Data from captureCellsInArea
 * @returns {Object} Center coordinates {x, y}
 */
export function getCaptureCenter(captureData) {
  const { width, height } = captureData;
  
  return {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2)
  };
}