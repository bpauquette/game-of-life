import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useProtectedAction } from './useProtectedAction.js';

jest.mock('./AuthProvider.js', () => ({
  useAuth: jest.fn()
}));

jest.mock('./Login.jsx', () => function LoginMock(props) {
  return <button onClick={() => props.onSuccess()}>login-success</button>;
});

jest.mock('./Register.jsx', () => function RegisterMock(props) {
  return <button onClick={() => props.onSuccess()}>register-success</button>;
});

const { useAuth } = jest.requireMock('./AuthProvider.js');

function TestHarness({ action }) {
  const { wrappedAction, renderDialog } = useProtectedAction(action);
  return (
    <div>
      <button
        onClick={async () => {
          try {
            await wrappedAction('shape-name', { foo: 'bar' });
          } catch (_) {
            // swallow in harness
          }
        }}
      >
        trigger
      </button>
      {renderDialog()}
    </div>
  );
}

describe('useProtectedAction', () => {
  test('forwards args and resolves action when authenticated', async () => {
    useAuth.mockReturnValue({ token: 'token-1' });
    const action = jest.fn().mockResolvedValue({ ok: true });

    render(<TestHarness action={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledWith('shape-name', { foo: 'bar' });
    });
  });

  test('prompts login then runs original action with pending args', async () => {
    useAuth.mockReturnValue({ token: null });
    const action = jest.fn().mockResolvedValue({ ok: true });

    render(<TestHarness action={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));

    // Unauthenticated flow may start on register or login depending on cached email.
    const successButton =
      screen.queryByRole('button', { name: 'register-success' }) ||
      screen.queryByRole('button', { name: 'login-success' });
    expect(successButton).toBeTruthy();
    fireEvent.click(successButton);

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledWith('shape-name', { foo: 'bar' });
    });
  });
});
