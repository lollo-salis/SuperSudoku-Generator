import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

for (const directory of ['src', 'scripts', 'test', '.']) {
  for (const name of await readdir(new URL(`../${directory}/`, import.meta.url))) {
    if (!name.endsWith('.js')) continue;
    const file = new URL(`../${directory}/${name}`, import.meta.url);
    const result = spawnSync(process.execPath, ['--check', file.pathname.replace(/^\/(?=[A-Za-z]:)/, '')], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
  }
}
console.log('All JavaScript syntax checks passed.');
