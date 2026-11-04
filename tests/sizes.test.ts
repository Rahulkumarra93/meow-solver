import { describe, expect, it } from 'vitest';
import { findBoard } from '../src/core/grid';
import { readRegions } from '../src/core/regions';
import { syntheticScreenshot } from './helpers';

// The game's own colours, sampled from the fixtures, plus a few more for big boards.
const COLOURS: Array<[number, number, number]> = [
  [213, 115, 116], [151, 120, 214], [228, 187, 73], [107, 188, 231], [235, 133, 183],
  [255, 170, 109], [72, 181, 178], [174, 217, 148], [91, 117, 178], [250, 180, 208],
  [173, 111, 72], [167, 191, 215], [120, 200, 90], [200, 90, 200],
];

/** Regions as horizontal stripes with a twist, so every row has two colours. */
const stripes = (n: number): number[][] =>
  Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (c < n / 2 ? r : (r + 1) % n)));

describe('board sizes other than the fixtures (R2)', () => {
  it.each([4, 5, 6, 7, 9, 11, 12, 14])('finds a %i x %i board and reads its colours', (n) => {
    const regions = stripes(n);
    const px = syntheticScreenshot(regions, COLOURS);
    const layout = findBoard(px);
    expect(layout?.size).toBe(n);
    const reading = readRegions(px, layout!);
    expect(reading.unknownCount).toBe(0);
    // Region ids are renumbered in reading order, so compare the partition, not the ids.
    const same = (a: number[][], b: number[][]): boolean =>
      a.flat().every((g, i) => a.flat().every((h, j) => (g === h) === (b.flat()[i] === b.flat()[j])));
    expect(same(reading.regions, regions)).toBe(true);
  });
});
