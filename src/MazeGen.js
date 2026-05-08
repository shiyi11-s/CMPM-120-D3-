/* ====================================================================
 *  MazeGen — recursive-backtracking maze generator
 *
 *  Produces a perfect maze on a `cols x rows` grid.  Each cell carries
 *  the four wall flags `n,e,s,w`.  After generation we also collect the
 *  list of *interior* walls so the GameScene can pick one for Y-key
 *  toggling (open/close a shortcut passage).
 *
 *  Reference:
 *    https://supernapie.com/blog/procedural-generated-maze-in-phaser-3/
 *    Wikipedia: "Maze generation algorithm" - Recursive backtracker
 * =================================================================== */

const MazeGen = (function () {
  // Direction deltas
  const DIR = {
    n: { dx: 0, dy: -1, opp: "s" },
    e: { dx: 1, dy: 0, opp: "w" },
    s: { dx: 0, dy: 1, opp: "n" },
    w: { dx: -1, dy: 0, opp: "e" },
  };

  function makeCell() {
    return { n: true, e: true, s: true, w: true, visited: false };
  }

  /**
   * Generate a perfect maze.
   * @param {number} cols
   * @param {number} rows
   * @param {number} [seed] optional seed for deterministic output
   * @returns {{cols:number, rows:number, cells:Array<Array<Object>>}}
   */
  function generate(cols, rows, seed) {
    const rand = mulberry32(seed != null ? seed : (Math.random() * 1e9) | 0);

    // 2D grid: cells[y][x]
    const cells = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) row.push(makeCell());
      cells.push(row);
    }

    // Iterative recursive backtracker (DFS).
    const stack = [];
    const startX = 0, startY = 0;
    cells[startY][startX].visited = true;
    stack.push([startX, startY]);

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const neighbors = [];
      for (const k of ["n", "e", "s", "w"]) {
        const nx = x + DIR[k].dx;
        const ny = y + DIR[k].dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !cells[ny][nx].visited) {
          neighbors.push([k, nx, ny]);
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }
      const [k, nx, ny] = neighbors[Math.floor(rand() * neighbors.length)];
      // knock down wall between (x,y) and (nx,ny)
      cells[y][x][k] = false;
      cells[ny][nx][DIR[k].opp] = false;
      cells[ny][nx].visited = true;
      stack.push([nx, ny]);
    }

    return { cols, rows, cells };
  }

  /**
   * Knock out an additional fraction of interior walls to create loops.
   * Helps make the maze less mean and gives the player choices.
   */
  function carveLoops(maze, fraction = 0.10, seed = 1) {
    const rand = mulberry32(seed);
    const candidates = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (x + 1 < maze.cols && maze.cells[y][x].e) candidates.push({ x, y, k: "e" });
        if (y + 1 < maze.rows && maze.cells[y][x].s) candidates.push({ x, y, k: "s" });
      }
    }
    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const n = Math.floor(candidates.length * fraction);
    for (let i = 0; i < n; i++) {
      const c = candidates[i];
      maze.cells[c.y][c.x][c.k] = false;
      const opp = { n: "s", e: "w", s: "n", w: "e" }[c.k];
      const dx = c.k === "e" ? 1 : 0;
      const dy = c.k === "s" ? 1 : 0;
      maze.cells[c.y + dy][c.x + dx][opp] = false;
    }
  }

  /**
   * Collect every wall segment as a (x1,y1)-(x2,y2) line in maze cell units.
   * Returns { walls, togglable }: walls is the static set; togglable is a
   * subset of *interior* walls that the game can flip to open/close.
   */
  function collectWalls(maze) {
    const walls = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        const c = maze.cells[y][x];
        if (c.n) walls.push({ x: x, y: y, k: "n", interior: y > 0 });
        if (c.w) walls.push({ x: x, y: y, k: "w", interior: x > 0 });
        // last col -> east border
        if (x === maze.cols - 1 && c.e) walls.push({ x: x, y: y, k: "e", interior: false });
        // last row -> south border
        if (y === maze.rows - 1 && c.s) walls.push({ x: x, y: y, k: "s", interior: false });
      }
    }
    return walls;
  }

  /** Pick a random *interior* wall as the Y-key togglable wall. */
  function pickToggleWall(maze, seed = 7) {
    const rand = mulberry32(seed);
    const interior = [];
    for (let y = 1; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (maze.cells[y][x].n) interior.push({ x, y, k: "n" });
      }
    }
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 1; x < maze.cols; x++) {
        if (maze.cells[y][x].w) interior.push({ x, y, k: "w" });
      }
    }
    if (interior.length === 0) return null;
    // Prefer walls roughly in the middle of the maze (more impactful change)
    interior.sort((a, b) => {
      const da = Math.hypot(a.x - maze.cols / 2, a.y - maze.rows / 2);
      const db = Math.hypot(b.x - maze.cols / 2, b.y - maze.rows / 2);
      return da - db;
    });
    // pick from the inner third
    const top = interior.slice(0, Math.max(1, Math.floor(interior.length / 3)));
    return top[Math.floor(rand() * top.length)];
  }

  // PRNG: mulberry32 — small, deterministic, plenty good for level layouts.
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  return { generate, carveLoops, collectWalls, pickToggleWall };
})();
