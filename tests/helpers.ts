import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { Pixels } from '../src/core/types';

export function loadFixture(level: number): Pixels {
  const png = PNG.sync.read(readFileSync(new URL(`./fixtures/level-${level}.png`, import.meta.url)));
  return { width: png.width, height: png.height, data: png.data };
}

export function expectedAnswer(level: number): { size: number; catColumnPerRow: number[] } {
  return JSON.parse(readFileSync(new URL(`./fixtures/level-${level}.json`, import.meta.url), 'utf8'));
}

/** Box-average downscale, like the browser does before analysis (plan.md risk 3). */
export function downscale(px: Pixels, factor: number): Pixels {
  const width = Math.floor(px.width * factor);
  const height = Math.floor(px.height * factor);
  const data = new Uint8ClampedArray(width * height * 4);
  const step = 1 / factor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const acc = [0, 0, 0, 0];
      let count = 0;
      for (let sy = Math.floor(y * step); sy < Math.min(px.height, Math.floor((y + 1) * step)); sy++) {
        for (let sx = Math.floor(x * step); sx < Math.min(px.width, Math.floor((x + 1) * step)); sx++) {
          const i = (sy * px.width + sx) * 4;
          for (let k = 0; k < 4; k++) acc[k]! += px.data[i + k]!;
          count++;
        }
      }
      const o = (y * width + x) * 4;
      for (let k = 0; k < 4; k++) data[o + k] = acc[k]! / Math.max(1, count);
    }
  }
  return { width, height, data };
}

export function crop(px: Pixels, top: number, bottom: number): Pixels {
  const height = bottom - top;
  const data = px.data.slice(top * px.width * 4, bottom * px.width * 4);
  return { width: px.width, height, data };
}

export function solidImage(width: number, height: number, rgb: [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...rgb, 255], i * 4);
  return { width, height, data };
}

/** Deterministic colourful noise: lots of saturated pixels but no grid. */
export function noiseImage(width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 42;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed % 256;
  };
  for (let i = 0; i < width * height; i++) data.set([rand(), rand(), rand(), 255], i * 4);
  return { width, height, data };
}

/**
 * A synthetic phone screenshot in the game's style: cream page, a white board panel,
 * square coloured cells with gaps. Each cell gets the colour of its region id.
 */
export function syntheticScreenshot(regions: number[][], colours: Array<[number, number, number]>): Pixels {
  const n = regions.length;
  const width = 1179;
  const height = 2556;
  const px = solidImage(width, height, [247, 240, 235]);
  const boardLeft = 30;
  const boardTop = 800;
  const boardSize = width - 60;
  const gap = 10;
  const cell = Math.floor((boardSize - gap * (n + 1)) / n);
  const fill = (x0: number, y0: number, w: number, h: number, rgb: [number, number, number]): void => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px.data.set([...rgb, 255], (y * width + x) * 4);
  };
  fill(boardLeft - 10, boardTop - 10, boardSize + 20, boardSize + 20, [255, 255, 255]);
  regions.forEach((row, r) =>
    row.forEach((g, c) => fill(boardLeft + gap + c * (cell + gap), boardTop + gap + r * (cell + gap), cell, cell, colours[g]!)),
  );
  return px;
}

/** Copy a rectangle from one image onto another, scaling with nearest-neighbour. */
export function pasteScaled(
  src: Pixels,
  from: { x: number; y: number; w: number; h: number },
  dst: Pixels,
  to: { x: number; y: number; w: number; h: number },
): Pixels {
  const out: Pixels = { width: dst.width, height: dst.height, data: new Uint8ClampedArray(dst.data) };
  for (let y = 0; y < to.h; y++) {
    for (let x = 0; x < to.w; x++) {
      const sx = from.x + Math.floor((x * from.w) / to.w);
      const sy = from.y + Math.floor((y * from.h) / to.h);
      const si = (sy * src.width + sx) * 4;
      out.data.set(src.data.subarray(si, si + 4), ((to.y + y) * dst.width + to.x + x) * 4);
    }
  }
  return out;
}

export function paintStrip(px: Pixels, top: number, height: number, rgb: [number, number, number]): Pixels {
  const out: Pixels = { width: px.width, height: px.height, data: new Uint8ClampedArray(px.data) };
  for (let y = top; y < top + height; y++) for (let x = 0; x < px.width; x++) out.data.set([...rgb, 255], (y * px.width + x) * 4);
  return out;
}
