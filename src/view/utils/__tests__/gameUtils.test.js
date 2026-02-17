import { loadGridIntoGame } from '../../utils/gameUtils.js';

describe('loadGridIntoGame', () => {
  const makeMockRef = () => {
    const clearModel = jest.fn();
    const setCellsAliveBulk = jest.fn();
    return {
      model: { clearModel, setCellsAliveBulk }
    };
  };

  test('clears model before applying cells by default', () => {
    const mvc = makeMockRef();
    const gameRef = { current: mvc };

    loadGridIntoGame(gameRef, [{ x: 1, y: 2 }]);

    expect(mvc.model.clearModel).toHaveBeenCalledTimes(1);
    expect(mvc.model.setCellsAliveBulk).toHaveBeenCalledWith([[1, 2]]);
  });

  test('skips clearing when replace is false', () => {
    const mvc = makeMockRef();
    const gameRef = { current: mvc };

    loadGridIntoGame(gameRef, [{ x: 3, y: 4 }], { replace: false });

    expect(mvc.model.clearModel).not.toHaveBeenCalled();
    expect(mvc.model.setCellsAliveBulk).toHaveBeenCalledWith([[3, 4]]);
  });

  test('supports live cell maps keyed by "x,y"', () => {
    const mvc = makeMockRef();
    const gameRef = { current: mvc };
    const mapCells = new Map([
      ['5,6', true],
      ['invalid', true],
    ]);

    loadGridIntoGame(gameRef, mapCells);

    expect(mvc.model.setCellsAliveBulk).toHaveBeenCalledWith([[5, 6]]);
  });

  test('supports live cell objects exposing forEachCell', () => {
    const mvc = makeMockRef();
    const gameRef = { current: mvc };
    const liveCells = {
      forEachCell: (cb) => {
        cb(7, 8);
        cb(9, 10);
      },
    };

    loadGridIntoGame(gameRef, liveCells);

    expect(mvc.model.setCellsAliveBulk).toHaveBeenCalledWith([[7, 8], [9, 10]]);
  });

  test('supports iterable fallback with [key,value] entries', () => {
    const mvc = makeMockRef();
    const gameRef = { current: mvc };
    const iterable = new Set([
      ['11,12', true],
      ['bad', true],
    ]);

    loadGridIntoGame(gameRef, iterable);

    expect(mvc.model.setCellsAliveBulk).toHaveBeenCalledWith([[11, 12]]);
  });
});
