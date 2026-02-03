import React from 'react';
import PropTypes from 'prop-types';
import { render, screen, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../useCurrentUser.js';

jest.mock('../../utils/backendApi.js', () => ({
  getBackendApiBase: () => 'https://example.test'
}));

describe('useCurrentUser', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('returns unauthenticated when no token', async () => {
    const Harness = ({ token }) => {
      const res = useCurrentUser(token);
      return <output aria-label="user-state">{JSON.stringify(res)}</output>;
    };

    Harness.propTypes = {
      token: PropTypes.string,
    };

    const fetchSpy = jest.spyOn(global, 'fetch');
    render(<Harness token={null} />);

    const out = await screen.findByLabelText('user-state');
    const parsed = JSON.parse(out.textContent || '{}');
    expect(parsed.status).toBe('unauthenticated');
    expect(parsed.user).toBeNull();
    expect(parsed.isAuthenticated).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('authenticates and returns user data', async () => {
    const Harness = ({ token }) => {
      const res = useCurrentUser(token);
      return <output aria-label="user-state">{JSON.stringify(res)}</output>;
    };

    Harness.propTypes = {
      token: PropTypes.string,
    };

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 7, name: 'Alice' })
    });

    render(<Harness token="token-123" />);

    await waitFor(() => {
      const parsed = JSON.parse(screen.getByLabelText('user-state').textContent || '{}');
      expect(parsed.status).toBe('authenticated');
      expect(parsed.user).toMatchObject({ id: 7, name: 'Alice' });
      expect(parsed.isAuthenticated).toBe(true);
    });
  });

  test('sets unauthenticated on 401', async () => {
    const Harness = ({ token }) => {
      const res = useCurrentUser(token);
      return <output aria-label="user-state">{JSON.stringify(res)}</output>;
    };

    Harness.propTypes = {
      token: PropTypes.string,
    };

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 });

    render(<Harness token="bad-token" />);

    await waitFor(() => {
      const parsed = JSON.parse(screen.getByLabelText('user-state').textContent || '{}');
      expect(parsed.status).toBe('unauthenticated');
      expect(parsed.user).toBeNull();
      expect(parsed.error).toBeNull();
    });
  });
});
