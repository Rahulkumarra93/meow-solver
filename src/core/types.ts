/** RGBA pixels, row-major, 4 bytes per pixel (same layout as canvas ImageData). */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/** A run of pixels [start, end) along one axis. */
export interface Band {
  start: number;
  end: number;
}

/** Where the board sits in the screenshot. */
export interface BoardLayout {
  size: number;
  rows: Band[];
  cols: Band[];
}

/** N x N region ids. UNKNOWN marks a cell whose colour could not be read (e.g. covered by a cat). */
export type RegionGrid = number[][];
export const UNKNOWN = -1;

export type Rgb = [number, number, number];

export interface Cat {
  row: number; // 0-based
  col: number; // 0-based
  region: number;
  reason: string;
}

export type PipelineResult =
  | {
      ok: true;
      size: number;
      regions: RegionGrid;
      palette: Rgb[];
      names: string[];
      cats: Cat[];
    }
  | {
      ok: false;
      error: string;
      /** Developer detail for logs and tests; never shown instead of the error. */
      detail: string;
    };
