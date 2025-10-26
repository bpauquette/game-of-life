// GameModel.colorScheme.test.js
// Tests for colorScheme functionality in GameModel

import { GameModel } from './GameModel';
import { colorSchemes } from './colorSchemes';

describe('GameModel ColorScheme', () => {
  let model;

  beforeEach(() => {
    model = new GameModel();
  });

  test('should initialize with null colorScheme', () => {
    expect(model.getColorScheme()).toBeNull();
  });

  test('should set and get colorScheme', () => {
    const testColorScheme = colorSchemes.spectrum;
  model.setColorSchemeModel(testColorScheme);
    expect(model.getColorScheme()).toBe(testColorScheme);
  });

  test('should notify observers when colorScheme changes', () => {
    const observer = jest.fn();
    model.addObserver(observer);

    const testColorScheme = colorSchemes.neon;
  model.setColorSchemeModel(testColorScheme);

    expect(observer).toHaveBeenCalledWith('colorSchemeChanged', testColorScheme);
  });

  test('should not include colorScheme in exportState', () => {
    const testColorScheme = colorSchemes.bio;
  model.setColorSchemeModel(testColorScheme);

    const state = model.exportState();
    expect(state).not.toHaveProperty('colorScheme');
  });

  test('should preserve colorScheme through state import/export', () => {
    const testColorScheme = colorSchemes.ember;
  model.setColorSchemeModel(testColorScheme);
    
    // Add some cells and export state
  model.setCellAliveModel(1, 1, true);
  model.setCellAliveModel(2, 2, true);
    const state = model.exportState();

    // Create new model and import state
    const newModel = new GameModel();
    newModel.importState(state);

    // Original model should still have colorScheme
    expect(model.getColorScheme()).toBe(testColorScheme);
    
    // New model should not have colorScheme (it's not serialized)
    expect(newModel.getColorScheme()).toBeNull();

    // But it should have the cells
    expect(newModel.isCellAlive(1, 1)).toBe(true);
    expect(newModel.isCellAlive(2, 2)).toBe(true);
  });
});