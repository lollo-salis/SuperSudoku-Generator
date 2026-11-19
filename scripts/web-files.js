// Only these files are included in the public site. Keep reference images and tooling out.
export const WEB_FILES = [
  'index.html', 'styles.css', 'mobile.css', 'icon.svg', 'manifest.webmanifest', 'LICENSE',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'data/starter.json',
  ...['app', 'engine', 'game', 'generator', 'generator-worker', 'i18n', 'layout', 'difficulty', 'touch-board'].map(name => `src/${name}.js`),
];
