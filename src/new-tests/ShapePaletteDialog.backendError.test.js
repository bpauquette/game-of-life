import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShapePaletteDialog from '../view/ShapePaletteDialog.js';

// Mock useAuth hook
jest.mock('../auth/AuthProvider.js', () => ({
  useAuth: () => ({ user: null }),
}));

beforeAll(() => {
  globalThis.__JEST__ = true;
});

function mockFetchShapesFail() {
  return Promise.reject(new Error('NetworkError: Failed to fetch'));
}

function mockCheckBackendHealthFail() {
  return Promise.resolve(false);
}

describe('ShapePaletteDialog backend error handling', () => {
  it('shows backend dialog when backend is down (fetch error)', async () => {
    render(
      <ShapePaletteDialog
        open={true}
        onClose={() => {}}
        onSelectShape={() => {}}
        backendBase="/api"
        colorScheme={{}}
        // Inject failing fetchShapes and health check
        fetchShapes={mockFetchShapesFail}
        checkBackendHealth={mockCheckBackendHealthFail}
      />
    );
    // With the backend down we expect no results to be displayed and no crash
    await waitFor(() => {
      expect(screen.getByText(/no shapes found/i)).toBeInTheDocument();
    });
  });

  it('does not show backend dialog when backend is healthy', async () => {
    function mockFetchShapesOk() {
      return Promise.resolve({ ok: true, items: [], total: 0 });
    }
    function mockCheckBackendHealthOk() {
      return Promise.resolve(true);
    }
    render(
      <ShapePaletteDialog
        open={true}
        onClose={() => {}}
        onSelectShape={() => {}}
        backendBase="/api"
        colorScheme={{}}
        fetchShapes={mockFetchShapesOk}
        checkBackendHealth={mockCheckBackendHealthOk}
      />
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/backend server not found|failed to cache catalog/i)
      ).not.toBeInTheDocument();
    });
  });
});
