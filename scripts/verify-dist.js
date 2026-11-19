import { spawnSync } from 'node:child_process';
const build = spawnSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const tests = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, SERVE_DIST: '1' },
});
process.exit(tests.status ?? 1);
