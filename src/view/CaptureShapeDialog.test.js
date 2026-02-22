import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CaptureShapeDialog from './CaptureShapeDialog.js';

describe('CaptureShapeDialog', () => {
  const captureData = {
    cells: [{ x: 1, y: 1 }],
    width: 2,
    height: 2,
    cellCount: 1
  };

  test('dismisses after successful save', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue({ id: 'shape-1' });

    render(
      <CaptureShapeDialog
        open
        onClose={onClose}
        onSave={onSave}
        captureData={captureData}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: /shape name/i }), { target: { value: 'My Capture' } });
    fireEvent.click(screen.getByRole('button', { name: /save shape/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test('ignores repeated save clicks while a save is already in progress', async () => {
    const onClose = jest.fn();
    let resolveSave;
    const onSave = jest.fn().mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(
      <CaptureShapeDialog
        open
        onClose={onClose}
        onSave={onSave}
        captureData={captureData}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: /shape name/i }), { target: { value: 'My Capture' } });
    const saveButton = screen.getByRole('button', { name: /save shape/i });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);

    resolveSave({ id: 'shape-1' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('stays open and shows message when auth is required', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockRejectedValue(new Error('AUTH_REQUIRED'));

    render(
      <CaptureShapeDialog
        open
        onClose={onClose}
        onSave={onSave}
        captureData={captureData}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: /shape name/i }), { target: { value: 'My Capture' } });
    fireEvent.click(screen.getByRole('button', { name: /save shape/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('Please log in to save shapes.')).toBeInTheDocument();
    });
  });
});
