import React from 'react';
import { render, screen } from '@testing-library/react';
import ShapesList from './ShapesList.js';

jest.mock('./ShapeListItem.js', () => {
  const ReactModule = require('react');
  return function MockShapeListItem({ shape }) {
    return ReactModule.createElement('div', { 'data-testid': 'shape-list-item' }, shape.name || '(unnamed)');
  };
});

describe('ShapesList', () => {
  test('renders empty state when not loading and no items', () => {
    render(
      <ShapesList
        items={[]}
        loading={false}
        colorScheme={{}}
        onSelect={() => {}}
        onDeleteRequest={() => {}}
        onAddRecent={() => {}}
        user={null}
        backendBase="/api"
      />
    );

    expect(screen.getByText('No shapes found')).toBeInTheDocument();
  });

  test('renders list items when items are provided', () => {
    const items = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ];

    render(
      <ShapesList
        items={items}
        loading={false}
        colorScheme={{}}
        onSelect={() => {}}
        onDeleteRequest={() => {}}
        onAddRecent={() => {}}
        user={{ id: 'u1' }}
        backendBase="/api"
      />
    );

    const rendered = screen.getAllByTestId('shape-list-item');
    expect(rendered).toHaveLength(2);
    expect(screen.queryByText('No shapes found')).not.toBeInTheDocument();
  });

  test('renders items with fallback key inputs (missing id/name/userId)', () => {
    const items = [
      { name: 'Named But No Id', userId: 'u2' },
      { id: null, name: '', userId: null }
    ];

    render(
      <ShapesList
        items={items}
        loading={false}
        colorScheme={{ theme: 'test' }}
        onSelect={() => {}}
        onDeleteRequest={() => {}}
        onAddRecent={() => {}}
        user={{ id: 'u1' }}
        backendBase="/api"
      />
    );

    const rendered = screen.getAllByTestId('shape-list-item');
    expect(rendered).toHaveLength(2);
  });

  test('does not render empty state while loading', () => {
    render(
      <ShapesList
        items={[]}
        loading={true}
        colorScheme={{}}
        onSelect={() => {}}
        onDeleteRequest={() => {}}
        onAddRecent={() => {}}
        user={null}
        backendBase="/api"
      />
    );

    expect(screen.queryByText('No shapes found')).not.toBeInTheDocument();
  });

  test('renders provided items while loading', () => {
    const items = [{ id: 'z', name: 'Zulu' }];
    render(
      <ShapesList
        items={items}
        loading={true}
        colorScheme={{}}
        onSelect={() => {}}
        onDeleteRequest={() => {}}
        onAddRecent={() => {}}
        user={null}
        backendBase="/api"
      />
    );

    expect(screen.getAllByTestId('shape-list-item')).toHaveLength(1);
    expect(screen.queryByText('No shapes found')).not.toBeInTheDocument();
  });
});
