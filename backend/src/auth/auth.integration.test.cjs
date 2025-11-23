// Integration tests for registration, login, logout, and update
const Database = require('better-sqlite3');
const fetch = require('node-fetch');
const assert = require('assert');

// Use IPv4 loopback to avoid situations where 'localhost' resolves to IPv6 (::1)
// and the server is only listening on IPv4 (0.0.0.0). This makes tests reliable
// across environments (Windows/Linux/macOS) where name resolution differs.
const BASE = 'http://127.0.0.1:55000/auth';
// Open the backend sqlite DB file relative to backend working directory
const db = new Database('auth.db');

// Before running tests, make sure the backend is healthy and accepting connections.
// This avoids brittle test failures if the server isn't started yet.
async function waitForBackendHealth(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok) return;
      }
    } catch (err) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Backend did not respond healthy at ${url} within ${timeoutMs}ms`);
}

describe('Auth Integration', () => {
  const testEmail = 'testuser@example.com';
  const testPassword = 'Test1234!';
  const testFirstName = 'Test';
  const testLastName = 'User';
  const testAboutMe = 'Integration test user.';
  let token; // Store token for authenticated requests

  after(() => {
    db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
  });

  // Ensure the backend is up before running auth tests.
  before(async function () {
    this.timeout(15000);
    await waitForBackendHealth('http://127.0.0.1:55000/v1/health', 10000);
  });

  it('should register a new user', async () => {
    const res = await fetch(BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: testFirstName,
        lastName: testLastName,
        aboutMe: testAboutMe
      })
    });
    assert.strictEqual(res.status, 200, 'Registration should succeed');
    const data = await res.json();
    assert(data.token, 'Token should be returned');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    assert(user, 'User should exist in DB');
    assert.strictEqual(user.first_name, testFirstName);
    assert.strictEqual(user.last_name, testLastName);
    assert.strictEqual(user.about_me, testAboutMe);
  });

  it('should update user info on re-registration', async () => {
    const newFirstName = 'Updated';
    const newLastName = 'Name';
    const newAboutMe = 'Updated info.';
    const res = await fetch(BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: newFirstName,
        lastName: newLastName,
        aboutMe: newAboutMe
      })
    });
    assert.strictEqual(res.status, 200, 'Re-registration should succeed');
    const data = await res.json();
    assert(data.token, 'Token should be returned');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    assert.strictEqual(user.first_name, newFirstName);
    assert.strictEqual(user.last_name, newLastName);
    assert.strictEqual(user.about_me, newAboutMe);
  });

  it('should login with correct credentials', async () => {
    const res = await fetch(BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    assert.strictEqual(res.status, 200, 'Login should succeed');
    const data = await res.json();
    assert(data.token, 'Token should be returned');
    token = data.token; // Store for later tests
  });

  it('should fail login with wrong password', async () => {
    const res = await fetch(BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPass1!' })
    });
    assert.strictEqual(res.status, 401, 'Login with wrong password should fail');
    const data = await res.json();
    assert(data.error, 'Error should be returned');
    assert.strictEqual(data.error, 'Invalid login');
  });

  it('should keep UUID the same on update', async () => {
    const user1 = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    await fetch(BASE + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: 'Another',
        lastName: 'Change',
        aboutMe: 'Another update.'
      })
    });
    const user2 = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    assert.strictEqual(user1.id, user2.id, 'UUID should not change');
  });

  // New tests for saving shapes with/without auth
  it('should save shape while authenticated', async () => {
    const res = await fetch('http://127.0.0.1:55000/v1/shapes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Shape',
        rle: 'bo$2bo$3o!',
        description: 'A test shape for integration tests'
      })
    });
    assert.strictEqual(res.status, 201, 'Saving shape should succeed when authenticated');
    const data = await res.json();
    assert(data.id, 'Shape ID should be returned');
  });

  it('should fail to save shape without authentication', async () => {
    const res = await fetch('http://127.0.0.1:55000/v1/shapes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Shape Unauth',
        rle: 'bo$2bo$3o!',
        description: 'Should fail without auth'
      })
    });
    assert.strictEqual(res.status, 401, 'Saving shape should fail without authentication');
  });

  // Note: No logout endpoint exists; logout is handled client-side by discarding the token.
  // To simulate logout, we can test that invalid/expired tokens fail.
  it('should fail to save shape with invalid token (simulating logout)', async () => {
    const res = await fetch('http://127.0.0.1:55000/v1/shapes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token'
      },
      body: JSON.stringify({
        name: 'Test Shape Invalid Token',
        rle: 'bo!',
        description: 'Should fail with invalid token'
      })
    });
    assert.strictEqual(res.status, 401, 'Saving shape should fail with invalid token');
  });

  it('should logout successfully', async () => {
    const res = await fetch(BASE + '/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    assert.strictEqual(res.status, 200, 'Logout should succeed');
    const data = await res.json();
    assert(data.ok, 'Logout should return ok');
  });
});
