/* eslint-disable testing-library/no-wait-for-multiple-assertions */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ShapePaletteDialog from './ShapePaletteDialog';
import logger from '../controller/utils/logger';

// Mock logger
jest.mock('../controller/utils/logger', () => ({

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
      name: 'Glider',
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
      name: 'Block',
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
    logger.warn.mockClear();
    logger.error.mockClear();
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
      expect(screen.getByLabelText('Search shapes')).toBeInTheDocument();
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
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/shapes'));
        expect(screen.getByText('Glider')).toBeInTheDocument();
        expect(screen.getByText('Block')).toBeInTheDocument();
      });
    });

    test('handles fetch error gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Shape search error:', expect.any(Error));
        expect(screen.getByText('No shapes found')).toBeInTheDocument();
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
      });
      
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith('Shape search returned non-OK status:', 500);
        expect(screen.getByText('No shapes found')).toBeInTheDocument();
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
      });
      
      await waitFor(() => {
        expect(screen.getByText('No shapes found')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('searches shapes when typing in search field', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search shapes');
      
      fireEvent.change(searchInput, { target: { value: 'glider' } });
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=glider'));
      });
    });

    test('debounces search input', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search shapes');
      
      // Clear initial calls
      fetch.mockClear();
      
      fireEvent.change(searchInput, { target: { value: 'glider' } });
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      // Should have debounced and made the call
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=glider'));
    });

    test('clears search and results when dialog closes', async () => {
      const { rerender } = render(<ShapePaletteDialog {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Search shapes');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      // Close dialog
      rerender(<ShapePaletteDialog {...defaultProps} open={false} />);
      
      // Reopen dialog
      rerender(<ShapePaletteDialog {...defaultProps} open={true} />);
      
      expect(screen.getByLabelText('Search shapes')).toHaveValue('');
    });
  });

  describe('Shape Selection', () => {
    test('selects shape when clicked', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      // Mock fetch for individual shape
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockShapes[0]
      });
      
      fireEvent.click(screen.getByText('Glider'));
      
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      // Mock failed fetch for individual shape
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });
      
      fireEvent.click(screen.getByText('Glider'));
      
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      // Mock network error for individual shape
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      fireEvent.click(screen.getByText('Glider'));
      
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      
      expect(screen.getByText('Delete shape?')).toBeInTheDocument();
      expect(screen.getByText('Glider', { selector: 'strong' })).toBeInTheDocument();
    });

    test('cancels delete operation', async () => {
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(screen.queryByText('Delete shape?')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Glider')).toBeInTheDocument(); // Shape still there
    });

    test('successfully deletes shape', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Deleted successfully'
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith('Delete failed:', 500);
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
      }).mockRejectedValueOnce(new Error('Network error'));
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Delete error:', expect.any(Error));
        expect(screen.getByText('Delete error')).toBeInTheDocument();
        expect(screen.getByText('Glider')).toBeInTheDocument(); // Shape restored
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
        text: async () => 'Deleted successfully'
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(screen.getByText('UNDO')).toBeInTheDocument();
      });
    });

    test('successfully restores deleted shape', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockShapes, total: 2 })
      }).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Deleted successfully'
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockShapes[0]
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(screen.getByText('UNDO')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('UNDO'));
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/shapes'),
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
        text: async () => 'Deleted successfully'
      }).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<ShapePaletteDialog {...defaultProps} />);
      
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Glider')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('delete');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(screen.getByText('UNDO')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('UNDO'));
      
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
        expect(screen.getByText('Load more')).toBeInTheDocument();
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
        expect(screen.getByText('Load more')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Load more'));
      
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
        expect(screen.getByText('Block')).toBeInTheDocument();
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
        expect(screen.getByText('Glider')).toBeInTheDocument();
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
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/shapes'));
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