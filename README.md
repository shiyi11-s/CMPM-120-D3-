# Marble Maze

A physics-based puzzle game built in Phaser 3 for **CMPM 120 D3 (Spring 2026)**.

Tilt the maze with your mouse and let gravity carry the marble through three
procedurally generated mazes — each one tighter and trickier than the last.

> **Play it here:** _itch.io link goes here once deployed_  
> **Dev preview:** _GitHub Pages link goes here once enabled_

---

## Controls

| Input                              | Effect                                                   | Type        |
| ---------------------------------- | -------------------------------------------------------- | ----------- |
| Hold + drag the **left mouse**     | Rotate the maze around its center                        | Continuous  |
| **Release** the mouse              | Locks the tilt at its current angle                      | Discrete    |
| Press **Y**                        | Toggles the orange "shortcut" wall (open / close)        | Discrete    |
| Press **R**                        | Resets the marble to the level's spawn point             | Discrete    |

The marble rolls with arcade-physics gravity, bounces off walls, and falls
into the dark portal at the bottom of each level to advance.

## How the design satisfies the experience requirements

**1. Both continuous and discrete inputs are used.**  
The mouse-drag is a continuous input — every pixel of cursor motion updates
both the visual rotation of the world (the main camera's `rotation`) and the
gravity vector applied to the marble. Releasing the mouse, pressing **Y**,
and pressing **R** are discrete events handled via Phaser's input
`pointerup` and `keydown` listeners.

**2. The player's goal can only be achieved indirectly.**  
The player never touches the marble. The only thing the player can do is
tilt the playing field and toggle a single wall — the marble itself moves
purely under arcade physics (gravity, collision, and bounce). The goal is to
let physics carry the marble into the goal portal.

**3. Three physics-based gameplay scenes, all driven by one `Scene`
subclass.**  
A single `GameScene` class accepts a `level` parameter (1, 2, or 3) and
configures cell count, the procedurally-generated maze, the loop fraction,
and how many death zones to place. Difficulty escalates: Level 1 is a pure
maze with one Y-toggle wall, Level 2 adds one fiery death zone, and Level 3
adds two.

**4. Other scenes contextualize the gameplay.**  
- `BootScene`  – preloads pixel-art assets with a progress bar.  
- `MenuScene`  – title screen with rules and a pulsing start prompt.  
- `SummaryScene` – between-level rest screen showing clear time and (from
  Level 2 onward) death count, plus a teaser for the next level.  
- `EndScene`  – final summary of total time and total deaths after Level 3.

## Project structure

```
.
├── index.html              ← entry HTML, loads scripts in order
├── game.js                 ← Phaser config, scene registration, RUN store
├── lib/
│   └── phaser.js           ← Phaser 3 library
├── src/
│   ├── MazeGen.js          ← recursive-backtracker maze generator
│   └── scenes/
│       ├── BootScene.js
│       ├── MenuScene.js
│       ├── GameScene.js    ← the physics gameplay (all three levels)
│       ├── SummaryScene.js
│       └── EndScene.js
└── assets/                 ← pixel-art textures (see below)
    ├── marble.png  bg.png  death.png  floor.png
    ├── frame.png   hole.png   spark.png   wall.png
```

## Data assets

All eight PNG sprites in `assets/` were created from scratch by me using a
short Python script (`make_assets.py`, kept outside the repo) that draws
pixel-by-pixel with PIL/Pillow. Specifically:

- **`marble.png`** – a 24×24 ball shaded by a Lambert / specular light model
  in cyan-blue, then quantized to a coarse 24-step palette so it reads as
  pixel art.
- **`wall.png`** – a 32×32 brick tile drawn with a brick row pattern, slight
  per-brick color jitter, and 1-pixel highlight / shadow edges.
- **`floor.png`** – a 32×32 dark checker tile with a few stray "grit" pixels.
- **`hole.png`** – a 40×40 radial gradient from black core through magenta
  ring out to a soft alpha edge, quantized for a pixelated halo.
- **`death.png`** – a 32×32 noisy lava tile with a few yellow bubbles.
- **`bg.png`** – a 32×32 dark starfield tile.
- **`frame.png`** – a 32×32 ornate gold border tile used around the maze.
- **`spark.png`** – a 6×6 yellow-white spark for goal / end-screen particles.

No external art was used, so no third-party credit is required.

## Code references

1. **Procedural Maze Generation in Phaser 3** —
   <https://supernapie.com/blog/procedural-generated-maze-in-phaser-3/>  
   I used this as the conceptual model for the recursive-backtracker maze
   generator in `src/MazeGen.js`.

2. **Arcade Physics: Gravity** —
   <https://phaser.io/examples/v3.85.0/physics/arcade/view/gravity>  
   Reference for setting global gravity on the physics world. In this game
   I update gravity every frame to a rotated vector so the marble appears
   to roll downhill in the visually-tilted maze.

3. **Phaser Arcade Physics labs** —
   <https://labs.phaser.io/index.html?dir=physics/arcade/>  
   Reference for static bodies / `staticGroup()` (used for every wall),
   circular bodies (`setCircle` on the marble), and overlap callbacks
   (used for the goal portal and death zones).

4. **Nathan Altice's MovementStudies** —
   <https://github.com/nathanaltice/MovementStudies>  
   Reference for keyboard-input handling (R, Y) and for the multi-scene
   pattern (Boot → Menu → Game ↔ Summary → End).

## Visual / motion references

1. **Ball Movement in a Maze** —
   <https://www.youtube.com/watch?v=bTk6dcAckuI>
2. **Phaser 3 Physics Tutorial** —
   <https://www.youtube.com/watch?v=z15L4E7A3wY>

## Running locally

Phaser loads assets via XHR, so `index.html` cannot be opened directly with
the `file://` protocol — it has to be served over HTTP. From the repo root:

```bash
# Python 3
python -m http.server 8000

# or, via npm
npx http-server -p 8000
```

then open <http://localhost:8000>.

## Process / commit history

The repository was initialized empty and built up incrementally — see the
commit log for the asset-generation, maze-generator, scene scaffolding,
and physics-tuning steps.
