// 3x3 Rubik's Cube Simulator, Validator, and Kociemba Two-Phase IDA* Solver
// Face order in 54-char state: back(0..8), top(9..17), left(18..26), front(27..35), right(36..44), bottom(45..53)

const FACE_ORDER_3X3 = ["back", "top", "left", "front", "right", "bottom"];
const FACE_TITLES_3X3 = {
  back: "Back (B) face",
  top: "Up (U) face",
  left: "Left (L) face",
  front: "Front (F) face",
  right: "Right (R) face",
  bottom: "Down (D) face",
};
const FACE_COLOR_CHAR = {
  back: "b",
  top: "y",
  left: "r",
  front: "g",
  right: "o",
  bottom: "w",
};
const CHAR_TO_CSS = {
  b: "blue",
  g: "green",
  o: "orange",
  r: "red",
  w: "white",
  y: "yellow",
};
const COLOR_CYCLE = ["y", "b", "g", "o", "r", "w"];
const OPPOSITE_3X3 = { b: "g", g: "b", o: "r", r: "o", w: "y", y: "w" };

const SOLVED_54 = FACE_ORDER_3X3.map((f) => FACE_COLOR_CHAR[f].repeat(9)).join("");

// Exact 3D clockwise quarter-turn permutations on the 54-facelet state
const CW_FACELET_PERMS = {
  U: [0, 1, 2, 3, 4, 5, 20, 19, 18, 15, 12, 9, 16, 13, 10, 17, 14, 11, 27, 28, 29, 21, 22, 23, 24, 25, 26, 36, 37, 38, 30, 31, 32, 33, 34, 35, 8, 7, 6, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
  R: [0, 1, 11, 3, 4, 14, 6, 7, 17, 9, 10, 29, 12, 13, 32, 15, 16, 35, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 47, 30, 31, 50, 33, 34, 53, 42, 39, 36, 43, 40, 37, 44, 41, 38, 45, 46, 2, 48, 49, 5, 51, 52, 8],
  F: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 26, 23, 20, 18, 19, 45, 21, 22, 46, 24, 25, 47, 33, 30, 27, 34, 31, 28, 35, 32, 29, 15, 37, 38, 16, 40, 41, 17, 43, 44, 42, 39, 36, 48, 49, 50, 51, 52, 53],
  D: [44, 43, 42, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 2, 1, 0, 27, 28, 29, 30, 31, 32, 24, 25, 26, 36, 37, 38, 39, 40, 41, 33, 34, 35, 51, 48, 45, 52, 49, 46, 53, 50, 47],
  L: [45, 1, 2, 48, 4, 5, 51, 7, 8, 0, 10, 11, 3, 13, 14, 6, 16, 17, 24, 21, 18, 25, 22, 19, 26, 23, 20, 9, 28, 29, 12, 31, 32, 15, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 27, 46, 47, 30, 49, 50, 33, 52, 53],
  B: [6, 3, 0, 7, 4, 1, 8, 5, 2, 38, 41, 44, 12, 13, 14, 15, 16, 17, 11, 19, 20, 10, 22, 23, 9, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 53, 39, 40, 52, 42, 43, 51, 45, 46, 47, 48, 49, 50, 18, 21, 24],
};

const ALL_FACELET_PERMS = {};
for (const [m, cw] of Object.entries(CW_FACELET_PERMS)) {
  const half = cw.map((_, i) => cw[cw[i]]);
  const ccw = cw.map((_, i) => half[cw[i]]);
  ALL_FACELET_PERMS[m] = cw;
  ALL_FACELET_PERMS[m + "2"] = half;
  ALL_FACELET_PERMS[m + "'"] = ccw;
}

const MOVE_NAMES_6 = ["U", "R", "F", "D", "L", "B"];
const ALL_18_NAMES = [];
for (const m of MOVE_NAMES_6) {
  ALL_18_NAMES.push(m, m + "2", m + "'");
}

function applyFaceletMove(state, moveName) {
  const perm = ALL_FACELET_PERMS[moveName];
  let out = "";
  for (let i = 0; i < 54; i++) out += state[perm[i]];
  return out;
}

// 8 Corners (outward-clockwise starting from U/D facelet) and 12 Edges (primary facelet first)
const CORNER_SLOTS_3X3 = [
  { name: "URF", idx: [17, 36, 29], solved: "yog" },
  { name: "UFL", idx: [15, 27, 20], solved: "ygr" },
  { name: "ULB", idx: [9, 18, 6], solved: "yrb" },
  { name: "UBR", idx: [11, 8, 38], solved: "ybo" },
  { name: "DFR", idx: [47, 35, 42], solved: "wgo" },
  { name: "DLF", idx: [45, 26, 33], solved: "wrg" },
  { name: "DBL", idx: [51, 0, 24], solved: "wbr" },
  { name: "DRB", idx: [53, 44, 2], solved: "wob" },
];

