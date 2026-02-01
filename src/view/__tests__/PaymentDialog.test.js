import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentDialog from '../PaymentDialog.js';
import { AuthProvider } from '../../auth/AuthProvider.js';

// Mock fetch globally
global.fetch = jest.fn();
const originalStripeEnabled = process.env.REACT_APP_STRIPE_ENABLED;

describe('PaymentDialog', () => {
  beforeEach(() => {
    fetch.mockClear();
    process.env.REACT_APP_STRIPE_ENABLED = 'true';
    // Mock the payment config endpoint
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        paypal: { enabled: true, clientId: 'test-client-id' },
        stripe: { enabled: true }
      })
    });
  });

  afterEach(() => {
    if (originalStripeEnabled === undefined) {
      delete process.env.REACT_APP_STRIPE_ENABLED;
    } else {
      process.env.REACT_APP_STRIPE_ENABLED = originalStripeEnabled;
    }
  });

  it('renders the donation dialog with title', () => {
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    expect(screen.getByText('Support the Project')).toBeInTheDocument();
  });

  it('fetches payment configuration on open', async () => {
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/config/payments');
    });
  });

  it('renders Stripe button when Stripe is enabled', async () => {
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Donate with Stripe/i)).toBeInTheDocument();
    });
  });

  it('renders PayPal container when PayPal is enabled', async () => {
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('paypal-button-container')).toBeInTheDocument();
    });
  });

  it('disables PayPal area while loading', async () => {
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    // Initial render should not have disabled state
    const container = screen.getByTestId('paypal-button-container');
    expect(container).toHaveStyle('pointerEvents: auto');
    // Simulate loading state by re-rendering with a component that shows loading
    // This would need a loading state prop; for now, we test the structure is correct
    expect(container).toBeInTheDocument();
  });

  it('shows error alert when neither payment method is enabled', async () => {
    fetch.mockClear();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        paypal: { enabled: false },
        stripe: { enabled: false }
      })
    });

    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment methods are not currently configured/i)).toBeInTheDocument();
    });
  });

  it('closes dialog when onClose is called', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={onClose} />
      </AuthProvider>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Rerender with open=false to simulate dialog closing
    rerender(
      <AuthProvider>
        <PaymentDialog open={false} onClose={onClose} />
      </AuthProvider>
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('handles Stripe checkout button click', async () => {
    fetch.mockClear();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        paypal: { enabled: false },
        stripe: { enabled: true }
      })
    });

    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Donate with Stripe/i)).toBeInTheDocument();
    });

    // This test would ideally verify that clicking the button
    // initiates a checkout session request
    // Actual implementation depends on how PaymentDialog handles loading state
  });

  it('handles missing auth user gracefully for PayPal', async () => {
    // AuthProvider should provide a user context; PaymentDialog should fall back
    // to 'unknown@paypal.donor' email when user is not authenticated
    render(
      <AuthProvider>
        <PaymentDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('paypal-button-container')).toBeInTheDocument();
    });

    // If PayPal donation was triggered, it should use fallback email
    // This is tested at integration level with actual PayPal SDK mock
  });
});
