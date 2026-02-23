import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccountManagementDialog from '../AccountManagementDialog.js';
import { AuthProvider } from '../../auth/AuthProvider.js';

describe('AccountManagementDialog', () => {
  const makeTestJwt = () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'test-user'
      })
    );
    return `${header}.${payload}.sig`;
  };

  beforeEach(() => {
    sessionStorage.setItem('authToken', makeTestJwt());
    global.fetch = jest.fn().mockImplementation(async (url) => {
      const asString = String(url);
      if (asString.includes('/v1/me')) {
        return { ok: true, json: async () => ({ email: 'test@example.com', hasSupportAccess: false }) };
      }
      if (asString.includes('/account/status')) {
        return { ok: true, json: async () => ({ deletionScheduled: false, deletionDate: null, daysRemaining: null }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  afterEach(() => {
    sessionStorage.removeItem('authToken');
    jest.clearAllMocks();
  });

  it('loads account status from supported auth endpoint', async () => {
    render(
      <AuthProvider>
        <AccountManagementDialog open={true} onClose={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      const statusCall = fetch.mock.calls.find(([url]) => String(url).includes('/account/status'));
      expect(statusCall).toBeDefined();
    });

    const [url, options] = fetch.mock.calls.find(([calledUrl]) =>
      String(calledUrl).includes('/account/status')
    );
    expect(String(url)).toContain('/api/auth/account/status');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toContain('Bearer ');
  });
});

