# Intent: Meow puzzle solver from a screenshot
Author: Gaurav Kumar (product owner), drafted with Claude. Status: accepted by product owner (2026-11-04).

## Problem
Levels of the Meow cat game get hard, and the in-game hints (bulb, cat, mouse) are limited.
There is no quick way to take a level you are stuck on and see where every cat goes, and why.

## Game rules (as shown by the rule icons on each level)
- The board is a square grid of N x N cells. N changes between levels
  (the sample, level 538, is 10 x 10; levels such as 8 x 8 also exist).
- The cells are split into N colour regions.
- Place exactly N cats so that:
  1. there is exactly 1 cat per colour region;
  2. there is exactly 1 cat per row and 1 cat per column;
  3. no two cats touch, including diagonally.

## Proposed outcome
A single web page where the user uploads (or pastes) a screenshot of a level like the sample.
The page returns:
- an image of the board with every cat marked, and
- a one-line explanation for each cat: its row, column, colour region, and the reason
  it has to be there (for example, "the yellow region is a single cell, so the cat must go here").
The output image shows the board only (not the full screenshot) and can be downloaded.
If the screenshot cannot be read, the page shows an error and asks for a clearer screenshot.

## Affected users and systems
Players of the Meow game, starting with the product owner. No existing systems.

## Constraints
- Single page, no login, no accounts, nothing saved on a server.
- Input is a phone screenshot of the game screen as-is (header, rule icons, buttons and ads included).
- The board size must be detected from the screenshot, never assumed to be 10 x 10.
- Works in a phone browser as well as on a desktop.
- Code and the playbook files live in the GitHub repo Rahulkumarra93/meow-solver.

## Out of scope (version 1)
- Playing the game automatically or connecting to the game app.
- Accounts, history of solved levels, sharing links.
- Other puzzle types.

## Evidence from a feasibility check
A throwaway script read two sample screenshots using image maths alone:
- Level 538: 10 x 10 board, 10 colour regions, exactly one solution.
- Level 541: 8 x 8 board, 8 colour regions, exactly one solution. This screenshot already had a
  cat placed by the player, which hides its cell's colour and makes the neighbouring cells glow.
  The colour of the hidden cell was recovered by trying each neighbouring colour and keeping the
  only one that gives a valid puzzle.
No AI model is needed to read the board or solve it, so the app can run entirely in the browser.

## Answered questions (product owner, 2026-11-04)
- Board size varies between levels (8 x 8 and 10 x 10 seen so far).
- Explanation: one line per cat is enough.
- Unreadable screenshot: show an error and ask the user to upload a clearer image.
- Output image: the board only.
- Rules: always the same three rules.
