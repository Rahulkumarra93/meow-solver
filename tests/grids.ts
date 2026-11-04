import type { RegionGrid } from '../src/core/types';

const parse = (rows: string[]): RegionGrid => rows.map((r) => r.split(' ').map((x) => (x === '?' ? -1 : parseInt(x, 16))));

/** Level 538, read by hand from tests/fixtures/level-538.png. Region ids are in reading order. */
export const LEVEL_538 = parse([
  '0 0 1 1 1 1 1 1 1 1',
  '0 0 2 3 3 3 3 1 1 1',
  '0 0 0 3 3 3 3 1 4 1',
  '5 5 5 3 3 4 1 1 4 4',
  '5 5 5 3 3 4 4 4 4 4',
  '6 5 5 5 4 4 4 4 7 7',
  '6 6 5 5 4 4 4 7 7 7',
  '6 6 6 8 8 8 8 7 7 7',
  '6 9 9 8 8 8 7 7 7 7',
  '9 9 9 9 9 8 8 7 7 7',
]);

/** Level 541 with the cell under the placed cat (row 6, col 4) unknown. */
export const LEVEL_541_WITH_UNKNOWN = parse([
  '0 0 0 0 0 1 1 2',
  '0 0 0 0 0 1 1 2',
  '0 0 0 0 3 3 4 4',
  '0 0 0 0 3 3 4 4',
  '0 0 5 5 6 6 6 6',
  '7 7 5 ? 6 6 6 6',
  '7 7 6 6 6 6 6 6',
  '6 6 6 6 6 6 6 6',
]);

/** Level 541 with the hidden cell filled in (it is yellow, region 5). */
export const LEVEL_541 = LEVEL_541_WITH_UNKNOWN.map((row, r) => row.map((g, c) => (r === 5 && c === 3 ? 5 : g)));

/** Regions are the columns: two answers (2-4-1-3 and 3-1-4-2), so it must be rejected. */
export const TWO_SOLUTIONS = parse(['0 1 2 3', '0 1 2 3', '0 1 2 3', '0 1 2 3']);

/** 3 x 3 boards can never be solved: some two cats always touch. */
export const NO_SOLUTION = parse(['0 1 2', '0 1 2', '0 1 2']);
