import { boardInfo, VARIANTS } from './layout.js';
import { translate, resolveLocale, variantInfo } from './i18n.js';
import { cellId } from './engine.js';
import { Game, serializeGame, deserializeGame } from './game.js';
import { enableTouchBoard, enableMobileButtons } from './touch-board.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const colours = {
  classic: '#d6b795', inequality: '#b9a7c7', addition: '#e3c87c', killer: '#a8b98c',
  consecutive: '#90b9ab', diagonal: '#9caec9', irregular: '#b0c3a3', offset: '#c2a489',
};
const offsetColours = ['#f1e6a5', '#d2d8dc', '#efd3a7', '#e4c9dd', '#cae3ca', '#d7c4ac', '#c8dbb4', '#f7f5ed', '#c9c4e2'];
const labelPositions = [[22, 1], [-2, 7], [28, 7], [-8, 15], [34, 15], [-2, 24], [28, 24], [22, 30]];
const mobileQuery = matchMedia('(max-width: 740px), (max-width: 1000px) and (pointer: coarse)');
let locale = 'it', game, selected, activeBoard, pencil = false, view = mobileQuery.matches ? 'focus' : 'overview';
let zoom = 1, elapsed = 0, errorMode = 'solution', solutionVisible = false, worker, workerTimeout, lastTick = Date.now(), saveProblem = false;
let dialogContent, keypadOpen = false, revealFrame;
try {
  const settings = JSON.parse(localStorage.getItem('supersudoku.settings') || '{}');
  locale = resolveLocale(settings.locale);
  if (['solution', 'rules', 'off'].includes(settings.errorMode)) errorMode = settings.errorMode;
} catch { /* The game remains playable when storage is unavailable. */ }
const t = key => translate(key, locale);

function updateKeypad() {
  const open = mobileQuery.matches && keypadOpen && game && selected && !game.puzzle.givens[selected] && !solutionVisible;
  document.body.classList.toggle('mobile-keypad-open', Boolean(open));
  $('entry-panel').setAttribute('aria-label', t('numericKeypad'));
  if (open) {
    const board = game.puzzle.boards.find(b => b.id === activeBoard), cell = game.model.cells.get(selected);
    $('keypad-cell').textContent = `${boardInfo(board, locale).name} · ${t('row')} ${cell.y - board.y + 1}, ${t('column')} ${cell.x - board.x + 1}`;
  }
  document.documentElement.style.setProperty('--keypad-height', open ? `${$('entry-panel').offsetHeight}px` : '0px');
}
function closeKeypad() { keypadOpen = false; updateKeypad(); }
function revealCell() {
  cancelAnimationFrame(revealFrame);
  revealFrame = requestAnimationFrame(() => {
    if (!mobileQuery.matches || !keypadOpen || !selected) return;
    const element = $('board-mount').querySelector(`[data-cell="${selected}"]`);
    if (!element) return;
    const viewport = $('board-viewport'), area = viewport.getBoundingClientRect();
    const top = Math.max(8, area.top + 4), bottom = Math.min(area.bottom - 4, $('entry-panel').getBoundingClientRect().top - 8);
    let bounds = element.getBoundingClientRect();
    if (bounds.bottom > bottom) viewport.scrollTop += bounds.bottom - bottom;
    else if (bounds.top < top) viewport.scrollTop -= top - bounds.top;
    bounds = element.getBoundingClientRect();
    if (bounds.bottom > bottom) window.scrollBy(0, bounds.bottom - bottom);
    else if (bounds.top < 8) window.scrollBy(0, bounds.top - 8);
  });
}
const touchBoard = enableTouchBoard($('board-viewport'), {
  enabled: () => mobileQuery.matches && Boolean(game),
  getZoom: () => zoom,
  setZoom: scale => {
    zoom = scale;
    $('board-mount').style.width = `${zoom * 100}%`;
    $('zoom-fit').textContent = `${Math.round(zoom * 100)}%`;
  },
  onTap: target => {
    const cell = target?.closest('[data-cell]'), rules = target?.closest('[data-rules]'), board = target?.closest('[data-board]');
    if (cell) chooseCell(cell.dataset.cell);
    else if (rules) showRules(rules.dataset.rules);
    else if (board) focusBoard(board.dataset.board);
  },
});
enableMobileButtons(() => mobileQuery.matches);
new ResizeObserver(updateKeypad).observe($('entry-panel'));
mobileQuery.addEventListener('change', () => {
  touchBoard.reset(); closeKeypad(); zoom = 1;
  if (mobileQuery.matches) view = 'focus';
  if (game) render();
});
window.addEventListener('resize', () => { updateKeypad(); revealCell(); });

