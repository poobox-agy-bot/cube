// in our 2x2 solved cube: blue is opposite green, orange is opp red, white is opp yellow.
// looking at the green face, adjacent colors going clockwise are: y, o, w, r

// TODO: https://twitter.com/i/status/1593771091738374144 is a better visualization.
// TODO: inputs for DFS vs BFS and implement a depth limit for async iterative DFS.

const solvedState = "byrbyoyrgygobrwbowrgwgow";

const COLOR_NAMES = {
  b: "blue",
  g: "green",
  o: "orange",
  r: "red",
  w: "white",
  y: "yellow",
};

const OPPOSITE_COLOR = {
  b: "g",
  g: "b",
  o: "r",
  r: "o",
  w: "y",
  y: "w",
};

// Each corner's 3 state indices ordered outward-clockwise starting from its U (yellow) or D (white) facelet.
const CORNER_SLOTS = [
  { name: "top-left-back", cw: [1, 2, 0], solved: "yrb" },
  { name: "top-right-back", cw: [4, 3, 5], solved: "ybo" },
  { name: "top-left-front", cw: [6, 8, 7], solved: "ygr" },
  { name: "top-right-front", cw: [9, 11, 10], solved: "yog" },
  { name: "bottom-left-back", cw: [14, 12, 13], solved: "wbr" },
  { name: "bottom-right-back", cw: [17, 16, 15], solved: "wob" },
  { name: "bottom-left-front", cw: [20, 18, 19], solved: "wrg" },
  { name: "bottom-right-front", cw: [23, 21, 22], solved: "wgo" },
];

const ANCHORED_CORNER_INDEX = 4; // bottom-left-back (DLB), fixed under <U, R, F>

const VALID_CORNER_PIECES = new Set(CORNER_SLOTS.map((s) => s.solved));

function validateCubeState(state) {
  if (typeof state !== "string" || state.length !== 24) {
    return { valid: false, reason: "Cube state must contain all 24 stickers." };
  }

  // 1. Check sticker color counts (4 of each of the 6 colors)
  const counts = { b: 0, g: 0, o: 0, r: 0, w: 0, y: 0 };
  for (const ch of state) {
    if (!(ch in counts)) {
      return { valid: false, reason: "Unknown sticker color '" + ch + "'." };
    }
    counts[ch]++;
  }
  const wrongCounts = Object.entries(counts)
    .filter(([, count]) => count !== 4)
    .map(([ch, count]) => count + " " + COLOR_NAMES[ch]);
  if (wrongCounts.length > 0) {
    return {
      valid: false,
      reason: "Invalid sticker counts (need 4 of each color): " + wrongCounts.join(", ") + ".",
    };
  }

  // 2. Check anchored corner remains solved
  const anchor = CORNER_SLOTS[ANCHORED_CORNER_INDEX];
  const anchorTri = anchor.cw.map((idx) => state[idx]).join("");
  if (anchorTri !== anchor.solved) {
    return {
      valid: false,
      reason: "Anchored corner (" + anchor.name + ") must remain in its solved orientation.",
    };
  }

  // 3. Check each corner is a valid, distinct physical cubie with right-handed chirality
  const seenPieces = new Map();
  let twistSum = 0;

  for (const slot of CORNER_SLOTS) {
    const tri = slot.cw.map((idx) => state[idx]).join("");
    const uniqueColors = new Set(tri);
    if (uniqueColors.size !== 3) {
      return {
        valid: false,
        reason: "Invalid corner at " + slot.name + ": contains duplicate color stickers.",
      };
    }
    for (const ch of tri) {
      if (uniqueColors.has(OPPOSITE_COLOR[ch])) {
        return {
          valid: false,
          reason:
            "Invalid corner at " +
            slot.name +
            ": opposite colors (" +
            COLOR_NAMES[ch] +
            " & " +
            COLOR_NAMES[OPPOSITE_COLOR[ch]] +
            ") cannot share a corner.",
        };
      }
    }

    // Exactly one sticker on a valid corner is yellow ('y') or white ('w')
    let twist = -1;
    for (let t = 0; t < 3; t++) {
      if (tri[t] === "y" || tri[t] === "w") {
        twist = t;
        break;
      }
    }
    const canonical = tri.slice(twist) + tri.slice(0, twist);
    if (!VALID_CORNER_PIECES.has(canonical)) {
      return {
        valid: false,
        reason:
          "Invalid corner at " +
          slot.name +
          ": stickers have mirrored (impossible) chirality.",
      };
    }
    if (seenPieces.has(canonical)) {
      return {
        valid: false,
        reason:
          "Duplicate corner piece (" +
          [...canonical].map((c) => COLOR_NAMES[c]).join("/") +
          ") at " +
          seenPieces.get(canonical) +
          " and " +
          slot.name +
          ".",
      };
    }
    seenPieces.set(canonical, slot.name);
    twistSum += twist;
  }

  // 4. Corner orientation invariant: sum of clockwise twists mod 3 must be 0
  if (twistSum % 3 !== 0) {
    return {
      valid: false,
      reason:
        "Unsolvable corner twist: total corner orientation (" +
        twistSum +
        " mod 3 != 0) is impossible by legal moves.",
    };
  }

  return { valid: true, reason: "Valid cube state." };
}

