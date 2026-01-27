// ShapesDao.test.js
import ShapesDao from './ShapesDao';

// Mock fetch globally
beforeEach(() => {
  globalThis.fetch = jest.fn();
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('ShapesDao', () => {
  it('listShapes returns array from .items', async () => {
    const mockShapes = [{ id: '1', name: 's1' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockShapes })
    });
    const result = await ShapesDao.listShapes();
    expect(result).toEqual(mockShapes);
  });

  it('listShapes returns array if not wrapped', async () => {
    const mockShapes = [{ id: '2', name: 's2' }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShapes
    });
    const result = await ShapesDao.listShapes();
    expect(result).toEqual(mockShapes);
  });

  it('getShape returns shape object', async () => {
    const shape = { id: '3', name: 's3' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => shape
    });
    const result = await ShapesDao.getShape('3');
    expect(result).toEqual(shape);
  });

  it('saveShape posts and returns saved shape', async () => {
    const shape = { name: 's4' };
    const saved = { id: '4', name: 's4' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => saved
    });
    const result = await ShapesDao.saveShape(shape);
    expect(result).toEqual(saved);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/shapes'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deleteShape deletes and returns true', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    const result = await ShapesDao.deleteShape('5');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/shapes'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
