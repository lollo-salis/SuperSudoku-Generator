import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Run manually after changing icon.svg. Netlify uses the committed PNG assets.
process.env.PLAYWRIGHT_BROWSERS_PATH = fileURLToPath(new URL('../.cache/browsers', import.meta.url));
const temp = fileURLToPath(new URL('../.cache/browser-temp', import.meta.url));
await mkdir(temp, { recursive: true });
process.env.TEMP = process.env.TMP = temp;
const { chromium } = await import('playwright');
const icons = new URL('../icons/', import.meta.url);
await mkdir(icons, { recursive: true });
const svg = await readFile(new URL('../icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
try {
  for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['apple-touch-icon.png', 180, false], ['maskable-512.png', 512, true]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#2d5346;display:grid;place-items:center}svg{width:${maskable ? 70 : 100}%;height:${maskable ? 70 : 100}%}</style>${svg}`);
    await page.screenshot({ path: fileURLToPath(new URL(name, icons)), omitBackground: false });
    await page.close();
  }
} finally { await browser.close(); }
console.log('Created install icons from icon.svg.');