function toggleColor(cell) {
  // function for modifying the starting position of the cube.
  cancelActiveSearch();
  const classes = cell.classList;
  if (classes.replace("yellow", "blue")) {
    refreshValidationStatus();
    return;
  }
  if (classes.replace("blue", "green")) {
    refreshValidationStatus();
    return;
  }
  if (classes.replace("green", "orange")) {
    refreshValidationStatus();
    return;
  }
  if (classes.replace("orange", "red")) {
    refreshValidationStatus();
    return;
  }
  if (classes.replace("red", "white")) {
    refreshValidationStatus();
    return;
  }
  if (classes.replace("white", "yellow")) {
    refreshValidationStatus();
    return;
  }
  classes.add("white");
  refreshValidationStatus();
}

function cellColor(cell) {
  if (cell.classList.contains("blue")) return "b";
  if (cell.classList.contains("green")) return "g";
  if (cell.classList.contains("orange")) return "o";
  if (cell.classList.contains("red")) return "r";
  if (cell.classList.contains("white")) return "w";
  if (cell.classList.contains("yellow")) return "y";
}

var domCube; // the Element

function getDomFaces() {
  var faces = {};
  for (let i = 0; i < domCube.children.length; i++) {
    const child = domCube.children[i];
    for (const name of ["back", "top", "left", "front", "right", "bottom"]) {
      if (child.classList.contains(name)) {
        faces[name] = child;
      }
    }
  }
  return faces;
}

function domCubeToState() {
  // cubestates are (2) layers of "corners" of which there are only 8.
  // chunks are named by their 3 face colors in the order(where present): back,top,left,front,right,bottom.
  // layers of 3 letter chunks are ordered:
  // top-left-back, top-right-back, top-left-front, top-right-front, bottom-left-back...
  const f = getDomFaces();
  const tlb = [cellColor(f.back.children[2]), cellColor(f.top.children[0]), cellColor(f.left.children[0])].join("");
  const trb = [cellColor(f.back.children[3]), cellColor(f.top.children[1]), cellColor(f.right.children[1])].join("");
  const tlf = [cellColor(f.top.children[2]), cellColor(f.left.children[1]), cellColor(f.front.children[0])].join("");
  const trf = [cellColor(f.top.children[3]), cellColor(f.front.children[1]), cellColor(f.right.children[0])].join("");
  const blb = [cellColor(f.back.children[0]), cellColor(f.left.children[2]), cellColor(f.bottom.children[2])].join("");
  const brb = [cellColor(f.back.children[1]), cellColor(f.right.children[3]), cellColor(f.bottom.children[3])].join("");
  const blf = [cellColor(f.left.children[3]), cellColor(f.front.children[2]), cellColor(f.bottom.children[0])].join("");
  const brf = [cellColor(f.front.children[3]), cellColor(f.right.children[2]), cellColor(f.bottom.children[1])].join("");
  return [tlb, trb, tlf, trf, blb, brb, blf, brf].join("");
}

