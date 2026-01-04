import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import SimpleScriptPanel from '../SimpleScriptPanel';

// Mock the scriptingInterpreter to avoid complex parsing during tests
jest.mock('../scriptingInterpreter', () => ({
  parseBlocks: jest.fn((lines) => 
    lines.filter(line => line.trim()).map((line, idx) => ({ line: line.trim(), indent: 0, raw: line, idx }))
  ),
  execBlock: jest.fn(async (blocks, state, onStep, emitStepEvent) => {
    console.log('Mock execBlock called with blocks:', blocks);
    console.log('Mock execBlock called with state:', state);
    
    // Mock script execution - simulate drawing based on commands
    blocks.forEach(block => {
      const line = block.line.toUpperCase();
      console.log('Processing line:', line);
      
      if (line.includes('RECT')) {
        const match = line.match(/RECT\\s+(\\d+)\\s+(\\d+)/);
        if (match) {
          const width = parseInt(match[1]);
          const height = parseInt(match[2]);
          const startX = state.x || 0;
          const startY = state.y || 0;
          
          console.log(`Drawing RECT ${width}x${height} at (${startX},${startY})`);
          
          // Add cells to state
          for (let dx = 0; dx < width; dx++) {
            for (let dy = 0; dy < height; dy++) {
              state.cells.add(`${startX + dx},${startY + dy}`);
            }
          }
          onStep(state.cells);
          emitStepEvent(state.cells);
        }
      }
      if (line.includes('GOTO')) {
        const match = line.match(/GOTO\\s+(\\d+)\\s+(\\d+)/);
        if (match) {
          state.x = parseInt(match[1]);
          state.y = parseInt(match[2]);
          console.log(`GOTO (${state.x},${state.y})`);
        }
      }
    });
    
    console.log('Mock execBlock completed, state.cells:', Array.from(state.cells));
    return Promise.resolve();
  })
}));

describe('SimpleScriptPanel Drawing Integration', () => {
  let mockGetLiveCells;
  let mockOnLoadGrid;
  let mockOnClose;
  let mockStep;
  let mockClear;
  let mockSetIsRunning;
  let capturedCells = [];

  beforeEach(() => {
    capturedCells = [];
    
    mockGetLiveCells = jest.fn(() => new Set());
    mockOnLoadGrid = jest.fn((cells) => {
      capturedCells = [...cells]; // Capture the cells that would be loaded
    });
    mockOnClose = jest.fn();
    mockStep = jest.fn();
    mockClear = jest.fn();
    mockSetIsRunning = jest.fn();
    
    // Clear any previous localStorage
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    getLiveCells: mockGetLiveCells,
    onLoadGrid: mockOnLoadGrid,
    clear: mockClear,
    step: mockStep,
    isRunning: false,
    setIsRunning: mockSetIsRunning,
  };

  test('renders with default drawing script', () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    // Check that the default script is shown
    const textArea = screen.getByRole('textbox');
    expect(textArea.value).toContain('PENDOWN');
    expect(textArea.value).toContain('RECT 4 3');
    expect(textArea.value).toContain('GOTO 10 5');
    expect(textArea.value).toContain('RECT 2 2');
  });

  test('executes drawing script and updates grid', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    const runButton = screen.getByText('Run Script');
    
    // Click the run button
    fireEvent.click(runButton);
    
    // Wait for the mocked execBlock to be called and complete
    await waitFor(() => {
      expect(mockOnLoadGrid).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Verify that cells were loaded to the grid
    expect(capturedCells.length).toBeGreaterThan(0);
    
    // Verify the pattern matches expected output:
    // - First RECT 4 3 at (0,0) should create 12 cells
    // - GOTO 10 5 then RECT 2 2 should create 4 more cells at (10,5)
    expect(capturedCells.length).toBe(16); // 4*3 + 2*2 = 16 cells
    
    // Check that we have cells at expected positions
    const cellPositions = capturedCells.map(cell => `${cell.x},${cell.y}`);
    
    // First rectangle (4x3) starting at (0,0)
    expect(cellPositions).toContain('0,0');
    expect(cellPositions).toContain('3,2'); // bottom-right corner
    
    // Second rectangle (2x2) starting at (10,5) 
    expect(cellPositions).toContain('10,5');
    expect(cellPositions).toContain('11,6'); // bottom-right corner
  });

  test('shows success message after script execution', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    const runButton = screen.getByText('Run Script');
    fireEvent.click(runButton);
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Script executed successfully!')).toBeInTheDocument();
    });
  });

  test('closes dialog when script runs', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    const runButton = screen.getByText('Run Script');
    fireEvent.click(runButton);
    
    // Wait for onClose to be called
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('can run custom drawing script', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    // Clear the text area and enter a custom script
    const textArea = screen.getByRole('textbox');
    fireEvent.change(textArea, { 
      target: { value: 'PENDOWN\nRECT 1 1\n' } 
    });
    
    const runButton = screen.getByText('Run Script');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(mockOnLoadGrid).toHaveBeenCalled();
    });
    
    // Should have created exactly 1 cell
    expect(capturedCells.length).toBe(1);
    expect(capturedCells[0]).toEqual({ x: 0, y: 0 });
  });

  test('handles script with GOTO positioning', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    const textArea = screen.getByRole('textbox');
    fireEvent.change(textArea, { 
      target: { value: 'GOTO 5 3\nPENDOWN\nRECT 2 1\n' } 
    });
    
    const runButton = screen.getByText('Run Script');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(mockOnLoadGrid).toHaveBeenCalled();
    });
    
    // Should have 2 cells at (5,3) and (6,3)
    expect(capturedCells.length).toBe(2);
    expect(capturedCells).toContainEqual({ x: 5, y: 3 });
    expect(capturedCells).toContainEqual({ x: 6, y: 3 });
  });

  test('prevents running script when already running', async () => {
    render(<SimpleScriptPanel {...defaultProps} />);
    
    const runButton = screen.getByText('Run Script');
    
    // Click run button twice quickly
    fireEvent.click(runButton);
    fireEvent.click(runButton);
    
    // Only one execution should happen
    await waitFor(() => {
      expect(mockOnLoadGrid).toHaveBeenCalledTimes(1);
    });
  });
});