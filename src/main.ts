import { solveScreenshot, READ_ERROR } from './core/pipeline';
import type { Pixels } from './core/types';
import { catLine, drawBoard, drawDownload, type BoardDrawing } from './ui/render';
import './style.css';

/** Large phone screenshots are shrunk to this height before reading (plan.md risk 3). */
const MAX_HEIGHT = 1400;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const drop = $<HTMLLabelElement>('drop');
const input = $<HTMLInputElement>('file');
const status = $<HTMLParagraphElement>('status');
const result = $<HTMLElement>('result');
const boardCanvas = $<HTMLCanvasElement>('board');
const list = $<HTMLOListElement>('cats');
const download = $<HTMLButtonElement>('download');
const again = $<HTMLButtonElement>('again');

let lastSolved: { board: BoardDrawing; names: string[] } | null = null;

async function toPixels(file: Blob): Promise<Pixels> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_HEIGHT / bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data };
}

function showError(message: string): void {
  result.hidden = true;
  status.textContent = message;
  status.dataset.kind = 'error';
  document.body.dataset.state = 'error';
}

/** Each upload gets a number; only the newest one may change the page. */
let latestRun = 0;

async function handle(file: File | Blob | null | undefined): Promise<void> {
  if (!file) return;
  const run = ++latestRun;
  try {
    await solveAndShow(file, run);
  } catch (err) {
    if (run !== latestRun) return;
    console.info('meow-solver: unexpected error', err);
    showError(READ_ERROR); // R8: never leave the page stuck or half-drawn
  }
}

async function solveAndShow(file: Blob, run: number): Promise<void> {
  if (!file.type.startsWith('image/')) {
    showError(READ_ERROR);
    return;
  }
  result.hidden = true; // never leave the previous level's answer on screen
  lastSolved = null;
  status.textContent = 'Reading the board…';
  status.dataset.kind = 'busy';
  document.body.dataset.state = 'busy';
  await new Promise((r) => setTimeout(r, 0)); // let the message paint

  if (run !== latestRun) return;

  let pixels: Pixels;
  try {
    pixels = await toPixels(file);
  } catch {
    if (run === latestRun) showError(READ_ERROR);
    return;
  }
  if (run !== latestRun) return; // a newer screenshot arrived while this one was decoding
  const solved = solveScreenshot(pixels);
  if (!solved.ok) {
    console.info('meow-solver:', solved.detail);
    showError(solved.error);
    return;
  }

  const board: BoardDrawing = { size: solved.size, regions: solved.regions, palette: solved.palette, cats: solved.cats };
  lastSolved = { board, names: solved.names };
  drawBoard(boardCanvas, board, 900);
  boardCanvas.setAttribute(
    'aria-label',
    `Solved ${solved.size} by ${solved.size} board. ` +
      solved.cats.map((c) => `Cat at row ${c.row + 1}, column ${c.col + 1}`).join('. '),
  );
  list.replaceChildren(
    ...solved.cats.map((cat, i) => {
      const li = document.createElement('li');
      const where = document.createElement('strong');
      where.textContent = `Row ${cat.row + 1}, Col ${cat.col + 1}`;
      const colour = document.createElement('span');
      colour.className = 'swatch';
      const [r, g, b] = solved.palette[cat.region]!;
      colour.style.background = `rgb(${r}, ${g}, ${b})`;
      const name = document.createElement('span');
      name.className = 'colour';
      name.textContent = solved.names[cat.region] ?? '';
      const reason = document.createElement('span');
      reason.className = 'reason';
      reason.textContent = cat.reason;
      li.append(where, colour, name, reason);
      li.title = catLine(cat, i, solved.names);
      return li;
    }),
  );
  status.textContent = `Solved: ${solved.size} cats on a ${solved.size} × ${solved.size} board.`;
  status.dataset.kind = 'done';
  document.body.dataset.state = 'solved';
  result.hidden = false;
  result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

input.addEventListener('change', () => {
  void handle(input.files?.[0]);
  input.value = '';
});

for (const type of ['dragenter', 'dragover'] as const) {
  drop.addEventListener(type, (e) => {
    e.preventDefault();
    drop.dataset.over = 'true';
  });
}
drop.addEventListener('dragleave', (e) => {
  // Ignore leaving into the zone's own children, which made the highlight flicker.
  if (!drop.contains(e.relatedTarget as Node | null)) delete drop.dataset.over;
});
drop.addEventListener('drop', () => delete drop.dataset.over);
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  void handle(e.dataTransfer?.files[0]);
});

// Dropping a file anywhere else would make the browser open the image and leave the app.
for (const type of ['dragover', 'drop'] as const) {
  window.addEventListener(type, (e) => e.preventDefault());
}

// Phones have no Ctrl+V and only offer "Paste" in text fields, so offer a button where the
// browser can read images from the clipboard. Reading the clipboard stays on the device.
const pasteButton = $<HTMLButtonElement>('paste');
const clipboard = navigator.clipboard as Clipboard | undefined;
if (clipboard && typeof clipboard.read === 'function') {
  pasteButton.hidden = false;
  pasteButton.addEventListener('click', async () => {
    try {
      const items = await clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          await handle(await item.getType(type));
          return;
        }
      }
      showNotice('There is no image on the clipboard. Copy a screenshot first, then tap Paste screenshot.');
    } catch {
      showNotice('Pasting was blocked. Copy the screenshot again, or choose it with the button above.');
    }
  });
}

function showNotice(message: string): void {
  result.hidden = true;
  status.textContent = message;
  status.dataset.kind = 'error';
}

window.addEventListener('paste', (e) => {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) void handle(file);
});

download.addEventListener('click', () => {
  if (!lastSolved) return;
  const canvas = drawDownload(lastSolved.board, lastSolved.names);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meow-solution-${lastSolved!.board.size}x${lastSolved!.board.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

again.addEventListener('click', () => {
  result.hidden = true;
  status.textContent = '';
  delete status.dataset.kind;
  document.body.dataset.state = 'idle';
  window.scrollTo({ top: 0 });
  input.click();
});
