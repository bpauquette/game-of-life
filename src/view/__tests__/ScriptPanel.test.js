import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Add jsdom environment setup
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

import ScriptPanel from '../ScriptPanel';
import { useAuthStatus } from '../../auth/useAuthStatus';

// Mock dependencies
jest.mock('../../auth/useAuthStatus');
jest.mock('../../utils/backendApi', () => ({
  getBackendApiBase: () => 'http://localhost:3001'
}));
jest.mock('../DebugPanel', () => ({ debugLog }) => (
  <div data-testid="debug-panel">Debug Panel: {debugLog.length} entries</div>
));
jest.mock('../languageDefinition', () => 'Mock language definition');
jest.mock('../scriptingInterpreter', () => ({
  parseBlocks: jest.fn(() => []),
  execBlock: jest.fn(() => Promise.resolve()),
  splitCond: jest.fn(() => ['x', '==', '1']),
  legacyCommand: jest.fn(() => Promise.resolve())
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

describe('ScriptPanel', () => {
  const mockOnClose = jest.fn();
  const mockUseAuthStatus = useAuthStatus;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStatus.mockReturnValue({
      isAuthenticated: false,
      me: null
    });
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'gol_script_name') return 'Test Script';
      if (key === 'gol_script_last') return 'PENDOWN\nRECT 2 2';
      return null;
    });
  });

  test('renders script panel with basic elements', () => {
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Script Playground')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Script')).toBeInTheDocument();
    // Check for textarea content differently since it might have formatting
    const textarea = screen.getByRole('textbox', { name: /script content/i });
    expect(textarea).toHaveValue('PENDOWN\nRECT 2 2');
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
  });

  test('handles script execution', async () => {
    const { legacyCommand, parseBlocks, execBlock } = require('../scriptingInterpreter');
    
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const runButton = screen.getByText('Run');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(legacyCommand).toHaveBeenCalled();
    });
  });

  test('shows authentication-specific features when logged in', () => {
    mockUseAuthStatus.mockReturnValue({
      isAuthenticated: true,
      me: { email: 'test@example.com' }
    });
    
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Save to Cloud')).toBeInTheDocument();
    expect(screen.getByText('Load from Cloud')).toBeInTheDocument();
    expect(screen.getByLabelText(/Public/)).toBeInTheDocument();
  });

  test('handles cloud save functionality', async () => {
    mockUseAuthStatus.mockReturnValue({
      isAuthenticated: true,
      me: { email: 'test@example.com' }
    });
    
    sessionStorageMock.getItem.mockReturnValue('mock-token');
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const saveButton = screen.getByText('Save to Cloud');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/scripts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );
    });
  });

  test('handles file save functionality', () => {
    // Mock URL methods
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement for anchor
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
      remove: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  test('handles file load functionality', () => {
    const mockInput = {
      type: '',
      accept: '',
      onchange: null,
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockInput);
    
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const loadButton = screen.getByText('Load');
    fireEvent.click(loadButton);
    
    expect(document.createElement).toHaveBeenCalledWith('input');
    expect(mockInput.type).toBe('file');
    expect(mockInput.accept).toBe('.txt');
    expect(mockInput.click).toHaveBeenCalled();
  });

  test('shows language definition dialog', () => {
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const langRefButton = screen.getByText('Language Reference');
    fireEvent.click(langRefButton);
    
    expect(screen.getByText('GOL Script Language Reference')).toBeInTheDocument();
    expect(screen.getByText('Mock language definition')).toBeInTheDocument();
  });

  test('handles script text changes', () => {
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const textarea = screen.getByRole('textbox', { name: /script content/i });
    fireEvent.change(textarea, { target: { value: 'NEW SCRIPT\nCIRCLE 5' } });
    
    expect(textarea.value).toBe('NEW SCRIPT\nCIRCLE 5');
  });

  test('handles script name changes', () => {
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const nameInput = screen.getByDisplayValue('Test Script');
    fireEvent.change(nameInput, { target: { value: 'New Script Name' } });
    
    expect(nameInput.value).toBe('New Script Name');
  });

  test('closes dialog when close button is clicked', () => {
    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('executes script and validates grid state changes', async () => {
    const { legacyCommand, parseBlocks, execBlock } = require('../scriptingInterpreter');
    
    // Mock script functions to actually modify state
    let gameState = { cells: new Set(), vars: {}, outputLabels: [] };
    
    legacyCommand.mockImplementation(async (line, state) => {
      if (line === 'PENDOWN') {
        state.penDown = true;
      } else if (line.startsWith('RECT')) {
        const [, w, h] = line.split(' ');
        const width = parseInt(w);
        const height = parseInt(h);
        // Add cells to represent a rectangle at current position (0,0)
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            state.cells.add(`${x},${y}`);
          }
        }
      }
      return state;
    });

    execBlock.mockImplementation(async (blocks, state) => {
      for (const block of blocks) {
        await legacyCommand(block.line, state);
      }
      return state;
    });

    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    // Change script to something that creates grid state
    const textarea = screen.getByRole('textbox', { name: /script content/i });
    fireEvent.change(textarea, { target: { value: 'PENDOWN\nRECT 3 2' } });
    
    const runButton = screen.getByText('Run');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(legacyCommand).toHaveBeenCalledWith('PENDOWN', expect.any(Object), null, null, null, null);
      expect(legacyCommand).toHaveBeenCalledWith('RECT 3 2', expect.any(Object), null, null, null, null);
    });

    // Verify the execBlock was called for full script execution
    await waitFor(() => {
      expect(execBlock).toHaveBeenCalled();
    });
  });

  test('handles script that creates specific cell patterns', async () => {
    const { legacyCommand, execBlock } = require('../scriptingInterpreter');
    
    // Create a more sophisticated mock that tracks cell positions
    let finalState = { cells: new Set(), vars: {}, outputLabels: [] };
    
    legacyCommand.mockImplementation(async (line, state) => {
      if (line.startsWith('GOTO')) {
        const [, x, y] = line.split(' ');
        state.x = parseInt(x);
        state.y = parseInt(y);
      } else if (line === 'PENDOWN') {
        state.penDown = true;
      } else if (line.startsWith('CIRCLE')) {
        const [, radius] = line.split(' ');
        const r = parseInt(radius);
        const centerX = state.x || 0;
        const centerY = state.y || 0;
        
        // Simple circle approximation - add cells in a circle pattern
        for (let x = -r; x <= r; x++) {
          for (let y = -r; y <= r; y++) {
            if (x*x + y*y <= r*r) {
              state.cells.add(`${centerX + x},${centerY + y}`);
            }
          }
        }
      }
      return state;
    });

    execBlock.mockImplementation(async (blocks, state) => {
      state.x = 0;
      state.y = 0;
      state.penDown = false;
      
      for (const block of blocks) {
        await legacyCommand(block.line, state);
      }
      finalState = state;
      return state;
    });

    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    // Set a script that creates a circle
    const textarea = screen.getByRole('textbox', { name: /script content/i });
    fireEvent.change(textarea, { target: { value: 'GOTO 5 5\nPENDOWN\nCIRCLE 2' } });
    
    const runButton = screen.getByText('Run');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(execBlock).toHaveBeenCalled();
    });

    // Verify that the final state contains cells (circle should create some cells)
    await waitFor(() => {
      expect(finalState.cells.size).toBeGreaterThan(0);
      // Check that center cell exists
      expect(finalState.cells.has('5,5')).toBe(true);
    });
  });

  test('validates step animation affects grid state', async () => {
    const { legacyCommand } = require('../scriptingInterpreter');
    
    // Mock Game of Life step function
    const mockTicks = jest.fn().mockReturnValue({
      keys: () => ['1,1', '1,2', '2,1', '2,2']
    });
    
    legacyCommand.mockImplementation(async (line, state, onStep, emitStepEvent, step, ticks) => {
      if (line.startsWith('STEP')) {
        const [, numSteps] = line.split(' ');
        const steps = parseInt(numSteps);
        
        // Simulate stepping through generations
        for (let i = 0; i < steps; i++) {
          const nextGen = mockTicks(Array.from(state.cells).map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
          }), 1);
          
          state.cells.clear();
          for (const key of nextGen.keys()) {
            state.cells.add(key);
          }
        }
      } else if (line.startsWith('RECT')) {
        // Initial state: create a 2x2 block
        state.cells.add('0,0');
        state.cells.add('0,1');
        state.cells.add('1,0');
        state.cells.add('1,1');
      }
      return state;
    });

    render(<ScriptPanel open={true} onClose={mockOnClose} />);
    
    // Set script that creates initial pattern and steps it
    const textarea = screen.getByRole('textbox', { name: /script content/i });
    fireEvent.change(textarea, { target: { value: 'RECT 2 2\nSTEP 3' } });
    
    const runButton = screen.getByText('Run');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(legacyCommand).toHaveBeenCalledWith('RECT 2 2', expect.any(Object), null, null, null, null);
      expect(legacyCommand).toHaveBeenCalledWith('STEP 3', expect.any(Object), null, null, null, null);
    });

    // Verify ticks function was called for evolution
    await waitFor(() => {
      expect(mockTicks).toHaveBeenCalled();
    });
  });
});