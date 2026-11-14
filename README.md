# cube

Interactive 2&times;2 Rubik's Cube (Pocket Cube) simulator and solver.

## Running Locally

Open `index.html` directly in any web browser (or serve the directory with `python3 -m http.server`).

`2x2fiddle.html`, `2x2fiddle.css`, and `2x2fiddle.js` remain directly runnable in [JSFiddle](https://jsfiddle.net/).

## Features

- Interactive **3D CSS Perspective Cube** (drag-to-orbit, click-to-edit stickers, view mode toggle) synced live with the **2D unfolded net**
- Step-by-step **Solution Playback** bar (`Play`/`Pause`/`Prev`/`Next`) to watch solutions execute on the cube
- Standard WCA Singmaster move controls (`U`, `U'`, `U2`, `R`, `R'`, `R2`, `F`, `F'`, `F2`), `Scramble`, and `Reset`
- Complete mathematical Pocket Cube state validation (sticker counts, chiral corner cubie validity, anchored corner check, and corner twist mod-3 invariant)
- Anchors the back-bottom-left (`DLB`) corner to eliminate whole-cube rotational symmetry while solving in Half-Turn Metric (`<U, R, F>`)
- Browser-friendly non-blocking solvers with UI selector:
  - **Bidirectional BFS** (shortest path, meet-in-the-middle)
  - **Unidirectional BFS** (shortest path)
  - **Iterative Deepening DFS (IDDFS)** with configurable depth limit (shortest path, low memory)
  - **Depth-Limited DFS** with configurable depth limit
