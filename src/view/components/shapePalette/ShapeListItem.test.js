import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import ShapeListItem from './ShapeListItem';

jest.mock('../../../utils/backendApi', () => ({
  updateShapePublic: jest.fn(async (id, isPublic) => ({ id, public: isPublic }))
}));

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
  it('shows checkbox for user shapes and toggles public', async () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: false }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        onHover={() => {}}
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

  it('disables checkbox for non-creator if public', () => {
    render(
      <ShapeListItem
        shape={{ ...baseShape, public: true, userId: 'user-1' }}
        idx={0}
        colorScheme={{}}
        onSelect={() => {}}
        onRequestDelete={() => {}}
        onAddRecent={() => {}}
        onHover={() => {}}
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
        onHover={() => {}}
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
        onHover={() => {}}
        user={user}
        backendBase="/api"
      />
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
