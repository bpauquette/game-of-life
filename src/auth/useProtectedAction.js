import { useCallback, useRef, useState } from 'react';
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
  const pendingActionRef = useRef(null);

  const executeAction = useCallback(async (args = []) => {
    return await action(...args);
  }, [action]);

  const wrappedAction = useCallback((...args) => {
    if (token) {
      return executeAction(args);
    }

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

    return new Promise((resolve, reject) => {
      // Replace any stale pending action.
      if (pendingActionRef.current?.reject) {
        pendingActionRef.current.reject(new Error('AUTH_REQUIRED'));
      }
      pendingActionRef.current = { args, resolve, reject };
    });
  }, [executeAction, token]);

  const resolvePendingAction = useCallback(async () => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (!pending) return;
    try {
      const result = await executeAction(pending.args || []);
      pending.resolve(result);
    } catch (error) {
      pending.reject(error);
    }
  }, [executeAction]);

  const handleLoginSuccess = useCallback(async () => {
    setShowDialog(false);
    await resolvePendingAction();
  }, [resolvePendingAction]);

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

  const handleRegisterSuccess = useCallback(async () => {
    setShowDialog(false);
    await resolvePendingAction();
  }, [resolvePendingAction]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
    setDialogMode('login');
    if (pendingActionRef.current?.reject) {
      pendingActionRef.current.reject(new Error('AUTH_REQUIRED'));
    }
    pendingActionRef.current = null;
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
