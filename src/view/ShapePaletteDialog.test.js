import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShapePaletteDialog from './ShapePaletteDialog';
import { colorSchemes } from '../model/colorSchemes';

// Mock useAuth hook
jest.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
}));

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
  colorScheme={colorSchemes.bio}
        // Inject failing fetchShapes and health check
        fetchShapes={mockFetchShapesFail}
        checkBackendHealth={mockCheckBackendHealthFail}
      />
    );
    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/backend server not found/i)).toBeInTheDocument();
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
  colorScheme={colorSchemes.bio}
        fetchShapes={mockFetchShapesOk}
        checkBackendHealth={mockCheckBackendHealthOk}
      />
    );
    await waitFor(() => {
      expect(screen.queryByText(/backend server not found/i)).not.toBeInTheDocument();
    });
  });
});
