import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// (Removed broken/stray return and duplicate mock)
jest.mock('../utils/backendApi.js', () => ({
  __esModule: true,
  fetchShapeNames: jest.fn(),
  getBackendApiBase: () => 'http://localhost:55000/api',
  fetchShapeById: jest.fn(),
  createShape: jest.fn(),
  checkBackendHealth: jest.fn().mockResolvedValue(true),
  deleteShapeById: jest.fn()
}));

// The module under test must be imported after the mocked module is declared.
/* eslint-disable import/first */
import ShapePaletteDialog from '../view/ShapePaletteDialog.js';
import { fetchShapeNames } from '../utils/backendApi.js';
/* eslint-enable import/first */

// Mock useAuth hook
jest.mock('../auth/AuthProvider.js', () => ({
  useAuth: () => ({ user: null }),
}));

beforeAll(() => {
  globalThis.__JEST__ = true;
});

// Tests now use mocked idbCatalog; no localStorage cache key

describe('ShapePaletteDialog caching behavior', () => {
  beforeEach(() => {
    fetchShapeNames.mockReset();
    // ensure no stale global cache is present
    try {
      if (Object.hasOwn(globalThis, '__GOL_SHAPES_CACHE__')) {
        delete globalThis.__GOL_SHAPES_CACHE__;
      }
    } catch (e) {}
  });

  it('downloads and stores the full catalog in localStorage when Cache Catalog is clicked', async () => {
    // Mock a single-page catalog
  fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
    const fetchShapesStub = jest.fn(() => fetchShapeNames('/api', '', 50, 0));
    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" fetchShapes={fetchShapesStub} />
    );
  // Wait for the auto-download to trigger on first open and the item to appear
  await waitFor(() => expect(fetchShapeNames).toHaveBeenCalled());
    expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
  });

  it('queries backend when typing a search and displays results', async () => {
    // Mock backend search response for initial load and for typed search
  fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
  fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });

    const fetchShapesStub = jest.fn(() => fetchShapeNames('/api', '', 50, 0));
    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" fetchShapes={fetchShapesStub} />
    );

    // Type a search string into the search input

    const input = await screen.findByLabelText(/search shapes/i);
    await userEvent.type(input, 'Alpha');

  // Wait for the debounced filter to run and the result to appear
  expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
    // Backend is queried for search terms
    await waitFor(() => {
      const calls = fetchShapeNames.mock.calls.map((c) => c[1]);
      expect(calls.some((term) => (term || '').toLowerCase().includes('alp'))).toBe(true);
    });
  });
});
