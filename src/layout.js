import { MESSAGES, variantInfo } from './i18n.js';

// Stable variant IDs are independent of the display language.
export const VARIANTS = Object.freeze(Object.fromEntries(
  Object.keys(MESSAGES.it.variants).map(id => [id, Object.freeze(variantInfo(id))]),
));

// Positions are fixed; variant identity and all local rule data move together.
export const SLOTS = Object.freeze([
  ['top', 12, 0], ['upper-left', 6, 6], ['upper-right', 18, 6],
  ['left', 0, 12], ['right', 24, 12], ['lower-left', 6, 18],
  ['lower-right', 18, 18], ['bottom', 12, 24],
].map(([id, x, y]) => Object.freeze({ id, x, y })));

export function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6D2B79F5;
    let n = Math.imul(state ^ state >>> 15, state | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

/** Local rule coordinates must be relative to their board, not to its slot. */
export const createSeed = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createLayout({ seed = createSeed(), shuffle = true, boards, variants } = {}) {
  if (boards && variants) throw new Error('Provide boards or variants, not both');
  const types = variants ?? Object.keys(VARIANTS);
  const definitions = boards ?? types.map((variant, i) => ({ id: `${variant}-${i + 1}`, variant }));
  if (definitions.length !== 8 ||
      definitions.some(b => !Object.hasOwn(VARIANTS, b.variant)) ||
      definitions.some(b => typeof b.id !== 'string' || !b.id) ||
      new Set(definitions.map(b => b.id)).size !== 8) {
    throw new Error('Expected eight boards with unique identities and supported variants');
  }
  const ordered = structuredClone(definitions).map((board, i) => ({
    ...board,
    instance: definitions.slice(0, i + 1).filter(b => b.variant === board.variant).length,
    copies: definitions.filter(b => b.variant === board.variant).length,
  }));
  if (shuffle) {
    const random = seededRandom(seed);
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  }
  return ordered.map((board, i) => ({ ...board, slotId: SLOTS[i].id, x: SLOTS[i].x, y: SLOTS[i].y }));
}

// Reference order from the photo, retained for comparison and debugging.
export const LAYOUT = Object.freeze(createLayout({ shuffle: false }).map(Object.freeze));

export function boardInfo(board, locale = 'it') {
  const info = variantInfo(board.variant, locale);
  return { boardId: board.id, slotId: board.slotId, name: `${info.name}${board.copies > 1 ? ` · ${board.instance}` : ''}`, rules: info.rules };
}
