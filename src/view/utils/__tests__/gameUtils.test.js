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
});