const EDGE_SLOTS_3X3 = [
  { name: "UR", idx: [14, 37], solved: "yo" },
  { name: "UF", idx: [16, 28], solved: "yg" },
  { name: "UL", idx: [12, 19], solved: "yr" },
  { name: "UB", idx: [10, 7], solved: "yb" },
  { name: "DR", idx: [50, 43], solved: "wo" },
  { name: "DF", idx: [46, 34], solved: "wg" },
  { name: "DL", idx: [48, 25], solved: "wr" },
  { name: "DB", idx: [52, 1], solved: "wb" },
  { name: "FR", idx: [32, 39], solved: "go" },
  { name: "FL", idx: [30, 23], solved: "gr" },
  { name: "BL", idx: [3, 21], solved: "br" },
  { name: "BR", idx: [5, 41], solved: "bo" },
];

const CORNER_PIECE_INDEX = new Map(CORNER_SLOTS_3X3.map((c, i) => [c.solved, i]));
const EDGE_PIECE_INDEX = new Map(EDGE_SLOTS_3X3.map((e, i) => [e.solved, i]));

function permutationParity(arr) {
  let inv = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) inv++;
    }
  }
  return inv & 1;
}

function validateAndParse3x3(state) {
  if (typeof state !== "string" || state.length !== 54) {
    return { valid: false, reason: "Cube state must contain all 54 stickers." };
  }

  // 1. Check sticker counts (9 of each color)
  const counts = { b: 0, g: 0, o: 0, r: 0, w: 0, y: 0 };
  for (const ch of state) {
    if (!(ch in counts)) return { valid: false, reason: "Unknown sticker color '" + ch + "'." };
    counts[ch]++;
  }
  const badCounts = Object.entries(counts)
    .filter(([, n]) => n !== 9)
    .map(([ch, n]) => n + " " + CHAR_TO_CSS[ch]);
  if (badCounts.length > 0) {
    return {
      valid: false,
      reason: "Invalid sticker counts (need 9 of each color): " + badCounts.join(", ") + ".",
    };
  }

  // 2. Check 6 fixed center facelets
  for (let fi = 0; fi < 6; fi++) {
    const fname = FACE_ORDER_3X3[fi];
    const expected = FACE_COLOR_CHAR[fname];
    if (state[fi * 9 + 4] !== expected) {
      return {
        valid: false,
        reason: "Center sticker of " + fname + " face must remain " + CHAR_TO_CSS[expected] + ".",
      };
    }
  }

  // 3. Parse and validate 8 corners
  const cp = new Array(8);
  const co = new Array(8);
  const seenCorners = new Map();
  let twistSum = 0;

  for (let i = 0; i < 8; i++) {
    const slot = CORNER_SLOTS_3X3[i];
    const tri = slot.idx.map((k) => state[k]).join("");
    const uniq = new Set(tri);
    if (uniq.size !== 3) {
      return { valid: false, reason: "Corner " + slot.name + " has duplicate sticker colors." };
    }
    for (const ch of tri) {
      if (uniq.has(OPPOSITE_3X3[ch])) {
        return {
          valid: false,
          reason: "Corner " + slot.name + " has opposite colors (" + CHAR_TO_CSS[ch] + "/" + CHAR_TO_CSS[OPPOSITE_3X3[ch]] + ").",
        };
      }
    }
    let twist = -1;
    for (let t = 0; t < 3; t++) {
      if (tri[t] === "y" || tri[t] === "w") {
        twist = t;
        break;
      }
    }
    const canon = tri.slice(twist) + tri.slice(0, twist);
    if (!CORNER_PIECE_INDEX.has(canon)) {
      return {
        valid: false,
        reason: "Corner " + slot.name + " has mirrored (impossible) sticker chirality.",
      };
    }
    const pieceId = CORNER_PIECE_INDEX.get(canon);
    if (seenCorners.has(pieceId)) {
      return {
        valid: false,
        reason: "Duplicate corner cubie at " + seenCorners.get(pieceId) + " and " + slot.name + ".",
      };
    }
    seenCorners.set(pieceId, slot.name);
    cp[i] = pieceId;
    co[i] = twist;
    twistSum += twist;
  }

  // 4. Parse and validate 12 edges
  const ep = new Array(12);
  const eo = new Array(12);
  const seenEdges = new Map();
  let flipSum = 0;

  for (let i = 0; i < 12; i++) {
    const slot = EDGE_SLOTS_3X3[i];
    const duo = slot.idx.map((k) => state[k]).join("");
    if (duo[0] === duo[1] || OPPOSITE_3X3[duo[0]] === duo[1]) {
      return {
        valid: false,
        reason: "Edge " + slot.name + " has invalid color pair (" + CHAR_TO_CSS[duo[0]] + "/" + CHAR_TO_CSS[duo[1]] + ").",
      };
    }
    let pieceId = -1;
    let flip = 0;
    if (EDGE_PIECE_INDEX.has(duo)) {
      pieceId = EDGE_PIECE_INDEX.get(duo);
      flip = 0;
    } else {
      const rev = duo[1] + duo[0];
      if (EDGE_PIECE_INDEX.has(rev)) {
        pieceId = EDGE_PIECE_INDEX.get(rev);
        flip = 1;
      }
    }
    if (pieceId === -1) {
      return { valid: false, reason: "Invalid edge piece at " + slot.name + "." };
    }
    if (seenEdges.has(pieceId)) {
      return {
        valid: false,
        reason: "Duplicate edge cubie at " + seenEdges.get(pieceId) + " and " + slot.name + ".",
      };
    }
    seenEdges.set(pieceId, slot.name);
    ep[i] = pieceId;
    eo[i] = flip;
    flipSum += flip;
  }

  // 5. Group-theoretic invariants
  if (twistSum % 3 !== 0) {
    return {
      valid: false,
      reason: "Unsolvable corner twist: total corner orientation (" + twistSum + " mod 3 != 0) is impossible.",
    };
  }
  if (flipSum % 2 !== 0) {
    return {
      valid: false,
      reason: "Unsolvable edge flip: odd number of flipped edges (" + flipSum + ").",
    };
  }
  if (permutationParity(cp) !== permutationParity(ep)) {
    return {
      valid: false,
      reason: "Unsolvable permutation parity: corner parity and edge parity do not match (single swapped pair).",
    };
  }

  return { valid: true, reason: "Valid 3×3 cube state.", cubie: { cp, co, ep, eo } };
}

