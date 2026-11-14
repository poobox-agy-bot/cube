# cube

Interactive **2&times;2 Pocket Cube** and **3&times;3 Rubik's Cube** simulators, validators, and solvers in pure vanilla HTML/CSS/JS.

## Running Locally

- **2&times;2 Solver:** Open `index.html` in any browser
- **3&times;3 Solver:** Open `3x3.html` in any browser (or serve with `python3 -m http.server` for background Web Worker solving)
- `2x2fiddle.html`, `2x2fiddle.css`, and `2x2fiddle.js` remain directly runnable in [JSFiddle](https://jsfiddle.net/).

## 2&times;2 Features (`index.html`)

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

## 3&times;3 Features (`3x3.html`)

- Fast client-side **Kociemba Two-Phase IDA\* Solver** (runs in a background Web Worker when served over HTTP, with automatic main-thread fallback on `file://`), solving arbitrary 3&times;3 scrambles in ~20–23 moves
- Full **7-invariant 3&times;3 solvability validator**: sticker counts, fixed center colors, 8 chiral corners, 12 edges, corner twist ($\bmod\;3$), edge flip ($\bmod\;2$), and coupled corner/edge permutation parity
- Synchronized **3D perspective cube** + **2D unfolded net**, all 18 WCA moves (`U, D, L, R, F, B` with `'` and `2`), 25-move random scrambler, and step-by-step animated solution playback
