import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportShapeDialog from './ImportShapeDialog.jsx';

jest.mock('../../auth/AuthProvider.js', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../utils/backendApi.js', () => ({
  getBackendApiBase: jest.fn()
}));

const { useAuth } = jest.requireMock('../../auth/AuthProvider.js');
const { getBackendApiBase } = jest.requireMock('../../utils/backendApi.js');

describe('ImportShapeDialog', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ token: 'token-1' });
    getBackendApiBase.mockReturnValue('http://backend.local');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('imports pasted RLE directly', async () => {
    const onClose = jest.fn();
    const onImportSuccess = jest.fn();
    const importedShape = { id: 'shape-1', name: 'Glider', cells: [{ x: 0, y: 0 }] };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => importedShape
    });

    render(<ImportShapeDialog open onClose={onClose} onImportSuccess={onImportSuccess} />);

    fireEvent.change(screen.getByRole('textbox', { name: /url or rle/i }), {
      target: { value: '#N Glider\nx = 3, y = 3\nbob$2bo$3o!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(onImportSuccess).toHaveBeenCalledWith(importedShape);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.local/v1/import-rle',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-1'
        })
      })
    );
  });

  test('resolves LifeWiki URL before posting import request', async () => {
    const onClose = jest.fn();
    const onImportSuccess = jest.fn();
    const importedShape = { id: 'shape-2', name: 'Gosper glider gun', cells: [{ x: 1, y: 1 }] };
    const resolvedRle = '#N Glider\nx = 3, y = 3, rule = B3/S23\nbob$2bo$3o!';

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => resolvedRle
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => importedShape
      });

    render(<ImportShapeDialog open onClose={onClose} onImportSuccess={onImportSuccess} />);

    fireEvent.change(screen.getByRole('textbox', { name: /url or rle/i }), {
      target: { value: 'https://conwaylife.com/wiki/Glider' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(onImportSuccess).toHaveBeenCalledWith(importedShape);
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://unpkg.com/cellular-automata-patterns@1.0.24/patterns/conwaylife/glider.rle',
      expect.any(Object)
    );

    const backendCall = global.fetch.mock.calls[1];
    expect(backendCall[0]).toBe('http://backend.local/v1/import-rle');
    const backendBody = JSON.parse(backendCall[1].body);
    expect(backendBody.rle).toBe(resolvedRle);
  });

  test('shows an error when URL cannot be resolved to RLE', async () => {
    const onClose = jest.fn();
    const onImportSuccess = jest.fn();

    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'not found'
    });

    render(<ImportShapeDialog open onClose={onClose} onImportSuccess={onImportSuccess} />);

    fireEvent.change(screen.getByRole('textbox', { name: /url or rle/i }), {
      target: { value: 'https://conwaylife.com/wiki/ThisPatternWillNotExist' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not resolve that lifewiki url/i)).toBeInTheDocument();
    });

    expect(onImportSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