// ============================================================================
// Kociemba Two-Phase IDA* Engine (self-contained so it can run in a Web Worker
// or directly on the main thread if file:// restricts Blob Workers)
// ============================================================================

function createKociembaEngine() {
  const CUBIE_MOVES_6 = [
    // U
    { cp: [3, 0, 1, 2, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0], ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    // R
    { cp: [4, 1, 2, 0, 7, 5, 6, 3], co: [2, 0, 0, 1, 1, 0, 0, 2], ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    // F
    { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [1, 2, 0, 0, 2, 1, 0, 0], ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11], eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0] },
    // D
    { cp: [0, 1, 2, 3, 5, 6, 7, 4], co: [0, 0, 0, 0, 0, 0, 0, 0], ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    // L
    { cp: [0, 2, 6, 3, 4, 1, 5, 7], co: [0, 1, 2, 0, 0, 2, 1, 0], ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    // B
    { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 1, 2, 0, 0, 2, 1], ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7], eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1] },
  ];

  const MOVE_NAMES_18 = [
    "U", "U2", "U'", "R", "R2", "R'", "F", "F2", "F'",
    "D", "D2", "D'", "L", "L2", "L'", "B", "B2", "B'",
  ];
  const P2_MOVES = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];
  const P2_SET = new Set(P2_MOVES);

  function mulCubie(a, b) {
    const cp = new Array(8);
    const co = new Array(8);
    const ep = new Array(12);
    const eo = new Array(12);
    for (let i = 0; i < 8; i++) {
      cp[i] = a.cp[b.cp[i]];
      co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
    }
    for (let i = 0; i < 12; i++) {
      ep[i] = a.ep[b.ep[i]];
      eo[i] = (a.eo[b.ep[i]] + b.eo[i]) & 1;
    }
    return { cp, co, ep, eo };
  }

  const ALL_18_CUBIES = [];
  const ID_CUBIE = {
    cp: [0, 1, 2, 3, 4, 5, 6, 7],
    co: [0, 0, 0, 0, 0, 0, 0, 0],
    ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  for (let f = 0; f < 6; f++) {
    let cur = ID_CUBIE;
    for (let p = 0; p < 3; p++) {
      cur = mulCubie(cur, CUBIE_MOVES_6[f]);
      ALL_18_CUBIES.push(cur);
    }
  }

  // Binomial table C[n][k] for n <= 12, k <= 4
  const C = Array.from({ length: 13 }, () => [1, 0, 0, 0, 0]);
  for (let n = 1; n <= 12; n++) {
    for (let k = 1; k <= 4; k++) {
      C[n][k] = C[n - 1][k - 1] + C[n - 1][k];
    }
  }
  const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];

  function getTwist(co) {
    let r = 0;
    for (let i = 0; i < 7; i++) r = r * 3 + co[i];
    return r;
  }
  function setTwist(idx) {
    const co = new Array(8);
    let s = 0;
    for (let i = 6; i >= 0; i--) {
      co[i] = idx % 3;
      s += co[i];
      idx = Math.floor(idx / 3);
    }
    co[7] = (3 - (s % 3)) % 3;
    return co;
  }
  function getFlip(eo) {
    let r = 0;
    for (let i = 0; i < 11; i++) r = (r << 1) | eo[i];
    return r;
  }
  function setFlip(idx) {
    const eo = new Array(12);
    let s = 0;
    for (let i = 10; i >= 0; i--) {
      eo[i] = idx & 1;
      s ^= eo[i];
      idx >>= 1;
    }
    eo[11] = s;
    return eo;
  }
  function getSlice(ep) {
    let idx = 0;
    let r = 4;
    for (let i = 11; i >= 0; i--) {
      if (ep[i] >= 8) {
        if (i >= r) idx += C[i][r];
        r--;
      }
    }
    return 494 - idx;
  }
  function setSlice(sliceCoord) {
    let idx = 494 - sliceCoord;
    const ep = new Array(12).fill(-1);
    let r = 4;
    let se = 11;
    for (let i = 11; i >= 0; i--) {
      const c = i >= r ? C[i][r] : 0;
      if (r > 0 && idx >= c) {
        idx -= c;
        ep[i] = se--;
        r--;
      }
    }
    let oe = 0;
    for (let i = 0; i < 12; i++) {
      if (ep[i] === -1) ep[i] = oe++;
    }
    return ep;
  }
  function getPermN(arr, n) {
    let idx = 0;
    for (let i = 0; i < n; i++) {
      let smaller = 0;
      for (let j = i + 1; j < n; j++) {
        if (arr[j] < arr[i]) smaller++;
      }
      idx = idx * (n - i) + smaller;
    }
    return idx;
  }
  function setPermN(idx, n) {
    const elems = Array.from({ length: n }, (_, i) => i);
    const res = new Array(n);
    for (let i = 0; i < n; i++) {
      const f = FACT[n - 1 - i];
      const q = Math.floor(idx / f);
      idx %= f;
      res[i] = elems.splice(q, 1)[0];
    }
    return res;
  }

  let initialized = false;
  let twistMove, flipMove, sliceMove, cpermMove, udepermMove, spermMove;
  let p1TwistSlice, p1FlipSlice, p2CpermSperm, p2UdepSperm;

  function buildPrune(nA, nB, moveA, moveB, nMoves) {
    const total = nA * nB;
    const dist = new Uint8Array(total);
    dist.fill(255);
    dist[0] = 0;
    let frontier = [0];
    let d = 0;
    while (frontier.length > 0) {
      const next = [];
      for (let idx = 0; idx < frontier.length; idx++) {
        const cur = frontier[idx];
        const b = cur % nB;
        const a = (cur - b) / nB;
        const baseA = a * nMoves;
        const baseB = b * nMoves;
        for (let m = 0; m < nMoves; m++) {
          const v = moveA[baseA + m] * nB + moveB[baseB + m];
          if (dist[v] === 255) {
            dist[v] = d + 1;
            next.push(v);
          }
        }
      }
      frontier = next;
      d++;
    }
    return dist;
  }

  function initTables() {
    if (initialized) return;

    // Phase 1 move tables (compute 6 CW moves, chain for 180 & CCW)
    twistMove = new Uint16Array(2187 * 18);
    for (let t = 0; t < 2187; t++) {
      const co = setTwist(t);
      for (let f = 0; f < 6; f++) {
        const mv = CUBIE_MOVES_6[f];
        const nextCo = new Array(8);
        for (let i = 0; i < 8; i++) nextCo[i] = (co[mv.cp[i]] + mv.co[i]) % 3;
        twistMove[t * 18 + f * 3] = getTwist(nextCo);
      }
    }
    for (let f = 0; f < 6; f++) {
      for (let t = 0; t < 2187; t++) {
        const t1 = twistMove[t * 18 + f * 3];
        const t2 = twistMove[t1 * 18 + f * 3];
        const t3 = twistMove[t2 * 18 + f * 3];
        twistMove[t * 18 + f * 3 + 1] = t2;
        twistMove[t * 18 + f * 3 + 2] = t3;
      }
    }

    flipMove = new Uint16Array(2048 * 18);
    for (let fl = 0; fl < 2048; fl++) {
      const eo = setFlip(fl);
      for (let f = 0; f < 6; f++) {
        const mv = CUBIE_MOVES_6[f];
        const nextEo = new Array(12);
        for (let i = 0; i < 12; i++) nextEo[i] = (eo[mv.ep[i]] + mv.eo[i]) & 1;
        flipMove[fl * 18 + f * 3] = getFlip(nextEo);
      }
    }
    for (let f = 0; f < 6; f++) {
      for (let fl = 0; fl < 2048; fl++) {
        const f1 = flipMove[fl * 18 + f * 3];
        const f2 = flipMove[f1 * 18 + f * 3];
        const f3 = flipMove[f2 * 18 + f * 3];
        flipMove[fl * 18 + f * 3 + 1] = f2;
        flipMove[fl * 18 + f * 3 + 2] = f3;
      }
    }

    sliceMove = new Uint16Array(495 * 18);
    for (let s = 0; s < 495; s++) {
      const ep = setSlice(s);
      for (let f = 0; f < 6; f++) {
        const mv = CUBIE_MOVES_6[f];
        const nextEp = new Array(12);
        for (let i = 0; i < 12; i++) nextEp[i] = ep[mv.ep[i]];
        sliceMove[s * 18 + f * 3] = getSlice(nextEp);
      }
    }
    for (let f = 0; f < 6; f++) {
      for (let s = 0; s < 495; s++) {
        const s1 = sliceMove[s * 18 + f * 3];
        const s2 = sliceMove[s1 * 18 + f * 3];
        const s3 = sliceMove[s2 * 18 + f * 3];
        sliceMove[s * 18 + f * 3 + 1] = s2;
        sliceMove[s * 18 + f * 3 + 2] = s3;
      }
    }

    // Phase 2 move tables (compute 6 G1 generators U, R2, F2, D, L2, B2 and chain U/D powers)
    // P2_MOVES order: [0:U, 1:U2, 2:U', 3:R2(4), 4:F2(7), 5:D(9), 6:D2(10), 7:D'(11), 8:L2(13), 9:B2(16)]
    const G1_GEN = [
      { p2Idx: 0, cub: ALL_18_CUBIES[0] },  // U
      { p2Idx: 3, cub: ALL_18_CUBIES[4] },  // R2
      { p2Idx: 4, cub: ALL_18_CUBIES[7] },  // F2
      { p2Idx: 5, cub: ALL_18_CUBIES[9] },  // D
      { p2Idx: 8, cub: ALL_18_CUBIES[13] }, // L2
      { p2Idx: 9, cub: ALL_18_CUBIES[16] }, // B2
    ];

    cpermMove = new Uint16Array(40320 * 10);
    for (let c = 0; c < 40320; c++) {
      const cp = setPermN(c, 8);
      for (const g of G1_GEN) {
        const nextCp = new Array(8);
        for (let i = 0; i < 8; i++) nextCp[i] = cp[g.cub.cp[i]];
        cpermMove[c * 10 + g.p2Idx] = getPermN(nextCp, 8);
      }
    }
    for (let c = 0; c < 40320; c++) {
      const u1 = cpermMove[c * 10 + 0];
      const u2 = cpermMove[u1 * 10 + 0];
      cpermMove[c * 10 + 1] = u2;
      cpermMove[c * 10 + 2] = cpermMove[u2 * 10 + 0];
      const d1 = cpermMove[c * 10 + 5];
      const d2 = cpermMove[d1 * 10 + 5];
      cpermMove[c * 10 + 6] = d2;
      cpermMove[c * 10 + 7] = cpermMove[d2 * 10 + 5];
    }

    udepermMove = new Uint16Array(40320 * 10);
    for (let u = 0; u < 40320; u++) {
      const ep8 = setPermN(u, 8);
      for (const g of G1_GEN) {
        const nextEp8 = new Array(8);
        for (let i = 0; i < 8; i++) nextEp8[i] = ep8[g.cub.ep[i]];
        udepermMove[u * 10 + g.p2Idx] = getPermN(nextEp8, 8);
      }
    }
    for (let u = 0; u < 40320; u++) {
      const u1 = udepermMove[u * 10 + 0];
      const u2 = udepermMove[u1 * 10 + 0];
      udepermMove[u * 10 + 1] = u2;
      udepermMove[u * 10 + 2] = udepermMove[u2 * 10 + 0];
      const d1 = udepermMove[u * 10 + 5];
      const d2 = udepermMove[d1 * 10 + 5];
      udepermMove[u * 10 + 6] = d2;
      udepermMove[u * 10 + 7] = udepermMove[d2 * 10 + 5];
    }

    spermMove = new Uint8Array(24 * 10);
    for (let sp = 0; sp < 24; sp++) {
      const sp4 = setPermN(sp, 4);
      for (let pm = 0; pm < 10; pm++) {
        const cub = ALL_18_CUBIES[P2_MOVES[pm]];
        const nextSp4 = new Array(4);
        for (let i = 0; i < 4; i++) nextSp4[i] = sp4[cub.ep[8 + i] - 8];
        spermMove[sp * 10 + pm] = getPermN(nextSp4, 4);
      }
    }

    p1TwistSlice = buildPrune(2187, 495, twistMove, sliceMove, 18);
    p1FlipSlice = buildPrune(2048, 495, flipMove, sliceMove, 18);
    p2CpermSperm = buildPrune(40320, 24, cpermMove, spermMove, 10);
    p2UdepSperm = buildPrune(40320, 24, udepermMove, spermMove, 10);

    initialized = true;
  }

  function redundantFace(prevF, curF) {
    if (prevF === -1) return false;
    if (prevF === curF) return true;
    if (prevF - curF === 3) return true;
    return false;
  }

  function solve(cubie, maxTotal = 23) {
    initTables();
    const tw0 = getTwist(cubie.co);
    const fl0 = getFlip(cubie.eo);
    const sl0 = getSlice(cubie.ep);

    // Check if already completely solved
    if (
      tw0 === 0 &&
      fl0 === 0 &&
      sl0 === 0 &&
      getPermN(cubie.cp, 8) === 0 &&
      getPermN(cubie.ep.slice(0, 8), 8) === 0 &&
      getPermN(cubie.ep.slice(8).map((x) => x - 8), 4) === 0
    ) {
      return { moves: [], nodes: 1 };
    }

    let nodes = 0;
    const p1Path = [];

    function searchP2(cpIdx, udeIdx, spIdx, dRem, prevF) {
      nodes++;
      const h1 = p2CpermSperm[cpIdx * 24 + spIdx];
      const h2 = p2UdepSperm[udeIdx * 24 + spIdx];
      const h = h1 > h2 ? h1 : h2;
      if (h > dRem) return null;
      if (dRem === 0) {
        return cpIdx === 0 && udeIdx === 0 && spIdx === 0 ? [] : null;
      }
      for (let pm = 0; pm < 10; pm++) {
        const m = P2_MOVES[pm];
        const f = (m / 3) | 0;
        if (redundantFace(prevF, f)) continue;
        const res = searchP2(
          cpermMove[cpIdx * 10 + pm],
          udepermMove[udeIdx * 10 + pm],
          spermMove[spIdx * 10 + pm],
          dRem - 1,
          f
        );
        if (res !== null) {
          res.unshift(m);
          return res;
        }
      }
      return null;
    }

    function launchP2(maxP2) {
      let cur = cubie;
      for (let i = 0; i < p1Path.length; i++) {
        cur = mulCubie(cur, ALL_18_CUBIES[p1Path[i]]);
      }
      const cpIdx = getPermN(cur.cp, 8);
      const udeIdx = getPermN(cur.ep.slice(0, 8), 8);
      const spIdx = getPermN(
        cur.ep.slice(8).map((x) => x - 8),
        4
      );
      const prevF = p1Path.length > 0 ? (p1Path[p1Path.length - 1] / 3) | 0 : -1;
      for (let d2 = 0; d2 <= maxP2; d2++) {
        const r2 = searchP2(cpIdx, udeIdx, spIdx, d2, prevF);
        if (r2 !== null) return p1Path.concat(r2);
      }
      return null;
    }

    function searchP1(tw, fl, sl, dRem, prevF) {
      nodes++;
      const h1 = p1TwistSlice[tw * 495 + sl];
      const h2 = p1FlipSlice[fl * 495 + sl];
      const h = h1 > h2 ? h1 : h2;
      if (h > dRem) return null;
      if (dRem === 0) {
        if (tw === 0 && fl === 0 && sl === 0) {
          return launchP2(maxTotal - p1Path.length);
        }
        return null;
      }
      for (let m = 0; m < 18; m++) {
        const f = (m / 3) | 0;
        if (redundantFace(prevF, f)) continue;
        if (dRem === 1 && P2_SET.has(m)) continue;
        p1Path.push(m);
        const res = searchP1(
          twistMove[tw * 18 + m],
          flipMove[fl * 18 + m],
          sliceMove[sl * 18 + m],
          dRem - 1,
          f
        );
        p1Path.pop();
        if (res !== null) return res;
      }
      return null;
    }

    for (let d1 = 0; d1 <= 12; d1++) {
      const ans = searchP1(tw0, fl0, sl0, d1, -1);
      if (ans !== null) {
        return { moves: ans.map((m) => MOVE_NAMES_18[m]), nodes };
      }
    }
    return null;
  }

  return { initTables, solve };
}

