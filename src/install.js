export function installPlatform({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  if (/iPad|iPhone|iPod/i.test(userAgent) || platform === 'MacIntel' && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

/** Check the anonymous requests an external installer must be able to make.
 * Playing in a logged-in browser does not establish anonymous asset access.
 */
export async function checkInstallAccess(base, fetcher = globalThis.fetch) {
  const options = { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) };
  async function get(url, type) {
    const response = await fetcher(url, options);
    if (response.status === 401 || response.status === 403) return { status: 'protected' };
    if (!response.ok || !response.headers.get('content-type')?.includes(type)) return { status: 'unavailable' };
    return { status: 'ok', response };
  }
  try {
    const manifestURL = new URL('./manifest.webmanifest', base);
    const manifestResult = await get(manifestURL, 'json');
    if (manifestResult.status !== 'ok') return manifestResult.status;
    const manifest = await manifestResult.response.json();
    const icons = [192, 512].map(size => manifest.icons?.find(icon => icon.sizes?.split(' ').includes(`${size}x${size}`) && icon.purpose !== 'maskable'));
    if (icons.some(icon => !icon)) return 'unavailable';
    for (const icon of icons) {
      const iconURL = new URL(icon.src, manifestURL);
      if (iconURL.origin !== manifestURL.origin) return 'unavailable';
      const result = await get(iconURL, 'image/');
      if (result.status !== 'ok') return result.status;
    }
    const worker = await get(new URL('./sw.js', base), 'javascript');
    return worker.status === 'ok' ? 'ready' : worker.status;
  } catch { return 'unavailable'; }
}