function svgNode(tag, attrs = {}, text) {
  const element = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  if (text !== undefined) element.textContent = text;
  return element;
}
function line(parent, x1, y1, x2, y2, attrs = {}) {
  parent.append(svgNode('line', { x1, y1, x2, y2, stroke: '#526053', 'stroke-width': .06, ...attrs }));
}
function persistSettings() {
  try { localStorage.setItem('supersudoku.settings', JSON.stringify({ locale, errorMode })); } catch { /* Optional preference storage. */ }
}
function save() {
  if (!game) return;
  try {
    localStorage.setItem('supersudoku.game', serializeGame(game, elapsed));
    saveProblem = false;
    $('save-status').textContent = t('saved');
  } catch { saveProblem = true; $('save-status').textContent = t('saveFailed'); }
}
function localize() {
  document.documentElement.lang = locale;
  document.title = t('appName');
  $('language').value = locale;
  $('error-mode').value = errorMode;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-title]')) {
    element.title = t(element.dataset.title); element.setAttribute('aria-label', t(element.dataset.title));
  }
  for (const element of document.querySelectorAll('[data-placeholder]')) element.placeholder = t(element.dataset.placeholder);
  for (const element of document.querySelectorAll('[data-variant-name]')) element.textContent = variantInfo(element.dataset.variantName, locale).name;
  updateRecipe(); updateDifficulty();
  if (dialogContent) fillTextDialog();
  if (game) render();
}

