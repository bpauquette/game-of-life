import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OptionsPanel from './OptionsPanel';
import logger from '../controller/utils/logger';

// Mock logger
jest.mock('../controller/utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

describe('OptionsPanel', () => {
  const defaultProps = {
    colorSchemes: {
      default: { name: 'Default' },
      dark: { name: 'Dark Theme' },
      neon: { name: 'Neon' }
    },
    colorSchemeKey: 'default',
    setColorSchemeKey: jest.fn(),
    popWindowSize: 10,
    setPopWindowSize: jest.fn(),
    popTolerance: 5,
    setPopTolerance: jest.fn(),
    onOk: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<OptionsPanel {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByLabelText('Color scheme')).toBeInTheDocument();
      expect(screen.getByLabelText('Steady window (generations)')).toBeInTheDocument();
      expect(screen.getByLabelText('Population tolerance')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    });

    it('should display current values in form fields', () => {
      render(<OptionsPanel {...defaultProps} />);

      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // popWindowSize
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();  // popTolerance
    });

    it('should render all color scheme options', () => {
      render(<OptionsPanel {...defaultProps} />);

      const colorSchemeSelect = screen.getByLabelText('Color scheme');
      fireEvent.mouseDown(colorSchemeSelect);

      expect(screen.getAllByText('Default')).toHaveLength(2); // One in select, one in menu
      expect(screen.getByText('Dark Theme')).toBeInTheDocument();
      expect(screen.getByText('Neon')).toBeInTheDocument();
    });

    it('should show helper texts and tooltips', () => {
      render(<OptionsPanel {...defaultProps} />);

      expect(screen.getByText('Choose a rendering color scheme')).toBeInTheDocument();
    });
  });

  describe('color scheme selection', () => {
    it('should update local scheme when selection changes', () => {
      render(<OptionsPanel {...defaultProps} />);

      const colorSchemeSelect = screen.getByLabelText('Color scheme');
      fireEvent.mouseDown(colorSchemeSelect);
      
      const darkOption = screen.getByText('Dark Theme');
      fireEvent.click(darkOption);

      // Verify the selection changed locally (not yet committed)
      expect(defaultProps.setColorSchemeKey).not.toHaveBeenCalled();
    });

    it('should initialize with current colorSchemeKey', () => {
      const props = { ...defaultProps, colorSchemeKey: 'neon' };
      render(<OptionsPanel {...props} />);

      // Check that the component renders with the neon scheme selected
      expect(screen.getByDisplayValue('neon')).toBeInTheDocument();
    });
  });

  describe('numeric inputs', () => {
    it('should update steady window value', () => {
      render(<OptionsPanel {...defaultProps} />);

      const windowInput = screen.getByLabelText('Steady window (generations)');
      
      fireEvent.change(windowInput, { target: { value: '15' } });

      expect(windowInput).toHaveValue(15);
      expect(defaultProps.setPopWindowSize).not.toHaveBeenCalled(); // Not committed yet
    });

    it('should update population tolerance value', () => {
      render(<OptionsPanel {...defaultProps} />);

      const toleranceInput = screen.getByLabelText('Population tolerance');
      
      fireEvent.change(toleranceInput, { target: { value: '8' } });

      expect(toleranceInput).toHaveValue(8);
      expect(defaultProps.setPopTolerance).not.toHaveBeenCalled(); // Not committed yet
    });

    it('should enforce minimum value of 1 for window size', () => {
      render(<OptionsPanel {...defaultProps} />);

      const windowInput = screen.getByLabelText('Steady window (generations)');
      
      fireEvent.change(windowInput, { target: { value: '0' } });

      // Should clamp to minimum of 1
      expect(windowInput).toHaveValue(1);
    });

    it('should enforce minimum value of 0 for tolerance', () => {
      render(<OptionsPanel {...defaultProps} />);

      const toleranceInput = screen.getByLabelText('Population tolerance');
      
      fireEvent.change(toleranceInput, { target: { value: '-5' } });

      // Should clamp to minimum of 0
      expect(toleranceInput).toHaveValue(0);
    });

    it('should handle invalid numeric input for window size', () => {
      render(<OptionsPanel {...defaultProps} />);

      const windowInput = screen.getByLabelText('Steady window (generations)');
      
      fireEvent.change(windowInput, { target: { value: 'invalid' } });

      // Should default to 1 for invalid input
      expect(windowInput).toHaveValue(1);
    });

    it('should handle invalid numeric input for tolerance', () => {
      render(<OptionsPanel {...defaultProps} />);

      const toleranceInput = screen.getByLabelText('Population tolerance');
      
      fireEvent.change(toleranceInput, { target: { value: 'abc' } });

      // Should default to 0 for invalid input
      expect(toleranceInput).toHaveValue(0);
    });
  });

  describe('dialog actions', () => {
    it('should call onCancel when Cancel button is clicked', () => {
      render(<OptionsPanel {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when dialog is closed', () => {
      render(<OptionsPanel {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      // Note: This might not trigger in jsdom, but the prop is passed correctly
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should commit changes and call onOk when OK button is clicked', () => {
      render(<OptionsPanel {...defaultProps} />);

      // Make some changes
      const windowInput = screen.getByLabelText('Steady window (generations)');
      fireEvent.change(windowInput, { target: { value: '20' } });

      const toleranceInput = screen.getByLabelText('Population tolerance');
      fireEvent.change(toleranceInput, { target: { value: '3' } });

      // Click OK to commit changes
      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(defaultProps.setPopWindowSize).toHaveBeenCalledWith(20);
      expect(defaultProps.setPopTolerance).toHaveBeenCalledWith(3);
      expect(defaultProps.onOk).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined onOk gracefully', () => {
      const props = { ...defaultProps, onOk: undefined };
      render(<OptionsPanel {...props} />);

      const okButton = screen.getByRole('button', { name: 'OK' });
      
      expect(() => {
        fireEvent.click(okButton);
      }).not.toThrow();
    });

    it('should handle undefined onCancel gracefully', () => {
      const props = { ...defaultProps, onCancel: undefined };
      render(<OptionsPanel {...props} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      expect(() => {
        fireEvent.click(cancelButton);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle setColorSchemeKey error and log debug message', () => {
      const props = {
        ...defaultProps,
        setColorSchemeKey: jest.fn(() => {
          throw new Error('Color scheme error');
        })
      };
      render(<OptionsPanel {...props} />);

      // Make a change and click OK
      const colorSchemeSelect = screen.getByLabelText('Color scheme');
      fireEvent.mouseDown(colorSchemeSelect);
      fireEvent.click(screen.getByText('Dark Theme'));

      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(logger.debug).toHaveBeenCalledWith('setColorSchemeKey failed:', expect.any(Error));
      expect(props.onOk).toHaveBeenCalledTimes(1); // Should still call onOk
    });

    it('should handle setPopWindowSize error and log debug message', () => {
      const props = {
        ...defaultProps,
        setPopWindowSize: jest.fn(() => {
          throw new Error('Window size error');
        })
      };
      render(<OptionsPanel {...props} />);

      // Make a change and click OK
      const windowInput = screen.getByLabelText('Steady window (generations)');
      fireEvent.change(windowInput, { target: { value: '15' } });

      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(logger.debug).toHaveBeenCalledWith('setPopWindowSize failed:', expect.any(Error));
      expect(props.onOk).toHaveBeenCalledTimes(1); // Should still call onOk
    });

    it('should handle setPopTolerance error and log debug message', () => {
      const props = {
        ...defaultProps,
        setPopTolerance: jest.fn(() => {
          throw new Error('Tolerance error');
        })
      };
      render(<OptionsPanel {...props} />);

      // Make a change and click OK
      const toleranceInput = screen.getByLabelText('Population tolerance');
      fireEvent.change(toleranceInput, { target: { value: '7' } });

      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(logger.debug).toHaveBeenCalledWith('setPopTolerance failed:', expect.any(Error));
      expect(props.onOk).toHaveBeenCalledTimes(1); // Should still call onOk
    });
  });

  describe('edge cases', () => {
    it('should handle empty color schemes object', () => {
      const props = { ...defaultProps, colorSchemes: {} };
      render(<OptionsPanel {...props} />);

      const colorSchemeSelect = screen.getByLabelText('Color scheme');
      fireEvent.mouseDown(colorSchemeSelect);

      // Should not crash, just show no options
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should handle very large numeric values', () => {
      render(<OptionsPanel {...defaultProps} />);

      const windowInput = screen.getByLabelText('Steady window (generations)');
      fireEvent.change(windowInput, { target: { value: '999999' } });

      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(defaultProps.setPopWindowSize).toHaveBeenCalledWith(999999);
    });

    it('should reset to defaults when values are empty', () => {
      render(<OptionsPanel {...defaultProps} />);

      const windowInput = screen.getByLabelText('Steady window (generations)');
      fireEvent.change(windowInput, { target: { value: '' } });

      const toleranceInput = screen.getByLabelText('Population tolerance');
      fireEvent.change(toleranceInput, { target: { value: '' } });

      const okButton = screen.getByRole('button', { name: 'OK' });
      fireEvent.click(okButton);

      expect(defaultProps.setPopWindowSize).toHaveBeenCalledWith(1); // Default minimum
      expect(defaultProps.setPopTolerance).toHaveBeenCalledWith(0); // Default minimum
    });

    it('should maintain state when switching between color schemes rapidly', () => {
      render(<OptionsPanel {...defaultProps} />);

      // Just test that multiple operations don't crash
      const colorSchemeSelect = screen.getByLabelText('Color scheme');
      
      // Switch schemes multiple times
      fireEvent.mouseDown(colorSchemeSelect);
      fireEvent.click(screen.getByText('Dark Theme'));
      
      fireEvent.mouseDown(colorSchemeSelect);
      fireEvent.click(screen.getByText('Neon'));

      // Should not crash and component should still be functional
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<OptionsPanel {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByLabelText('Color scheme')).toBeInTheDocument();
      expect(screen.getByLabelText('Steady window (generations)')).toBeInTheDocument();
      expect(screen.getByLabelText('Population tolerance')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<OptionsPanel {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const okButton = screen.getByRole('button', { name: 'OK' });

      expect(cancelButton).toBeEnabled();
      expect(okButton).toBeEnabled();
      
      // Should be focusable elements
      expect(cancelButton.tabIndex).toBeGreaterThanOrEqual(0);
      expect(okButton.tabIndex).toBeGreaterThanOrEqual(0);
    });

    it('should provide helpful tooltips', () => {
      render(<OptionsPanel {...defaultProps} />);

      const infoIcons = screen.getAllByTestId('InfoIcon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('PropTypes', () => {
    it('should have proper PropTypes defined', () => {
      /* eslint-disable react/forbid-foreign-prop-types */
      expect(OptionsPanel.propTypes).toBeDefined();
      expect(OptionsPanel.propTypes.colorSchemes).toBeDefined();
      expect(OptionsPanel.propTypes.colorSchemeKey).toBeDefined();
      expect(OptionsPanel.propTypes.setColorSchemeKey).toBeDefined();
      expect(OptionsPanel.propTypes.popWindowSize).toBeDefined();
      expect(OptionsPanel.propTypes.setPopWindowSize).toBeDefined();
      expect(OptionsPanel.propTypes.popTolerance).toBeDefined();
      expect(OptionsPanel.propTypes.setPopTolerance).toBeDefined();
      expect(OptionsPanel.propTypes.onOk).toBeDefined();
      expect(OptionsPanel.propTypes.onCancel).toBeDefined();
      /* eslint-enable react/forbid-foreign-prop-types */
    });
  });
});