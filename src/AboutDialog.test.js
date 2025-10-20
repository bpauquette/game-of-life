import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AboutDialog from './AboutDialog';

describe('AboutDialog', () => {
  test('renders about dialog when open', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText('About Conway\'s Game of Life')).toBeInTheDocument();
    expect(screen.getByText('Game of Life')).toBeInTheDocument();
    expect(screen.getByText('Interactive Cellular Automaton Simulator')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={false} onClose={onClose} />);
    
    expect(screen.queryByText('About Conway\'s Game of Life')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('displays version information', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText(/Version 0\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/Built:/)).toBeInTheDocument();
  });

  test('shows technology stack', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText('React 19.1.1')).toBeInTheDocument();
    expect(screen.getByText('Material-UI 7.3.4')).toBeInTheDocument();
    expect(screen.getByText('HTML5 Canvas')).toBeInTheDocument();
  });

  test('includes key features section', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText(/Infinite scrollable grid/)).toBeInTheDocument();
    expect(screen.getByText(/Multiple drawing tools/)).toBeInTheDocument();
    expect(screen.getByText(/Shape library integration/)).toBeInTheDocument();
  });

  test('contains links to external resources', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    const githubLink = screen.getByRole('link', { name: 'Source Code Repository' });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/bpauquette/game-of-life');
    expect(githubLink).toHaveAttribute('target', '_blank');
    
    const lifewikiLink = screen.getByRole('link', { name: 'LifeWiki - Pattern Database' });
    expect(lifewikiLink).toHaveAttribute('href', 'https://conwaylife.com/');
    expect(lifewikiLink).toHaveAttribute('target', '_blank');
  });

  test('includes information about John Conway', () => {
    const onClose = jest.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText(/John Horton Conway/)).toBeInTheDocument();
    expect(screen.getByText(/Mathematical Games/)).toBeInTheDocument();
    expect(screen.getByText(/Scientific American/)).toBeInTheDocument();
  });
});