import React from 'react';
import { render, screen } from '@testing-library/react';
import AuxActions from './AuxActions.js';

function buildProps(overrides = {}) {
  return {
    onOpenChart: jest.fn(),
    onOpenHelp: jest.fn(),
    onOpenAbout: jest.fn(),
    onOpenOptions: jest.fn(),
    onOpenUser: jest.fn(),
    onOpenImport: jest.fn(),
    onOpenDonate: jest.fn(),
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
});
