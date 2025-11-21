import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShapePaletteDialog from '../ShapePaletteDialog';
import { useShapePaletteSearch } from '../hooks/useShapePaletteSearch';
import { useHoverPreview } from '../hooks/useHoverPreview';
import { fetchShapeById } from '../../utils/backendApi';

jest.mock('../hooks/useShapePaletteSearch');
jest.mock('../hooks/useHoverPreview');
jest.mock('../../utils/backendApi', () => ({
  fetchShapeById: jest.fn(),
  createShape: jest.fn(),
  checkBackendHealth: jest.fn(),
  deleteShapeById: jest.fn()
}));

const baseSearchState = (items = []) => ({
  inputValue: '',
  setInputValue: jest.fn(),
  results: items,
  setResults: jest.fn(),
  displayedResults: items,
  loading: false,
  total: items.length,
  backendError: '',
  setBackendError: jest.fn(),
  showBackendDialog: false,
  setShowBackendDialog: jest.fn(),
  retry: jest.fn()
});

describe('ShapePaletteDialog add-to-recent flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHoverPreview.mockReturnValue({ preview: null, handleHover: jest.fn() });
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches full shape data before adding to recents when the catalog entry lacks cells', async () => {
    const skeletonShape = { id: 'shape-1', name: 'Stub shape', meta: { width: 5, height: 5 } };
    useShapePaletteSearch.mockReturnValue(baseSearchState([skeletonShape]));

    const hydrated = {
      id: 'shape-1',
      name: 'Stub shape',
      pattern: [[0, 0], [1, 0]]
    };
    fetchShapeById.mockResolvedValue({ ok: true, data: hydrated });
    const onAddRecent = jest.fn();

    const { getByTestId } = render(
      <ShapePaletteDialog
        open
        onAddRecent={onAddRecent}
        onSelectShape={jest.fn()}
        onClose={jest.fn()}
        backendBase="/api"
        colorScheme={{}}
        colorSchemeKey="bio"
      />
    );

    fireEvent.click(getByTestId('add-recent-btn-shape-1'));

    await waitFor(() => expect(onAddRecent).toHaveBeenCalledTimes(1));
    expect(fetchShapeById).toHaveBeenCalledWith('shape-1', '/api');
    expect(onAddRecent.mock.calls[0][0].pattern).toEqual([[0, 0], [1, 0]]);
  });

  it('skips the fetch when the catalog entry already includes cells', async () => {
    const richShape = {
      id: 'shape-2',
      name: 'Rich shape',
      pattern: [[2, 2]]
    };
    useShapePaletteSearch.mockReturnValue(baseSearchState([richShape]));
    const onAddRecent = jest.fn();

    const { getByTestId } = render(
      <ShapePaletteDialog
        open
        onAddRecent={onAddRecent}
        onSelectShape={jest.fn()}
        onClose={jest.fn()}
        backendBase="/api"
        colorScheme={{}}
        colorSchemeKey="bio"
      />
    );

    fireEvent.click(getByTestId('add-recent-btn-shape-2'));

    await waitFor(() => expect(onAddRecent).toHaveBeenCalledTimes(1));
    expect(fetchShapeById).not.toHaveBeenCalled();
    expect(onAddRecent.mock.calls[0][0].pattern).toEqual([[2, 2]]);
  });
});
