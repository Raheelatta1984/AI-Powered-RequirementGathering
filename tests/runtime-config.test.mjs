import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeConfig, configurationError } from '../server/runtime-config.mjs';

test('production reports missing secret and insecure cookies together without echoing values', () => {
  const secret = 'tiny-value';
  const config = runtimeConfig({ NODE_ENV: 'production', WORKSPACE_ACCESS_TOKEN: secret, SECURE_COOKIES: 'false' });
  assert.equal(config.problems.length, 2);
  assert.match(config.problems.join('\n'), /WORKSPACE_ACCESS_TOKEN/);
  assert.match(config.problems.join('\n'), /SECURE_COOKIES/);
  assert.ok(!configurationError(config.problems).message.includes(secret));
});
test('production defaults to secure cookies and accepts a strong secret', () => {
  const config = runtimeConfig({ NODE_ENV: 'production', WORKSPACE_ACCESS_TOKEN: 'x'.repeat(32), PORT: '10000', RENDER_EXTERNAL_URL: 'https://clarity.onrender.com' });
  assert.deepEqual(config.problems, []);
  assert.equal(config.secureCookies, true);
  assert.equal(config.port, 10000);
  assert.equal(config.publicOrigin, 'https://clarity.onrender.com');
});
test('whitespace is not a strong secret and invalid ports/proxy settings fail closed', () => {
  const config = runtimeConfig({ NODE_ENV: 'production', WORKSPACE_ACCESS_TOKEN: ' '.repeat(30), PORT: '70000', TRUST_PROXY_HOPS: '-1' });
  assert.equal(config.problems.length, 3);
  assert.match(config.problems.join('\n'), /missing or empty/);
});
test('too-short secrets report only their length, never their value', () => {
  const secret = 'super-secret-value';
  const config = runtimeConfig({ NODE_ENV: 'production', WORKSPACE_ACCESS_TOKEN: secret });
  assert.match(config.problems.join('\n'), new RegExp(`received ${secret.length} characters`));
  assert.ok(!configurationError(config.problems).message.includes(secret));
});
test('custom public origin must be exact and development may remain unauthenticated', () => {
  assert.ok(runtimeConfig({ PUBLIC_ORIGIN: 'https://example.org/' }).problems.some(p => p.includes('PUBLIC_ORIGIN')));
  const dev = runtimeConfig({ NODE_ENV: 'development' });
  assert.deepEqual(dev.problems, []);
  assert.equal(dev.secureCookies, false);
});