function splitState(state) {
  var tmp = new Array(8);
  for (let i = 0; i < 24; i += 3) {
    tmp[i / 3] = state.substring(i, i + 3);
  }
  return tmp;
}

function setCellColorChar(cell, ch) {
  const colorMap = { b: "blue", g: "green", o: "orange", r: "red", w: "white", y: "yellow" };
  cell.classList.remove("blue", "green", "orange", "red", "white", "yellow");
  cell.classList.add(colorMap[ch]);
}

function stateToDomCube(state) {
  const f = getDomFaces();
  const [tlb, trb, tlf, trf, blb, brb, blf, brf] = splitState(state);

  setCellColorChar(f.back.children[2], tlb[0]);
  setCellColorChar(f.top.children[0], tlb[1]);
  setCellColorChar(f.left.children[0], tlb[2]);

  setCellColorChar(f.back.children[3], trb[0]);
  setCellColorChar(f.top.children[1], trb[1]);
  setCellColorChar(f.right.children[1], trb[2]);

  setCellColorChar(f.top.children[2], tlf[0]);
  setCellColorChar(f.left.children[1], tlf[1]);
  setCellColorChar(f.front.children[0], tlf[2]);

  setCellColorChar(f.top.children[3], trf[0]);
  setCellColorChar(f.front.children[1], trf[1]);
  setCellColorChar(f.right.children[0], trf[2]);

  setCellColorChar(f.back.children[0], blb[0]);
  setCellColorChar(f.left.children[2], blb[1]);
  setCellColorChar(f.bottom.children[2], blb[2]);

  setCellColorChar(f.back.children[1], brb[0]);
  setCellColorChar(f.right.children[3], brb[1]);
  setCellColorChar(f.bottom.children[3], brb[2]);

  setCellColorChar(f.left.children[3], blf[0]);
  setCellColorChar(f.front.children[2], blf[1]);
  setCellColorChar(f.bottom.children[0], blf[2]);

  setCellColorChar(f.front.children[3], brf[0]);
  setCellColorChar(f.right.children[2], brf[1]);
  setCellColorChar(f.bottom.children[1], brf[2]);
  refreshValidationStatus();
}

var countElement;
var solutionElement;
var validationElement;
var stop = false;
var activeTimers = [];

function cancelActiveSearch() {
  stop = true;
  while (activeTimers.length > 0) {
    clearInterval(activeTimers.pop());
  }
}

function refreshValidationStatus() {
  if (!domCube || !validationElement) return { valid: true, reason: "" };
  const check = validateCubeState(domCubeToState());
  validationElement.textContent = check.reason;
  validationElement.classList.toggle("valid", check.valid);
  validationElement.classList.toggle("invalid", !check.valid);
  return check;
}

function init() {
  document.getElementById("stopButton").addEventListener("click", () => {
    cancelActiveSearch();
  });
  domCube = document.getElementById("startCube");
  countElement = document.getElementById("counter");
  solutionElement = document.getElementById("solution");
  validationElement = document.getElementById("validationStatus");
  refreshValidationStatus();
}

function updateCount(count) {
  const label = "searched " + count + " unique states.";
  countElement.textContent = label;
  return count;
}

function showSolution(path) {
  solutionElement.textContent = path;
}

