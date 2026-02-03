import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { render, screen, waitFor, act } from '@testing-library/react';
import useInitialShapeLoader from '../useInitialShapeLoader.js';
import logger from '../../controller/utils/logger.js';
import { fetchShapes, getBackendApiBase } from '../../utils/backendApi.js';

jest.mock('../../controller/utils/logger.js', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/backendApi.js', () => {
  const fetchShapesMock = jest.fn();
  return {
    fetchShapes: fetchShapesMock,
    getBackendApiBase: jest.fn(() => 'https://example.test'),
  };
});

function Harness({ autoStart = false, startRef }) {
  const state = useInitialShapeLoader({ batchSize: 2, autoStart });

  useEffect(() => {
    if (startRef) startRef.current = state.start;
  }, [startRef, state.start]);

  return <output aria-label="shape-loader-state">{JSON.stringify(state)}</output>;
}

Harness.propTypes = {
  autoStart: PropTypes.bool,
  startRef: PropTypes.shape({ current: PropTypes.func }),
};

describe('useInitialShapeLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.requestIdleCallback = (cb) => cb();
  });

  test('loads shapes in batches, dedupes, and reports ready', async () => {
    fetchShapes
      .mockResolvedValueOnce({ ok: true, items: [{ id: 1 }, { id: 2 }], total: 3 })
      .mockResolvedValueOnce({ ok: true, items: [{ id: 2 }, { id: 3 }], total: 3 })
      .mockResolvedValueOnce({ ok: true, items: [], total: 3 });

    const startRef = { current: null };
    render(<Harness startRef={startRef} />);

    await act(async () => {
      await startRef.current();
    });

    await waitFor(() => {
      const parsed = JSON.parse(screen.getByLabelText('shape-loader-state').textContent || '{}');
      expect(parsed.ready).toBe(true);
      expect(parsed.loading).toBe(false);
      expect(parsed.progress).toMatchObject({ done: 3, total: 3 });
      expect(parsed.error).toBeNull();
    });

    expect(fetchShapes).toHaveBeenCalledTimes(2);
    expect(getBackendApiBase).toHaveBeenCalled();
  });

  test('logs and surfaces errors', async () => {
    fetchShapes.mockRejectedValueOnce(new Error('boom'));

    render(<Harness autoStart />);

    await waitFor(() => {
      const parsed = JSON.parse(screen.getByLabelText('shape-loader-state').textContent || '{}');
      expect(parsed.loading).toBe(false);
      expect(parsed.ready).toBe(false);
      expect(parsed.error).not.toBeNull();
    });

    expect(logger.error).toHaveBeenCalled();
  });
});
