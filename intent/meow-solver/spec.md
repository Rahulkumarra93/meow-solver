# Spec: Meow puzzle solver from a screenshot
From: intent.md (Gaurav Kumar, product owner). Status: ready for product owner review.
Skills applied: none yet (no organisation skills exist for this project; see concern 4).

## Requirements
- R1. The user can give the page a screenshot by file picker, drag and drop, Ctrl+V, or a "Paste screenshot"
  button (for phones, where long-press paste only works in text fields).
- R2. The page finds the board in the screenshot and detects its size N (any N from 4 to 14) without being told.
- R3. The page reads the colour region of every cell, including cells that are covered by a placed cat
  or tinted by the game's highlight glow.
- R4. The page checks the reading before solving: exactly N regions, every region is one connected
  group of cells. If any check fails, it shows R8's error.
- R5. The page finds the placement of N cats that satisfies all three rules (1 per region, 1 per row
  and column, no two touching, diagonals included), and confirms the solution is the only one.
- R6. The page shows the board only (redrawn cleanly, in the detected colours) with a cat on each
  solved cell, numbered in the order the cats were deduced.
- R7. Under the board, one line per cat: number, row, column, colour name and the reason, e.g.
  `3. Row 2, Col 3 (yellow): yellow has only one cell, so the cat must go here.`
- R8. If the board cannot be read, or the reading has no solution, the page shows:
  "Couldn't read this board. Please upload a clear, uncropped screenshot of the level." No partial answer.
- R9. The user can download the solved board (with the cat list beneath it) as a PNG.
- R10. Nothing leaves the browser: no server calls with the image, no login, no storage.
- R11. Works on a current phone browser (Chrome on Android, Safari on iPhone) and desktop browsers.
- R12. A typical screenshot (up to 1290 x 2796) is solved in under 2 seconds on a mid-range phone.

## Design

### Architecture
A static single page, built with Vite + TypeScript, no framework. All logic runs in the browser and
is split into pure modules that take plain data (pixel arrays, grids) so they can be unit tested in Node:

| Module | Input | Output | Covers |
| :--- | :--- | :--- | :--- |
| `src/core/grid.ts` | RGBA pixels, width, height | Board bounds, row and column bands, N | R2 |
| `src/core/regions.ts` | Pixels + bands | N x N region ids (some cells "unknown") and a palette | R3 |
| `src/core/validate.ts` | Region grid | OK, or a reason for R8 | R4 |
| `src/core/solve.ts` | Region grid | Cat positions in deduction order, each with a reason; or "no unique solution" | R3, R5, R7 |
| `src/core/colours.ts` | RGB | Human colour name (red, pink, yellow, ...) | R7 |
| `src/ui/render.ts` | Grid, palette, solution | Canvas drawing of the solved board | R6, R9 |
| `src/main.ts` | Browser events | Wires upload, paste, drop, download, errors | R1, R8, R9 |

### How the board is read (proven in the feasibility check on levels 538 and 541)
1. Mark every pixel whose colour is saturated (max channel minus min channel > 40).
2. Rows of the board are the horizontal bands where more than half the width is saturated; columns
   are found the same way inside those rows. N is the number of bands; rows and columns must agree.
3. Each cell is sampled on a 9 x 9 grid of points. Cells whose samples agree are "clean"; the palette
   is built from clean cells only.
4. Every cell is classified by majority vote of its samples against the palette, which handles the
   glow tint. A cell with too few matching samples (covered by a cat) is "unknown".
5. For each unknown cell, try each neighbouring region as its colour, and, when the board is one
   colour short, a colour of its own (a cat sitting on a single-cell colour). Keep the only candidate that
   gives a valid board with exactly one solution. If zero or several candidates work, show R8's error.
6. Cats already placed in the screenshot are ignored as moves: the puzzle is solved from scratch,
   because the player's cat could be wrong.

### How the solver produces reasons (R5, R7)
The solver works like a person, step by step, and records the rule that placed each cat:
- "X has only one cell left, so the cat must go here" (region, row or column with one candidate cell).
- "Regions X and Y fill rows a and b between them, so ..." (k regions confined to k rows or columns).
- "Every other cell in X would block all of Y" (a candidate that would leave another region with no cells).
When those rules get stuck, the confirmed unique solution supplies the next cat and the reason becomes
"Every other cell in X leads to a dead end, so the cat must go here." A final exhaustive search confirms
the solution is unique (R5).

### Page layout
Header with a one-line description, a large drop zone ("Upload, drop or paste a screenshot"),
then the result: solved board image, the numbered cat list, and a "Download PNG" button.
Mobile first: full-width board, the list below it.

### Hosting
GitHub Pages, deployed from `main` by a GitHub Actions workflow after the tests pass. Free and static,
which matches R10.

## How each constraint in the intent is met
| Constraint | Met by |
| :---- | :---- |
| Single page, no login, nothing saved on a server | R10, static hosting on GitHub Pages |
| Phone screenshot as-is (header, icons, buttons, ads) | R2: only the board's dense colour bands are used; header, icons and ads are too sparse to count |
| Board size detected, never assumed | R2, tested with the 8 x 8 and 10 x 10 fixtures |
| Code lives in Rahulkumarra93/meow-solver | Repo layout below |
| One line per cat | R7 |
| Error and ask for a clearer image | R8 |
| Board only in the output | R6 |

## Tests (the feedback loop)
- Fixtures: `tests/fixtures/level-538.png` (10 x 10, clean) and `tests/fixtures/level-541.png`
  (8 x 8, with a placed cat and glow). Each has a hand-checked expected solution in a `.json` file beside it.
- Unit tests (Vitest) for every core module, including: rules violated on purpose, a puzzle with two
  solutions, a cropped image, a non-game image (must give R8's error, not a wrong answer).
- One command runs everything: `npm test`. `npm run build` must succeed with no type errors.

## Open questions carried forward
- None from the intent; all were answered on 2026-11-04.

## Areas of concern
1. Only two real screenshots so far. Phones with other resolutions, dark mode, or game themes may
   break the colour thresholds. Mitigation: R8 fails safe; collect 5 to 10 more screenshots
   (ideally another size, e.g. 9 x 9) as fixtures. Owner: product owner.
2. Two regions with very similar colours (e.g. the two pinks in level 538) are separated by a colour
   distance threshold. A theme with closer shades could merge them. R4's region count check catches it
   and shows the error rather than a wrong answer. Owner: engineering.
3. Reasons from the backtracking fallback are less satisfying than rule-based ones. Acceptable for v1
   given "one line is enough". Owner: product owner.
4. The playbook expects organisation skills (brand, UX, security) to constrain the spec. None exist
   for this project; the only security-relevant rule (R10, no data leaves the browser) is written
   into CLAUDE.md instead. Owner: product owner.
5. GitHub write access: Claude can read the repo but cannot push to it yet, so commits currently
   go to the local Meow folder and the product owner pushes. Owner: product owner.
