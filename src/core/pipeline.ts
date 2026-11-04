import { nameColours } from './colours';
import { findBoard } from './grid';
import { readRegions } from './regions';
import { resolveUnknownCells, solveWithReasons } from './solve';
import type { Pixels, PipelineResult } from './types';
import { validateRegions } from './validate';

/** R8: the only message a user ever sees when something goes wrong. */
export const READ_ERROR = "Couldn't read this board. Please upload a clear, uncropped screenshot of the level.";

/** Most cells a placed cat (or anything else) may hide before we give up. */
export const MAX_UNKNOWN_CELLS = 3;

const fail = (detail: string): PipelineResult => ({ ok: false, error: READ_ERROR, detail });

/** Screenshot pixels in, solved board or the R8 error out. Never returns a partial answer. */
export function solveScreenshot(px: Pixels): PipelineResult {
  const layout = findBoard(px);
  if (!layout) return fail('no N x N board found');

  const reading = readRegions(px, layout);
  if (reading.unknownCount > MAX_UNKNOWN_CELLS) {
    return fail(`${reading.unknownCount} cells could not be read`);
  }
  const regions = resolveUnknownCells(reading.regions, MAX_UNKNOWN_CELLS);
  if (!regions) return fail('hidden cells could not be worked out');

  const valid = validateRegions(regions);
  if (!valid.ok) return fail(valid.detail);

  // A hidden cell that turned out to be a colour of its own: take its colour from its visible rim.
  const palette = [...reading.palette];
  regions.forEach((row, r) =>
    row.forEach((g, c) => {
      if (palette[g] === undefined) palette[g] = reading.hiddenColours.get(`${r},${c}`) ?? [200, 200, 200];
    }),
  );

  const names = nameColours(palette);
  const cats = solveWithReasons(regions, names);
  if (!cats) return fail('board does not have exactly one solution');

  return { ok: true, size: layout.size, regions, palette, names, cats };
}
