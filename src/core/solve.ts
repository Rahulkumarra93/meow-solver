import { UNKNOWN, type Cat, type RegionGrid } from './types';
import { validateRegions } from './validate';

/** The rules of the game, checked independently of how a solution was found. */
export function isValidSolution(grid: RegionGrid, colPerRow: number[]): boolean {
  const n = grid.length;
  if (colPerRow.length !== n) return false;
  const cols = new Set<number>();
  const regions = new Set<number>();
  for (let r = 0; r < n; r++) {
    const c = colPerRow[r]!;
    if (c < 0 || c >= n) return false;
    cols.add(c);
    regions.add(grid[r]![c]!);
    if (r > 0 && Math.abs(colPerRow[r - 1]! - c) <= 1) return false; // touching, incl. diagonal
  }
  return cols.size === n && regions.size === n;
}

/**
 * Exhaustive search, one cat per row. Returns up to `limit` solutions as "column per row".
 * Used to confirm a puzzle has exactly one answer (R5).
 */
export function findSolutions(grid: RegionGrid, limit = 2): number[][] {
  const n = grid.length;
  const out: number[][] = [];
  const pos: number[] = [];
  const usedCols = new Array<boolean>(n).fill(false);
  const usedRegions = new Set<number>();
  const search = (r: number): void => {
    if (out.length >= limit) return;
    if (r === n) {
      out.push([...pos]);
      return;
    }
    for (let c = 0; c < n; c++) {
      const g = grid[r]![c]!;
      if (usedCols[c] || usedRegions.has(g)) continue;
      if (r > 0 && Math.abs(pos[r - 1]! - c) <= 1) continue;
      usedCols[c] = true;
      usedRegions.add(g);
      pos.push(c);
      search(r + 1);
      pos.pop();
      usedRegions.delete(g);
      usedCols[c] = false;
    }
  };
  search(0);
  return out;
}

/**
 * R3: fill in cells that could not be read (hidden under a cat). Each unknown cell belongs either
 * to one of its neighbours' regions or, when the board is one colour short, to a colour of its own
 * that only it has (a cat sitting on a single-cell colour). Keep the only combination that gives a
 * valid board with exactly one solution. Returns null when zero or several combinations work.
 */
export function resolveUnknownCells(grid: RegionGrid, maxUnknown = 3): RegionGrid | null {
  const n = grid.length;
  const unknown: Array<[number, number]> = [];
  grid.forEach((row, r) => row.forEach((g, c) => g === UNKNOWN && unknown.push([r, c])));
  if (unknown.length === 0) return grid;
  if (unknown.length > maxUnknown) return null;

  const known = new Set(grid.flat().filter((g) => g !== UNKNOWN));
  const freshId = Math.max(-1, ...known) + 1;
  const options = unknown.map(([r, c]) => {
    const set = new Set<number>();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const g = grid[r + dr]?.[c + dc];
      if (g !== undefined && g !== UNKNOWN) set.add(g);
    }
    if (known.size < n) set.add(freshId);
    return [...set];
  });

  const working: RegionGrid[] = [];
  const pick = (i: number, current: RegionGrid): void => {
    if (working.length > 1) return;
    if (i === unknown.length) {
      if (validateRegions(current).ok && findSolutions(current, 2).length === 1) {
        working.push(current.map((row) => [...row]));
      }
      return;
    }
    const [r, c] = unknown[i]!;
    for (const g of options[i]!) {
      current[r]![c] = g;
      pick(i + 1, current);
    }
    current[r]![c] = UNKNOWN;
  };
  pick(0, grid.map((row) => [...row]));
  return working.length === 1 ? working[0]! : null;
}

type UnitKind = 'region' | 'row' | 'col';
interface Unit {
  kind: UnitKind;
  index: number;
  cells: Array<[number, number]>;
}

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function listWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * R5 + R7: solve the puzzle the way a person would, recording one reason per cat.
 * Rules are tried from simplest to hardest; when none applies, the known unique solution
 * is used for the next cat and the reason says the other cells lead to a dead end.
 * Returns null if the grid has no single solution.
 */
