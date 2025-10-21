import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HelpDialog from './HelpDialog';

describe('HelpDialog', () => {
  test('renders help dialog when open', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    
    expect(screen.getByText("Conway's Game of Life - Help & Guide")).toBeInTheDocument();
    expect(screen.getByText('Game Rules')).toBeInTheDocument();
    expect(screen.getByText('Tools & Controls')).toBeInTheDocument();
    expect(screen.getByText('Tips & Strategies')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={false} onClose={onClose} />);
    
    expect(screen.queryByText("Conway's Game of Life - Help & Guide")).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('switches between tabs correctly', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    
    // Click on Tools & Controls tab
    const toolsTab = screen.getByText('Tools & Controls');
    fireEvent.click(toolsTab);
    
    expect(screen.getByText('Drawing Tools')).toBeInTheDocument();
    expect(screen.getByText('Freehand Draw')).toBeInTheDocument();
  });

  test('contains essential help content', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    
    // Check for key concepts
    expect(screen.getByText(/Birth/)).toBeInTheDocument();
    expect(screen.getByText(/Survival/)).toBeInTheDocument();
    expect(screen.getByText(/Death by Isolation/)).toBeInTheDocument();
    expect(screen.getByText(/Death by Overpopulation/)).toBeInTheDocument();
  });

  test('includes links to external resources', () => {
    const onClose = jest.fn();
    render(<HelpDialog open={true} onClose={onClose} />);
    
    // Click on Resources tab
    const resourcesTab = screen.getByText('Resources');
    fireEvent.click(resourcesTab);
    
    expect(screen.getByText('LifeWiki - The Ultimate Reference')).toBeInTheDocument();
    const lifewikiLink = screen.getByText('https://conwaylife.com/wiki/Main_Page');
    expect(lifewikiLink).toHaveAttribute('href', 'https://conwaylife.com/wiki/Main_Page');
    expect(lifewikiLink).toHaveAttribute('target', '_blank');
  });
});