function renderBoard() {
  const board = game.puzzle.boards.find(b => b.id === activeBoard) ?? game.puzzle.boards[0];
  const values = solutionVisible ? game.puzzle.solution : game.values;
  const errors = solutionVisible ? new Set() : game.errors(errorMode);
  const svg = svgNode('svg', {
    viewBox: view === 'overview' ? '-8.5 -1.2 50 35.8' : `${board.x - .35} ${board.y - .35} 9.7 9.7`,
    role: 'group', 'aria-label': view === 'overview' ? t('overview') : boardInfo(board, locale).name,
  });
  const tint = svgNode('g');
  const overlay = svgNode('g', { 'pointer-events': 'none' });
  const digits = svgNode('g');
  const byId = new Map(game.puzzle.boards.map(b => [b.id, b]));
  const activeCells = new Set([...game.model.cells.values()].filter(c => c.boards.includes(activeBoard)).map(c => c.id));
  const selectedValue = selected && values[selected];
  const selectedCell = game.model.cells.get(selected);
  for (const cell of game.model.cells.values()) {
    const { id, x, y, boards } = cell;
    const owner = byId.get(boards.includes(activeBoard) ? activeBoard : boards[0]);
    const group = svgNode('g', { class: 'sudoku-cell', 'data-cell': id, role: 'button', tabindex: id === selected ? 0 : -1 });
    let fill = colours[owner.variant], opacity = boards.length > 1 ? .27 : .12;
    const offset = boards.map(id => byId.get(id)).find(b => b.variant === 'offset');
    if (offset) { fill = offsetColours[(y - offset.y) % 3 * 3 + (x - offset.x) % 3]; opacity = 1; }
    group.append(svgNode('rect', { x, y, width: 1, height: 1, fill, 'fill-opacity': opacity }));
    if (activeCells.has(id) && selectedCell && (x === selectedCell.x || y === selectedCell.y)) {
      group.append(svgNode('rect', { x, y, width: 1, height: 1, fill: '#456a51', opacity: .065 }));
    }
    if (selectedValue && selectedValue === values[id]) group.append(svgNode('rect', { x, y, width: 1, height: 1, fill: '#c9ab65', opacity: .24 }));
    if (errors.has(id)) group.append(svgNode('rect', { x, y, width: 1, height: 1, fill: '#cf4f48', opacity: .18 }));
    if (id === selected) group.append(svgNode('rect', { x: x + .035, y: y + .035, width: .93, height: .93, fill: '#2e6d5e', 'fill-opacity': .17, stroke: '#2d6654', 'stroke-width': .07 }));
    group.append(svgNode('rect', { x, y, width: 1, height: 1, class: 'cell-outline' }));
    const info = boards.map(id => boardInfo(byId.get(id), locale).name).join(' / ');
    const label = `${info}; ${t('row')} ${y - owner.y + 1}, ${t('column')} ${x - owner.x + 1}; ${values[id] || t('empty')}${game.puzzle.givens[id] ? `; ${t('given')}` : ''}${boards.length > 1 ? `; ${t('sharedCell')}` : ''}`;
    group.setAttribute('aria-label', label);
    group.setAttribute('aria-pressed', String(id === selected));
    group.append(svgNode('title', {}, label));
    tint.append(group);
    if (values[id]) digits.append(svgNode('text', {
      x: x + .5, y: y + .69, 'text-anchor': 'middle',
      class: `cell-digit${game.puzzle.givens[id] || solutionVisible ? '' : ' entered'}${errors.has(id) ? ' invalid' : ''}`,
    }, String(values[id])));
    else if (!solutionVisible) for (const n of game.notes[id] ?? []) digits.append(svgNode('text', {
      x: x + .18 + (n - 1) % 3 * .31, y: y + .29 + Math.floor((n - 1) / 3) * .29,
      'text-anchor': 'middle', class: 'cell-note',
    }, String(n)));
  }
  svg.append(tint);
  for (const b of game.puzzle.boards) {
    // Focus isolates clue markings when repeated variants overlap.
    // Shared values are still validated against every board by the game model.
    if (view === 'focus' && b.id !== activeBoard) continue;
    const at = ([r, c]) => [b.x + c, b.y + r];
    if (b.variant === 'diagonal') {
      line(overlay, b.x, b.y, b.x + 9, b.y + 9, { stroke: '#b65a54', 'stroke-width': .035, opacity: .65 });
      line(overlay, b.x + 9, b.y, b.x, b.y + 9, { stroke: '#b65a54', 'stroke-width': .035, opacity: .65 });
    }
    if (b.variant === 'irregular') {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (c < 8 && b.regions[r * 9 + c] !== b.regions[r * 9 + c + 1]) line(overlay, b.x + c + 1, b.y + r, b.x + c + 1, b.y + r + 1);
        if (r < 8 && b.regions[r * 9 + c] !== b.regions[(r + 1) * 9 + c]) line(overlay, b.x + c, b.y + r + 1, b.x + c + 1, b.y + r + 1);
      }
    } else for (const i of [3, 6]) {
      line(overlay, b.x + i, b.y, b.x + i, b.y + 9);
      line(overlay, b.x, b.y + i, b.x + 9, b.y + i);
    }
    for (const cage of b.cages ?? []) {
      const cells = new Set(cage.cells.map(pos => pos.join(',')));
      for (const [r, c] of cage.cells) {
        const x = b.x + c, y = b.y + r;
        const attrs = { stroke: '#798951', 'stroke-width': .025, 'stroke-dasharray': '.08 .055' };
        if (!cells.has([r - 1, c].join(','))) line(overlay, x + .09, y + .09, x + .91, y + .09, attrs);
        if (!cells.has([r + 1, c].join(','))) line(overlay, x + .09, y + .91, x + .91, y + .91, attrs);
        if (!cells.has([r, c - 1].join(','))) line(overlay, x + .09, y + .09, x + .09, y + .91, attrs);
        if (!cells.has([r, c + 1].join(','))) line(overlay, x + .91, y + .09, x + .91, y + .91, attrs);
      }
      const first = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
      const [x, y] = at(first);
      overlay.append(svgNode('rect', { x: x + .06, y: y + .025, width: .4, height: .25, fill: '#f3f3e6' }));
      overlay.append(svgNode('text', { x: x + .1, y: y + .23, 'font-size': .23, fill: '#58623b', 'font-family': 'Arial', class: 'cage-total' }, String(cage.target)));
    }
    for (const [index, group] of (b.additions ?? []).entries()) {
      for (const pos of [...group.cells, group.target]) {
        const [x, y] = at(pos), target = pos === group.target;
        overlay.append(svgNode('rect', { x: x + .04, y: y + .04, width: .92, height: .92, rx: .08, fill: target ? '#dd9662' : '#7e9bcd', opacity: .46 }));
        overlay.append(svgNode('text', { x: x + .1, y: y + .24, 'font-size': .19, fill: '#41494b', 'font-family': 'Arial' }, String.fromCharCode(65 + index)));
      }
    }
    for (const clue of b.inequalities ?? []) {
      const [sx, sy] = at(clue.smaller), [lx, ly] = at(clue.larger);
      const x = (sx + lx) / 2 + .5, y = (sy + ly) / 2 + .5;
      overlay.append(svgNode('circle', { cx: x, cy: y, r: .2, fill: '#f5edf8' }));
      overlay.append(svgNode('text', { x, y: y + .13, 'text-anchor': 'middle', 'font-family': 'Arial', 'font-size': .43, fill: '#735780', transform: `rotate(${sy === ly ? 0 : 90} ${x} ${y})` }, sx < lx || sy < ly ? '<' : '>'));
    }
    for (const pair of b.bridges ?? []) {
      const [ax, ay] = at(pair[0]), [bx, by] = at(pair[1]);
      const x = (ax + bx) / 2 + .5, y = (ay + by) / 2 + .5;
      overlay.append(svgNode('rect', { x: x - (ay === by ? .21 : .09), y: y - (ay === by ? .09 : .21), width: ay === by ? .42 : .18, height: ay === by ? .18 : .42, rx: .025, fill: '#ac4d80' }));
    }
    overlay.append(svgNode('rect', { x: b.x, y: b.y, width: 9, height: 9, fill: 'none', stroke: '#3c5143', 'stroke-width': activeBoard === b.id ? .09 : .065 }));
  }
  svg.append(overlay, digits);
  if (view === 'overview') {
    svg.append(svgNode('text', { x: 16.5, y: 16.9, 'text-anchor': 'middle', 'font-family': 'Georgia', 'font-size': 1.1, fill: '#b0b7a8', 'pointer-events': 'none' }, '×8'));
    game.puzzle.boards.forEach((b, i) => {
      const [x, y] = labelPositions[i], info = boardInfo(b, locale);
      const label = svgNode('g', { class: 'board-label', transform: `translate(${x} ${y})` });
      label.append(svgNode('rect', { x: 0, y: 0, width: 7.5, height: 1.8, rx: .15, fill: '#fffef9' }));
      const nameButton = svgNode('g', { role: 'button', tabindex: 0, 'data-board': b.id, 'aria-label': `${t('focus')}: ${info.name}` });
      nameButton.append(svgNode('rect', { x: 0, y: 0, width: 7.5, height: .8, fill: 'transparent' }));
      nameButton.append(svgNode('rect', { x: 0, y: .16, width: .12, height: .48, rx: .03, fill: colours[b.variant] }));
      nameButton.append(svgNode('text', { x: .36, y: .51 }, info.name));
      const rulesButton = svgNode('g', { role: 'button', tabindex: 0, 'data-rules': b.id, 'aria-label': `${t('rules')}: ${info.name}` });
      rulesButton.append(svgNode('rect', { x: 0, y: .8, width: 7.5, height: .8, fill: 'transparent' }));
      rulesButton.append(svgNode('text', { x: .36, y: 1.25, class: 'label-rule' }, `${t('rules')} ↗`));
      label.append(nameButton, rulesButton); svg.append(label);
    });
  }
  $('board-mount').replaceChildren(svg);
  $('board-mount').style.width = `${zoom * 100}%`;
  $('zoom-fit').textContent = `${Math.round(zoom * 100)}%`;
  $('overview').classList.toggle('active', view === 'overview');
  $('focus').classList.toggle('active', view === 'focus');
  $('overview').setAttribute('aria-pressed', String(view === 'overview'));
  $('focus').setAttribute('aria-pressed', String(view === 'focus'));
  $('focus-heading').hidden = view !== 'focus';
  $('focus-name').textContent = boardInfo(board, locale).name;
}

