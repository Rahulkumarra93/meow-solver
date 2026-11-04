import { UNKNOWN, type BoardLayout, type Pixels, type RegionGrid, type Rgb } from './types';

export const COLOURS = {
  /** Sample points per cell side (9 x 9 = 81 samples). */
  samplesPerSide: 9,
  /** Sample from 10% to 90% of the cell, avoiding rounded corners and borders. */
  inset: 0.1,
  /** A cell is "clean" when this share of samples sits close to its median colour. */
  cleanShare: 0.9,
  /** Distance (sum of R, G, B differences) for "close to the median". */
  cleanDistance: 30,
  /** Two colours closer than this are the same region colour. */
  sameColour: 45,
  /** A cell needs at least this share of its samples matching one palette colour, else it is unknown. */
  minVoteShare: 0.4,
} as const;

const distance = (a: Rgb, b: Rgb): number => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

function medianColour(samples: Rgb[]): Rgb {
  const mid = Math.floor(samples.length / 2);
  const channel = (k: 0 | 1 | 2): number => [...samples.map((s) => s[k])].sort((a, b) => a - b)[mid]!;
  return [channel(0), channel(1), channel(2)];
}

export interface RegionReading {
  regions: RegionGrid;
  palette: Rgb[];
  unknownCount: number;
  /** Best guess at each hidden cell's own colour, from its visible rim; keyed "row,col". */
  hiddenColours: Map<string, Rgb>;
}

/**
 * R3: read each cell's colour region. The palette comes only from "clean" cells (one flat colour),
 * so a placed cat or the highlight glow cannot invent a new colour. Every cell is then classified
 * by majority vote of its samples; cells with too few matching samples are UNKNOWN.
 * Region ids are numbered in reading order (top-left first).
 */
export function readRegions(px: Pixels, layout: BoardLayout): RegionReading {
  const sample = (x: number, y: number): Rgb => {
    const i = (Math.round(y) * px.width + Math.round(x)) * 4;
    return [px.data[i]!, px.data[i + 1]!, px.data[i + 2]!];
  };

  const cellSamples: Rgb[][][] = layout.rows.map((rb) =>
    layout.cols.map((cb) => {
      const out: Rgb[] = [];
      const k = COLOURS.samplesPerSide;
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          const fy = COLOURS.inset + ((1 - 2 * COLOURS.inset) * i) / (k - 1);
          const fx = COLOURS.inset + ((1 - 2 * COLOURS.inset) * j) / (k - 1);
          out.push(sample(cb.start + (cb.end - cb.start - 1) * fx, rb.start + (rb.end - rb.start - 1) * fy));
        }
      }
      return out;
    }),
  );

  // The rim of a cell (just inside its edge) usually stays visible around a placed cat.
  const rimColour = (rb: { start: number; end: number }, cb: { start: number; end: number }): Rgb => {
    const rim: Rgb[] = [];
    const h = rb.end - rb.start - 1;
    const w = cb.end - cb.start - 1;
    for (let t = 0.15; t <= 0.85; t += 0.05) {
      for (const [fx, fy] of [[t, 0.04], [t, 0.96], [0.04, t], [0.96, t]] as const) {
        const s = sample(cb.start + w * fx, rb.start + h * fy);
        if (Math.max(...s) - Math.min(...s) > 40) rim.push(s); // skip black/white cat pixels
      }
    }
    return rim.length ? medianColour(rim) : [200, 200, 200];
  };

  // 1. Palette from clean cells, in reading order.
  const palette: Rgb[] = [];
  for (const row of cellSamples) {
    for (const samples of row) {
      const med = medianColour(samples);
      const close = samples.filter((s) => distance(s, med) < COLOURS.cleanDistance).length;
      if (close / samples.length < COLOURS.cleanShare) continue;
      if (!palette.some((p) => distance(p, med) < COLOURS.sameColour)) palette.push(med);
    }
  }

  // 2. Majority vote per cell.
  let unknownCount = 0;
  const hiddenColours = new Map<string, Rgb>();
  const regions: RegionGrid = cellSamples.map((row, r) =>
    row.map((samples, c) => {
      const votes = new Array<number>(palette.length).fill(0);
      for (const s of samples) {
        let best = -1;
        let bestD = Infinity;
        palette.forEach((p, k) => {
          const d = distance(p, s);
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        });
        if (best >= 0 && bestD < COLOURS.sameColour) votes[best]!++;
      }
      const top = Math.max(0, ...votes);
      if (top < samples.length * COLOURS.minVoteShare) {
        unknownCount++;
        hiddenColours.set(`${r},${c}`, rimColour(layout.rows[r]!, layout.cols[c]!));
        return UNKNOWN;
      }
      return votes.indexOf(top);
    }),
  );

  // 3. Renumber regions in reading order of first appearance; drop palette colours no cell uses.
  const remap = new Map<number, number>();
  for (const row of regions) for (const g of row) if (g !== UNKNOWN && !remap.has(g)) remap.set(g, remap.size);
  const used: Rgb[] = [];
  for (const [oldId, newId] of remap) used[newId] = palette[oldId]!;
  return {
    regions: regions.map((row) => row.map((g) => (g === UNKNOWN ? UNKNOWN : remap.get(g)!))),
    palette: used,
    unknownCount,
    hiddenColours,
  };
}
