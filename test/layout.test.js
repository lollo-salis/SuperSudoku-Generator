import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, LAYOUT, SLOTS, VARIANTS, boardInfo } from '../src/layout.js';
import { createModel } from '../src/engine.js';

test('same seed reproduces order; other seeds change neighbors', () => {
  assert.deepEqual(createLayout({ seed: 'partita-42' }), createLayout({ seed: 'partita-42' }));
  const orders = new Set(Array.from({ length: 30 }, (_, seed) => createLayout({ seed }).map(b => b.variant).join(',')));
  assert.ok(orders.size > 20);
  const neighborPairs = new Set(Array.from({ length: 30 }, (_, seed) => {
    const layout = createLayout({ seed });
    return [layout[0].variant, layout[1].variant].join(',');
  }));
  assert.ok(neighborPairs.size > 1);
});

test('every shuffled arrangement preserves all variants and shared cells', () => {
  for (let seed = 0; seed < 30; seed++) {
    const layout = createLayout({ seed });
    assert.deepEqual(layout.map(b => b.variant).sort(), Object.keys(VARIANTS).sort());
    assert.deepEqual(layout.map(b => [b.slotId, b.x, b.y]), SLOTS.map(s => [s.id, s.x, s.y]));
    // Geometry check only: an actual irregular board still requires its region map.
    const model = createModel(layout.map(b => ({ ...b, variant: 'classic' })));
    assert.equal(model.cells.size, 576);
    assert.equal([...model.cells.values()].filter(c => c.boards.length === 2).length, 72);
  }
});

test('rule data and labels travel with their board without mutating the source', () => {
  const boards = LAYOUT.map(b => ({ ...b, localClues: [{ row: 1, column: 2, target: 8 }] }));
  const snapshot = structuredClone(boards);
  const layout = createLayout({ seed: 'mix', boards });
  for (const board of layout) {
    const info = boardInfo(board);
    assert.equal(info.name, VARIANTS[board.variant].name);
    assert.ok(info.rules.includes('sovrapposte'));
    assert.deepEqual(board.localClues, [{ row: 1, column: 2, target: 8 }]);
  }
  layout[0].localClues[0].target = 9;
  assert.deepEqual(boards, snapshot);
  assert.deepEqual(createLayout({ shuffle: false }), LAYOUT);
});

test('rejects missing variants, duplicate identities, and unknown variants', () => {
  assert.throws(() => createLayout({ boards: [] }));
  assert.throws(() => createLayout({ boards: LAYOUT.map(b => ({ ...b, id: 'duplicate' })) }));
  assert.throws(() => createLayout({ boards: LAYOUT.map(b => ({ ...b, variant: 'classic' })) }));
  assert.throws(() => boardInfo({ variant: 'missing' }));
});
