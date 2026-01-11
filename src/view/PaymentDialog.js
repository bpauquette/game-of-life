import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useAuth } from '../auth/AuthProvider';

// Donation dialog supporting both Stripe and PayPal.
export default function PaymentDialog({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({ paypal: { enabled: false }, stripe: { enabled: false, publishableKey: null } });
  const { user } = useAuth();

  // Canonical project URLs — update to match repository/location
  const repoUrl = 'https://github.com/bpauquette/game-of-life';
  const issuesUrl = repoUrl + '/issues/new/choose';

  // Keep frontend links minimal to avoid exposing donation targets.
  const links = [
    { label: 'Project (GitHub)', url: repoUrl },
    { label: 'Report a bug / Request a feature', url: issuesUrl }
  ];

  const recordPayPalDonation = useCallback(async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const email = user?.email || 'unknown@paypal.donor';
      const response = await fetch('/api/donations/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          email,
          amount: 5.00,
          currency: 'USD'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to record donation: ${response.statusText}`);
      }

      setLoading(false);
      onClose();
      alert('Thank you for your donation! Your donation has been recorded.');
    } catch (err) {
      console.error('Error recording PayPal donation:', err);
      setError('Failed to record donation. Please contact support.');
      setLoading(false);
    }
  }, [onClose, user]);

  const initializePayPalButtons = useCallback(() => {
    const container = document.getElementById('paypal-button-container');
    if (container && window.paypal) {
      container.innerHTML = '';

      window.paypal.Buttons({
        createOrder(data, actions) {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: '5.00',
                }
              }
            ]
          });
        },
        onApprove(data, actions) {
          return actions.order.capture().then(() => {
            recordPayPalDonation(data.id);
          });
        },
        onError(err) {
          console.error('PayPal error:', err);
          setError('PayPal payment failed. Please try again.');
          setLoading(false);
        }
      }).render(container);
    }
  }, [recordPayPalDonation]);

  const loadPayPalSDK = useCallback((clientId) => {
    if (window.paypal) {
      initializePayPalButtons();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      initializePayPalButtons();
    };
    script.onerror = () => {
      console.error('Failed to load PayPal SDK');
      setError('PayPal SDK failed to load. Please use Stripe instead.');
    };
    document.head.appendChild(script);
  }, [initializePayPalButtons]);

  // Fetch payment configuration and load PayPal SDK
  useEffect(() => {
    const loadPaymentConfig = async () => {
      try {
        const response = await fetch('/api/config/payments');
        if (response.ok) {
          const config = await response.json();
          setPaymentConfig(config);

          if (config.paypal?.enabled && config.paypal?.clientId) {
            loadPayPalSDK(config.paypal.clientId);
          }
        }
      } catch (err) {
        console.error('Failed to load payment config:', err);
      }
    };

    if (open) {
      loadPaymentConfig();
    }
  }, [loadPayPalSDK, open]);

  const handleStripeCheckout = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/payments/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new Error('Unexpected response from payment server');
      }

      if (!response.ok || !data?.url || typeof data.url !== 'string') {
        throw new Error(data?.error || `Failed to create checkout session: ${response.statusText}`);
      }

      // Redirect to Stripe checkout
      window.location.assign(data.url);
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setError(err.message || 'Failed to initiate Stripe checkout');
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Support the Project</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          If you enjoy this app and would like to support its continued development,
          please consider donating. Any contribution helps cover hosting, development time,
          and tooling costs.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* Stripe button */}
          {paymentConfig.stripe?.enabled && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Donate with Card (Stripe)
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleStripeCheckout}
                disabled={loading}
                fullWidth
                data-testid="stripe-button"
              >
                {loading ? <CircularProgress size={24} /> : 'Donate with Card'}
              </Button>
            </Box>
          )}

          {/* PayPal button container */}
          {paymentConfig.paypal?.enabled && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Donate with PayPal
              </Typography>
              <Box
                id="paypal-button-container"
                data-testid="paypal-button-container"
                sx={{ minHeight: '50px', pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}
              />
            </Box>
          )}

          {!paymentConfig.stripe?.enabled && !paymentConfig.paypal?.enabled && (
            <Alert severity="warning">
              Payment methods are not currently configured. Please try again later.
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Both Stripe and PayPal are secure payment methods. Your donation helps support this project.
          </Typography>

          {links.map((l) => (
            <Button
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
            >
              {l.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">Project repo:</Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{repoUrl}</Typography>
          <Button
            size="small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(repoUrl);
              } catch (e) {
                /* ignore */
              }
            }}
          >
            Copy
          </Button>
        </Box>

        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Prefer not to use a payment provider? You can also contribute code, documentation,
          bug reports, or share the project with others — all are appreciated.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

PaymentDialog.defaultProps = { open: false, onClose: () => {} };
