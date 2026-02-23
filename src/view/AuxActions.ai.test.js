import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AuxActions from './AuxActions.js';

function buildProps(overrides = {}) {
  return {
    onOpenChart: jest.fn(),
    onOpenHelp: jest.fn(),
    onOpenAbout: jest.fn(),
    onOpenOptions: jest.fn(),
    onOpenUser: jest.fn(),
    onOpenImport: jest.fn(),
    onOpenSupport: jest.fn(),
    onOpenPhotoTest: jest.fn(),
    onOpenScript: jest.fn(),
    onOpenAssistant: jest.fn(),
    loggedIn: false,
    ...overrides
  };
}

describe('AuxActions AI button visibility', () => {
  test('hides AI Assistant button when showAssistant is false', () => {
    render(<AuxActions {...buildProps({ showAssistant: false })} />);
    expect(screen.queryByLabelText('ai-assistant')).not.toBeInTheDocument();
  });

  test('shows AI Assistant button when showAssistant is true', () => {
    render(<AuxActions {...buildProps({ showAssistant: true })} />);
    expect(screen.getByLabelText('ai-assistant')).toBeInTheDocument();
  });

  test('hides Photosensitivity button when showPhotoTest is false', () => {
    render(<AuxActions {...buildProps({ showPhotoTest: false })} />);
    expect(screen.queryByLabelText('photosensitivity-test')).not.toBeInTheDocument();
  });

  test('shows Photosensitivity button when showPhotoTest is true', () => {
    render(<AuxActions {...buildProps({ showPhotoTest: true })} />);
    expect(screen.getByLabelText('photosensitivity-test')).toBeInTheDocument();
  });

  test('disables Photosensitivity button when photoTestEnabled is false', () => {
    const onOpenPhotoTest = jest.fn();
    render(<AuxActions {...buildProps({ showPhotoTest: true, photoTestEnabled: false, onOpenPhotoTest })} />);
    const button = screen.getByLabelText('photosensitivity-test');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onOpenPhotoTest).not.toHaveBeenCalled();
  });

  test('enables Photosensitivity button when photoTestEnabled is true', () => {
    const onOpenPhotoTest = jest.fn();
    render(<AuxActions {...buildProps({ showPhotoTest: true, photoTestEnabled: true, onOpenPhotoTest })} />);
    const button = screen.getByLabelText('photosensitivity-test');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onOpenPhotoTest).toHaveBeenCalledTimes(1);
  });
});

