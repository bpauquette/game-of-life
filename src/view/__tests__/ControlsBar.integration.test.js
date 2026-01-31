// ControlsBar.integration.test.js

// Mock useGridFileManager to simulate backend response
jest.mock('../hooks/useGridFileManager', () => () => ({
  grids: [
    { id: 'g1', name: 'Grid 1', liveCells: [{ x: 1, y: 2 }] },
    { id: 'g2', name: 'Grid 2', liveCells: [{ x: 3, y: 4 }] }
  ],
  loadingGrids: false,
  saveDialogOpen: false,
  loadDialogOpen: false,
  openSaveDialog: jest.fn(),
  closeSaveDialog: jest.fn(),
  openLoadDialog: jest.fn(),
  closeLoadDialog: jest.fn(),
  saveGrid: jest.fn(),
  loadGrid: jest.fn(),
  deleteGrid: jest.fn(),
  loadGridsList: jest.fn(),
  error: null
}));

describe.skip('ControlsBar integration', () => {
  it('renders grids from backend response (items array)', async () => {
    // Skipped: Dialog/modal rendering is not reliable in this test environment. See LoadGridDialog.integration.test.js for direct dialog test.
  });
});
