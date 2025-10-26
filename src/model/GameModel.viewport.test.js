// GameModel.viewport.test.js - Tests for enhanced viewport management in GameModel
import { GameModel } from './GameModel';

const CONST_VIEWPORTCHANGED = 'viewportChanged';

describe('GameModel Viewport Management', () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  describe('viewport initialization', () => {
    test('should initialize with default viewport values', () => {
      const viewport = model.getViewport();
      
      expect(viewport.offsetX).toBe(0);
      expect(viewport.offsetY).toBe(0);
      expect(viewport.cellSize).toBe(20);
      expect(viewport.zoom).toBe(1);
      expect(viewport.minCellSize).toBe(1);
      expect(viewport.maxCellSize).toBe(200);
    });

    test('should return defensive copy of viewport', () => {
      const viewport1 = model.getViewport();
      const viewport2 = model.getViewport();

      expect(viewport1).not.toBe(viewport2); // Different objects
      expect(viewport1).toEqual(viewport2); // Same values

      // Mutating returned viewport should not affect internal state
      viewport1.offsetX = 999;
      expect(model.getViewport().offsetX).toBe(0);
    });
  });

  describe('complete viewport operations', () => {
    test('should set viewport with all parameters', () => {
  const changed = model.setViewportModel(10, 20, 15, 2);

      expect(changed).toBe(true);
      expect(model.getViewport()).toEqual({
        offsetX: 10,
        offsetY: 20,
        cellSize: 15,
        zoom: 2,
        minCellSize: 1,
        maxCellSize: 200
      });
    });

    test('should notify observers when viewport changes', () => {
      const observer = jest.fn();
      model.addObserver(observer);

  model.setViewportModel(5, 10, 25);

      expect(observer).toHaveBeenCalledWith(CONST_VIEWPORTCHANGED, {
        offsetX: 5,
        offsetY: 10,
        cellSize: 25,
        zoom: 1,
        minCellSize: 1,
        maxCellSize: 200
      });
    });

    test('should not notify observers when viewport unchanged', () => {
  model.setViewportModel(5, 10, 25);

      const observer = jest.fn();
      model.addObserver(observer);

  const changed = model.setViewportModel(5, 10, 25); // Same values

      expect(changed).toBe(false);
      expect(observer).not.toHaveBeenCalled();
    });

    test('should handle partial viewport updates', () => {
  model.setViewportModel(5, 10, 15);

  const changed = model.setViewportModel(5, 10, 20); // Only cellSize changed

      expect(changed).toBe(true);
      expect(model.getViewport().cellSize).toBe(20);
      expect(model.getViewport().offsetX).toBe(5);
      expect(model.getViewport().offsetY).toBe(10);
    });
  });

  describe('individual offset operations', () => {
    test('should set and get offset', () => {
  const changed = model.setOffsetModel(15, 25);

      expect(changed).toBe(true);
      expect(model.getOffset()).toEqual({ x: 15, y: 25 });
      expect(model.getViewport().offsetX).toBe(15);
      expect(model.getViewport().offsetY).toBe(25);
    });

    test('should preserve other viewport properties when setting offset', () => {
  model.setViewportModel(0, 0, 30, 1.5);

  model.setOffsetModel(10, 20);

      const viewport = model.getViewport();
      expect(viewport.offsetX).toBe(10);
      expect(viewport.offsetY).toBe(20);
      expect(viewport.cellSize).toBe(30); // Preserved
      expect(viewport.zoom).toBe(1.5); // Preserved
    });

    test('should handle negative offsets', () => {
  model.setOffsetModel(-10, -20);

      const offset = model.getOffset();
      expect(offset.x).toBe(-10);
      expect(offset.y).toBe(-20);
    });

    test('should handle fractional offsets', () => {
  model.setOffsetModel(10.5, 20.75);

      const offset = model.getOffset();
      expect(offset.x).toBe(10.5);
      expect(offset.y).toBe(20.75);
    });
  });

  describe('cell size operations', () => {
    test('should set and get cell size', () => {
  const changed = model.setCellSizeModel(35);

      expect(changed).toBe(true);
      expect(model.getCellSize()).toBe(35);
      expect(model.getViewport().cellSize).toBe(35);
    });

    test('should clamp cell size to valid range', () => {
      // Test minimum clamping
  model.setCellSizeModel(0.5);
      expect(model.getCellSize()).toBe(1); // Clamped to min

      // Test maximum clamping
  model.setCellSizeModel(300);
      expect(model.getCellSize()).toBe(200); // Clamped to max
    });

    test('should preserve other viewport properties when setting cell size', () => {
  model.setViewportModel(10, 20, 15, 2);

  model.setCellSizeModel(40);

      const viewport = model.getViewport();
      expect(viewport.offsetX).toBe(10); // Preserved
      expect(viewport.offsetY).toBe(20); // Preserved
      expect(viewport.cellSize).toBe(40);
      expect(viewport.zoom).toBe(2); // Preserved
    });

    test('should notify observers when cell size changes', () => {
      const observer = jest.fn();
      model.addObserver(observer);

  model.setCellSizeModel(50);

      expect(observer).toHaveBeenCalledWith(CONST_VIEWPORTCHANGED, expect.objectContaining({
        cellSize: 50
      }));
    });

    test('should not change state when setting same cell size', () => {
  model.setCellSizeModel(25);

      const observer = jest.fn();
      model.addObserver(observer);

  const changed = model.setCellSizeModel(25); // Same value

      expect(changed).toBe(false);
      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe('zoom operations', () => {
    test('should set and get zoom', () => {
  const changed = model.setZoomModel(1.5);

      expect(changed).toBe(true);
      expect(model.getZoom()).toBe(1.5);
      expect(model.getViewport().zoom).toBe(1.5);
    });

    test('should clamp zoom to valid range', () => {
  // Test minimum clamping
  model.setZoomModel(0.05);
  expect(model.getZoom()).toBe(0.1); // Clamped to min

  // Test maximum clamping
  model.setZoomModel(15);
  expect(model.getZoom()).toBe(10); // Clamped to max
    });

    test('should notify observers when zoom changes', () => {
      const observer = jest.fn();
      model.addObserver(observer);

  model.setZoomModel(2.5);

      expect(observer).toHaveBeenCalledWith(CONST_VIEWPORTCHANGED, expect.objectContaining({
        zoom: 2.5
      }));
    });

    test('should not change state when setting same zoom', () => {
  model.setZoomModel(1.25);

      const observer = jest.fn();
      model.addObserver(observer);

  const changed = model.setZoomModel(1.25); // Same value

      expect(changed).toBe(false);
      expect(observer).not.toHaveBeenCalled();
    });

    test('should preserve other viewport properties when setting zoom', () => {
  model.setViewportModel(15, 25, 30, 1);

  model.setZoomModel(3);

      const viewport = model.getViewport();
      expect(viewport.offsetX).toBe(15); // Preserved
      expect(viewport.offsetY).toBe(25); // Preserved  
      expect(viewport.cellSize).toBe(30); // Preserved
      expect(viewport.zoom).toBe(3);
    });

    test('should handle fractional zoom values', () => {
  model.setZoomModel(1.23456);
      expect(model.getZoom()).toBe(1.23456);
    });
  });

  describe('viewport state integration', () => {
    test('should work alongside game state operations', () => {
      // Set up game state
  model.setCellAliveModel(5, 5, true);
  model.setRunningModel(true);

      // Set up viewport state
  model.setViewportModel(10, 20, 30, 2);

      // Verify all state is maintained
      expect(model.isCellAlive(5, 5)).toBe(true);
      expect(model.getIsRunning()).toBe(true);
      expect(model.getViewport()).toEqual({
        offsetX: 10,
        offsetY: 20,
        cellSize: 30,
        zoom: 2,
        minCellSize: 1,
        maxCellSize: 200
      });
    });

    test('should maintain viewport state during game operations', () => {
  model.setViewportModel(15, 25, 35, 1.8);

  // Perform game operations
  model.setCellAliveModel(0, 0, true);
  model.step();
  model.clearModel();
  // Restore viewport state after clear
  model.setViewportModel(15, 25, 35, 1.8);

    // Viewport state should be preserved
    const viewport = model.getViewport();
    expect(viewport.offsetX).toBe(15);
    expect(viewport.offsetY).toBe(25);
    expect(viewport.cellSize).toBe(35);
    expect(viewport.zoom).toBe(1.8);
    });

    test('should exclude viewport from serialization correctly', () => {
  model.setViewportModel(100, 200, 50, 3);
  model.setCellAliveModel(1, 1, true);

      const exportedState = model.exportState();

      // Should include viewport in export (it's game state)
      expect(exportedState.viewport).toEqual({
        offsetX: 100,
        offsetY: 200,
        cellSize: 50,
        zoom: 3,
        minCellSize: 1,
        maxCellSize: 200
      });
    });

    test('should support multiple viewport observers', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      model.addObserver(observer1);
      model.addObserver(observer2);

  model.setOffsetModel(50, 75);

      expect(observer1).toHaveBeenCalledWith(CONST_VIEWPORTCHANGED, expect.any(Object));
      expect(observer2).toHaveBeenCalledWith(CONST_VIEWPORTCHANGED, expect.any(Object));
    });

    test('should handle rapid viewport changes correctly', () => {
      const observer = jest.fn();
      model.addObserver(observer);

  model.setOffsetModel(10, 10);
  model.setCellSizeModel(25);
  model.setZoomModel(1.5);

      expect(observer).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle extreme viewport values gracefully', () => {
      // Very large offsets
  model.setOffsetModel(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
      expect(model.getOffset().x).toBe(Number.MAX_SAFE_INTEGER);
      expect(model.getOffset().y).toBe(Number.MIN_SAFE_INTEGER);
    });

    test('should handle NaN and infinite values', () => {
      // Should not crash with invalid values
      expect(() => {
  model.setCellSizeModel(Number.NaN);
      }).not.toThrow();

      expect(() => {
  model.setZoomModel(Infinity);
      }).not.toThrow();
    });

    test('should maintain consistent state after invalid operations', () => {
      // Attempt invalid operations
  model.setCellSizeModel(Number.NaN);
  model.setZoomModel(-Infinity);

      // State should be clamped or preserved
      const newViewport = model.getViewport();
      expect(newViewport.cellSize).toBeGreaterThanOrEqual(1);
      expect(newViewport.zoom).toBeGreaterThanOrEqual(0.1);
    });
  });
});