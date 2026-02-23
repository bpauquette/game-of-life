import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SupportRequestDialog from '../SupportRequestDialog.js';
import { submitSupportRequest } from '../../utils/backendApi.js';

jest.mock('../../utils/backendApi.js', () => ({
  submitSupportRequest: jest.fn()
}));

jest.mock('../../auth/AuthProvider.jsx', () => ({
  useAuth: () => ({
    email: 'tester@example.com'
  })
}));

describe('SupportRequestDialog', () => {
  beforeEach(() => {
    submitSupportRequest.mockReset();
  });

  it('prefills contact info and submits support request payload', async () => {
    submitSupportRequest.mockResolvedValue({
      ok: true,
      requestId: 'req-123',
      requestedAt: '2026-02-22T00:00:00.000Z'
    });

    render(<SupportRequestDialog open={true} onClose={() => {}} />);

    expect(screen.getByRole('textbox', { name: /Contact Info/i })).toHaveValue('tester@example.com');
    fireEvent.change(screen.getByRole('textbox', { name: /Support Request/i }), {
      target: { value: 'Need support with importing shapes.' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Request Support' }));

    await waitFor(() => {
      expect(submitSupportRequest).toHaveBeenCalledWith({
        contactInfo: 'tester@example.com',
        requestText: 'Need support with importing shapes.'
      });
    });
  });
});
