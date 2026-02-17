import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ShapeListItem from './ShapeListItem.js';

jest.mock('../../../utils/backendApi', () => ({
  updateShapePublic: jest.fn(async (id, isPublic) => ({ id, public: isPublic })),
  fetchShapeById: jest.fn()
}));

jest.mock('../../../controller/utils/logger.js', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

const { updateShapePublic, fetchShapeById } = require('../../../utils/backendApi');

const user = { id: 'user-1', name: 'Test User' };
const otherUser = { id: 'user-2', name: 'Other User' };
const baseShape = {
  id: 'shape-1',
  name: 'Test Shape',
  userId: 'user-1',
  public: false,
  cells: [{ x: 0, y: 0 }]
};

describe('ShapeListItem public/private checkbox', () => {
  let mockCtx;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      clearRect: jest.fn(),
      save: jest.fn(),
      scale: jest.fn(),
      fillRect: jest.fn(),
      restore: jest.fn(),
      _fillStyle: '#000',
      set fillStyle(value) { this._fillStyle = value; },
      get fillStyle() { return this._fillStyle; }
    };
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows checkbox for user shapes and toggles public', async () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );
    // Checkbox should be present and not checked
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    // Click to make public
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('reverts optimistic public toggle when update fails', async () => {
    updateShapePublic.mockRejectedValueOnce(new Error('failure'));

    render(
      <ShapeListItem
        shape={{ ...baseShape, public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateShapePublic).toHaveBeenCalledWith('shape-1', true);
      expect(checkbox).not.toBeChecked();
    });
  });

  it('disables checkbox for non-creator if public', () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: true, userId: 'user-1' }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={otherUser}
        backendBase="/api"
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  it('enables checkbox for creator if public', () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: true, userId: 'user-1' }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  it('does not show checkbox for system shapes', () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, userId: 'system', public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('draws mini preview for object and array cell formats', async () => {
    const getCellColor = jest.fn(() => '#123456');
    render(
      <ShapeListItem
        shape={{
          ...baseShape,
          cells: [{ x: 0, y: 0 }, [1, 2], null]
        }}
        idx={0}
        colorScheme={{ getCellColor }}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );

    await waitFor(() => {
      expect(mockCtx.clearRect).toHaveBeenCalled();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.scale).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  it('fetches full shape when list item has id but no cells', async () => {
    fetchShapeById.mockResolvedValueOnce({
      ok: true,
      data: { id: 'shape-1', cells: [{ x: 4, y: 5 }], name: 'Hydrated Shape' }
    });

    render(
      <ShapeListItem
        shape={{ id: 'shape-1', name: 'Hydrate Me', userId: 'user-1', public: false }}
        idx={0}
        colorScheme={{ getCellColor: () => '#4a9' }}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );

    await waitFor(() => {
      expect(fetchShapeById).toHaveBeenCalledWith('shape-1', '/api');
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  it('does not fetch full shape when pattern data already exists', async () => {
    render(
      <ShapeListItem
        shape={{
          id: 'shape-1',
          name: 'Has Pattern',
          userId: 'user-1',
          public: false,
          pattern: [[0, 0], [1, 0]],
          cells: []
        }}
        idx={0}
        colorScheme={{ getCellColor: () => '#4a9' }}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );

    await waitFor(() => {
      expect(fetchShapeById).not.toHaveBeenCalled();
    });
  });

  it('handles hydration fetch errors without crashing', async () => {
    fetchShapeById.mockRejectedValueOnce(new Error('fetch failed'));
    render(
      <ShapeListItem
        shape={{ id: 'shape-1', name: 'Hydrate Me', userId: 'user-1', public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );

    await waitFor(() => {
      expect(fetchShapeById).toHaveBeenCalled();
      expect(screen.getByText('Hydrate Me')).toBeInTheDocument();
    });
  });

  it('selects and deletes shape through action handlers', () => {
    const onSelect = jest.fn();
    const onRequestDelete = jest.fn();
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: false, userId: user.id }}
        idx={0}
        colorScheme={{}}
        onSelect={onSelect}
        onRequestDelete={onRequestDelete}
        onAddRecent={() => {}}
        user={user}
        backendBase="/api"
      />
    );

    fireEvent.click(screen.getByTestId('shape-label'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'shape-1' }));

    fireEvent.click(screen.getByLabelText('delete'));
    expect(onRequestDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'shape-1' }));
  });

  it('adds shape to recent list using plus button', async () => {
    const onAddRecent = jest.fn();
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={onAddRecent}
        user={user}
        backendBase="/api"
      />
    );

    fireEvent.click(screen.getByTestId('add-recent-btn-shape-1'));
    await waitFor(() => expect(onAddRecent).toHaveBeenCalledWith(expect.objectContaining({ id: 'shape-1' })));
  });
});
