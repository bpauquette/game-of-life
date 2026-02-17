import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopulationChart from './PopulationChart.js';

describe('PopulationChart', () => {
  test('renders empty state and stopped label when no history', () => {
    render(<PopulationChart history={[]} isRunning={false} onClose={jest.fn()} />);

    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.getByText('No data recorded')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  test('renders normalized samples and close handler for mixed history values', () => {
    const onClose = jest.fn();
    render(
      <PopulationChart
        history={[1, null, { generation: 5, population: 10 }, { generation: 'bad', population: 3 }]}
        isRunning={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Samples: 2, Generations: 0–5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('supports embedded and custom fixed positioning', () => {
    const { container, rerender } = render(
      <PopulationChart history={[1]} embedded={true} />
    );
    expect(container.firstChild).toHaveStyle('position: static');
    expect(container.firstChild).toHaveStyle('width: 100%');

    rerender(
      <PopulationChart
        history={[1]}
        embedded={false}
        position={{ top: 5, left: 9 }}
      />
    );
    expect(container.firstChild).toHaveStyle('position: fixed');
    expect(container.firstChild).toHaveStyle('top: 5px');
    expect(container.firstChild).toHaveStyle('left: 9px');
  });
});