function U() {
  cancelActiveSearch();
  stateToDomCube(rotateTopClock(domCubeToState()));
}
function Up() {
  cancelActiveSearch();
  stateToDomCube(rotateTopAnti(domCubeToState()));
}
function U2() {
  cancelActiveSearch();
  stateToDomCube(rotateTopHalf(domCubeToState()));
}
function R() {
  cancelActiveSearch();
  stateToDomCube(rotateRightClock(domCubeToState()));
}
function Rp() {
  cancelActiveSearch();
  stateToDomCube(rotateRightAnti(domCubeToState()));
}
function R2() {
  cancelActiveSearch();
  stateToDomCube(rotateRightHalf(domCubeToState()));
}
function F() {
  cancelActiveSearch();
  stateToDomCube(rotateFrontClock(domCubeToState()));
}
function Fp() {
  cancelActiveSearch();
  stateToDomCube(rotateFrontAnti(domCubeToState()));
}
function F2() {
  cancelActiveSearch();
  stateToDomCube(rotateFrontHalf(domCubeToState()));
}

function resetCube() {
  cancelActiveSearch();
  stateToDomCube(solvedState);
  updateCount(0);
  showSolution("");
}

function scrambleCube(steps = 11) {
  cancelActiveSearch();
  let state = solvedState;
  let lastFace = "";
  for (let i = 0; i < steps; i++) {
    const candidates = SOLVER_MOVES.filter((m) => m.face !== lastFace);
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    lastFace = chosen.face;
    state = chosen.fn(state);
  }
  stateToDomCube(state);
  updateCount(0);
  showSolution("");
}

// layer rotations

//           0123456789 10 11 12 13 14 15 16 17 18 19 20 21 22 23
//  state = "abcdefghij k  l  m  n  o  p  q  r  s  t  u  v  w  x";
// "BackClock: dfepqrghijklabcmonstuvwx"
function rotateBackClock(state) {
  return "" + state.substring(3, 4) + state.substring(5, 6) + state.substring(4, 5) + state.substring(15, 18) +
    state.substring(6, 12) + state.substring(0, 3) +
    state.substring(12, 13) + state.substring(14, 15) + state.substring(13, 14) + state.substring(18, 24);
}

// "BackAnti: mnoacbghijklprqdefstuvwx"
function rotateBackAnti(state) {
  return "" + state.substring(12, 15) + state.substring(0, 1) + state.substring(2, 3) + state.substring(1, 2) +
    state.substring(6, 12) + state.substring(15, 16) + state.substring(17, 18) + state.substring(16, 17) +
    state.substring(3, 6) + state.substring(18, 24);
}

// "TopClock: hgicbajklefdmnopqrstuvwx"
function rotateTopClock(state) {
  return "" + state.substring(7, 8) + state.substring(6, 7) + state.substring(8, 9) +
    state.substring(2, 3) + state.substring(1, 2) + state.substring(0, 1) + state.substring(9, 12) +
    state.substring(4, 6) + state.substring(3, 4) + state.substring(12, 24);
}

// "TopAnti: fedljkbacghimnopqrstuvwx"
function rotateTopAnti(state) {
  return "" + state.substring(5, 6) + state.substring(4, 5) + state.substring(3, 4) + state.substring(11, 12) +
    state.substring(9, 11) + state.substring(1, 2) + state.substring(0, 1) + state.substring(2, 3) +
    state.substring(6, 9) + state.substring(12, 24);
}

// "LeftClock: omndefacbjklustpqrhgivwx"
function rotateLeftClock(state) {
  return "" + state.substring(14, 15) + state.substring(12, 14) + state.substring(3, 6) +
    state.substring(0, 1) + state.substring(2, 3) + state.substring(1, 2) +
    state.substring(9, 12) + state.substring(20, 21) +
    state.substring(18, 20) + state.substring(15, 18) + state.substring(7, 8) +
    state.substring(6, 7) + state.substring(8, 9) + state.substring(21, 24);
}