function renderList() {
  $('board-list').replaceChildren();
  for (const board of game.puzzle.boards) {
    const info = boardInfo(board, locale), row = document.createElement('div');
    row.className = `board-row${board.id === activeBoard ? ' active' : ''}`;
    const dot = document.createElement('span'); dot.className = 'board-dot'; dot.style.background = colours[board.variant];
    const name = document.createElement('button'); name.textContent = info.name; name.dataset.board = board.id;
    name.title = t('focus'); name.setAttribute('aria-pressed', String(board.id === activeBoard));
    const rules = document.createElement('button'); rules.textContent = t('rules'); rules.dataset.rules = board.id; rules.className = 'rules-button';
    rules.setAttribute('aria-label', `${t('rules')}: ${info.name}`);
    row.append(dot, name, rules); $('board-list').append(row);
  }
}

function render() {
  renderBoard(); renderList();
  const count = Object.keys(game.values).length, percent = Math.round(count / 576 * 100);
  $('progress-value').textContent = `${percent}%`;
  $('progress-bar').style.width = `${percent}%`;
  $('progress-caption').textContent = `${count} / 576 ${t('filled')}`;
  $('game-code').textContent = game.puzzle.seed;
  $('game-difficulty').textContent = `${t('difficulty')}: ${t(game.puzzle.difficulty ?? 'unrated')}`;
  $('undo').disabled = !game.history.length || solutionVisible;
  $('redo').disabled = !game.future.length || solutionVisible;
  $('notes').setAttribute('aria-pressed', String(pencil));
  $('notes').disabled = solutionVisible;
  $('erase').disabled = solutionVisible;
  $('show-solution').textContent = t(solutionVisible ? 'hideSolution' : 'showSolution');
  const errors = game.errors(errorMode), selectedError = errors.has(selected);
  $('feedback').textContent = t(solutionVisible ? 'solutionShown' : game.completed ? 'completed' : selectedError ? errorMode === 'solution' ? 'wrongNumber' : 'ruleConflict' : selected ? 'cellHint' : 'selectCell');
  $('feedback').className = `feedback${selectedError && !solutionVisible ? ' error' : ''}${game.completed ? ' success' : ''}`;
  $('save-status').textContent = t(saveProblem ? 'saveFailed' : 'localNote');
  for (const button of $('number-pad').children) button.disabled = solutionVisible || !selected || Boolean(game.puzzle.givens[selected]);
  updateKeypad();
}

