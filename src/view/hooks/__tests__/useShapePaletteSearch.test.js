import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../utils/backendApi.js', () => ({
  __esModule: true,
  fetchShapeNames: jest.fn(),
  fetchShapeById: jest.fn(),
  deleteShapeById: jest.fn(),
  getBackendApiBase: () => '/api'
}));

/* eslint-disable import/first */
import { fetchShapeNames } from '../../../utils/backendApi.js';
import { useShapePaletteSearch } from '../useShapePaletteSearch.js';
/* eslint-enable import/first */

describe('useShapePaletteSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchShapeNames.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches the first page when opened', async () => {
    fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });

    const { result } = renderHook(() => useShapePaletteSearch({ open: true, backendBase: '/api', limit: 50, page: 0 }));

    await waitFor(() => expect(fetchShapeNames).toHaveBeenCalledWith('/api', '', 50, 0));
    await waitFor(() => expect(result.current.results).toEqual([{ id: 's1', name: 'Alpha' }]));
    expect(result.current.total).toBe(1);
  });

  it('debounces search input and queries backend with the term', async () => {
    fetchShapeNames
      .mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 })
      .mockResolvedValueOnce({ ok: true, items: [{ id: 's2', name: 'Glider' }], total: 1 });

    const { result } = renderHook(() => useShapePaletteSearch({ open: true, backendBase: '/api', limit: 50, page: 0 }));

    await waitFor(() => expect(fetchShapeNames).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setInputValue('glider');
    });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(fetchShapeNames).toHaveBeenCalledWith('/api', 'glider', 50, 0));
    await waitFor(() => expect(result.current.displayedResults).toEqual([{ id: 's2', name: 'Glider' }]));
  });

  it('exposes backend error state when fetch fails', async () => {
    fetchShapeNames.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useShapePaletteSearch({ open: true, backendBase: '/api', limit: 50, page: 0 }));

    await waitFor(() => expect(result.current.backendError).toBe('Shapes catalog error'));
    expect(result.current.showBackendDialog).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
