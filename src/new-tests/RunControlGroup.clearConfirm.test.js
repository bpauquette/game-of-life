import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useGridFileManager from '../view/hooks/useGridFileManager.js';
import HeaderBar from '../view/HeaderBar.js';
import { AuthProvider } from '../auth/AuthProvider.jsx';

// Mock grid file manager used by HeaderBar so we don't open dialogs or hit network
jest.mock('../view/hooks/useGridFileManager', () => ({ __esModule: true, default: jest.fn() }));

function makeProps(overrides = {}) {
  return {
    isRunning: false,
    setIsRunning: jest.fn(),
    step: jest.fn(),
    draw: jest.fn(),
    clear: jest.fn(),
    snapshotsRef: { current: [1,2,3] },
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
    generation: 0,
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

beforeEach(() => {
  jest.clearAllMocks();
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

describe('RunControlGroup - clear confirmation', () => {
  test('clicking Clear opens confirm dialog and only clears after confirm', async () => {
    const props = makeProps();
    render(<AuthProvider><HeaderBar {...props} /></AuthProvider>);

    // Open confirm dialog via clear button
    const clearButton = screen.getByLabelText(/clear/i);
  userEvent.click(clearButton);

    // Dialog appears
    const dialogTitle = await screen.findByText(/clear grid\?/i);
    expect(dialogTitle).toBeInTheDocument();

    // Ensure clear not called yet
    expect(props.clear).not.toHaveBeenCalled();

    // Confirm clear
    const confirmBtn = screen.getByRole('button', { name: /^Clear$/i });
  userEvent.click(confirmBtn);

    expect(props.clear).toHaveBeenCalledTimes(1);
    expect(props.draw).toHaveBeenCalled();
  });
});