function chooseCell(id, keyboard = false) {
  if (!game?.model.cells.has(id)) return;
  selected = id;
  const cell = game.model.cells.get(id);
  if (!cell.boards.includes(activeBoard)) activeBoard = cell.boards[0];
  if (mobileQuery.matches) keypadOpen = !game.puzzle.givens[id] && !solutionVisible;
  render();
  revealCell();
  if (keyboard) $('board-mount').querySelector(`[data-cell="${id}"]`)?.focus({ preventScroll: true });
}
function focusBoard(id) {
  if (!game.puzzle.boards.some(b => b.id === id)) return;
  activeBoard = id; view = 'focus'; zoom = 1;
  closeKeypad();
  const board = game.puzzle.boards.find(b => b.id === id);
  if (!game.model.cells.get(selected)?.boards.includes(id)) selected = cellId(board.x, board.y);
  render(); $('board-viewport').scrollTo(0, 0);
}
function enter(digit) {
  if (!game || !selected || solutionVisible) return;
  if (game.enter(selected, digit, pencil && digit !== 0)) { save(); render(); }
}
function fillTextDialog() {
  const info = dialogContent === 'help' ? { name: t('help'), rules: t('helpText') } : boardInfo(game.puzzle.boards.find(b => b.id === dialogContent), locale);
  $('dialog-title').textContent = info.name; $('dialog-body').textContent = info.rules;
}
function showRules(id) { closeKeypad(); dialogContent = id; fillTextDialog(); $('text-dialog').showModal(); }

