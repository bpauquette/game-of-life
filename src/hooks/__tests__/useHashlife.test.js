import React from 'react';
import { renderHook, act } from '@testing-library/react';
import useHashlife from '../useHashlife.js';
import adapter from '../../model/hashlife/adapter.js';

jest.mock('../../model/hashlife/adapter.js', () => {
  const adapterMock = {
    run: jest.fn(async (cells, generations) => ({ cells, generations, hasCells: true })),
    cancel: jest.fn(),
    clearCache: jest.fn(),
    onProgress: jest.fn(),
  };
  return adapterMock;
});

describe('useHashlife', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('runs adapter and exposes result', async () => {
    adapter.run.mockResolvedValueOnce({ cells: [{ x: 1, y: 1 }], generations: 2, hasCells: true });
    const { result } = renderHook(() => useHashlife());

    await act(async () => {
      const res = await result.current.run([{ x: 1, y: 1 }], 2);
      expect(res).toMatchObject({ generations: 2, hasCells: true });
    });

    expect(adapter.run).toHaveBeenCalledWith([{ x: 1, y: 1 }], 2, {});
    expect(result.current.isRunning).toBe(false);
    expect(result.current.lastResult).toMatchObject({ generations: 2, hasCells: true });
  });

  test('cancel stops running and invokes adapter.cancel', async () => {
    let resolver;
    const pending = new Promise((resolve) => { resolver = resolve; });
    adapter.run.mockImplementation(() => pending);

    const { result } = renderHook(() => useHashlife());

    act(() => {
      result.current.run([], 1);
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(adapter.cancel).toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);

    act(() => {
      resolver?.({ ok: true });
    });
  });
});
