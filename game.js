/* ====================================================================
 *  Marble Maze — main entry
 *  CMPM 120 D3, Spring 2026
 *
 *  Three physics-based gameplay scenes (Level 1, 2, 3 driven by a single
 *  GameScene subclass) with summary scenes between them.  Continuous input
 *  is the player's drag-to-tilt; discrete inputs are mouse-up "lock in",
 *  the R key (reset) and the Y key (toggle a hidden wall passage).
 * =================================================================== */

// Small store that survives between scenes so we can carry stats forward.
const RUN = {
  level: 1,
  totalTimeMs: 0,
  totalDeaths: 0,
  perLevel: [],   // [{timeMs, deaths}]
};

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  backgroundColor: "#0a0816",
  pixelArt: true,           // crisp pixel art rendering
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, SummaryScene, EndScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
