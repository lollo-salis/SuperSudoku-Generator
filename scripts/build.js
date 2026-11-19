import { mkdir, readFile, writeFile, copyFile, rm, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WEB_FILES } from './web-files.js';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const output = path.resolve(root, 'dist');
// Refuse to clean a symlink or any resolved location outside this checkout's dist directory.
if (path.relative(root, output) !== 'dist') throw new Error('Unsafe build output');
try {
  if ((await lstat(output)).isSymbolicLink() || path.relative(root, await realpath(output)) !== 'dist') throw new Error('Unsafe existing build output');
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const contents = await Promise.all(WEB_FILES.map(async name => [name, await readFile(path.join(root, name))]));
const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
const headers = await readFile(path.join(root, '_headers'), 'utf8');
const manifest = JSON.parse(contents.find(([name]) => name === 'manifest.webmanifest')[1]);
for (const icon of manifest.icons) if (!WEB_FILES.includes(icon.src.replace(/^\.\//, ''))) throw new Error(`Unpublished manifest icon: ${icon.src}`);
const hash = createHash('sha256');
for (const [name, data] of contents) hash.update(name).update(data);
hash.update(worker).update(headers);
const release = hash.digest('hex').slice(0, 16);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [name] of contents) {
  const destination = path.join(output, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, name), destination);
}
await writeFile(path.join(output, 'sw.js'), worker.replace('__BUILD_ID__', release));
await writeFile(path.join(output, '_headers'), headers);
console.log(`Static app built in dist/ (${contents.length + 2} files, release ${release}).`);
