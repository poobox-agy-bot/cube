# cube

Interactive 2&times;2 Rubik's Cube (Pocket Cube) simulator and solver.

## Running Locally

Open `index.html` directly in any web browser (or serve the directory with `python3 -m http.server`).

`2x2fiddle.html`, `2x2fiddle.css`, and `2x2fiddle.js` remain directly runnable in [JSFiddle](https://jsfiddle.net/).

## Features

- Interactive 2D unfolded cube net — click stickers to edit colors or use the move buttons (`A`, `A'`, `T`, `T'`, `L`, `L'`), `Scramble`, and `Reset`
- Anchors the front-right-bottom corner to eliminate whole-cube rotational symmetry
- Browser-friendly non-blocking bidirectional BFS solver
