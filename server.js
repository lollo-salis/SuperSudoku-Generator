import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { networkInterfaces } from 'node:os';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '0.0.0.0';
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (relative.split(/[\\/]/).some(p => p.startsWith('.')) || !/^(index\.html|styles\.css|mobile\.css|manifest\.webmanifest|sw\.js|icon\.svg|src\/[\w-]+\.js|data\/starter\.json)$/.test(relative)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !(await stat(target)).isFile()) throw new Error('Not found');
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(target));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, host, () => {
  console.log(`SuperSudoku: http://localhost:${port}`);
  for (const addresses of Object.values(networkInterfaces())) for (const address of addresses ?? []) {
    if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
      console.log(`Phone (same Wi-Fi): http://${address.address}:${port}`);
    }
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
