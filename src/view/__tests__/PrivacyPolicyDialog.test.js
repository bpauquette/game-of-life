import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PrivacyPolicyDialog from '../PrivacyPolicyDialog.js';

describe('PrivacyPolicyDialog', () => {
  it('shows PayPal-only support payment language with current policy dates', () => {
    render(<PrivacyPolicyDialog open={true} onClose={() => {}} />);

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText(/Published: February 22, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Updated: February 22, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/PayPal transaction identifiers and payer email confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Use the Support actions \(heart icon\/menu\) to open the PayPal checkout flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Support Request URL: \/requestsupport/i)).toBeInTheDocument();
    expect(screen.getByText(/Support Purchase URL: \/support/i)).toBeInTheDocument();
    expect(screen.getByText(/was published on February 22, 2026, is effective as of February 22, 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/Stripe/i)).not.toBeInTheDocument();
  });
});
