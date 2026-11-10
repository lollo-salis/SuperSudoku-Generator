import test from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, SUPPORTED_LOCALES, resolveLocale, translate, variantInfo } from '../src/i18n.js';
import { createLayout, boardInfo } from '../src/layout.js';

test('Italian and English cover the same UI messages and all eight variants', () => {
  assert.deepEqual(Object.keys(MESSAGES.it.ui).sort(), Object.keys(MESSAGES.en.ui).sort());
  assert.deepEqual(Object.keys(MESSAGES.it.variants).sort(), Object.keys(MESSAGES.en.variants).sort());
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of Object.keys(MESSAGES.it.ui)) assert.ok(translate(key, locale).trim());
    for (const variant of Object.keys(MESSAGES.it.variants)) {
      const info = variantInfo(variant, locale);
      assert.ok(info.name.trim());
      assert.ok(info.rules.includes(MESSAGES[locale].standard));
      assert.ok(info.rules.includes(MESSAGES[locale].shared));
      assert.equal(info.rules.includes(MESSAGES[locale].boxes), variant !== 'irregular');
    }
  }
});

test('changing language changes only display text, preserving board identity and layout', () => {
  const layout = createLayout({ seed: 'bilingual' });
  const snapshot = structuredClone(layout);
  for (const board of layout) {
    const it = boardInfo(board, 'it');
    const en = boardInfo(board, 'en');
    assert.equal(it.boardId, en.boardId);
    assert.equal(it.slotId, en.slotId);
    assert.notEqual(it.rules, en.rules);
    assert.deepEqual(boardInfo(board), it);
  }
  assert.deepEqual(layout, snapshot);
  assert.equal(translate('rules', 'en'), 'Rules');
  assert.equal(translate('rules'), 'Regole');
});

test('regional languages normalize, unsupported languages fall back, missing keys fail clearly', () => {
  assert.equal(resolveLocale('EN-us'), 'en');
  assert.equal(resolveLocale('it_IT'), 'it');
  assert.equal(resolveLocale('fr'), 'it');
  assert.equal(resolveLocale(null), 'it');
  assert.equal(translate('rules', 'en-GB'), 'Rules');
  assert.equal(translate('rules', 'fr'), 'Regole');
  assert.throws(() => translate('missing'));
  assert.throws(() => translate('toString'));
  assert.throws(() => variantInfo('toString'));
});
