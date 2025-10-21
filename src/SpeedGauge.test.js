import React from 'react';
import { render, screen } from '@testing-library/react';
import SpeedGauge from './SpeedGauge';

describe('SpeedGauge', () => {
  test('renders speed gauge when visible', () => {
    render(
      <SpeedGauge 
        isVisible={true}
        generation={42}
        liveCellsCount={123}
        onToggleVisibility={() => {}}
      />
    );
    
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('FPS:')).toBeInTheDocument();
    expect(screen.getByText('Gen/s:')).toBeInTheDocument();
  });

  test('renders minimized icon when not visible', () => {
    render(
      <SpeedGauge 
        isVisible={false}
        generation={0}
        liveCellsCount={0}
        onToggleVisibility={() => {}}
      />
    );
    
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  test('shows expanded metrics when expanded', () => {
    render(
      <SpeedGauge 
        isVisible={true}
        generation={100}
        liveCellsCount={500}
        onToggleVisibility={() => {}}
      />
    );
    
    // Click the expand button
    const expandButton = screen.getByText('+');
    expandButton.click();
    
    // Should show additional metrics
    expect(screen.getByText('Cells:')).toBeInTheDocument();
    expect(screen.getByText('Peak:')).toBeInTheDocument();
    expect(screen.getByText('Frame:')).toBeInTheDocument();
  });

  test('displays correct cell count', () => {
    render(
      <SpeedGauge 
        isVisible={true}
        generation={10}
        liveCellsCount={1234}
        onToggleVisibility={() => {}}
      />
    );
    
    // Click expand to see cell count
    const expandButton = screen.getByText('+');
    expandButton.click();
    
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});