// ============================================================================
// UI State, 2D Unfolded Net, 3D Perspective Cube, Worker Bridge & Playback
// ============================================================================

let currentState54 = SOLVED_54;
let netCells = []; // 54 2D buttons
let cube3dCells = []; // 54 3D buttons
let cam3x3RotX = -26;
let cam3x3RotY = -36;

let solverWorker = null;
let mainThreadEngine = null;
let activeSolveRequestId = 0;

let playStates3x3 = [];
let playMoves3x3 = [];
let playIdx3x3 = 0;
let playTimer3x3 = null;

function initSolverBackend() {
  try {
    const workerSrc = `
      const createKociembaEngine = ${createKociembaEngine.toString()};
      const engine = createKociembaEngine();
      self.onmessage = (e) => {
        const { type, reqId, cubie } = e.data;
        if (type === "warmup") {
          const t0 = performance.now();
          engine.initTables();
          self.postMessage({ type: "ready", ms: Math.round(performance.now() - t0) });
        } else if (type === "solve") {
          const t0 = performance.now();
          const out = engine.solve(cubie, 23);
          const ms = Math.round(performance.now() - t0);
          self.postMessage({ type: "result", reqId, out, ms });
        }
      };
    `;
    const blob = new Blob([workerSrc], { type: "application/javascript" });
    solverWorker = new Worker(URL.createObjectURL(blob));
    solverWorker.onmessage = handleWorkerMessage;
    solverWorker.onerror = () => {
      solverWorker = null;
    };
    solverWorker.postMessage({ type: "warmup" });
  } catch (_) {
    solverWorker = null;
  }
}

