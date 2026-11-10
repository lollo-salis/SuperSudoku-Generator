/** Constraint model: shared cells have one global coordinate and one value. */
export const cellId = (x, y) => `${x},${y}`;

export { LAYOUT } from './layout.js';

export function createModel(boards) {
  const cells = new Map();
  const constraints = [];
  const add = (type, ids, extra = {}) => {
    if (!ids.length || ids.some(id => !cells.has(id))) throw new Error('Unknown constraint cell');
    constraints.push({ type, cells: ids, ...extra });
  };
  for (const board of boards) {
    if (!Number.isInteger(board.x) || !Number.isInteger(board.y)) throw new Error('Invalid board position');
    const at = (r, c) => cellId(board.x + c, board.y + r);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const id = at(r, c);
      if (!cells.has(id)) cells.set(id, { id, x: board.x + c, y: board.y + r, boards: [] });
      cells.get(id).boards.push(board.id);
    }
    for (let i = 0; i < 9; i++) {
      add('unique', Array.from({ length: 9 }, (_, j) => at(i, j)));
      add('unique', Array.from({ length: 9 }, (_, j) => at(j, i)));
    }
    if (board.variant === 'irregular' && !board.regions) {
      throw new Error('Irregular board requires an explicit region map');
    }
    const regions = board.regions ?? Array.from({ length: 81 }, (_, i) =>
      Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3));
    if (regions.length !== 81 || new Set(regions).size !== 9) throw new Error('Expected nine regions');
    for (const region of new Set(regions)) {
      const ids = regions.flatMap((value, i) => value === region ? [at(Math.floor(i / 9), i % 9)] : []);
      if (ids.length !== 9) throw new Error('Each region must contain nine cells');
      const remaining = new Set(ids);
      const queue = [ids[0]];
      remaining.delete(ids[0]);
      for (let i = 0; i < queue.length; i++) {
        const { x, y } = cells.get(queue[i]);
        for (const id of [cellId(x + 1, y), cellId(x - 1, y), cellId(x, y + 1), cellId(x, y - 1)]) {
          if (remaining.delete(id)) queue.push(id);
        }
      }
      if (remaining.size) throw new Error('Regions must be connected');
      add('unique', ids);
    }
    if (board.variant === 'diagonal') {
      add('unique', Array.from({ length: 9 }, (_, i) => at(i, i)));
      add('unique', Array.from({ length: 9 }, (_, i) => at(i, 8 - i)));
    }
    if (board.variant === 'offset') {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        add('unique', Array.from({ length: 9 }, (_, i) => at(r + Math.floor(i / 3) * 3, c + i % 3 * 3)));
      }
    }
    for (const clue of board.inequalities ?? []) {
      add('less', [at(...clue.smaller), at(...clue.larger)], { boardId: board.id });
    }
    for (const cage of board.cages ?? []) {
      add('sum', cage.cells.map(pos => at(...pos)), { target: cage.target, unique: true, boardId: board.id });
    }
    for (const group of board.additions ?? []) {
      add('sumTarget', [...group.cells.map(pos => at(...pos)), at(...group.target)], { boardId: board.id });
    }
    if (board.variant === 'consecutive' && board.bridges) {
      const key = (a, b) => [a.join(','), b.join(',')].sort().join('|');
      const bridges = new Set(board.bridges.map(pair => key(...pair)));
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (r + dr < 9 && c + dc < 9) {
            add('consecutive', [at(r, c), at(r + dr, c + dc)], {
              expected: bridges.has(key([r, c], [r + dr, c + dc])), boardId: board.id,
            });
          }
        }
      }
    }
  }
  return { cells, constraints, add };
}

function satisfied(rule, values) {
  const nums = rule.cells.map(id => values[id] || 0);
  const filled = nums.filter(Boolean);
  if (rule.type === 'unique') return new Set(filled).size === filled.length;
  if (rule.type === 'less') return !nums[0] || !nums[1] || nums[0] < nums[1];
  if (rule.type === 'consecutive') {
    return !nums[0] || !nums[1] || (Math.abs(nums[0] - nums[1]) === 1) === rule.expected;
  }
  if (rule.type === 'sum') {
    if (rule.unique && new Set(filled).size !== filled.length) return false;
    const total = filled.reduce((a, b) => a + b, 0);
    const empty = nums.length - filled.length;
    return total + empty <= rule.target && total + 9 * empty >= rule.target;
  }
  if (rule.type === 'sumTarget') {
    const target = nums.at(-1);
    const inputs = nums.slice(0, -1);
    const total = inputs.reduce((a, b) => a + b, 0);
    const empty = inputs.filter(n => !n).length;
    return target ? total + empty <= target && total + 9 * empty >= target : total + empty <= 9;
  }
  throw new Error(`Unknown constraint: ${rule.type}`);
}

export function conflicts(model, values) {
  const errors = [];
  for (const [id, value] of Object.entries(values)) {
    if (!model.cells.has(id) || !Number.isInteger(value) || value < 0 || value > 9) {
      errors.push({ type: 'invalid', cells: [id] });
    }
  }
  return errors.concat(model.constraints.filter(rule => !satisfied(rule, values)));
}

