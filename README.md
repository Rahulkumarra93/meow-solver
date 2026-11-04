# Meow solver

Stuck on a level of the Meow cat game? Upload a screenshot and see where every cat goes,
with a one-line reason for each.

**Live app:** https://rahulkumarra93.github.io/meow-solver/

- Works with any board size (8 x 8, 10 x 10, ...).
- Runs entirely in your browser: the screenshot never leaves your device.
- If a screenshot can't be read, it says so instead of guessing.

## The rules it solves
Place one cat per colour, one per row and one per column. Cats can't touch, not even diagonally.

## Run it locally
```
npm install
npm run dev      # http://localhost:5173
npm test         # unit and screenshot tests
npm run build    # production build in dist/
```

## How it was built
This project follows an AI-native development process. The brief, spec and plan are in
[`intent/meow-solver/`](intent/meow-solver/), and [`CLAUDE.md`](CLAUDE.md) holds the project rules.
To add a screenshot that the app gets wrong, put it in `tests/fixtures/` as `level-<n>.png`
with a `level-<n>.json` holding the correct answer.
