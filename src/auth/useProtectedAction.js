
import { useCallback, useState } from 'react';
import { useAuth } from './AuthProvider.js';
import Login from './Login.jsx';
import Register from './Register.jsx';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { isRegistered, getLastCheckedEmail } from './emailCheck.js';
import React from 'react';


/**
 * Hook that wraps an action with authentication protection.
 * If user is not authenticated, shows login/register dialog.
 * If login fails, switches to register mode.
 *
 * @param {Function} action - The action to perform when authenticated
 * @returns {Object} - { wrappedAction, renderDialog }
 */
export function useProtectedAction(action) {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('login');
  const { token } = useAuth();
  const [initialEmail, setInitialEmail] = useState('');

  const wrappedAction = useCallback((...args) => {
    if (token) {
      // User is authenticated, execute the action
      action(...args);
    } else {
      // User not authenticated, determine dialog mode based on stored email
      const lastEmail = getLastCheckedEmail();
      if (lastEmail) {
        setInitialEmail(lastEmail);
        setDialogMode('login');
      } else {
        // No cached email -> encourage registration flow first
        setInitialEmail('');
        setDialogMode('register');
      }

      setShowDialog(true);
    }
  }, [action, token]);

  const handleLoginSuccess = useCallback(() => {
    setShowDialog(false);
    // Now that user is logged in, execute the original action
    action();
  }, [action]);

  const handleLoginError = useCallback(async (error, email) => {
    if (error === 'Invalid login' && email) {
      // Check if the email actually exists
      const exists = await isRegistered(email);
      if (!exists) {
        // Email doesn't exist, switch to register
        setInitialEmail(email);
        setDialogMode('register');
      }
      // If email exists, stay on login (wrong password)
    }
  }, []);

  const handleRegisterError = useCallback((error) => {
    // Stay on register mode if registration fails
    console.warn(error);
    setDialogMode('register');
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    setShowDialog(false);
    // After successful registration, user should be logged in, so execute action
    action();
  }, [action]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setDialogMode('login');
  }, []);

  // Render the dialog
  const renderDialog = useCallback(() => (
    <Dialog open={showDialog} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {dialogMode === 'login' ? 'Login Required' : 'Create Account'}
      </DialogTitle>
      <DialogContent>
        {dialogMode === 'login' ? (
          <Login
            onSuccess={handleLoginSuccess}
            onError={(error, email) => handleLoginError(error, email)}
            showRegisterLink={false}
            initialEmail={initialEmail}
          />
        ) : (
          <Register
            onSuccess={handleRegisterSuccess}
            onError={handleRegisterError}
            showLoginLink={true}
            onSwitchToLogin={() => setDialogMode('login')}
          />
        )}
      </DialogContent>
    </Dialog>
  ), [dialogMode, handleClose, handleLoginError, handleLoginSuccess, handleRegisterError, handleRegisterSuccess, initialEmail, showDialog]);

  return { wrappedAction, renderDialog };
}

export default useProtectedAction;