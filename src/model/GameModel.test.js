import { GameModel } from './GameModel.js';

describe('GameModel', () => {
  it('can be constructed', () => {
    const model = new GameModel();
    expect(model).toBeInstanceOf(GameModel);
  });
  it('can set and check cell alive', () => {
    const model = new GameModel();
    model.setCellAliveModel(1, 2, true);
    expect(model.isCellAlive(1, 2)).toBe(true);
    model.setCellAliveModel(1, 2, false);
    expect(model.isCellAlive(1, 2)).toBe(false);
  });
  it('can place a shape', () => {
    const model = new GameModel();
    const shape = { cells: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    model.placeShape(5, 5, shape);
    expect(model.isCellAlive(5, 5)).toBe(true);
    expect(model.isCellAlive(6, 6)).toBe(true);
  });
});
