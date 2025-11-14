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

// Mock idbCatalog so tests can run without real IndexedDB
jest.mock('../view/idbCatalog', () => ({
  putItems: jest.fn().mockResolvedValue(undefined),
  getAllItems: jest.fn().mockResolvedValue([]),
  clearStore: jest.fn().mockResolvedValue(undefined)
}));

// The module under test must be imported after the mocked module is declared.
/* eslint-disable import/first */
import ShapePaletteDialog from '../view/ShapePaletteDialog';
import { fetchShapes } from '../utils/backendApi';
/* eslint-enable import/first */

// Tests now use mocked idbCatalog; no localStorage cache key

describe('ShapePaletteDialog caching behavior', () => {
  beforeEach(() => {
    fetchShapes.mockReset();
    const idb = require('../view/idbCatalog');
    idb.putItems.mockReset();
    idb.getAllItems.mockReset();
    idb.clearStore.mockReset();
  });

  it('downloads and stores the full catalog in localStorage when Cache Catalog is clicked', async () => {
    // Mock a single-page catalog
    fetchShapes.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
    const idb = require('../view/idbCatalog');
    idb.getAllItems.mockResolvedValueOnce([]);

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" />
    );
    // Wait for the auto-download to trigger on first open
    await waitFor(() => expect(fetchShapes).toHaveBeenCalled());
    expect(idb.putItems).toHaveBeenCalled();
  });

  it('uses cached catalog for subsequent searches and avoids server calls', async () => {
    // Pre-seed the mocked idb with items
    const cached = [{ id: 's1', name: 'Alpha' }, { id: 's2', name: 'Beta' }];
    const idb = require('../view/idbCatalog');
    idb.getAllItems.mockResolvedValueOnce(cached);

    // Ensure fetchShapes is a mock that would fail if called
    fetchShapes.mockResolvedValue({ ok: true, items: [], total: 0 });

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" />
    );

    // Clear any calls that may happen on mount
    fetchShapes.mockClear();

    // Type a search string into the search input
    const input = await screen.findByLabelText(/search shapes/i);
    await userEvent.type(input, 'Alpha');

    // Wait a bit for the debounced search to run
    await waitFor(() => {
      // No network call should have been made because cached catalog should be used
      expect(fetchShapes).not.toHaveBeenCalled();
    });

    // The results should show the matching item
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
  });
});
