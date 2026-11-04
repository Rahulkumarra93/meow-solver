import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findSolutions, isValidSolution, resolveUnknownCells, solveWithReasons } from '../src/core/solve';
import { LEVEL_538, LEVEL_541, LEVEL_541_WITH_UNKNOWN, NO_SOLUTION, TWO_SOLUTIONS } from './grids';

const expected = (level: number): number[] =>
  JSON.parse(readFileSync(new URL(`./fixtures/level-${level}.json`, import.meta.url), 'utf8')).catColumnPerRow;

const names10 = ['red', 'purple', 'yellow', 'sky blue', 'pink', 'orange', 'teal', 'green', 'blue', 'light pink'];
const names8 = ['blue', 'brown', 'green', 'light blue', 'purple', 'yellow', 'red', 'pink'];

describe('findSolutions (R5)', () => {
  it('finds exactly one solution for level 538, matching the fixture', () => {
    expect(findSolutions(LEVEL_538, 2)).toEqual([expected(538)]);
  });
  it('finds exactly one solution for level 541, matching the fixture', () => {
    expect(findSolutions(LEVEL_541, 2)).toEqual([expected(541)]);
  });
  it('reports both answers of a two-solution board', () => {
    expect(findSolutions(TWO_SOLUTIONS, 5)).toHaveLength(2);
  });
  it('reports no answer for an impossible board', () => {
    expect(findSolutions(NO_SOLUTION, 2)).toHaveLength(0);
  });
});

describe('isValidSolution (the three rules)', () => {
  it('accepts the real answer', () => {
    expect(isValidSolution(LEVEL_538, expected(538))).toBe(true);
  });
  it('rejects two cats in one column', () => {
    const bad = [...expected(538)];
    bad[1] = bad[0]!;
    expect(isValidSolution(LEVEL_538, bad)).toBe(false);
  });
  it('rejects diagonally touching cats', () => {
    expect(isValidSolution(TWO_SOLUTIONS, [0, 1, 3, 2])).toBe(false);
  });
});

describe('resolveUnknownCells (R3)', () => {
  it('fills the cell hidden by the cat in level 541 with yellow', () => {
    expect(resolveUnknownCells(LEVEL_541_WITH_UNKNOWN)).toEqual(LEVEL_541);
  });
  it('leaves a fully known grid alone', () => {
    expect(resolveUnknownCells(LEVEL_538)).toEqual(LEVEL_538);
  });
  it('gives up when too many cells are hidden', () => {
    const grid = LEVEL_538.map((row) => [...row]);
    for (const [r, c] of [[0, 0], [3, 3], [6, 6], [9, 9]] as const) grid[r]![c] = -1;
    expect(resolveUnknownCells(grid)).toBeNull();
  });
});

describe('solveWithReasons (R5, R7)', () => {
  it.each([
    [538, LEVEL_538, names10],
    [541, LEVEL_541, names8],
  ])('solves level %i with one reason per cat', (level, grid, names) => {
    const cats = solveWithReasons(grid, names)!;
    expect(cats).not.toBeNull();
    expect(cats).toHaveLength(grid.length);
    const colPerRow = new Array<number>(grid.length);
    for (const cat of cats) {
      colPerRow[cat.row] = cat.col;
      expect(cat.reason.length).toBeGreaterThan(20);
      expect(cat.reason).toMatch(/[.]$/);
    }
    expect(colPerRow).toEqual(expected(level));
  });

  it('explains a single-cell region with the "only one cell" reason', () => {
    const cats = solveWithReasons(LEVEL_538, names10)!;
    const yellow = cats.find((c) => c.region === 2)!;
    expect(yellow.reason).toBe('Yellow has only one cell, so the cat must go here.');
    expect(cats[0]).toBe(yellow); // the most obvious cat comes first
  });

  it('refuses a board with two solutions', () => {
    expect(solveWithReasons(TWO_SOLUTIONS, ['a', 'b', 'c', 'd'])).toBeNull();
  });

  it('refuses an impossible board', () => {
    expect(solveWithReasons(NO_SOLUTION, ['a', 'b', 'c'])).toBeNull();
  });
});