export function solveWithReasons(grid: RegionGrid, names: string[]): Cat[] | null {
  const n = grid.length;
  const solutions = findSolutions(grid, 2);
  if (solutions.length !== 1) return null;
  const solution = solutions[0]!;

  const regionIds = [...new Set(grid.flat())];
  const regionName = (g: number): string => names[g] ?? `region ${g + 1}`;
  const unitLabel = (u: Unit): string =>
    u.kind === 'region' ? regionName(u.index) : `${u.kind === 'row' ? 'row' : 'column'} ${u.index + 1}`;

  const units: Unit[] = [
    ...regionIds.map((g) => ({
      kind: 'region' as const,
      index: g,
      cells: grid.flatMap((row, r) => row.flatMap((v, c) => (v === g ? [[r, c] as [number, number]] : []))),
    })),
    ...Array.from({ length: n }, (_, r) => ({
      kind: 'row' as const,
      index: r,
      cells: Array.from({ length: n }, (_, c) => [r, c] as [number, number]),
    })),
    ...Array.from({ length: n }, (_, c) => ({
      kind: 'col' as const,
      index: c,
      cells: Array.from({ length: n }, (_, r) => [r, c] as [number, number]),
    })),
  ];

  const cand = Array.from({ length: n }, () => new Array<boolean>(n).fill(true));
  // Why and when each cell was ruled out: a rule's note, or the index of the cat that blocked it.
  const removedBy = Array.from({ length: n }, () => new Array<string | number | null>(n).fill(null));
  const removedAt = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  let clock = 0;
  const hasCat = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const cats: Cat[] = [];

  const unitDone = (u: Unit): boolean => u.cells.some(([r, c]) => hasCat[r]![c]);
  const live = (u: Unit): Array<[number, number]> => u.cells.filter(([r, c]) => cand[r]![c]);
  const openUnits = (kind: UnitKind): Unit[] => units.filter((u) => u.kind === kind && !unitDone(u));

  /** Cells a cat at (r, c) rules out: same row, column, region, or touching. */
  const blockedBy = (r: number, c: number): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (let rr = 0; rr < n; rr++) {
      for (let cc = 0; cc < n; cc++) {
        if (rr === r && cc === c) continue;
        const touching = Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1;
        if (rr === r || cc === c || touching || grid[rr]![cc] === grid[r]![c]) out.push([rr, cc]);
      }
    }
    return out;
  };

  const place = (r: number, c: number, reason: string): void => {
    const index = cats.length;
    cats.push({ row: r, col: c, region: grid[r]![c]!, reason });
    hasCat[r]![c] = true;
    cand[r]![c] = false;
    clock++;
    for (const [rr, cc] of blockedBy(r, c)) {
      if (cand[rr]![cc]) {
        cand[rr]![cc] = false;
        removedBy[rr]![cc] = index;
        removedAt[rr]![cc] = clock;
      }
    }
  };

  const eliminate = (cells: Array<[number, number]>, note: string): boolean => {
    let any = false;
    clock++;
    for (const [r, c] of cells) {
      if (cand[r]![c]) {
        cand[r]![c] = false;
        removedBy[r]![c] = note;
        removedAt[r]![c] = clock;
        any = true;
      }
    }
    return any;
  };

  /** One line: the step that removed the last other cell in this unit. */
  const singleReason = (u: Unit, r: number, c: number): string => {
    const label = unitLabel(u);
    if (u.kind === 'region' && u.cells.length === 1) {
      return `${capitalise(label)} has only one cell, so the cat must go here.`;
    }
    let latest: [number, number] | null = null;
    for (const [rr, cc] of u.cells) {
      if (rr === r && cc === c) continue;
      if (!latest || removedAt[rr]![cc]! > removedAt[latest[0]]![latest[1]]!) latest = [rr, cc];
    }
    const why = latest ? removedBy[latest[0]]![latest[1]] : null;
    if (typeof why === 'string') return `${capitalise(why)}, so this is the last cell left in ${label}.`;
    if (typeof why === 'number') {
      const cat = cats[why]!;
      return `Cat ${why + 1} (row ${cat.row + 1}, column ${cat.col + 1}) rules out the last other cell in ${label}.`;
    }
    return `This is the only cell left in ${label}.`;
  };

  // Rule: k open regions that only fit in k rows (or columns) own those lines.
  // Rule: k open rows (or columns) that can only be filled by k regions own those regions.
  const confinement = (k: number): boolean => {
    const regions = openUnits('region');
    for (const lineKind of ['row', 'col'] as const) {
      const lineWord = lineKind === 'row' ? 'row' : 'column';
      const lines = openUnits(lineKind);
      const lineOf = (cell: [number, number]): number => (lineKind === 'row' ? cell[0] : cell[1]);

      for (const subset of subsetsOfSize(regions, k)) {
        if (subset.length >= regions.length) continue;
        const spanned = new Set(subset.flatMap((u) => live(u).map(lineOf)));
        if (spanned.size !== k) continue;
        const ids = new Set(subset.map((u) => u.index));
        const targets: Array<[number, number]> = [];
        for (const line of spanned) {
          for (let i = 0; i < n; i++) {
            const cell: [number, number] = lineKind === 'row' ? [line, i] : [i, line];
            if (!ids.has(grid[cell[0]]![cell[1]]!)) targets.push(cell);
          }
        }
        const lineNums = [...spanned].sort((a, b) => a - b).map((x) => String(x + 1));
        const who = listWords(subset.map((u) => regionName(u.index)));
        const note =
          k === 1
            ? `${who} must use ${lineWord} ${lineNums[0]}`
            : `${who} must use ${lineWord}s ${listWords(lineNums)} between them`;
        if (eliminate(targets, note)) return true;
      }

      for (const subset of subsetsOfSize(lines, k)) {
        if (subset.length >= lines.length) continue;
        const owners = new Set(subset.flatMap((u) => live(u).map(([r, c]) => grid[r]![c]!)));
        if (owners.size !== k) continue;
        const lineSet = new Set(subset.map((u) => u.index));
        const targets = regions
          .filter((u) => owners.has(u.index))
          .flatMap((u) => live(u))
          .filter((cell) => !lineSet.has(lineOf(cell)));
        const lineNums = subset.map((u) => String(u.index + 1));
        const who = listWords([...owners].map(regionName));
        const note =
          k === 1
            ? `${who} must be the cat in ${lineWord} ${lineNums[0]}`
            : `${who} must fill ${lineWord}s ${listWords(lineNums)}`;
        if (eliminate(targets, note)) return true;
      }
    }
    return false;
  };

  // Rule: a cell is impossible if a cat there would leave some other region, row or column empty.
  const blocking = (): boolean => {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!cand[r]![c]) continue;
        const gone = new Set(blockedBy(r, c).map(([rr, cc]) => rr * n + cc));
        for (const u of units) {
          if (unitDone(u)) continue;
          const own =
            (u.kind === 'region' && u.index === grid[r]![c]) ||
            (u.kind === 'row' && u.index === r) ||
            (u.kind === 'col' && u.index === c);
          if (own) continue;
          if (live(u).every(([rr, cc]) => gone.has(rr * n + cc))) {
            const note = `a cat at row ${r + 1}, column ${c + 1} would leave ${unitLabel(u)} with no room`;
            if (eliminate([[r, c]], note)) return true;
          }
        }
      }
    }
    return false;
  };

  const maxSteps = n * n * 4;
  for (let step = 0; cats.length < n && step < maxSteps; step++) {
    const open = units.filter((u) => !unitDone(u));
    if (open.some((u) => live(u).length === 0)) return null; // contradiction: should not happen

    const single = open.find((u) => live(u).length === 1);
    if (single) {
      const [r, c] = live(single)[0]!;
      if (solution[r] !== c) return null; // deduction disagrees with the search: a bug, fail safe
      place(r, c, singleReason(single, r, c));
      continue;
    }
    if (confinement(1) || confinement(2) || blocking()) continue;
    let progressed = false;
    for (let k = 3; k < n && !progressed; k++) progressed = confinement(k);
    if (progressed) continue;

    // Fallback: no simple rule applies. Take the smallest open region and use the solution.
    const target = openUnits('region').sort((a, b) => live(a).length - live(b).length)[0]!;
    const cell = live(target).find(([r, c]) => solution[r] === c)!;
    place(
      cell[0],
      cell[1],
      `Every other cell in ${regionName(target.index)} leads to a dead end, so the cat must go here.`,
    );
  }

  if (cats.length !== n) return null;
  const colPerRow = new Array<number>(n);
  for (const cat of cats) colPerRow[cat.row] = cat.col;
  return isValidSolution(grid, colPerRow) ? cats : null;
}

function subsetsOfSize<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (start: number, acc: T[]): void => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i <= items.length - (k - acc.length); i++) {
      acc.push(items[i]!);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}
