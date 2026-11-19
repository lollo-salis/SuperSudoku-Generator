import test from 'node:test';
import assert from 'node:assert/strict';
import { installPlatform, checkInstallAccess } from '../src/install.js';

test('installation help identifies Android, iPhone, desktop and iPad desktop mode', () => {
  assert.equal(installPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130' }), 'android');
  assert.equal(installPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }), 'ios');
  assert.equal(installPlatform({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  assert.equal(installPlatform({ platform: 'MacIntel', maxTouchPoints: 0 }), 'desktop');
});

const manifest = { icons: [{ src: './icons/icon-192.png', sizes: '192x192' }, { src: './icons/icon-512.png', sizes: '512x512' }] };
const fixture = (status = {}) => async (url, options) => {
  assert.equal(options.credentials, 'omit');
  assert.equal(options.cache, 'no-store');
  const name = new URL(url).pathname;
  if (status[name]) return new Response('', { status: status[name] });
  if (name.endsWith('manifest.webmanifest')) return Response.json(manifest);
  return new Response('asset', { headers: { 'content-type': name.endsWith('.png') ? 'image/png' : 'text/javascript' } });
};

test('anonymous installation checks test both PNG sizes and the worker', async () => {
  assert.equal(await checkInstallAccess('https://example.test/', fixture()), 'ready');
  assert.equal(await checkInstallAccess('https://example.test/', fixture({ '/manifest.webmanifest': 401 })), 'protected');
  assert.equal(await checkInstallAccess('https://example.test/', fixture({ '/icons/icon-512.png': 403 })), 'protected');
  assert.equal(await checkInstallAccess('https://example.test/', fixture({ '/sw.js': 404 })), 'unavailable');
});

test('network failures and login HTML do not claim installation is ready', async () => {
  assert.equal(await checkInstallAccess('https://example.test/', async () => { throw new Error('offline'); }), 'unavailable');
  assert.equal(await checkInstallAccess('https://example.test/', async () => new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } })), 'unavailable');
});
