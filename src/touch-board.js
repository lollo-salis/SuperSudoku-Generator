/** Mobile-only navigation. Capture on the viewport so SVG redraws do not lose touches. */
export function enableTouchBoard(viewport, { enabled, getZoom, setZoom, onTap }) {
  const pointers = new Map();
  let pinch, moved = false, multiple = false, suppressedUntil = 0;
  const point = event => ({ x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
  const geometry = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  function startPinch() {
    const { x, y, distance } = geometry(), rect = viewport.getBoundingClientRect(), scale = getZoom();
    pinch = { distance: Math.max(1, distance), scale,
      anchorX: (viewport.scrollLeft + x - rect.left) / scale,
      anchorY: (viewport.scrollTop + y - rect.top) / scale };
  }
  function down(event) {
    if (!enabled() || event.pointerType === 'mouse') return;
    if (!pointers.size) { moved = false; multiple = false; }
    pointers.set(event.pointerId, point(event));
    viewport.setPointerCapture(event.pointerId);
    if (pointers.size >= 2) { multiple = true; startPinch(); }
  }
  function move(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    const dx = previous.x - event.clientX, dy = previous.y - event.clientY;
    if (Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) > 8) moved = true;
    pointers.set(event.pointerId, { ...previous, x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const { x, y, distance } = geometry(), rect = viewport.getBoundingClientRect();
      const scale = Math.min(6, Math.max(1, pinch.scale * distance / pinch.distance));
      setZoom(scale);
      viewport.scrollLeft = pinch.anchorX * scale - (x - rect.left);
      viewport.scrollTop = pinch.anchorY * scale - (y - rect.top);
    } else if (moved || multiple) {
      const before = viewport.scrollTop;
      viewport.scrollLeft += dx; viewport.scrollTop += dy;
      // At normal scale, allow a vertical swipe at a board edge to scroll the page.
      if (getZoom() <= 1.01 && !multiple) window.scrollBy(0, dy - (viewport.scrollTop - before));
    }
  }
  function end(event) {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const isTap = event.type === 'pointerup' && !moved && !multiple &&
      Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) <= 8;
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    suppressedUntil = performance.now() + 700;
    if (pointers.size < 2) pinch = undefined;
    else startPinch();
    if (isTap) onTap(document.elementFromPoint(event.clientX, event.clientY));
  }
  const handlers = { pointerdown: down, pointermove: move, pointerup: end, pointercancel: end };
  for (const [type, handler] of Object.entries(handlers)) viewport.addEventListener(type, handler, { passive: false });
  return {
    suppressClick: () => enabled() && performance.now() < suppressedUntil,
    reset() {
      for (const id of pointers.keys()) if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
      pointers.clear(); pinch = undefined; moved = false; multiple = false;
    },
  };
}

/** Activate phone buttons on a stationary touch, including immediately after a pan.
 * Cancelling touchend prevents a second compatibility click. Mouse/keyboard keep
 * their normal click path, and swipes or multi-touch never activate a button.
 */
export function enableMobileButtons(enabled) {
  let press;
  document.addEventListener('touchstart', event => {
    const button = event.target.closest('button');
    if (!enabled() || event.touches.length !== 1 || !button || button.disabled) { press = undefined; return; }
    const touch = event.touches[0];
    press = { button, id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!press) return;
    const touch = [...event.touches].find(t => t.identifier === press.id);
    if (!touch || Math.hypot(touch.clientX - press.x, touch.clientY - press.y) > 8) press = undefined;
  }, { passive: true });
  document.addEventListener('touchcancel', () => { press = undefined; }, { passive: true });
  document.addEventListener('touchend', event => {
    const current = press; press = undefined;
    if (!current || !enabled() || event.touches.length || current.button.disabled) return;
    const touch = [...event.changedTouches].find(t => t.identifier === current.id);
    if (!touch || Math.hypot(touch.clientX - current.x, touch.clientY - current.y) > 8) return;
    event.preventDefault(); current.button.click();
  }, { passive: false });
}