document.addEventListener('click', event => {
  if (event.detail !== 0 && $('board-viewport').contains(event.target) && touchBoard.suppressClick()) {
    event.preventDefault(); return;
  }
  if (mobileQuery.matches && keypadOpen && !$('entry-panel').contains(event.target) && !$('board-viewport').contains(event.target)) closeKeypad();
  const cell = event.target.closest('[data-cell]'), rules = event.target.closest('[data-rules]'), board = event.target.closest('[data-board]');
  if (cell) chooseCell(cell.dataset.cell);
  else if (rules) showRules(rules.dataset.rules);
  else if (board) focusBoard(board.dataset.board);
});
document.addEventListener('keydown', event => {
  if (event.target.matches('input, select, textarea') || $('text-dialog').open || $('new-dialog').open) return;
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-board], [data-rules]')) {
    event.preventDefault(); event.target.closest('[data-board], [data-rules]').dispatchEvent(new MouseEvent('click', { bubbles: true })); return;
  }
  if (!game) return;
  if (event.key === 'Escape' && mobileQuery.matches) { closeKeypad(); return; }
  if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); enter(Number(event.key)); }
  else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); enter(0); }
  else if (event.key.toLowerCase() === 'n') { pencil = !pencil; render(); }
  else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); if (!solutionVisible) { event.shiftKey ? game.redo() : game.undo(); save(); render(); }
  } else if (event.key.startsWith('Arrow') && selected) {
    event.preventDefault();
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    let { x, y } = game.model.cells.get(selected);
    for (let i = 0; i < 33; i++) {
      x += delta[0]; y += delta[1];
      if (x < 0 || x > 32 || y < 0 || y > 32) break;
      if (game.model.cells.has(cellId(x, y))) { chooseCell(cellId(x, y), true); break; }
    }
  }
});
for (let n = 1; n <= 9; n++) {
  const button = document.createElement('button'); button.textContent = n; button.addEventListener('click', () => enter(n)); $('number-pad').append(button);
}
const mobileErase = document.createElement('button');
mobileErase.id = 'mobile-erase'; mobileErase.className = 'mobile-only'; mobileErase.dataset.title = 'erase'; mobileErase.textContent = '⌫';
mobileErase.addEventListener('click', () => enter(0)); $('number-pad').append(mobileErase);
$('keypad-close').onclick = closeKeypad;
$('mobile-reset').onclick = () => { zoom = 1; touchBoard.reset(); renderBoard(); $('board-viewport').scrollTo(0, 0); };
$('notes').onclick = () => { pencil = !pencil; render(); };
$('erase').onclick = () => enter(0);
$('undo').onclick = () => { game.undo(); save(); render(); };
$('redo').onclick = () => { game.redo(); save(); render(); };
$('language').onchange = event => { locale = resolveLocale(event.target.value); persistSettings(); localize(); };
$('error-mode').onchange = event => { errorMode = event.target.value; persistSettings(); render(); };
$('overview').onclick = () => { closeKeypad(); view = 'overview'; zoom = 1; render(); $('board-viewport').scrollTo(0, 0); };
$('focus').onclick = () => focusBoard(activeBoard);
$('focus-rules').onclick = () => showRules(activeBoard);
$('zoom-in').onclick = () => { zoom = Math.min(4, zoom + .25); renderBoard(); };
$('zoom-out').onclick = () => { zoom = Math.max(1, zoom - .25); renderBoard(); };
$('zoom-fit').onclick = () => { zoom = 1; renderBoard(); $('board-viewport').scrollTo(0, 0); };
$('help-button').onclick = () => showRules('help');
$('text-close').onclick = $('dialog-done').onclick = () => $('text-dialog').close();
$('text-dialog').addEventListener('close', () => { dialogContent = undefined; });
$('restart').onclick = () => {
  if (!confirm(t('restartConfirm'))) return;
  game = new Game(game.puzzle); elapsed = 0; solutionVisible = false; save(); render();
};
$('show-solution').onclick = () => {
  if (!solutionVisible && !confirm(t('showSolutionConfirm'))) return;
  solutionVisible = !solutionVisible; render();
};
let printView;
window.addEventListener('beforeprint', () => { printView = view; view = 'overview'; renderBoard(); });
window.addEventListener('afterprint', () => { if (printView) { view = printView; printView = undefined; renderBoard(); } });
$('print').onclick = () => window.print();
$('new-game').onclick = () => { closeKeypad(); $('new-dialog').showModal(); };
function recipeVariants() {
  return [...$('recipe-inputs').querySelectorAll('input')].flatMap(input =>
    Array.from({ length: Math.max(0, Math.min(8, Number(input.value) || 0)) }, () => input.dataset.variant));
}
function updateRecipe() {
  const inputs = [...$('recipe-inputs').querySelectorAll('input')];
  const total = inputs.reduce((sum, input) => sum + (Number(input.value) || 0), 0);
  const valid = total === 8 && inputs.every(input => input.value !== '' && Number.isInteger(Number(input.value)) && Number(input.value) >= 0 && Number(input.value) <= 8);
  $('recipe-total').textContent = `${t('recipeTotal')}: ${total} / 8`;
  $('recipe-error').hidden = valid;
  $('generate-button').disabled = !valid || Boolean(worker);
  return valid;
}
function updateDifficulty() { $('difficulty-description').textContent = t(`${$('difficulty').value}Description`); }
for (const variant of Object.keys(VARIANTS)) {
  const label = document.createElement('label');
  const name = document.createElement('span'); name.dataset.variantName = variant;
  const input = document.createElement('input'); input.type = 'number'; input.min = 0; input.max = 8; input.step = 1; input.value = 1; input.dataset.variant = variant;
  input.addEventListener('input', updateRecipe);
  label.append(name, input); $('recipe-inputs').append(label);
}
$('difficulty').onchange = updateDifficulty;
$('one-each').onclick = () => { for (const input of $('recipe-inputs').querySelectorAll('input')) input.value = 1; updateRecipe(); };
$('all-classic').onclick = () => { for (const input of $('recipe-inputs').querySelectorAll('input')) input.value = input.dataset.variant === 'classic' ? 8 : 0; updateRecipe(); };
function stopGeneration() {
  worker?.terminate(); worker = undefined; clearTimeout(workerTimeout);
  $('generation-status').hidden = true; $('generate-button').disabled = false;
  $('seed').disabled = $('difficulty').disabled = $('recipe-fieldset').disabled = false;
  updateRecipe();
}
$('new-close').onclick = $('cancel-generation').onclick = () => { stopGeneration(); $('new-dialog').close(); };
$('new-dialog').addEventListener('cancel', stopGeneration);
$('generate-form').onsubmit = event => {
  event.preventDefault();
  if (worker || !updateRecipe()) return;
  $('generation-status').hidden = false;
  $('generation-message').textContent = t('constructing');
  $('generation-progress').removeAttribute('value');
  $('generate-button').disabled = true; $('seed').disabled = $('difficulty').disabled = $('recipe-fieldset').disabled = true;
  const fail = (kind) => { stopGeneration(); $('generation-status').hidden = false; $('generation-message').textContent = t(kind === 'difficulty' ? 'difficultyUnavailable' : 'generationFailed'); $('generation-status').querySelector('.spinner').hidden = true; };
  $('generation-status').querySelector('.spinner').hidden = false;
  try {
    worker = new Worker(new URL('./generator-worker.js', import.meta.url), { type: 'module' });
    workerTimeout = setTimeout(fail, 45000);
    worker.onmessage = ({ data }) => {
      if (data.progress) {
        const p = data.progress;
        $('generation-message').textContent = t(p.stage === 'solution' ? 'constructing' : 'checking');
        if (p.stage === 'clues') $('generation-progress').value = p.current / p.total * 100;
      } else if (data.puzzle) {
        try {
          const next = new Game(data.puzzle);
          stopGeneration(); game = next; elapsed = 0; selected = undefined; pencil = false; solutionVisible = false;
          activeBoard = game.puzzle.boards[0].id; save(); render(); $('new-dialog').close();
        } catch { fail(); }
      } else fail(data.error);
    };
    worker.onerror = fail;
    worker.postMessage({ seed: $('seed').value.trim() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, difficulty: $('difficulty').value, variants: recipeVariants() });
  } catch { fail(); }
};

