/** Constraint model: shared cells have one global coordinate and one value. */
export const cellId = (x, y) => `${x},${y}`;

export const LAYOUT = Object.freeze([
  { id: 'classic', x: 12, y: 0, variant: 'classic' },
  { id: 'inequality', x: 6, y: 6, variant: 'inequality' },
  { id: 'addition', x: 18, y: 6, variant: 'addition' },
  { id: 'killer', x: 0, y: 12, variant: 'killer' },
  { id: 'consecutive', x: 24, y: 12, variant: 'consecutive' },
  { id: 'diagonal', x: 6, y: 18, variant: 'diagonal' },
  { id: 'irregular', x: 18, y: 18, variant: 'irregular' },
  { id: 'offset', x: 12, y: 24, variant: 'offset' },
]);

export function createModel(boards) {
  const cells = new Map();
  const constraints = [];
  const add = (type, ids, extra = {}) => {
    if (!ids.length || ids.some(id => !cells.has(id))) throw new Error('Unknown constraint cell');
    constraints.push({ type, cells: ids, ...extra });
  };
  for (const board of boards) {
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
export function solve(model, givens = {}, { limit = 2, maxNodes = 1_000_000 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(maxNodes) || maxNodes < 1) {
    throw new Error('Positive integer search limits required');
  }
  const values = { ...givens };
  const solutions = [];
  let nodes = 0;
  let exhausted = true;
  const byCell = new Map([...model.cells.keys()].map(id => [id, []]));
  for (const rule of model.constraints) for (const id of rule.cells) byCell.get(id).push(rule);
  function visit() {
    if (++nodes > maxNodes) { exhausted = false; return; }
    let chosen;
    let candidates;
    for (const id of model.cells.keys()) {
      if (values[id]) continue;
      const options = [];
      for (let n = 1; n <= 9; n++) {
        values[id] = n;
        if (byCell.get(id).every(rule => satisfied(rule, values))) options.push(n);
      }
      delete values[id];
      if (!options.length) return;
      if (!candidates || options.length < candidates.length) { chosen = id; candidates = options; }
      if (options.length === 1) break;
    }
    if (!chosen) { solutions.push({ ...values }); return; }
    for (const n of candidates) {
      values[chosen] = n;
      visit();
      delete values[chosen];
      if (!exhausted || solutions.length >= limit) return;
    }
  }
  if (!conflicts(model, values).length) visit();
  return { solutions, nodes, exhausted, unique: limit > 1 && exhausted && solutions.length === 1 };
}
