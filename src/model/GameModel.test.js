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

  it('keeps a 2x2 block stable across consecutive normal steps', async () => {
    const model = new GameModel();
    model.setCellAliveModel(0, 0, true);
    model.setCellAliveModel(1, 0, true);
    model.setCellAliveModel(0, 1, true);
    model.setCellAliveModel(1, 1, true);

    await model.step();
    expect(model.getCellCount()).toBe(4);
    expect(model.isCellAlive(0, 0)).toBe(true);
    expect(model.isCellAlive(1, 0)).toBe(true);
    expect(model.isCellAlive(0, 1)).toBe(true);
    expect(model.isCellAlive(1, 1)).toBe(true);

    await model.step();
    expect(model.getCellCount()).toBe(4);
    expect(model.isCellAlive(0, 0)).toBe(true);
    expect(model.isCellAlive(1, 0)).toBe(true);
    expect(model.isCellAlive(0, 1)).toBe(true);
    expect(model.isCellAlive(1, 1)).toBe(true);
  });
});