function handleWorkerMessage(e) {
  const { type, reqId, out, ms } = e.data;
  const statusEl = document.getElementById("solverStatus3x3");
  if (type === "ready") {
    if (statusEl) {
      statusEl.textContent = "Kociemba pruning tables ready (" + ms + " ms warmup).";
    }
  } else if (type === "result") {
    if (reqId !== activeSolveRequestId) return;
    finishSolveDisplay(out, ms);
  }
}

function finishSolveDisplay(out, ms) {
  const statusEl = document.getElementById("solverStatus3x3");
  const solEl = document.getElementById("solution3x3");
  if (!out) {
    statusEl.textContent = "Search finished (" + ms + " ms).";
    solEl.textContent = "No solution found.";
    return;
  }
  statusEl.textContent = "Searched " + out.nodes + " IDA* nodes in " + ms + " ms.";
  if (out.moves.length === 0) {
    solEl.textContent = "Already solved! (0 moves)";
  } else {
    const joined = out.moves.join(" ");
    const word = out.moves.length === 1 ? "move" : "moves";
    solEl.textContent = "Solution (" + out.moves.length + " " + word + "): " + joined;
    setup3x3Playback(currentState54, out.moves);
  }
}

function build3x3DOM() {
  const netEl = document.getElementById("net3x3");
  const cube3dEl = document.getElementById("cube3d3x3");
  const stageEl = document.getElementById("cube3dStage3x3");

  // Unfolded cross grid layout (4 rows x 3 cols):
  // [empty, back, empty], [empty, top, empty], [left, front, right], [empty, bottom, empty]
  const gridSlots = [
    null, "back", null,
    null, "top", null,
    "left", "front", "right",
    null, "bottom", null,
  ];

  netEl.innerHTML = "";
  cube3dEl.innerHTML = "";
  netCells = new Array(54);
  cube3dCells = new Array(54);

  let dragMoved = false;

  for (const slot of gridSlots) {
    if (!slot) {
      netEl.appendChild(document.createElement("div"));
      continue;
    }
    const fi = FACE_ORDER_3X3.indexOf(slot);
    const faceNet = document.createElement("div");
    faceNet.className = "face-net " + slot;
    faceNet.title = FACE_TITLES_3X3[slot];

    for (let k = 0; k < 9; k++) {
      const absIdx = fi * 9 + k;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell-net";
      if (k === 4) {
        btn.classList.add("fixed-cell");
        btn.title = "Fixed center sticker";
      } else {
        btn.title = "Click to cycle sticker color";
        btn.addEventListener("click", () => {
          cycleSticker3x3(absIdx);
        });
      }
      faceNet.appendChild(btn);
      netCells[absIdx] = btn;
    }
    netEl.appendChild(faceNet);
  }

  for (let fi = 0; fi < 6; fi++) {
    const fname = FACE_ORDER_3X3[fi];
    const face3d = document.createElement("div");
    face3d.className = "face3d " + fname;

    for (let k = 0; k < 9; k++) {
      const absIdx = fi * 9 + k;
      const btn3d = document.createElement("button");
      btn3d.type = "button";
      btn3d.className = "cell3d";
      if (k === 4) {
        btn3d.classList.add("fixed-cell");
        btn3d.title = "Fixed center sticker";
      } else {
        btn3d.title = "Click to cycle sticker color";
        btn3d.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (dragMoved) return;
          cycleSticker3x3(absIdx);
        });
      }
      face3d.appendChild(btn3d);
      cube3dCells[absIdx] = btn3d;
    }
    cube3dEl.appendChild(face3d);
  }

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = cam3x3RotX;
  let baseY = cam3x3RotY;

  stageEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    baseX = cam3x3RotX;
    baseY = cam3x3RotY;
    cube3dEl.classList.add("dragging");
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
    cam3x3RotY = baseY + dx * 0.65;
    cam3x3RotX = Math.max(-85, Math.min(85, baseX - dy * 0.65));
    applyCamera3x3();
  });

  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    cube3dEl.classList.remove("dragging");
  });

  applyCamera3x3();
  renderState3x3(SOLVED_54);
}

