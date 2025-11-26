const fetch = require('node-fetch');

async function run() {
  const base = 'http://127.0.0.1:55000';
  const email = `int-test-${Date.now()}@example.com`;
  const password = 'TestPass1!';

  console.log('Registering user', email);
  let res = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'IT', lastName: 'User', aboutMe: 'replicate' })
  });
  console.log('Register status', res.status);
  const reg = await res.text();
  console.log('Register body:', reg);

  console.log('Logging in');
  res = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  console.log('Login status', res.status);
  const loginBody = await res.json();
  console.log('Login body:', loginBody);
  const token = loginBody.token;
  if (!token) {
    console.error('No token, aborting');
    process.exit(2);
  }

  console.log('Posting shape with token');
  const start = Date.now();
  res = await fetch(base + '/v1/shapes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Replicate Shape', rle: 'bo$2bo$3o!', description: 'replicate test' })
  });
  const elapsed = Date.now() - start;
  console.log('Shape POST status', res.status, `(elapsed ${elapsed}ms)`);
  const text = await res.text();
  console.log('Shape POST body:', text);
}

run().catch(err => { console.error(err); process.exit(1); });
