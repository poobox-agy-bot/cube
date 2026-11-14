# cube

Interactive 2&times;2 Rubik's Cube (Pocket Cube) simulator and solver.

## Running Locally

Open `index.html` directly in any web browser (or serve the directory with `python3 -m http.server`).

`2x2fiddle.html`, `2x2fiddle.css`, and `2x2fiddle.js` remain directly runnable in [JSFiddle](https://jsfiddle.net/).

## Features

- Interactive 2D unfolded cube net — click stickers to edit colors or use standard WCA Singmaster move controls (`U`, `U'`, `U2`, `R`, `R'`, `R2`, `F`, `F'`, `F2`), `Scramble`, and `Reset`
- Complete mathematical Pocket Cube state validation (sticker counts, chiral corner cubie validity, anchored corner check, and corner twist mod-3 invariant)
- Anchors the back-bottom-left (`DLB`) corner to eliminate whole-cube rotational symmetry while solving in Half-Turn Metric (`<U, R, F>`)
- Browser-friendly non-blocking bidirectional BFS solver
