import { beforeEach, describe, expect, test, jest } from '@jest/globals';

let useGameDao;
let setupGameDaoFromMVC;

beforeEach(async () => {
  jest.resetModules();
  ({ useGameDao } = await import('../model/dao/gameDao.js'));
  ({ setupGameDaoFromMVC } = await import('../controller/setupGameDao.js'));
});

describe('setupGameDaoFromMVC', () => {
  test('injects setCellAlive and getLiveCells from GameMVC', () => {
    const mvc = {
      setCellAlive: jest.fn(),
      getLiveCells: jest.fn(() => new Map([[1, true]])),
    };

    setupGameDaoFromMVC(mvc);

    useGameDao.getState().setCellAlive(1, 2, true);
    expect(mvc.setCellAlive).toHaveBeenCalledWith(1, 2, true);

    const result = useGameDao.getState().getLiveCells();
    expect(result instanceof Map).toBe(true);
    expect(result.get(1)).toBe(true);
  });

  test('logs error when mvc missing delegates', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupGameDaoFromMVC({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