function applyCamera3x3() {
  const cube3dEl = document.getElementById("cube3d3x3");
  if (cube3dEl) {
    cube3dEl.style.transform = "rotateX(" + cam3x3RotX + "deg) rotateY(" + cam3x3RotY + "deg)";
  }
}

function resetCamera3x3() {
  cam3x3RotX = -26;
  cam3x3RotY = -36;
  applyCamera3x3();
}

function onViewMode3x3Change() {
  const mode = document.getElementById("viewMode3x3").value;
  document.getElementById("cube3dPanel3x3").classList.toggle("hidden", mode === "2d");
  document.getElementById("net3x3").classList.toggle("hidden", mode === "3d");
}

function renderState3x3(state) {
  currentState54 = state;
  const allColors = Object.values(CHAR_TO_CSS);
  for (let i = 0; i < 54; i++) {
    const cls = CHAR_TO_CSS[state[i]];
    netCells[i].classList.remove(...allColors);
    netCells[i].classList.add(cls);
    cube3dCells[i].classList.remove(...allColors);
    cube3dCells[i].classList.add(cls);
  }
  refreshValidation3x3();
}

function refreshValidation3x3() {
  const valEl = document.getElementById("validation3x3");
  const res = validateAndParse3x3(currentState54);
  valEl.textContent = res.reason;
  valEl.classList.toggle("valid", res.valid);
  valEl.classList.toggle("invalid", !res.valid);
  return res;
}

