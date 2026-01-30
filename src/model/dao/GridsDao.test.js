// GridsDao.test.js
import GridsDao from './GridsDao.js';

// Mock fetch globally
beforeEach(() => {
  globalThis.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('GridsDao', () => {
  it('listGrids returns array from .items', async () => {
    const mockGrids = [{ id: '1', name: 'g1' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockGrids })
    });
    const result = await GridsDao.listGrids();
    expect(result).toEqual(mockGrids);
  });

  it('listGrids returns array if not wrapped', async () => {
    const mockGrids = [{ id: '2', name: 'g2' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGrids
    });
    const result = await GridsDao.listGrids();
    expect(result).toEqual(mockGrids);
  });

  it('getGrid returns grid object', async () => {
    const grid = { id: '3', name: 'g3' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => grid
    });
    const result = await GridsDao.getGrid('3');
    expect(result).toEqual(grid);
  });

  it('saveGrid posts and returns saved grid', async () => {
    const grid = { name: 'g4' };
    const saved = { id: '4', name: 'g4' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => saved
    });
    const result = await GridsDao.saveGrid(grid);
    expect(result).toEqual(saved);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/grids'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deleteGrid deletes and returns true', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    const result = await GridsDao.deleteGrid('5');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/grids/5'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('throws on failed fetch', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(GridsDao.listGrids()).rejects.toThrow('Failed to fetch grids: 500');
  });
});
