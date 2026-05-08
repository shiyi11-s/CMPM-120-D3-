/* ====================================================================
 *  GameScene — the physics-based gameplay scene (one Phaser Scene class
 *  driving all three levels).
 *
 *  Continuous input  : drag the mouse to rotate the maze (camera rotates
 *                      and gravity rotates with it).
 *  Discrete inputs   : pointer-up locks the tilt; R resets the marble;
 *                      Y toggles the orange shortcut wall.
 *
 *  The physics walls remain axis-aligned in the world.  Visual rotation
 *  is performed by the main camera; a second camera renders the HUD
 *  unrotated.  Gravity is applied in the world frame so that, after the
 *  inverse camera rotation, it appears to point straight down on screen.
 * =================================================================== */
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  /* ---------- per-level configuration ---------- */
  getLevelConfig(level) {
    // Three escalating layouts.  Cell pitch shrinks slightly so larger
    // mazes still fit the play area.
    const W = this.scale.width, H = this.scale.height;
    const seedBase = 0xC0FFEE + level * 17;
    if (level === 1) {
      return {
        cols: 8, rows: 8, cellPitch: 48, seed: seedBase,
        loopFraction: 0.10,
        startCell: { x: 1, y: 0 },
        goalCell:  { x: 6, y: 7 },
        deathCells: [],
      };
    }
    if (level === 2) {
      return {
        cols: 9, rows: 9, cellPitch: 44, seed: seedBase,
        loopFraction: 0.12,
        startCell: { x: 1, y: 0 },
        goalCell:  { x: 7, y: 8 },
        deathCells: [{ x: 4, y: 4 }],
      };
    }
    // level 3+
    return {
      cols: 10, rows: 10, cellPitch: 42, seed: seedBase,
      loopFraction: 0.15,
      startCell: { x: 1, y: 0 },
      goalCell:  { x: 8, y: 9 },
      deathCells: [{ x: 3, y: 3 }, { x: 6, y: 7 }],
    };
  }

  /* ---------- lifecycle ---------- */
  init(data) {
    this.level = data && data.level ? data.level : 1;
    RUN.level = this.level;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.fadeIn(280, 0, 0, 0);

    // Background tilesprite — sits in the world so the camera rotation
    // also subtly rotates the starfield (looks great).
    this.bg = this.add.tileSprite(W / 2, H / 2, W * 2, H * 2, "bg");

    /* ---------- maze data + geometry ---------- */
    const cfg = this.getLevelConfig(this.level);
    this.cellPitch = cfg.cellPitch;
    this.wallThickness = 8;

    this.maze = MazeGen.generate(cfg.cols, cfg.rows, cfg.seed);
    MazeGen.carveLoops(this.maze, cfg.loopFraction, cfg.seed + 31);

    // Open the entry (north of start) and exit (south of goal) walls.
    this.startCell = cfg.startCell;
    this.goalCell  = cfg.goalCell;
    this.maze.cells[this.startCell.y][this.startCell.x].n = false;
    this.maze.cells[this.goalCell.y][this.goalCell.x].s = false;

    const mazeW = cfg.cols * this.cellPitch;
    const mazeH = cfg.rows * this.cellPitch;
    this.mazeOriginX = W / 2 - mazeW / 2;
    this.mazeOriginY = H / 2 - mazeH / 2;
    this.mazeCenterX = W / 2;
    this.mazeCenterY = H / 2;
    this.mazeWidth   = mazeW;
    this.mazeHeight  = mazeH;

    /* ---------- floor (tiled) ---------- */
    this.floorSprite = this.add.tileSprite(
      this.mazeCenterX, this.mazeCenterY, mazeW, mazeH, "floor"
    );

    /* ---------- decorative outer frame ---------- */
    this.frameTop = this.add.tileSprite(
      this.mazeCenterX, this.mazeOriginY - this.wallThickness / 2,
      mazeW + this.wallThickness * 2, this.wallThickness, "frame"
    );
    this.frameBot = this.add.tileSprite(
      this.mazeCenterX, this.mazeOriginY + mazeH + this.wallThickness / 2,
      mazeW + this.wallThickness * 2, this.wallThickness, "frame"
    );
    this.frameLeft = this.add.tileSprite(
      this.mazeOriginX - this.wallThickness / 2, this.mazeCenterY,
      this.wallThickness, mazeH, "frame"
    );
    this.frameRight = this.add.tileSprite(
      this.mazeOriginX + mazeW + this.wallThickness / 2, this.mazeCenterY,
      this.wallThickness, mazeH, "frame"
    );

    /* ---------- walls (static physics group) ---------- */
    const tog = MazeGen.pickToggleWall(this.maze, cfg.seed + 99);
    this.toggleSpec = tog;

    this.wallGroup = this.physics.add.staticGroup();
    this.wallSprites = [];
    this.buildAllWalls(tog);

    /* ---------- togglable Y-key wall ---------- */
    this.toggleWallSprite = null;
    if (tog) {
      this.toggleWallSprite = this.makeWallSprite(tog.x, tog.y, tog.k);
      this.toggleWallSprite.setTint(0xffaa44);
      this.toggleWallSprite.setData("toggle", true);
    }
    this.toggleOpen = false;   // wall starts closed (active)

    /* ---------- goal hole ---------- */
    const goalScreen = this.cellEdgeCenter(this.goalCell.x, this.goalCell.y, "s");
    this.goalX = goalScreen.x;
    this.goalY = goalScreen.y;
    this.goal = this.add.image(this.goalX, this.goalY, "hole");
    this.physics.add.existing(this.goal, true);
    this.goal.body.setCircle(14, 6, 6);  // smaller hit zone in the dark center

    // Pulse animation on the hole
    this.tweens.add({
      targets: this.goal, scale: 1.15, yoyo: true,
      duration: 850, repeat: -1, ease: "sine.inOut",
    });

    /* ---------- death zones ---------- */
    this.deathGroup = this.physics.add.staticGroup();
    for (const dc of cfg.deathCells) {
      const c = this.cellCenter(dc.x, dc.y);
      const dz = this.deathGroup.create(c.x, c.y, "death");
      dz.setDisplaySize(this.cellPitch - this.wallThickness - 6,
                        this.cellPitch - this.wallThickness - 6).refreshBody();
      dz.body.setCircle((this.cellPitch - this.wallThickness - 6) / 2);
    }

    /* ---------- marble ---------- */
    const startScreen = this.cellCenter(this.startCell.x, this.startCell.y);
    this.startX = startScreen.x;
    this.startY = startScreen.y;
    this.marble = this.physics.add.image(this.startX, this.startY - 220, "marble");
    this.marble.setCircle(10, 2, 2); // 24px sprite, 20px hit circle
    this.marble.setBounce(0.32);
    this.marble.setDamping(true);
    this.marble.setDrag(0.985);
    this.marble.setMaxVelocity(520, 520);
    this.marble.setVelocity(0, 220);
    this.marble.setMass(1);

    this.physics.add.collider(this.marble, this.wallGroup);
    this.physics.add.overlap(this.marble, this.goal, () => this.onReachGoal(), null, this);
    this.physics.add.overlap(this.marble, this.deathGroup, () => this.onDeath(), null, this);

    /* ---------- input ---------- */
    this.tiltAngle = 0;          // unbounded — the player can spin the maze
                                 //  as many full turns as they like.
    this.draggingState = null;
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup",   this.onPointerUp,   this);

    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyY = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
    this.keyR.on("down", () => this.resetMarble(false));  // R = manual respawn, not a death
    this.keyY.on("down", () => this.toggleWall());

    /* ---------- HUD on a separate camera (not rotated) ---------- */
    this.deathCount = 0;
    this.elapsedMs = 0;
    this.completed = false;

    this.hudPanel = this.add.rectangle(W / 2, 28, W - 32, 40, 0x0f0a22, 0.78)
      .setOrigin(0.5);
    this.hudText = this.add.text(W / 2, 28, "", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "18px",
      color: "#e5deff",
    }).setOrigin(0.5);

    this.hintText = this.add.text(W / 2, H - 18, "drag = tilt    R = reset    Y = toggle orange wall", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "14px",
      color: "#a89cd8",
    }).setOrigin(0.5);

    // Multi-camera setup: main camera shows world (rotates), uiCam shows HUD (fixed).
    this.cameras.main.centerOn(this.mazeCenterX, this.mazeCenterY);
    this.uiCam = this.cameras.add(0, 0, W, H);
    this.uiCam.setName("ui");

    // Tell each camera which objects to ignore.
    const hudObjects = [this.hudPanel, this.hudText, this.hintText];
    this.cameras.main.ignore(hudObjects);
    // Build a list of every world-object so the UI camera ignores them.
    const worldObjs = [
      this.bg, this.floorSprite, this.frameTop, this.frameBot,
      this.frameLeft, this.frameRight, this.marble, this.goal,
    ];
    this.wallGroup.getChildren().forEach((w) => worldObjs.push(w));
    this.deathGroup.getChildren().forEach((w) => worldObjs.push(w));
    if (this.toggleWallSprite) worldObjs.push(this.toggleWallSprite);
    this.uiCam.ignore(worldObjs);

    // Gentle level-intro flash text
    const intro = this.add.text(this.mazeCenterX, this.mazeCenterY - this.mazeHeight / 2 - 24,
      `level ${this.level}`, {
      fontFamily: "ui-monospace, monospace",
      fontSize: "22px",
      color: "#ffd166",
    }).setOrigin(0.5);
    this.uiCam.ignore(intro);
    this.tweens.add({
      targets: intro, alpha: 0, duration: 1400, delay: 600,
      onComplete: () => intro.destroy(),
    });

    // Start the level timer once the marble has actually entered the maze.
    this.timerActive = false;
    this.physics.world.once("worldstep", () => {});  // no-op, ensures world initialized
    this.time.delayedCall(700, () => this.timerActive = true);
  }

  /* ---------- helpers: cell -> world coords ---------- */
  cellCenter(cx, cy) {
    return {
      x: this.mazeOriginX + (cx + 0.5) * this.cellPitch,
      y: this.mazeOriginY + (cy + 0.5) * this.cellPitch,
    };
  }

  // Center of a wall on a given side of cell (cx, cy).
  cellEdgeCenter(cx, cy, side) {
    const c = this.cellCenter(cx, cy);
    const half = this.cellPitch / 2;
    if (side === "n") return { x: c.x, y: c.y - half };
    if (side === "s") return { x: c.x, y: c.y + half };
    if (side === "w") return { x: c.x - half, y: c.y };
    return { x: c.x + half, y: c.y };
  }

  /* ---------- wall construction ---------- */
  buildAllWalls(skipSpec) {
    const T = this.wallThickness;
    const P = this.cellPitch;

    for (let y = 0; y < this.maze.rows; y++) {
      for (let x = 0; x < this.maze.cols; x++) {
        const c = this.maze.cells[y][x];
        if (c.n && !this.matchesWall(skipSpec, x, y, "n")) this.makeWallSprite(x, y, "n");
        if (c.w && !this.matchesWall(skipSpec, x, y, "w")) this.makeWallSprite(x, y, "w");
        if (x === this.maze.cols - 1 && c.e && !this.matchesWall(skipSpec, x, y, "e")) this.makeWallSprite(x, y, "e");
        if (y === this.maze.rows - 1 && c.s && !this.matchesWall(skipSpec, x, y, "s")) this.makeWallSprite(x, y, "s");
      }
    }
  }

  matchesWall(spec, cx, cy, side) {
    return spec && spec.x === cx && spec.y === cy && spec.k === side;
  }

  // Create a tiled wall sprite + static physics body for the given cell side.
  makeWallSprite(cx, cy, side) {
    const T = this.wallThickness;
    const P = this.cellPitch;
    const c = this.cellCenter(cx, cy);
    const half = P / 2;

    let x, y, w, h;
    if (side === "n" || side === "s") {
      // horizontal wall, length P + T (overlap into corners)
      w = P + T; h = T;
      x = c.x;
      y = (side === "n") ? c.y - half : c.y + half;
    } else {
      // vertical wall
      w = T; h = P + T;
      x = (side === "w") ? c.x - half : c.x + half;
      y = c.y;
    }
    const wall = this.add.tileSprite(x, y, w, h, "wall");
    this.physics.add.existing(wall, true);
    // Static bodies need an explicit body refresh after a size change so the
    // collision box matches the rendered tile-sprite.
    wall.body.setSize(w, h);
    if (wall.body.updateFromGameObject) wall.body.updateFromGameObject();
    this.wallGroup.add(wall);
    this.wallSprites.push(wall);
    return wall;
  }

  /* ---------- input handlers ---------- */
  pointerVecFromCenter(pointer) {
    // Pointer comes in screen coords (game canvas frame).  The maze is
    // centered on the screen, so the pivot is just (W/2, H/2).
    return {
      x: pointer.x - this.scale.width / 2,
      y: pointer.y - this.scale.height / 2,
    };
  }

  onPointerDown(pointer) {
    if (this.completed) return;
    const v = this.pointerVecFromCenter(pointer);
    // ignore clicks too close to center (no useful angle there)
    if (Math.hypot(v.x, v.y) < 30) {
      this.draggingState = null;
      return;
    }
    // Track only the "last frame" pointer angle and accumulate per-frame
    // deltas into tiltAngle.  This lets the player spin the maze any
    // number of full turns without the angle jumping at the +/-PI seam.
    this.draggingState = {
      lastAngle: Math.atan2(v.y, v.x),
    };
  }

  onPointerMove(pointer) {
    if (this.completed) return;
    if (!this.draggingState || !pointer.isDown) return;
    const v = this.pointerVecFromCenter(pointer);
    if (Math.hypot(v.x, v.y) < 30) return;
    const a = Math.atan2(v.y, v.x);
    let delta = a - this.draggingState.lastAngle;
    // unwrap *this single frame's* delta into [-PI, PI]; tiltAngle itself
    // stays unbounded so we can rack up multiple full rotations.
    while (delta >  Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    this.tiltAngle += delta;
    this.draggingState.lastAngle = a;
    this.applyTilt();
  }

  onPointerUp() {
    // discrete event: tilt is now "locked" at its current angle.
    this.draggingState = null;
  }

  applyTilt() {
    const G = 620;
    // Visual rotation of the world.
    this.cameras.main.setRotation(this.tiltAngle);
    // Gravity in the world frame so that, after the camera rotation,
    // it still appears as steady screen-down gravity.
    this.physics.world.gravity.set(
      G * Math.sin(this.tiltAngle),
      G * Math.cos(this.tiltAngle)
    );
  }

  /* ---------- gameplay events ---------- */
  // countAsDeath is true only when the marble actually touched a hazard;
  // a manual R reset just respawns the marble without penalising the player.
  // The marble is placed back inside the start cell (rather than dropped
  // from outside the maze) so it can't fly off if the maze is currently
  // tilted at a steep angle.
  resetMarble(countAsDeath) {
    this.marble.setVelocity(0, 0);
    this.marble.setPosition(this.startX, this.startY);
    if (countAsDeath) this.deathCount += 1;
    this.cameras.main.shake(120, 0.004);
  }

  toggleWall() {
    if (!this.toggleWallSprite) return;
    this.toggleOpen = !this.toggleOpen;
    if (this.toggleOpen) {
      this.toggleWallSprite.setVisible(false);
      this.toggleWallSprite.body.enable = false;
    } else {
      this.toggleWallSprite.setVisible(true);
      this.toggleWallSprite.body.enable = true;
    }
    // tiny flash for feedback
    this.cameras.main.flash(80, 255, 200, 100, false);
  }

  onReachGoal() {
    if (this.completed) return;
    this.completed = true;

    // record stats
    RUN.perLevel[this.level - 1] = {
      timeMs: this.elapsedMs,
      deaths: this.deathCount,
    };
    RUN.totalTimeMs += this.elapsedMs;
    RUN.totalDeaths += this.deathCount;

    // "drop into next level" effect: shrink + spin the marble into the hole
    this.marble.body.enable = false;
    this.tweens.add({
      targets: this.marble,
      x: this.goalX,
      y: this.goalY,
      scale: 0.15,
      angle: 540,
      duration: 600,
      ease: "cubic.in",
    });

    // particles via simple tweened sprites
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(this.goalX, this.goalY, "spark");
      this.uiCam.ignore(s);
      const ang = (i / 14) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: this.goalX + Math.cos(ang) * 60,
        y: this.goalY + Math.sin(ang) * 60,
        alpha: 0, scale: 0.2,
        duration: 700,
        onComplete: () => s.destroy(),
      });
    }

    this.time.delayedCall(750, () => {
      this.cameras.main.fadeOut(320, 0, 0, 0);
    });
    this.time.delayedCall(1100, () => {
      this.scene.start("SummaryScene", { level: this.level });
    });
  }

  onDeath() {
    if (this.completed) return;
    this.cameras.main.flash(120, 255, 60, 60, true);
    this.cameras.main.shake(160, 0.008);
    this.resetMarble(true);
  }

  /* ---------- per-frame ---------- */
  update(time, dt) {
    if (this.completed) return;

    if (this.timerActive) {
      this.elapsedMs += dt;
    }

    // safety: marble somehow escaped the maze area? send it home.
    const m = this.marble;
    const cx = this.mazeCenterX, cy = this.mazeCenterY;
    const safeR = Math.max(this.mazeWidth, this.mazeHeight) * 0.85;
    if (Math.hypot(m.x - cx, m.y - cy) > safeR) {
      this.resetMarble(true);
    }

    // HUD text refresh
    const t = formatTime(this.elapsedMs);
    this.hudText.setText(
      `level ${this.level}    time ${t}    deaths ${this.deathCount}`
    );

    // subtle background parallax (counter-rotates a bit)
    this.bg.tilePositionX += 0.12;
    this.bg.tilePositionY += 0.06;
  }
}

/** Formatter for stopwatch-style mm:ss.ms. */
function formatTime(ms) {
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  const pad = (n, w) => String(n).padStart(w, "0");
  return `${pad(m, 2)}:${pad(s, 2)}.${pad(cs, 2)}`;
}
