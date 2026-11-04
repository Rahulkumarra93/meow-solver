// Cases from the independent review of v1 (each one made the app show the error wrongly).
import { describe, expect, it } from 'vitest';
import { baseColourName, nameColours } from '../src/core/colours';
import { findBoard } from '../src/core/grid';
import { solveScreenshot } from '../src/core/pipeline';
import { expectedAnswer, loadFixture, paintStrip, pasteScaled } from './helpers';

const level538 = loadFixture(538);
const level541 = loadFixture(541);

const answerOf = (result: ReturnType<typeof solveScreenshot>): number[] => {
  if (!result.ok) throw new Error(result.detail);
  const cols = new Array<number>(result.size);
  for (const cat of result.cats) cols[cat.row] = cat.col;
  return cols;
};

describe('a cat placed on a single-cell colour (review finding 1, R3)', () => {
  // Take the real cat (and its cell) from level 541, row 6 col 4, and put it on level 538's
  // only yellow cell, row 2 col 3: the most obvious first move a player makes.
  const l541 = findBoard(level541)!;
  const l538 = findBoard(level538)!;
  const box = (layout: typeof l538, r: number, c: number) => ({
    x: layout.cols[c]!.start,
    y: layout.rows[r]!.start,
    w: layout.cols[c]!.end - layout.cols[c]!.start,
    h: layout.rows[r]!.end - layout.rows[r]!.start,
  });
  const withCat = pasteScaled(level541, box(l541, 5, 3), level538, box(l538, 1, 2));

  it('still solves the level', () => {
    expect(answerOf(solveScreenshot(withCat))).toEqual(expectedAnswer(538).catColumnPerRow);
  });
  it('recovers the hidden colour as yellow for the drawing', () => {
    const result = solveScreenshot(withCat);
    if (!result.ok) throw new Error(result.detail);
    expect(result.names[result.regions[1]![2]!]).toBe('yellow');
  });
});

describe('other coloured strips on the screen (review finding 2, R2)', () => {
  it.each([
    ['a tall ad banner below the board', 2000, 200],
    ['a cell-height bar below the board', 2000, 90],
    ['a bar above the board', 700, 90],
  ])('solves level 538 with %s', (_name, top, height) => {
    const px = paintStrip(level538, top, height, [40, 120, 220]);
    expect(answerOf(solveScreenshot(px))).toEqual(expectedAnswer(538).catColumnPerRow);
  });
});

describe('colour names (review finding 5, R7)', () => {
  it('never gives two colours the same name', () => {
    const palettes: Array<Array<[number, number, number]>> = [
      [[60, 90, 220], [120, 150, 240], [200, 220, 235]],
      [[235, 133, 183], [250, 180, 208], [240, 160, 195]],
      [[213, 115, 116], [214, 117, 160], [250, 200, 200], [180, 60, 60]],
    ];
    for (const p of palettes) {
      const names = nameColours(p);
      expect(new Set(names).size, names.join(' | ')).toBe(p.length);
    }
  });
  it('names the game colours plainly', () => {
    expect(baseColourName([228, 187, 73])).toBe('yellow');
    expect(baseColourName([173, 111, 72])).toBe('brown');
    expect(baseColourName([72, 181, 178])).toBe('teal');
    expect(baseColourName([151, 120, 214])).toBe('purple');
  });
});
