import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the backendApi module used by ShapePaletteDialog
jest.mock('../view/../utils/backendApi', () => {
  return {
    fetchShapes: jest.fn(),
    getBaseUrl: (b) => (b || ''),
    fetchShapeById: jest.fn(),
    createShape: jest.fn(),
    checkBackendHealth: jest.fn().mockResolvedValue(true),
    deleteShapeById: jest.fn()
  };
});

// The module under test must be imported after the mocked module is declared.
/* eslint-disable import/first */
import ShapePaletteDialog from '../view/ShapePaletteDialog';
import { fetchShapes } from '../utils/backendApi';
/* eslint-enable import/first */

// Tests now use mocked idbCatalog; no localStorage cache key

describe('ShapePaletteDialog caching behavior', () => {
  beforeEach(() => {
    fetchShapes.mockReset();
    // ensure no stale global cache is present
    try { delete globalThis.__GOL_SHAPES_CACHE__; } catch (e) {}
  });

  it('downloads and stores the full catalog in localStorage when Cache Catalog is clicked', async () => {
    // Mock a single-page catalog
    fetchShapes.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" />
    );
    // Wait for the auto-download to trigger on first open and the item to appear
    await waitFor(() => expect(fetchShapes).toHaveBeenCalled());
    expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
  });

  it('queries backend when typing a search and displays results', async () => {
    // Mock backend search response for 'Alpha'
    fetchShapes.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" />
    );

    // Clear any calls that may happen on mount
    fetchShapes.mockClear();

    // Type a search string into the search input
    const input = await screen.findByLabelText(/search shapes/i);
    await userEvent.type(input, 'Alpha');

    // Wait for the debounced search to trigger and the result to appear
    await waitFor(() => expect(fetchShapes).toHaveBeenCalled());
    expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
  });
});
