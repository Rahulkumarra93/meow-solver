import { describe, expect, it } from 'vitest';
import { nameColours } from '../src/core/colours';
import { findBoard } from '../src/core/grid';
import { READ_ERROR, solveScreenshot } from '../src/core/pipeline';
import { readRegions } from '../src/core/regions';
import { UNKNOWN } from '../src/core/types';
import { LEVEL_538, LEVEL_541_WITH_UNKNOWN } from './grids';
import { crop, downscale, expectedAnswer, loadFixture, noiseImage, solidImage } from './helpers';

const level538 = loadFixture(538);
const level541 = loadFixture(541);

describe('findBoard (R2)', () => {
  it('detects a 10 x 10 board in level 538', () => {
    expect(findBoard(level538)?.size).toBe(10);
  });
  it('detects an 8 x 8 board in level 541', () => {
    expect(findBoard(level541)?.size).toBe(8);
  });
  it('still detects the board after the browser shrinks the screenshot', () => {
    expect(findBoard(downscale(level538, 0.5))?.size).toBe(10);
    expect(findBoard(downscale(level541, 0.5))?.size).toBe(8);
  });
});

describe('readRegions (R3)', () => {
  it('reads every cell of level 538', () => {
    const reading = readRegions(level538, findBoard(level538)!);
    expect(reading.regions).toEqual(LEVEL_538);
    expect(reading.palette).toHaveLength(10);
  });
  it('reads level 541 and marks only the cell under the cat as unknown', () => {
    const reading = readRegions(level541, findBoard(level541)!);
    expect(reading.unknownCount).toBe(1);
    expect(reading.regions[5]![3]).toBe(UNKNOWN);
    expect(reading.regions).toEqual(LEVEL_541_WITH_UNKNOWN);
  });
});

describe('nameColours (R7)', () => {
  it('gives the ten colours of level 538 distinct names', () => {
    const names = nameColours(readRegions(level538, findBoard(level538)!).palette);
    expect(new Set(names).size).toBe(10);
    expect(names[2]).toBe('yellow');
  });
});

describe('solveScreenshot (R2-R5, R8, R12)', () => {
  it.each([538, 541])('solves level %i to the checked answer in under 500 ms', (level) => {
    const px = loadFixture(level);
    const start = performance.now();
    const result = solveScreenshot(px);
    const ms = performance.now() - start;
    if (!result.ok) throw new Error(result.detail);
    const answer = expectedAnswer(level);
    expect(result.size).toBe(answer.size);
    const colPerRow = new Array<number>(result.size);
    for (const cat of result.cats) colPerRow[cat.row] = cat.col;
    expect(colPerRow).toEqual(answer.catColumnPerRow);
    expect(ms).toBeLessThan(500);
  });

  it('solves both levels after the browser shrinks the screenshot', () => {
    for (const level of [538, 541]) {
      const result = solveScreenshot(downscale(loadFixture(level), 0.55));
      expect(result.ok, result.ok ? '' : result.detail).toBe(true);
    }
  });

  it.each([
    ['a board cut in half', () => crop(level538, 0, 1300)],
    ['a blank image', () => solidImage(600, 1200, [247, 240, 235])],
    ['colourful noise', () => noiseImage(400, 800)],
    ['the top of the screen only', () => crop(level538, 0, 700)],
  ])('shows the R8 error for %s', (_name, make) => {
    const result = solveScreenshot(make());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(READ_ERROR);
  });

  it('uses the exact error wording from the spec', () => {
    expect(READ_ERROR).toBe("Couldn't read this board. Please upload a clear, uncropped screenshot of the level.");
  });
});

describe('nameColours on level 541', () => {
  it('names the 8 colours the way a player would', () => {
    const names = nameColours(readRegions(level541, findBoard(level541)!).palette);
    expect(names).toEqual(['blue', 'brown', 'green', 'pale blue', 'purple', 'yellow', 'red', 'pink']);
  });
});