// "LeftAnti: gihdeftsujklbcapqrnomvwx"
function rotateLeftAnti(state) {
  return "" + state.substring(6, 7) + state.substring(8, 9) + state.substring(7, 8) + state.substring(3, 6) +
    state.substring(19, 20) + state.substring(18, 19) + state.substring(20, 21) + state.substring(9, 12) +
    state.substring(1, 3) + state.substring(0, 1) + state.substring(15, 18) + state.substring(13, 15) +
    state.substring(12, 13) + state.substring(21, 24);
}

// "FrontClock: abcdefsuthigmnopqrxvwkjl"
function rotateFrontClock(state) {
  return "" + state.substring(0, 6) + state.substring(18, 19) + state.substring(20, 21) + state.substring(19, 20) +
    state.substring(7, 9) + state.substring(6, 7) + state.substring(12, 18) + state.substring(23, 24) +
    state.substring(21, 23) + state.substring(10, 11) + state.substring(9, 10) + state.substring(11, 12);
}

// "FrontAnti: abcdefljkwvxmnopqrgihtus"
function rotateFrontAnti(state) {
  return "" + state.substring(0, 6) + state.substring(11, 12) + state.substring(9, 11) + state.substring(22, 23) +
    state.substring(21, 22) + state.substring(23, 24) + state.substring(12, 18) + state.substring(6, 7) +
    state.substring(8, 9) + state.substring(7, 8) + state.substring(19, 21) + state.substring(18, 19);
}

// "RightClock: abcjklghivxwmnoefdsturqp"
function rotateRightClock(state) {
  return "" + state.substring(0, 3) + state.substring(9, 12) + state.substring(6, 9) + state.substring(21, 22) +
    state.substring(23, 24) + state.substring(22, 23) + state.substring(12, 15) + state.substring(4, 6) +
    state.substring(3, 4) + state.substring(18, 21) + state.substring(17, 18) + state.substring(16, 17) +
    state.substring(15, 16);
}

// "RightAnti: abcrpqghidefmnoxwvstujlk"
function rotateRightAnti(state) {
  return "" + state.substring(0, 3) + state.substring(17, 18) + state.substring(15, 17) + state.substring(6, 9) +
    state.substring(3, 6) + state.substring(12, 15) + state.substring(23, 24) + state.substring(22, 23) +
    state.substring(21, 22) + state.substring(18, 21) + state.substring(9, 10) + state.substring(11, 12) +
    state.substring(10, 11);
}

// "BottomClock: abcdefghijklqprwvxmnostu"
function rotateBottomClock(state) {
  return "" + state.substring(0, 12) + state.substring(16, 17) + state.substring(15, 16) + state.substring(17, 18) +
    state.substring(22, 23) + state.substring(21, 22) + state.substring(23, 24) + state.substring(12, 15) +
    state.substring(18, 21);
}

// "BottomAnti: abcdefghijklstunmovwxqpr"
function rotateBottomAnti(state) {
  return "" + state.substring(0, 12) + state.substring(18, 21) + state.substring(13, 14) + state.substring(12, 13) +
    state.substring(14, 15) + state.substring(21, 24) + state.substring(16, 17) + state.substring(15, 16) +
    state.substring(17, 18);
}

function rotateTopHalf(state) {
  return rotateTopClock(rotateTopClock(state));
}
function rotateRightHalf(state) {
  return rotateRightClock(rotateRightClock(state));
}
function rotateFrontHalf(state) {
  return rotateFrontClock(rotateFrontClock(state));
}

// Standard WCA 2x2 generator set <U, R, F> in Half-Turn Metric (anchors DLB corner)
const SOLVER_MOVES = [
  { name: "U", face: "U", fn: rotateTopClock },
  { name: "U'", face: "U", fn: rotateTopAnti },
  { name: "U2", face: "U", fn: rotateTopHalf },
  { name: "R", face: "R", fn: rotateRightClock },
  { name: "R'", face: "R", fn: rotateRightAnti },
  { name: "R2", face: "R", fn: rotateRightHalf },
  { name: "F", face: "F", fn: rotateFrontClock },
  { name: "F'", face: "F", fn: rotateFrontAnti },
  { name: "F2", face: "F", fn: rotateFrontHalf },
];

