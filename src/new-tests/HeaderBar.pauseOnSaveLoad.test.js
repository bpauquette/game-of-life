import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HeaderBar from '../view/HeaderBar';
import useGridFileManager from '../view/hooks/useGridFileManager';
// Mock the grid file manager hook to avoid network and heavy UI
jest.mock('../view/hooks/useGridFileManager', () => ({ __esModule: true, default: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure the mocked hook returns the contract HeaderBar expects
  useGridFileManager.mockReturnValue({
    saveGrid: jest.fn(),
    loadGrid: jest.fn(),
    deleteGrid: jest.fn(),
    grids: [],
    loading: false,
    error: null,
    loadingGrids: false,
    saveDialogOpen: false,
    loadDialogOpen: false,
    openSaveDialog: jest.fn(),
    closeSaveDialog: jest.fn(),
    openLoadDialog: jest.fn(),
    closeLoadDialog: jest.fn()
  });
});

function makeProps(overrides = {}) {
  return {
    isRunning: true,
    setIsRunning: jest.fn(),
    step: jest.fn(),
    draw: jest.fn(),
    clear: jest.fn(),
    snapshotsRef: { current: {} },
    setSteadyInfo: jest.fn(),
    colorSchemes: { default: {} },
    colorSchemeKey: 'default',
    setColorSchemeKey: jest.fn(),
    popWindowSize: 5,
    setPopWindowSize: jest.fn(),
    popTolerance: 3,
    setPopTolerance: jest.fn(),
    showSpeedGauge: false,
    setShowSpeedGauge: jest.fn(),
    maxFPS: 60,
    setMaxFPS: jest.fn(),
    maxGPS: 60,
    setMaxGPS: jest.fn(),
    getLiveCells: () => new Set(),
    onLoadGrid: jest.fn(),
    generation: 1,
    setShowChart: jest.fn(),
    onToggleSidebar: jest.fn(),
    isSidebarOpen: false,
    isSmall: false,
    selectedTool: 'draw',
    setSelectedTool: jest.fn(),
    showToolsRow: false,
    ...overrides
  };
}

describe('HeaderBar - pause on Save/Load click', () => {
  test('clicking Save pauses the simulation (calls setIsRunning(false))', async () => {
    const props = makeProps({ isRunning: true });
    render(<HeaderBar {...props} />);

  const saveButton = screen.getByRole('button', { name: /save current grid state/i });
  userEvent.click(saveButton);

    expect(props.setIsRunning).toHaveBeenCalledWith(false);
  });

  test('clicking Load pauses the simulation (calls setIsRunning(false))', async () => {
    const props = makeProps({ isRunning: true });
    render(<HeaderBar {...props} />);

    const loadButton = screen.getByRole('button', { name: /load/i });
  userEvent.click(loadButton);

    expect(props.setIsRunning).toHaveBeenCalledWith(false);
  });
});
