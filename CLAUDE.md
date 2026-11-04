# Meow solver
Single-page web app: upload a screenshot of a Meow cat-game level, get the solved board
and one line of reasoning per cat. Everything runs in the browser.

## Commands
- Install: npm install
- Dev server: npm run dev (http://localhost:5173)
- Test: npm test (Vitest; all green, prints "Tests  N passed")
- Type check + build: npm run build (must finish with no errors; output in dist/)
- Lint: npm run lint (zero warnings)

## Conventions
- Vite + TypeScript, strict mode, no UI framework.
- src/core/ is pure logic on plain data (pixel arrays, grids). No DOM, no canvas, no window there,
  so it runs in Node tests. All browser code lives in src/ui/ and src/main.ts.
- Rows and columns are 0-based in code, 1-based in anything the user sees.
- Every core function gets a unit test in tests/. New screenshot cases go in tests/fixtures/
  as level-<n>.png plus level-<n>.json with the expected answer.

## Architecture
- intent/meow-solver/ holds intent.md, spec.md and plan.md. Requirements are R1..R12 in spec.md;
  cite them in commits and PRs.
- Pipeline: grid.ts (find board, N) -> regions.ts (cell colours) -> validate.ts -> solve.ts
  (cats + reasons) -> render.ts (draw board).

## Rules that must always hold
- The image never leaves the browser: no fetch/XHR/beacon with image data, no analytics on uploads (R10).
- Never show a partial or guessed answer. If any check fails, show the R8 error message exactly.
- Never assume the board is 10 x 10.

## Things Claude gets wrong
- (Add here when Claude makes the same mistake twice.)

## Verifying your work
Run npm test, npm run build and npm run lint before reporting any task complete, and paste the output.
For UI changes, open the dev server, upload both fixtures and screenshot the result.
If a test fails, fix the code, not the test.