function lastMoveFace(path) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const lastSpace = trimmed.lastIndexOf(" ");
  const token = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1);
  return token[0];
}

var depthLimit = Number.MAX_SAFE_INTEGER;
var maxVisited = Number.MAX_SAFE_INTEGER;

function recursiveDfs(start, end, visited, path, depth) {
  if (depth > depthLimit) return false;
  if (visited.size > maxVisited) return false;

  if (start === end) return path.trim();
  if (visited.has(start)) return false;
  visited.add(start);

  const prevFace = lastMoveFace(path);
  for (const move of SOLVER_MOVES) {
    if (move.face === prevFace) continue;
    const tmp = recursiveDfs(move.fn(start), end, visited, path + " " + move.name, depth + 1);
    if (tmp !== false) return tmp;
  }

  return false;
}

function search(start, end, breadthFirst) {
  var dq = [[start, ""]];
  var head = 0;
  var visited = new Set();

  while (head < dq.length) {
    if (visited.size > maxVisited) return visited.size;

    const [currentState, currentPath] = breadthFirst ? dq[head++] : dq.pop();
    if (visited.has(currentState)) continue;
    visited.add(currentState);
    if (currentState === end) return currentPath.trim();

    const prevFace = lastMoveFace(currentPath);
    for (const move of SOLVER_MOVES) {
      if (move.face === prevFace) continue;
      dq.push([move.fn(currentState), currentPath + " " + move.name]);
    }
  }
  return "unsolved";
}

function asyncSearch(start, end, breadthFirst, callback) {
  var dq = [[start, ""]];
  var head = 0;
  var visited = new Set();
  var found = false;
  var result;

  var iterate = function () {
    const [currentState, currentPath] = breadthFirst ? dq[head++] : dq.pop();
    if (visited.has(currentState)) return;

    visited.add(currentState);

    if (currentState === end) {
      result = currentPath.trim();
      found = true;
      return;
    }

    const prevFace = lastMoveFace(currentPath);
    for (const move of SOLVER_MOVES) {
      if (move.face === prevFace) continue;
      dq.push([move.fn(currentState), currentPath + " " + move.name]);
    }
  };

  var runnerId, updaterId;
  var runsPerInterval = 10;
  var stopAdjusting = false;
  var updaterTime;

  var updater = function () {
    updateCount(visited.size);
    if (stopAdjusting) return;

    if (updaterTime) {
      if (2100 > new Date() - updaterTime) {
        runsPerInterval += 10;
      } else {
        stopAdjusting = true;
        runsPerInterval = Math.max(5, runsPerInterval - 5);
      }
    }
    updaterTime = new Date();
  };

  var runner = function () {
    for (let i = 0; i < runsPerInterval; i++) {
      const hasItems = breadthFirst ? head < dq.length : dq.length > 0;
      if (hasItems && !found && !stop) {
        iterate();
      } else {
        clearInterval(runnerId);
        clearInterval(updaterId);
        updater();
        callback(found ? result : null);
        break;
      }
    }
  };
  updaterId = setInterval(updater, 500);
  runnerId = setInterval(runner, 0);
  activeTimers.push(updaterId, runnerId);
}

function reverseMove(move) {
  if (!move) return "";
  if (move.endsWith("'")) return move.slice(0, -1);
  if (move.endsWith("2")) return move;
  return move + "'";
}

function reversePath(path) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).reverse().map(reverseMove).join(" ");
}

function joinPaths(firstPart, secondPart) {
  return [firstPart.trim(), secondPart.trim()].filter(Boolean).join(" ");
}

