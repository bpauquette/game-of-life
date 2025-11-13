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

const CACHE_KEY = 'gol:shapesCatalog:v1';

describe('ShapePaletteDialog caching behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchShapes.mockReset();
  });

  it('downloads and stores the full catalog in localStorage when Cache Catalog is clicked', async () => {
    // Mock a single-page catalog
    fetchShapes.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" />
    );

    const btn = await screen.findByRole('button', { name: /cache catalog/i });
    userEvent.click(btn);

    await waitFor(() => expect(fetchShapes).toHaveBeenCalled());

    const raw = localStorage.getItem(CACHE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].id).toBe('s1');
  });

  it('uses cached catalog for subsequent searches and avoids server calls', async () => {
    // Pre-seed localStorage with a cached catalog
    const cached = { fetchedAt: Date.now(), items: [{ id: 's1', name: 'Alpha' }, { id: 's2', name: 'Beta' }] };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));

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
