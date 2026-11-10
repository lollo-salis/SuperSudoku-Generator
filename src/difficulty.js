import { solve } from './engine.js';

export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);

/** An engine-relative technique rating, not an externally calibrated human score. */
export function rateDifficulty(model, givens) {
  const basic = solve(model, givens, { allowSearch: false, hiddenSingles: false });
  if (basic.solutions.length) return { level: 'easy', technique: 'singles-and-variant-rules' };
  const logical = solve(model, givens, { allowSearch: false });
  if (logical.solutions.length) return { level: 'medium', technique: 'hidden-singles' };
  return { level: 'hard', technique: 'beyond-supported-deductions' };
}
