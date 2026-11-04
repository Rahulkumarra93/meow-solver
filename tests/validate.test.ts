import { describe, expect, it } from 'vitest';
import { validateRegions } from '../src/core/validate';
import { LEVEL_538, LEVEL_541, LEVEL_541_WITH_UNKNOWN } from './grids';

const copy = (g: number[][]): number[][] => g.map((r) => [...r]);

describe('validateRegions (R4)', () => {
  it('accepts both real boards', () => {
    expect(validateRegions(LEVEL_538).ok).toBe(true);
    expect(validateRegions(LEVEL_541).ok).toBe(true);
  });
  it('rejects a board with unread cells', () => {
    expect(validateRegions(LEVEL_541_WITH_UNKNOWN).ok).toBe(false);
  });
  it('rejects two colours read as one (too few regions)', () => {
    const g = copy(LEVEL_538).map((row) => row.map((v) => (v === 9 ? 4 : v))); // light pink merged into pink
    expect(validateRegions(g)).toMatchObject({ ok: false });
  });
  it('rejects a region split into two pieces', () => {
    const g = copy(LEVEL_538);
    g[0]![9] = 9; // a light pink cell far from the rest of light pink... and purple stays connected
    expect(validateRegions(g)).toMatchObject({ ok: false, detail: expect.stringContaining('split') });
  });
  it('rejects a board that is not square', () => {
    expect(validateRegions([[0, 1], [1]]).ok).toBe(false);
  });
});
