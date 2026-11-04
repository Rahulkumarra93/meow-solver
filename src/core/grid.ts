import type { Band, BoardLayout, Pixels } from './types';

/** All thresholds for reading the board live here, so they can be tuned in one place. */
export const READING = {
  /** A pixel is "coloured" when its brightest and dullest channels differ by more than this. */
  saturation: 40,
  /**
   * A line of pixels counts as part of a cell band when more than this share of it is coloured,
   * measured against the most-coloured line in the image (so a board narrower than the screen,
   * e.g. on a tablet, still qualifies).
   */
  bandCoverage: 0.5,
  /** Ignore bands thinner than this many pixels (anti-aliasing, thin borders). */
  minBandPixels: 4,
  /** Neighbouring cells may differ in size, and steps in spacing, by at most this share. */
  sizeTolerance: 0.2,
  /** The gap between cells must be smaller than this share of a cell. */
  maxGapShare: 0.5,
  minSize: 4,
  maxSize: 14,
} as const;

function isColoured(px: Pixels, x: number, y: number): boolean {
  const i = (y * px.width + x) * 4;
  const r = px.data[i]!;
  const g = px.data[i + 1]!;
  const b = px.data[i + 2]!;
  return Math.max(r, g, b) - Math.min(r, g, b) > READING.saturation;
}

function runs(flags: boolean[]): Band[] {
  const out: Band[] = [];
  let start = -1;
  flags.forEach((on, i) => {
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      out.push({ start, end: i });
      start = -1;
    }
  });
  if (start >= 0) out.push({ start, end: flags.length });
  return out.filter((b) => b.end - b.start >= READING.minBandPixels);
}

const size = (b: Band): number => b.end - b.start;
const near = (a: number, b: number): boolean => Math.abs(a - b) <= Math.max(a, b) * READING.sizeTolerance;

/**
 * Candidate boards: runs of consecutive bands that look like grid cells (similar size, small gaps,
 * even spacing), plus every shorter stretch inside them, longest first. A bar that happens to line
 * up with the board is thereby trimmed off; a wrong stretch fails the column check in findBoard.
 */
function gridRuns(bands: Band[]): Band[][] {
  const maximal: Band[][] = [];
  for (let i = 0; i < bands.length; i++) {
    const first = bands[i]!;
    const group = [first];
    let step = -1;
    for (let j = i + 1; j < bands.length; j++) {
      const prev = group[group.length - 1]!;
      const b = bands[j]!;
      const gap = b.start - prev.end;
      const thisStep = b.start - prev.start;
      if (!near(size(b), size(first)) || gap > size(first) * READING.maxGapShare) break;
      if (step >= 0 && !near(thisStep, step)) break;
      step = thisStep;
      group.push(b);
    }
    maximal.push(group);
    i += group.length - 1;
  }
  const out: Band[][] = [];
  for (const run of maximal) {
    for (let len = Math.min(run.length, READING.maxSize); len >= READING.minSize; len--) {
      for (let start = 0; start + len <= run.length; start++) out.push(run.slice(start, start + len));
    }
  }
  return out.sort((a, b) => b.length - a.length || size(b[0]!) - size(a[0]!));
}

function lineFlags(counts: number[]): boolean[] {
  const most = Math.max(0, ...counts);
  return counts.map((c) => most > 0 && c > most * READING.bandCoverage);
}

/**
 * R2: find the board and its size N in a full-phone screenshot.
 * Rows of the board are the longest evenly spaced run of strongly coloured horizontal bands;
 * columns are found the same way within those rows, and must give the same N with square cells.
 * Returns null if no believable N x N grid is found.
 */
export function findBoard(px: Pixels): BoardLayout | null {
  const { width, height } = px;
  const rowCounts: number[] = [];
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (isColoured(px, x, y)) count++;
    rowCounts.push(count);
  }
  const rowCandidates = gridRuns(runs(lineFlags(rowCounts)));

  for (const rows of rowCandidates) {
    const n = rows.length;
    const top = rows[0]!.start;
    const bottom = rows[n - 1]!.end;
    const colCounts: number[] = [];
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let y = top; y < bottom; y++) if (isColoured(px, x, y)) count++;
      colCounts.push(count);
    }
    const cols = gridRuns(runs(lineFlags(colCounts))).find((g) => g.length === n);
    if (!cols) continue;
    if (!near(size(rows[0]!), size(cols[0]!))) continue; // cells are square
    return { size: n, rows, cols };
  }
  return null;
}