function cycleSticker3x3(absIdx) {
  cancelSolve();
  clear3x3Playback();
  const cur = currentState54[absIdx];
  const next = COLOR_CYCLE[(COLOR_CYCLE.indexOf(cur) + 1) % COLOR_CYCLE.length];
  renderState3x3(currentState54.slice(0, absIdx) + next + currentState54.slice(absIdx + 1));
}

function applyManualMove(moveName) {
  cancelSolve();
  clear3x3Playback();
  renderState3x3(applyFaceletMove(currentState54, moveName));
}

function reset3x3() {
  cancelSolve();
  clear3x3Playback();
  renderState3x3(SOLVED_54);
  document.getElementById("solution3x3").textContent = "";
}

function scramble3x3(steps = 25) {
  cancelSolve();
  clear3x3Playback();
  let s = SOLVED_54;
  let prevFace = -1;
  for (let i = 0; i < steps; i++) {
    let f;
    do {
      f = Math.floor(Math.random() * 6);
    } while (f === prevFace);
    prevFace = f;
    const mv = ALL_18_NAMES[f * 3 + Math.floor(Math.random() * 3)];
    s = applyFaceletMove(s, mv);
  }
  renderState3x3(s);
  document.getElementById("solution3x3").textContent = "";
}

function cancelSolve() {
  activeSolveRequestId++;
  if (solverWorker) {
    // Re-spin worker only if user explicitly stopped an active solve
  }
}

