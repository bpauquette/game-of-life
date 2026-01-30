import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadGridDialog from '../LoadGridDialog.js';

describe('LoadGridDialog', () => {
  it('renders grid names from props', () => {
    render(
      <LoadGridDialog
        open={true}
        onClose={() => {}}
        onLoad={() => {}}
        onDelete={() => {}}
        grids={[
          { id: 'g1', name: 'Grid 1', liveCells: [{ x: 1, y: 2 }] },
          { id: 'g2', name: 'Grid 2', liveCells: [{ x: 3, y: 4 }] }
        ]}
        loading={false}
        error={null}
        loadingGrids={false}
      />
    );
    expect(screen.getByText('Grid 1')).toBeInTheDocument();
    expect(screen.getByText('Grid 2')).toBeInTheDocument();
  });
});
