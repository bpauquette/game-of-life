// GameModel.toolInteraction.test.js - Tests for tool and interaction state in GameModel
import { GameModel } from "./GameModel";

describe("GameModel Tool and Interaction State", () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  describe("selectedTool state", () => {
    test("should initialize with default tool", () => {
      expect(model.getSelectedTool()).toBe("draw");
    });

    test("should set and get selected tool", () => {
      model.setSelectedTool("line");
      expect(model.getSelectedTool()).toBe("line");
    });

    test("should notify observers on tool change", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.setSelectedTool("rect");

      expect(observer).toHaveBeenCalledWith("selectedToolChanged", "rect");
    });

    test("should not notify observers when setting same tool", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.setSelectedTool("draw"); // Same as initial

      expect(observer).not.toHaveBeenCalled();
    });

    test("should handle null tool", () => {
      model.setSelectedTool(null);
      expect(model.getSelectedTool()).toBe(null);
    });

    test("should handle multiple tool changes", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      model.setSelectedTool("line");
      model.setSelectedTool("rect");
      model.setSelectedTool("circle");

      expect(observer).toHaveBeenCalledTimes(3);
      expect(observer).toHaveBeenNthCalledWith(
        1,
        "selectedToolChanged",
        "line",
      );
      expect(observer).toHaveBeenNthCalledWith(
        2,
        "selectedToolChanged",
        "rect",
      );
      expect(observer).toHaveBeenNthCalledWith(
        3,
        "selectedToolChanged",
        "circle",
      );
    });
  });

  describe("selectedShape state", () => {
    test("should initialize with null shape", () => {
      expect(model.getSelectedShape()).toBe(null);
    });

    test("should set and get selected shape", () => {
      const testShape = {
        name: "glider",
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      };
      model.setSelectedShape(testShape);
      expect(model.getSelectedShape()).toBe(testShape);
    });

    test("should notify observers on shape change", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      const testShape = {
        name: "block",
        cells: [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
      };
      model.setSelectedShape(testShape);

      expect(observer).toHaveBeenCalledWith("selectedShapeChanged", testShape);
    });

    test("should not notify observers when setting same shape", () => {
      const testShape = { name: "test" };
      model.setSelectedShape(testShape);

      const observer = jest.fn();
      model.addObserver(observer);

      model.setSelectedShape(testShape); // Same shape reference

      expect(observer).not.toHaveBeenCalled();
    });

    test("should clear selected shape", () => {
      const testShape = { name: "test" };
      model.setSelectedShape(testShape);
      expect(model.getSelectedShape()).toBe(testShape);

      model.setSelectedShape(null);
      expect(model.getSelectedShape()).toBe(null);
    });

    test("should handle different shape objects with same content", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      const shape1 = { name: "test" };
      const shape2 = { name: "test" }; // Different object, same content

      model.setSelectedShape(shape1);
      model.setSelectedShape(shape2);

      expect(observer).toHaveBeenCalledTimes(2);
      expect(model.getSelectedShape()).toBe(shape2);
    });
  });

  describe("cursor position state", () => {
    test("should initialize with null position", () => {
      expect(model.getCursorPosition()).toBe(null);
    });

    test("should set and get cursor position", () => {
      const position = { x: 10, y: 20 };
      model.setCursorPosition(position);
      expect(model.getCursorPosition()).toEqual(position);
    });

    test("should notify observers on position change", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      const position = { x: 5, y: 15 };
      model.setCursorPosition(position);

      expect(observer).toHaveBeenCalledWith("cursorPositionChanged", position);
    });

    test("should throttle rapid cursor updates", () => {
      const observer = jest.fn();
      model.addObserver(observer);

      // Set throttle delay to a higher value for testing
      model.cursorThrottleDelay = 50;

      const pos1 = { x: 1, y: 1 };
      const pos2 = { x: 2, y: 2 };

      model.setCursorPosition(pos1);
      model.setCursorPosition(pos2); // Should be throttled

      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer).toHaveBeenCalledWith("cursorPositionChanged", pos1);
    });

    test("should not notify observers for same position", () => {
      const position = { x: 10, y: 10 };
      model.setCursorPosition(position);

      const observer = jest.fn();
      model.addObserver(observer);

      model.setCursorPosition(position); // Same values but different object

      expect(observer).not.toHaveBeenCalled();
    });

    test("should handle null cursor position", () => {
      // Disable throttling for this test
      model.cursorThrottleDelay = 0;

      const position = { x: 5, y: 5 };
      model.setCursorPosition(position);
      expect(model.getCursorPosition()).toEqual(position);

      model.setCursorPosition(null);
      expect(model.getCursorPosition()).toBe(null);
    });

    test("should create defensive copy of position", () => {
      const originalPosition = { x: 10, y: 20 };
      model.setCursorPosition(originalPosition);

      const retrievedPosition = model.getCursorPosition();
      expect(retrievedPosition).not.toBe(originalPosition); // Different object reference
      expect(retrievedPosition).toEqual(originalPosition); // Same values

      // Mutating original should not affect stored position
      originalPosition.x = 999;
      expect(model.getCursorPosition().x).toBe(10);
    });

    test("should handle negative coordinates", () => {
      const position = { x: -5, y: -10 };
      model.setCursorPosition(position);
      expect(model.getCursorPosition()).toEqual(position);
    });

    test("should handle fractional coordinates", () => {
      const position = { x: 10.5, y: 20.7 };
      model.setCursorPosition(position);
      expect(model.getCursorPosition()).toEqual(position);
    });
  });

  describe("state serialization exclusion", () => {
    test("should exclude tool and interaction state from export", () => {
      // Set up tool and interaction state
      model.setSelectedTool("line");
      model.setSelectedShape({ name: "test", cells: [[0, 0]] });
      model.setCursorPosition({ x: 10, y: 20 });

      // Add some game state for comparison
      model.setCellAlive(1, 1, true);
      model.generation = 5;

      const exportedState = model.exportState();

      // Should include game state
      expect(exportedState.generation).toBe(5);
      expect(exportedState.liveCells).toHaveLength(1);

      // Should exclude tool and interaction state
      expect(exportedState.selectedTool).toBeUndefined();
      expect(exportedState.selectedShape).toBeUndefined();
      expect(exportedState.cursorPosition).toBeUndefined();
    });
  });

  describe("observer management", () => {
    test("should support multiple observers for tool state", () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      model.addObserver(observer1);
      model.addObserver(observer2);

      model.setSelectedTool("rect");

      expect(observer1).toHaveBeenCalledWith("selectedToolChanged", "rect");
      expect(observer2).toHaveBeenCalledWith("selectedToolChanged", "rect");
    });

    test("should handle observer removal", () => {
      const observer = jest.fn();
      model.addObserver(observer);
      model.removeObserver(observer);

      model.setSelectedTool("circle");

      expect(observer).not.toHaveBeenCalled();
    });

    test("should handle function-style observers", () => {
      const functionObserver = jest.fn();
      model.addObserver(functionObserver);

      model.setSelectedTool("oval");

      expect(functionObserver).toHaveBeenCalledWith(
        "selectedToolChanged",
        "oval",
      );
    });

    test("should handle object-style observers", () => {
      const objectObserver = {
        selectedToolChanged: jest.fn(),
        selectedShapeChanged: jest.fn(),
      };
      model.addObserver(objectObserver);

      const testShape = { name: "test" };
      model.setSelectedTool("randomRect");
      model.setSelectedShape(testShape);

      expect(objectObserver.selectedToolChanged).toHaveBeenCalledWith(
        "randomRect",
      );
      expect(objectObserver.selectedShapeChanged).toHaveBeenCalledWith(
        testShape,
      );
    });
  });

  describe("integration with existing state", () => {
    test("should work alongside existing game state", () => {
      // Set up game state
      model.setCellAlive(5, 5, true);
      model.setRunning(true);

      // Set up tool state
      model.setSelectedTool("shapes");
      model.setSelectedShape({ name: "glider" });
      model.setCursorPosition({ x: 10, y: 15 });

      // Verify all state is maintained
      expect(model.isCellAlive(5, 5)).toBe(true);
      expect(model.getIsRunning()).toBe(true);
      expect(model.getSelectedTool()).toBe("shapes");
      expect(model.getSelectedShape()).toEqual({ name: "glider" });
      expect(model.getCursorPosition()).toEqual({ x: 10, y: 15 });
    });

    test("should maintain tool state during game operations", () => {
      model.setSelectedTool("line");
      model.setSelectedShape({ name: "test" });
      model.setCursorPosition({ x: 1, y: 2 });

      // Perform game operations
      model.setCellAlive(0, 0, true);
      model.step();
      model.clear();

      // Tool state should be preserved
      expect(model.getSelectedTool()).toBe("line");
      expect(model.getSelectedShape()).toEqual({ name: "test" });
      expect(model.getCursorPosition()).toEqual({ x: 1, y: 2 });
    });
  });
});