function runSolve() {
  clear3x3Playback();
  const check = refreshValidation3x3();
  const solEl = document.getElementById("solution3x3");
  const statusEl = document.getElementById("solverStatus3x3");

  if (!check.valid) {
    solEl.textContent = "Cannot solve: " + check.reason;
    return;
  }

  const reqId = ++activeSolveRequestId;
  solEl.textContent = "Solving...";

  if (solverWorker) {
    statusEl.textContent = "Running Kociemba Two-Phase IDA* in background worker...";
    solverWorker.postMessage({ type: "solve", reqId, cubie: check.cubie });
  } else {
    statusEl.textContent = "Building tables & running Kociemba Two-Phase IDA*...";
    setTimeout(() => {
      if (reqId !== activeSolveRequestId) return;
      if (!mainThreadEngine) mainThreadEngine = createKociembaEngine();
      const t0 = performance.now();
      const out = mainThreadEngine.solve(check.cubie, 23);
      const ms = Math.round(performance.now() - t0);
      finishSolveDisplay(out, ms);
    }, 16);
  }
}

// Playback controls
function stop3x3Playback() {
  if (playTimer3x3 !== null) {
    clearInterval(playTimer3x3);
    playTimer3x3 = null;
  }
  const btn = document.getElementById("playPauseBtn3x3");
  if (btn) btn.textContent = "Play";
}

function clear3x3Playback() {
  stop3x3Playback();
  playStates3x3 = [];
  playMoves3x3 = [];
  playIdx3x3 = 0;
  document.getElementById("playbackBar3x3").classList.add("hidden");
}

function setup3x3Playback(startState, movesArr) {
  stop3x3Playback();
  playMoves3x3 = movesArr;
  playStates3x3 = [startState];
  let s = startState;
  for (const mv of movesArr) {
    s = applyFaceletMove(s, mv);
    playStates3x3.push(s);
  }
  playIdx3x3 = 0;
  document.getElementById("playbackBar3x3").classList.remove("hidden");
  update3x3PlaybackLabel();
}

function update3x3PlaybackLabel() {
  const lbl = document.getElementById("playbackStepLabel3x3");
  if (playMoves3x3.length === 0) return;
  if (playIdx3x3 === 0) {
    lbl.textContent = "Step 0 / " + playMoves3x3.length + " (start)";
  } else {
    lbl.textContent =
      "Step " + playIdx3x3 + " / " + playMoves3x3.length + " (" + playMoves3x3[playIdx3x3 - 1] + ")";
  }
}

function goto3x3Step(idx) {
  if (playStates3x3.length === 0) return;
  playIdx3x3 = Math.max(0, Math.min(playStates3x3.length - 1, idx));
  renderState3x3(playStates3x3[playIdx3x3]);
  update3x3PlaybackLabel();
}

function step3x3Start() {
  stop3x3Playback();
  goto3x3Step(0);
}
function step3x3Prev() {
  stop3x3Playback();
  goto3x3Step(playIdx3x3 - 1);
}
function step3x3Next() {
  stop3x3Playback();
  goto3x3Step(playIdx3x3 + 1);
}
function step3x3End() {
  stop3x3Playback();
  goto3x3Step(playStates3x3.length - 1);
}

function toggle3x3Playback() {
  if (playStates3x3.length === 0) return;
  if (playTimer3x3 !== null) {
    stop3x3Playback();
    return;
  }
  if (playIdx3x3 >= playStates3x3.length - 1) {
    goto3x3Step(0);
  }
  document.getElementById("playPauseBtn3x3").textContent = "Pause";
  playTimer3x3 = setInterval(() => {
    if (playIdx3x3 < playStates3x3.length - 1) {
      goto3x3Step(playIdx3x3 + 1);
    } else {
      stop3x3Playback();
    }
  }, 420);
}

build3x3DOM();
initSolverBackend();
