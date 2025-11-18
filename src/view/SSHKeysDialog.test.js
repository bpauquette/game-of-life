import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SSHKeysDialog from './SSHKeysDialog';

describe('SSHKeysDialog', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the dialog when open', () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    expect(screen.getByText('SSH Keys Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your SSH keys for secure connections. Keys are stored locally in your browser.')).toBeInTheDocument();
  });

  it('shows empty state when no keys are present', () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    expect(screen.getByText('No SSH keys configured yet')).toBeInTheDocument();
    expect(screen.getByText('Click "Add New SSH Key" to get started')).toBeInTheDocument();
  });

  it('shows add key form when Add button is clicked', () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    const addButton = screen.getByRole('button', { name: /Add New SSH Key/i });
    fireEvent.click(addButton);
    
    expect(screen.getByLabelText(/Key Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Public Key/i)).toBeInTheDocument();
  });

  it('adds a new SSH key when form is submitted', async () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    // Click add button
    const addButton = screen.getByRole('button', { name: /Add New SSH Key/i });
    fireEvent.click(addButton);
    
    // Fill in the form
    const nameInput = screen.getByLabelText(/Key Name/i);
    const keyInput = screen.getByLabelText(/Public Key/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Key' } });
    fireEvent.change(keyInput, { target: { value: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ test@example.com' } });
    
    // Click Add Key button
    const submitButton = screen.getByRole('button', { name: /Add Key/i });
    fireEvent.click(submitButton);
    
    // Wait for the key to appear in the list
    await waitFor(() => {
      expect(screen.getByText('Test Key')).toBeInTheDocument();
    });
  });

  it('calls onClose when Close button is clicked', () => {
    const onCloseMock = jest.fn();
    render(<SSHKeysDialog open={true} onClose={onCloseMock} />);
    
    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('shows error when trying to add key without name', () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    // Click add button
    const addButton = screen.getByRole('button', { name: /Add New SSH Key/i });
    fireEvent.click(addButton);
    
    // Try to submit without filling name
    const keyInput = screen.getByLabelText(/Public Key/i);
    fireEvent.change(keyInput, { target: { value: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /Add Key/i });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Key name is required')).toBeInTheDocument();
  });

  it('persists keys to localStorage', async () => {
    render(<SSHKeysDialog open={true} onClose={() => {}} />);
    
    // Add a key
    const addButton = screen.getByRole('button', { name: /Add New SSH Key/i });
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText(/Key Name/i);
    const keyInput = screen.getByLabelText(/Public Key/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Key' } });
    fireEvent.change(keyInput, { target: { value: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /Add Key/i });
    fireEvent.click(submitButton);
    
    // Wait for the key to be added
    await waitFor(() => {
      expect(screen.getByText('Test Key')).toBeInTheDocument();
    });
    
    // Check localStorage
    const storedKeys = JSON.parse(localStorage.getItem('sshKeys'));
    expect(storedKeys).toHaveLength(1);
    expect(storedKeys[0].name).toBe('Test Key');
  });
});