setInterval(() => {
  const now = Date.now();
  if (game && !game.completed && !document.hidden && !solutionVisible && !$('new-dialog').open && !$('text-dialog').open) elapsed += Math.min((now - lastTick) / 1000, 2);
  lastTick = now;
  const seconds = Math.floor(elapsed);
  $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').setAttribute('aria-label', t('timer'));
}, 1000);
setInterval(() => { if (game && !document.hidden) save(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); lastTick = Date.now(); });
window.addEventListener('pagehide', save);
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install-button').hidden = false; });
$('install-button').onclick = async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = undefined; $('install-button').hidden = true; } };

async function boot() {
  localize();
  let loadFailed = false;
  try {
    const saved = localStorage.getItem('supersudoku.game');
    if (saved) ({ game, elapsed } = deserializeGame(saved));
  } catch { loadFailed = true; }
  if (!game) {
    const response = await fetch(new URL('../data/starter.json', import.meta.url));
    if (!response.ok) throw new Error('Starter unavailable');
    game = new Game(await response.json());
  }
  activeBoard = game.puzzle.boards[0].id;
  $('new-game').disabled = false;
  render();
  if (loadFailed) $('save-status').textContent = t('loadFailed');
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
boot().catch(() => { $('board-mount').textContent = t('startupFailed'); });
