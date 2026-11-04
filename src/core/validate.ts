import { UNKNOWN, type RegionGrid } from './types';

export type ValidationResult = { ok: true } | { ok: false; detail: string };

/**
 * R4: before solving, the reading must make sense: an N x N grid with no unknown cells,
 * exactly N distinct regions, and every region one connected group of cells.
 */
export function validateRegions(grid: RegionGrid): ValidationResult {
  const n = grid.length;
  if (n === 0) return { ok: false, detail: 'empty grid' };
  for (const row of grid) {
    if (row.length !== n) return { ok: false, detail: 'grid is not square' };
    if (row.includes(UNKNOWN)) return { ok: false, detail: 'grid has unknown cells' };
  }

  const cellsByRegion = new Map<number, Array<[number, number]>>();
  grid.forEach((row, r) =>
    row.forEach((g, c) => {
      const list = cellsByRegion.get(g) ?? [];
      list.push([r, c]);
      cellsByRegion.set(g, list);
    }),
  );
  if (cellsByRegion.size !== n) {
    return { ok: false, detail: `found ${cellsByRegion.size} regions on a ${n} x ${n} board` };
  }

  for (const [g, cells] of cellsByRegion) {
    const seen = new Set<string>();
    const first = cells[0];
    if (!first) continue;
    const stack: Array<[number, number]> = [first];
    seen.add(`${first[0]},${first[1]}`);
    while (stack.length) {
      const [r, c] = stack.pop()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const rr = r + dr;
        const cc = c + dc;
        const key = `${rr},${cc}`;
        if (grid[rr]?.[cc] === g && !seen.has(key)) {
          seen.add(key);
          stack.push([rr, cc]);
        }
      }
    }
    if (seen.size !== cells.length) {
      return { ok: false, detail: `region ${g} is split into separate pieces` };
    }
  }
  return { ok: true };
}
