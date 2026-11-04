# Plan: Meow puzzle solver (from intent.md and spec.md)
Author: Claude (plan mode), for approval by Gaurav Kumar. Status: approved by product owner (2026-11-04).

## Stack (pinned)
Node 22, Vite 8, TypeScript 5 (strict), Vitest 5, ESLint 10 with typescript-eslint, pngjs (tests only,
to load fixture screenshots in Node). No runtime dependencies in the shipped page.

## Files that change
| File | New/changed | Purpose | Requirements |
| :--- | :--- | :--- | :--- |
| package.json, tsconfig.json, vite.config.ts, eslint.config.js, .gitignore | new | Project setup; `npm test`, `npm run build`, `npm run lint` | - |
| src/core/types.ts | new | Shared types: Pixels, Bands, RegionGrid, Cat, SolveResult | - |
| src/core/grid.ts | new | Find board bounds, row/column bands, N | R2 |
| src/core/regions.ts | new | Palette from clean cells, majority vote, mark covered cells unknown | R3 |
| src/core/validate.ts | new | N regions, each region connected | R4 |
| src/core/solve.ts | new | Rule-based deduction with reasons, backtracking fallback, uniqueness check, resolving unknown cells | R3, R5, R7 |
| src/core/colours.ts | new | Name a colour (red, pink, yellow, blue, purple, ...) | R7 |
| src/core/pipeline.ts | new | `solveScreenshot(pixels)` = grid -> regions -> validate -> solve; returns result or the R8 error | R2-R5, R8 |
| src/ui/render.ts | new | Draw solved board + numbered cats + list onto a canvas; PNG export | R6, R9 |
| src/main.ts, index.html, src/style.css | new | Upload/drop/paste, show result or error, download button | R1, R8, R9, R11 |
| tests/*.test.ts | new | Unit and fixture tests (see Proof) | all |
| .github/workflows/ci.yml | new | On every push/PR: install, lint, test, build | - |
| .github/workflows/pages.yml | new | On push to main after CI passes: deploy dist/ to GitHub Pages | R10 |
| README.md | new | What it is, live link, how to run locally | - |
| CLAUDE.md | changed | Real commands once they exist | - |

## Order of work
1. Project setup and an empty passing test, so the feedback loop exists before any logic.
2. solve.ts first, tested on hand-written grids (no images): unique puzzle, two-solution puzzle,
   unsolvable puzzle, each reason type (R5, R7).
3. grid.ts and regions.ts against both fixtures: N, band count, region grid matches the expected
   grid (R2, R3). Unknown cell in level 541 resolved by solve.ts (R3).
4. validate.ts and pipeline.ts: fixtures give the expected cats; cropped image, blank image and a
   random photo-like image give the R8 error (R4, R8).
5. colours.ts and render.ts, then the page (R1, R6, R7, R9, R11).
6. Timing check: pipeline on both fixtures well under 2 s in Node (R12 proxy), then on a phone.
7. CI and Pages workflows, README. Product owner turns on Pages once (Settings -> Pages -> GitHub Actions).

## Risks
- Spec concern 1: thresholds tuned on two screenshots only. Mitigation: every threshold is a named
  constant in one place, and R4 fails safe. New screenshots become fixtures.
- Unknown-cell resolution multiplies solve time by the number of neighbour candidates. Mitigation:
  cap unknown cells at 3; more than that gives the R8 error.
- Canvas `getImageData` on large phone screenshots: decode once, downscale to max 1400 px tall
  before analysis (bands are wide enough to survive).

## Proof
| Requirement | Proved by |
| :--- | :--- |
| R1 | Manual: file picker, drag-drop, paste on desktop Chrome; file picker on a phone |
| R2 | tests/pipeline.test.ts (N=10 and N=8, also shrunk), tests/sizes.test.ts (4 to 14), tests/review-findings.test.ts (banners) |
| R3 | tests/pipeline.test.ts: region grids match; level 541 has one unknown cell, resolved to yellow. tests/review-findings.test.ts: cat on a single-cell colour |
| R4 | tests/validate.test.ts: merged regions, split region, wrong count each rejected |
| R5 | tests/solve.test.ts + tests/pipeline.test.ts: answers equal catColumnPerRow in the fixture JSON; two-solution grid rejected |
| R6, R9 | Manual screenshot of the result page for both fixtures; downloaded PNG opens |
| R7 | tests/solve.test.ts: every cat has a non-empty reason; single-cell region gives the "only one cell" reason |
| R8 | tests/pipeline.test.ts: cropped and non-game images return the exact R8 message |
| R10 | Lint rule bans fetch/XHR/WebSocket/sendBeacon in src/; the built page carries a Content-Security-Policy with connect-src 'none' |
| R11 | Manual check on a phone browser after deploy |
| R12 | tests/pipeline.test.ts asserts each fixture solves in under 500 ms in Node |

## Review (v1, independent reviewer, 2026-11-05)
No wrong answers and no data leaks found. Important findings and what was done:
1. A cat on a single-cell colour gave the R8 error. Fixed: a hidden cell may be a colour of its own
   when the board is one colour short; test pastes the real cat from level 541 onto level 538's yellow.
2. A full-width coloured banner broke board detection. Fixed: detection picks the evenly spaced run
   of cell bands and trims bars that line up with it; tests add banners above and below the board.
3. Long-press paste is impossible on phones. Fixed: "Paste screenshot" button using the clipboard.
4. Two quick uploads could leave the older answer on screen. Fixed: only the newest upload may update the page.
5. Two colours could get the same name. Fixed: "pale blue" for the base colour, numbering as a last resort.
Nits fixed: unexpected errors show the R8 message; drops outside the zone no longer leave the app;
Content-Security-Policy blocks all network connections; a cell needs 40% of samples to be labelled;
spec wording for the fallback reason aligned with the code.
Not verified yet: R11 (real phone browsers) and R12 on a phone; to be checked after deploy.