function asyncBiSearch(start, end, breadthFirst, callback, visited, otherVisited, isForward) {
  // visited is a Map of state to path-from-origin
  var dq = [[start, ""]];
  var head = 0;
  var found = false;
  var result;

  var iterate = function () {
    const [currentState, currentPath] = breadthFirst ? dq[head++] : dq.pop();
    if (visited.has(currentState)) return;

    visited.set(currentState, currentPath);

    if (currentState === end) {
      result = isForward ? currentPath.trim() : reversePath(currentPath);
      found = true;
      return;
    } else if (otherVisited.has(currentState)) {
      if (isForward) {
        result = joinPaths(currentPath, reversePath(otherVisited.get(currentState)));
      } else {
        result = joinPaths(otherVisited.get(currentState), reversePath(currentPath));
      }
      found = true;
      return;
    }

    const prevFace = lastMoveFace(currentPath);
    for (const move of SOLVER_MOVES) {
      if (move.face === prevFace) continue;
      dq.push([move.fn(currentState), currentPath + " " + move.name]);
    }
  };

  var runnerId, updaterId;
  var runsPerInterval = 20;
  var stopAdjusting = false;
  var updateTime;

  var updater = function () {
    updateCount(visited.size + otherVisited.size);
    if (stopAdjusting) return;

    if (updateTime) {
      if (600 > new Date() - updateTime) {
        runsPerInterval += 20;
      } else {
        stopAdjusting = true;
        runsPerInterval = Math.max(10, runsPerInterval - 5);
      }
    }
    updateTime = new Date();
  };

  var runner = function () {
    for (let i = 0; i < runsPerInterval; i++) {
      const hasItems = breadthFirst ? head < dq.length : dq.length > 0;
      if (hasItems && !found && !stop) {
        iterate();
      } else {
        clearInterval(runnerId);
        clearInterval(updaterId);
        updater();
        callback(found ? result : null);
        break;
      }
    }
  };
  updaterId = setInterval(updater, 500);
  runnerId = setInterval(runner, 0);
  activeTimers.push(updaterId, runnerId);
  return [updaterId, runnerId];
}

function bidirectionalSearch(start, end, callback) {
  if (start === end) {
    updateCount(1);
    callback("");
    return;
  }

  var startToEndVisited = new Map();
  var endToStartVisited = new Map();
  var startIntervals = new Array(2);
  var endIntervals = new Array(2);
  var settled = false;

  var finish = function (otherIntervals, result) {
    if (settled) return;
    settled = true;
    clearInterval(otherIntervals[0]);
    clearInterval(otherIntervals[1]);
    callback(result);
  };

  var s = asyncBiSearch(
    start,
    end,
    true,
    (res) => finish(endIntervals, res),
    startToEndVisited,
    endToStartVisited,
    true
  );
  var e = asyncBiSearch(
    end,
    start,
    true,
    (res) => finish(startIntervals, res),
    endToStartVisited,
    startToEndVisited,
    false
  );

  startIntervals[0] = s[0];
  startIntervals[1] = s[1];
  endIntervals[0] = e[0];
  endIntervals[1] = e[1];
}

function runTest() {
  cancelActiveSearch();
  stop = false;

  var state = domCubeToState();
  const check = refreshValidationStatus();
  if (!check.valid) {
    updateCount(0);
    showSolution("Cannot solve: " + check.reason);
    return;
  }

  updateCount(0);
  showSolution("");
  var startTime = new Date();

  bidirectionalSearch(state, solvedState, (result) => {
    const elapsed = new Date().getTime() - startTime.getTime();
    if (result === null) {
      showSolution(stop ? "Search stopped." : "No solution found.");
    } else if (result === "") {
      showSolution("Already solved! (0 moves, " + elapsed + " ms)");
    } else {
      showSolution("Solution: " + result + " (" + elapsed + " ms)");
    }
    stop = false;
  });
}

init();
