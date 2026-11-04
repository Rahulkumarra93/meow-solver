import type { Cat, RegionGrid, Rgb } from '../core/types';

export const INK = '#24203A';
export const EYE = '#F2B632';
const PAPER = '#FFFFFF';

export interface BoardDrawing {
  size: number;
  regions: RegionGrid;
  palette: Rgb[];
  cats: Cat[];
}

/** One cat head: ears, round face, marigold eyes with slit pupils, and its solving number. */
export function drawCat(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, number: number): void {
  const r = cell * 0.3;
  ctx.save();
  ctx.fillStyle = INK;
  // ears
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * r * 0.95, cy - r * 0.25);
    ctx.lineTo(cx + side * r * 0.85, cy - r * 1.25);
    ctx.lineTo(cx + side * r * 0.2, cy - r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // face
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  for (const side of [-1, 1]) {
    ctx.fillStyle = EYE;
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.4, cy - r * 0.08, r * 0.24, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.4, cy - r * 0.08, r * 0.06, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // number badge
  const br = cell * 0.17;
  const bx = cx + cell * 0.3;
  const by = cy + cell * 0.3;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, cell * 0.03);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(br * 1.25)}px ui-rounded, "Nunito", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), bx, by + br * 0.06);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** R6: the board only, redrawn cleanly in the detected colours, with numbered cats. */
export function drawBoard(canvas: HTMLCanvasElement, board: BoardDrawing, pixelsWide = 720): void {
  const n = board.size;
  const pad = Math.round(pixelsWide * 0.03);
  const gap = Math.max(2, Math.round(pixelsWide * 0.008));
  const cell = (pixelsWide - pad * 2 - gap * (n - 1)) / n;
  canvas.width = pixelsWide;
  canvas.height = pixelsWide;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = PAPER;
  roundRect(ctx, 0, 0, pixelsWide, pixelsWide, pad);
  ctx.fill();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const [R, G, B] = board.palette[board.regions[r]![c]!] ?? [200, 200, 200];
      ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
      roundRect(ctx, pad + c * (cell + gap), pad + r * (cell + gap), cell, cell, cell * 0.12);
      ctx.fill();
    }
  }
  board.cats.forEach((cat, i) => {
    const cx = pad + cat.col * (cell + gap) + cell / 2;
    const cy = pad + cat.row * (cell + gap) + cell / 2;
    drawCat(ctx, cx, cy, cell, i + 1);
  });
}

/** One line per cat, as shown under the board and in the download. */
export function catLine(cat: Cat, index: number, names: string[]): string {
  return `${index + 1}. Row ${cat.row + 1}, Col ${cat.col + 1} (${names[cat.region] ?? 'region'}): ${cat.reason}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** R9: the downloadable image: board on top, the cat list beneath it. */
export function drawDownload(board: BoardDrawing, names: string[]): HTMLCanvasElement {
  const width = 1080;
  const margin = 48;
  const boardCanvas = document.createElement('canvas');
  drawBoard(boardCanvas, board, width - margin * 2);

  const out = document.createElement('canvas');
  const ctx = out.getContext('2d')!;
  const font = `500 30px ui-rounded, "Nunito", system-ui, sans-serif`;
  ctx.font = font;
  const textLines = board.cats.flatMap((cat, i) => [...wrap(ctx, catLine(cat, i, names), width - margin * 2), '']);
  const lineHeight = 42;
  out.width = width;
  out.height = margin + boardCanvas.height + margin + textLines.length * lineHeight + margin;

  ctx.fillStyle = '#EEEAF6';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(boardCanvas, margin, margin);
  ctx.font = font;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  textLines.forEach((line, i) => ctx.fillText(line, margin, margin * 2 + boardCanvas.height + i * lineHeight));
  return out;
}
