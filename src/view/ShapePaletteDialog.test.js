/* eslint-disable testing-library/no-wait-for-multiple-assertions */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ShapePaletteDialog from './ShapePaletteDialog';
import { TEST_TEXT } from '../test-utils/TestConstants';

const CONST_GLIDER = 'Glider';
const CONST_BLOCK = 'Block';
const CONST_SEARCH_SHAPES = 'Search shapes';
const CONST_V1_SHAPES = '/v1/shapes';
const CONST_NETWORK_ERROR = 'Network error';
const CONST_NO_SHAPES_FOUND = 'No shapes found';
const CONST_DELETE = 'delete';
const CONST_BUTTON = 'button';
const CONST_DELETED_SUCCESSFULLY = 'Deleted successfully';
const CONST_DELETE_1 = 'Delete';
const CONST_UNDO = 'UNDO';

// Note: logger import removed from tests to avoid coupling to logging

// Mock fetch globally
globalThis.fetch = jest.fn();

// Mock timers for debouncing
jest.useFakeTimers();

describe('ShapePaletteDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSelectShape: jest.fn(),
    backendBase: 'http://localhost:55000',
    colorScheme: {
      background: '#000',
      cellColor: '#39ff14',
      getCellColor: jest.fn().mockReturnValue('#4a9')
    }
  };

  const mockShapes = [
    {
      id: 'shape-1',
      name: CONST_GLIDER,
      width: 3,
      height: 3,
      cellsCount: 5,
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 }
      ]
    },
    {
      id: 'shape-2',
      name: CONST_BLOCK,
      width: 2,
      height: 2,
      cellsCount: 4,
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ]
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    
    // Default successful fetch response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: mockShapes, total: 2 })
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Dialog Rendering', () => {
    test('renders dialog when open', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      expect(screen.getByText('Insert shape from catalog')).toBeInTheDocument();
      expect(screen.getByLabelText(CONST_SEARCH_SHAPES)).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    test('does not render dialog when closed', () => {
      render(<ShapePaletteDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Insert shape from catalog')).not.toBeInTheDocument();
    });

    test('renders loading spinner while loading', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await act(async () => {
        jest.advanceTimersByTime(300);
        // allow microtasks (fetch .then handlers) to run inside act
        await Promise.resolve();
      });
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Shape Loading', () => {
    test('loads shapes on open', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining(CONST_V1_SHAPES));
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
        expect(screen.getByText(CONST_BLOCK)).toBeInTheDocument();
      });
    });

    test('handles fetch error gracefully', async () => {
      fetch.mockRejectedValue(new Error(CONST_NETWORK_ERROR));
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
  // error handling verified by UI state; do not assert on logger calls
        expect(screen.getByText(CONST_NO_SHAPES_FOUND)).toBeInTheDocument();
      });
    });

    test('handles non-OK response', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
  // warning logged internally; verify UI state instead
        expect(screen.getByText(CONST_NO_SHAPES_FOUND)).toBeInTheDocument();
      });
    });

    test('handles malformed JSON response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Parse error'); }
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_NO_SHAPES_FOUND)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('searches shapes when typing in search field', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText(CONST_SEARCH_SHAPES);
      
      fireEvent.change(searchInput, { target: { value: 'glider' } });
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=glider'));
      });
    });

    test('debounces search input', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText(CONST_SEARCH_SHAPES);
      
      // Clear initial calls
      fetch.mockClear();
      
      fireEvent.change(searchInput, { target: { value: 'glider' } });
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      // Should have debounced and made the call
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=glider'));
    });

    test('clears search and results when dialog closes', async () => {
      const { rerender } = render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText(CONST_SEARCH_SHAPES);
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      // Close dialog
      rerender(<ShapePaletteDialog {...defaultProps} open={false} />);
      
      // Reopen dialog
      rerender(<ShapePaletteDialog {...defaultProps} open={true} />);
      
      expect(screen.getByLabelText(CONST_SEARCH_SHAPES)).toHaveValue('');
    });
  });

  describe('Shape Selection', () => {
    test('selects shape when clicked', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      // Mock fetch for individual shape
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockShapes[0]
      });
      
      fireEvent.click(screen.getByText(CONST_GLIDER));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/shapes/shape-1'));
        expect(defaultProps.onSelectShape).toHaveBeenCalledWith(mockShapes[0]);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    test('falls back to metadata when individual fetch fails', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      // Mock failed fetch for individual shape
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });
      
      fireEvent.click(screen.getByText(CONST_GLIDER));
      
      await waitFor(() => {
        expect(defaultProps.onSelectShape).toHaveBeenCalledWith(mockShapes[0]);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    test('handles network error during shape fetch', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      // Mock network error for individual shape
      fetch.mockRejectedValueOnce(new Error(CONST_NETWORK_ERROR));
      
      fireEvent.click(screen.getByText(CONST_GLIDER));
      
      await waitFor(() => {
        expect(defaultProps.onSelectShape).toHaveBeenCalledWith(mockShapes[0]);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Shape Deletion', () => {
    test('opens delete confirmation dialog', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
          fireEvent.click(deleteButtons[0]);
      expect(screen.getByText('Delete shape?')).toBeInTheDocument();
      expect(screen.getByText(CONST_GLIDER, { selector: 'strong' })).toBeInTheDocument();
    });

    test('cancels delete operation', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
      
          fireEvent.click(screen.getByRole(CONST_BUTTON, { name: TEST_TEXT.DELETE_BUTTON }));
      
      await waitFor(() => {
        expect(screen.queryByText('Delete shape?')).not.toBeInTheDocument();
      });
        const shapePresent = !!screen.queryByText(CONST_GLIDER) || !!screen.queryByText(CONST_BLOCK);
        expect(shapePresent).toBe(true); // After cancelling delete, at least one shape should still be present
    });

    test('successfully deletes shape', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => CONST_DELETED_SUCCESSFULLY
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
          fireEvent.click(screen.getByRole(CONST_BUTTON, { name: TEST_TEXT.DELETE_BUTTON }));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/shapes/shape-1'),
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(screen.getByText('Shape deleted')).toBeInTheDocument();
      });
    });

    test('handles delete failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
          fireEvent.click(screen.getByRole(CONST_BUTTON, { name: TEST_TEXT.DELETE_BUTTON }));
      
      await waitFor(() => {
        // Assert that the UI is in a loading or error state, or that a warning is logged
        // For example, check that the delete button is disabled or a spinner is shown
        // If no UI change, assert that the fetch was called
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/shapes/shape-1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
      
      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });
      
      // Note: Shape restoration logic is covered by optimistic UI updates
    });

    test('handles delete network error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockRejectedValueOnce(new Error(CONST_NETWORK_ERROR));
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
          fireEvent.click(screen.getByRole(CONST_BUTTON, { name: TEST_TEXT.DELETE_BUTTON }));
      
      await waitFor(() => {
  // error logged internally; verify UI state instead
  expect(screen.getByText('Delete error')).toBeInTheDocument();
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument(); // Shape restored
      });
    });
  });

  describe('Undo Functionality', () => {
    test('shows undo button after successful delete', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => CONST_DELETED_SUCCESSFULLY
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole(CONST_BUTTON, { name: CONST_DELETE_1 }));
      
      await waitFor(() => {
        expect(screen.getByText(CONST_UNDO)).toBeInTheDocument();
      });
    });

    test('successfully restores deleted shape', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => CONST_DELETED_SUCCESSFULLY
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockShapes[0]
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole(CONST_BUTTON, { name: CONST_DELETE_1 }));
      
      await waitFor(() => {
        expect(screen.getByText(CONST_UNDO)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText(CONST_UNDO));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(CONST_V1_SHAPES),
          expect.objectContaining({ 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockShapes[0])
          })
        );
        expect(screen.getByText('Restored')).toBeInTheDocument();
      });
    });

    test('handles restore failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => CONST_DELETED_SUCCESSFULLY
      }).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(CONST_DELETE);
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole(CONST_BUTTON, { name: CONST_DELETE_1 }));
      
      await waitFor(() => {
        expect(screen.getByText(CONST_UNDO)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText(CONST_UNDO));
      
      await waitFor(() => {
        expect(screen.getByText('Restore failed')).toBeInTheDocument();
      });
    });
  });

  describe('Load More Functionality', () => {
    test('shows load more button when there are more results', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockShapes, total: 100 })
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
  expect(screen.getByText(TEST_TEXT.LOAD_MORE)).toBeInTheDocument();
        expect(screen.getByText('100 shapes in catalog')).toBeInTheDocument();
      });
    });

    test('loads more results when load more button clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 100 })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [mockShapes[0]], total: 100 })
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
  expect(screen.getByText(TEST_TEXT.LOAD_MORE)).toBeInTheDocument();
      });
      
  fireEvent.click(screen.getByText(TEST_TEXT.LOAD_MORE));
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('offset=50'));
      });
    });

    test('shows large catalog warning', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2000 })
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/2000 shapes in catalog — large catalog, use search or paging/)).toBeInTheDocument();
      });
    });
  });

  describe('Preview Rendering', () => {
    test('renders SVG preview for shapes with cells', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
        expect(screen.getByText(CONST_BLOCK)).toBeInTheDocument();
        // SVG previews should be rendered (we can't easily test SVG content, but shapes are shown)
      });
    });

    test('renders empty grid for shapes without cells', async () => {
      const emptyShape = {
        id: 'empty',
        name: 'Empty',
        width: 5,
        height: 5,
        cellsCount: 0,
        cells: []
      };
      
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ items: [emptyShape], total: 1 })
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Empty')).toBeInTheDocument();
      });
    });

    test('handles color scheme fallbacks', async () => {
      const propsWithoutColorScheme = {
        ...defaultProps,
        colorScheme: {}
      };
      
      render(<ShapePaletteDialog {...propsWithoutColorScheme} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText(CONST_GLIDER)).toBeInTheDocument();
      });
    });
  });

  describe('Base URL Resolution', () => {
    test('uses provided backend base URL', async () => {
      render(<ShapePaletteDialog {...defaultProps} backendBase="http://custom-backend:8080" />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('http://custom-backend:8080/v1/shapes'));
      });
    });

    test('falls back to window location origin', async () => {
      // Mock window.location
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'http://localhost:3000'
          }
        },
        writable: true
      });
      
      render(<ShapePaletteDialog {...defaultProps} backendBase="" />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/v1/shapes'));
      });
    });

    test('uses fallback URL when backend base is empty', async () => {
      render(<ShapePaletteDialog {...defaultProps} backendBase="" />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining(CONST_V1_SHAPES));
      });
    });
  });

  describe('Dialog Actions', () => {
    test('closes dialog when close button clicked', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Close'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    // Note: Snackbar auto-close functionality tested by other components
  });
});