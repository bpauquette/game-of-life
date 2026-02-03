import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('../utils/backendApi.js', () => ({
  __esModule: true,
  fetchShapeNames: jest.fn(),
  getBackendApiBase: () => 'http://localhost:55000/api',
  fetchShapeById: jest.fn(),
  createShape: jest.fn(),
  checkBackendHealth: jest.fn().mockResolvedValue(true),
  deleteShapeById: jest.fn()
}));

/* eslint-disable import/first */
import ShapePaletteDialog from '../view/ShapePaletteDialog.js';
import { fetchShapeNames } from '../utils/backendApi.js';
/* eslint-enable import/first */

jest.mock('../auth/AuthProvider.js', () => ({
  useAuth: () => ({ user: null }),
}));

beforeAll(() => {
  globalThis.__JEST__ = true;
});

describe('ShapePaletteDialog fetching behavior', () => {
  beforeEach(() => {
    fetchShapeNames.mockReset();
  });

  it('fetches the first page on open and renders results', async () => {
    fetchShapeNames.mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
    const fetchShapesStub = jest.fn(() => fetchShapeNames('/api', '', 50, 0));

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" fetchShapes={fetchShapesStub} />
    );

    await waitFor(() => expect(fetchShapeNames).toHaveBeenCalled());
    expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
  });

  it('fetches when typing a search term and shows results', async () => {
    fetchShapeNames
      .mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 })
      .mockResolvedValueOnce({ ok: true, items: [{ id: 's1', name: 'Alpha' }], total: 1 });
    const fetchShapesStub = jest.fn(() => fetchShapeNames('/api', '', 50, 0));

    render(
      <ShapePaletteDialog open={true} onClose={() => {}} onSelectShape={() => {}} backendBase="/api" fetchShapes={fetchShapesStub} />
    );

    const input = await screen.findByLabelText(/search shapes/i);
    await userEvent.type(input, 'Alpha');

    expect(await screen.findByText(/Alpha/)).toBeInTheDocument();
    await waitFor(() => expect(fetchShapeNames).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      const calls = fetchShapeNames.mock.calls.map((c) => c[1]);
      expect(calls.some((term) => (term || '').toLowerCase().includes('alp'))).toBe(true);
    });
  });
});
