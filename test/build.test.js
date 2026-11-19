import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { WEB_FILES } from '../scripts/web-files.js';

test('production build publishes only runtime files, proper PNG icons and a release-specific worker', async () => {
  const result = spawnSync(process.execPath, ['scripts/build.js'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const actual = [];
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await visit(new URL(`${entry.name}/`, directory), `${name}/`);
      else actual.push(name);
    }
  }
  await visit(new URL('../dist/', import.meta.url));
  assert.deepEqual(actual.sort(), [...WEB_FILES, 'sw.js', '_headers'].sort());
  assert.ok(!actual.some(name => /Supersudoku\.webp|README|package|server|test|node_modules/.test(name)));
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url)));
  for (const icon of manifest.icons.filter(icon => icon.type === 'image/png')) {
    const bytes = await readFile(new URL(`../dist/${icon.src}`, import.meta.url));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
  }
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /supersudoku-[a-f0-9]{16}/);
  assert.ok(!worker.includes('__BUILD_ID__'));
  assert.match(await readFile(new URL('../dist/_headers', import.meta.url), 'utf8'), /\/sw\.js\s+Cache-Control: no-cache, no-store/);
});