/** Bounded solution enumeration supports uniqueness checks (limit = 2). */
export function solve(model, givens = {}, { limit = 2, maxNodes = 1_000_000, random, hiddenSingles = true, allowSearch = true } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(maxNodes) || maxNodes < 1) {
    throw new Error('Positive integer search limits required');
  }
  const solutions = [];
  let nodes = 0;
  let exhausted = true;
  const ids = [...model.cells.keys()];
  const indexes = new Map(ids.map((id, i) => [id, i]));
  const rules = model.constraints.map(rule => ({ ...rule, cells: rule.cells.map(id => indexes.get(id)) }));
  const unique = rules.filter(rule => rule.type === 'unique' || rule.type === 'sum' && rule.unique);
  const others = rules.filter(rule => rule.type !== 'unique');
  const peers = ids.map(() => new Set());
  for (const rule of unique) for (const i of rule.cells) for (const j of rule.cells) if (i !== j) peers[i].add(j);
  const bits = mask => { const list = []; for (let n = 1; n <= 9; n++) if (mask & 1 << n) list.push(n); return list; };
  const count = mask => { let n = 0; while (mask) { mask &= mask - 1; n++; } return n; };
  const minimum = mask => 31 - Math.clz32(mask & -mask);
  const maximum = mask => 31 - Math.clz32(mask);
  function propagate(domains) {
    let changed = true;
    while (changed) {
      changed = false;
      const narrow = (i, mask) => {
        const next = domains[i] & mask;
        if (next !== domains[i]) { domains[i] = next; changed = true; }
        return next !== 0;
      };
      for (let i = 0; i < domains.length; i++) {
        const mask = domains[i];
        if (!mask) return false;
        if ((mask & mask - 1) === 0) for (const j of peers[i]) if (!narrow(j, ~mask)) return false;
      }
      for (const rule of unique) {
        if (!hiddenSingles) continue;
        if (rule.cells.length !== 9) continue;
        for (let n = 1; n <= 9; n++) {
          const bit = 1 << n;
          let place = -1;
          for (const i of rule.cells) if (domains[i] & bit) { if (place !== -1) { place = -2; break; } place = i; }
          if (place === -1) return false;
          if (place >= 0 && !narrow(place, bit)) return false;
        }
      }
      for (const rule of others) {
        const cells = rule.cells;
        if (rule.type === 'less' || rule.type === 'consecutive') {
          const [a, b] = cells;
          let ma = 0, mb = 0;
          for (const va of bits(domains[a])) for (const vb of bits(domains[b])) {
            if (rule.type === 'less' ? va < vb : (Math.abs(va - vb) === 1) === rule.expected) {
              ma |= 1 << va; mb |= 1 << vb;
            }
          }
          if (!narrow(a, ma) || !narrow(b, mb)) return false;
        } else if (rule.type === 'sum' || rule.type === 'sumTarget') {
          const inputs = rule.type === 'sumTarget' ? cells.slice(0, -1) : cells;
          const target = rule.type === 'sumTarget' ? cells.at(-1) : null;
          const lower = inputs.reduce((sum, i) => sum + minimum(domains[i]), 0);
          const upper = inputs.reduce((sum, i) => sum + maximum(domains[i]), 0);
          const targetMin = target === null ? rule.target : minimum(domains[target]);
          const targetMax = target === null ? rule.target : maximum(domains[target]);
          if (lower > targetMax || upper < targetMin) return false;
          for (const i of inputs) {
            let mask = 0;
            for (const n of bits(domains[i])) {
              if (lower - minimum(domains[i]) + n <= targetMax && upper - maximum(domains[i]) + n >= targetMin) mask |= 1 << n;
            }
            if (!narrow(i, mask)) return false;
          }
          if (target !== null) {
            let mask = 0;
            for (const n of bits(domains[target])) if (n >= lower && n <= upper) mask |= 1 << n;
            if (!narrow(target, mask)) return false;
          }
        } else throw new Error(`Unknown constraint: ${rule.type}`);
      }
    }
    return true;
  }
  function visit(domains) {
    if (++nodes > maxNodes) { exhausted = false; return; }
    if (!propagate(domains)) return;
    let chosen = -1, size = 10;
    for (let i = 0; i < domains.length; i++) {
      const n = count(domains[i]);
      if (n > 1 && n < size) { chosen = i; size = n; }
    }
    if (chosen === -1) {
      const solution = Object.fromEntries(ids.map((id, i) => [id, minimum(domains[i])]));
      if (!conflicts(model, solution).length) solutions.push(solution);
      return;
    }
    if (!allowSearch) return;
    const candidates = bits(domains[chosen]);
    if (random) for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const n of candidates) {
      const next = domains.slice();
      next[chosen] = 1 << n;
      visit(next);
      if (!exhausted || solutions.length >= limit) return;
    }
  }
  if (!conflicts(model, givens).length) {
    const domains = new Uint16Array(ids.length).fill(1022);
    for (const [id, n] of Object.entries(givens)) if (n) domains[indexes.get(id)] = 1 << n;
    visit(domains);
  }
  return { solutions, nodes, exhausted, unique: limit > 1 && exhausted && solutions.length === 1 };
}
