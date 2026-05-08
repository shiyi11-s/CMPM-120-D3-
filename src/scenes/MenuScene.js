/* ====================================================================
 *  MenuScene — title and a quick rules card.
 * =================================================================== */
class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // Tiled starfield background
    this.add.tileSprite(0, 0, w, h, "bg").setOrigin(0, 0);

    // Big title
    this.add.text(w / 2, 110, "MARBLE", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "84px",
      color: "#ffd166",
      stroke: "#3b2a08",
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(w / 2, 188, "MAZE", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "84px",
      color: "#a080ff",
      stroke: "#1f1438",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Floating marble for flavor
    const marble = this.add.image(w / 2, 270, "marble").setScale(2);
    this.tweens.add({
      targets: marble,
      y: 285,
      yoyo: true,
      duration: 900,
      repeat: -1,
      ease: "sine.inOut",
    });

    // Rules
    const rules = [
      "tilt the maze so the marble drops into the dark portal at the bottom.",
      "",
      "controls:",
      "  hold + drag mouse  ->  rotate the maze (continuous)",
      "  release            ->  lock the tilt (discrete)",
      "  Y                  ->  toggle the orange shortcut wall",
      "  R                  ->  reset marble to spawn",
      "",
      "three levels, with a summary between each.",
    ];
    this.add.text(w / 2, 390, rules.join("\n"), {
      fontFamily: "ui-monospace, monospace",
      fontSize: "16px",
      color: "#d8d0ff",
      align: "center",
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Start prompt
    const start = this.add.text(w / 2, h - 70,
      "click anywhere to begin", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "22px",
      color: "#ffd166",
    }).setOrigin(0.5);
    this.tweens.add({
      targets: start,
      alpha: 0.4,
      yoyo: true,
      duration: 600,
      repeat: -1,
    });

    this.input.once("pointerdown", () => {
      // reset run-stats on a fresh game
      RUN.level = 1;
      RUN.totalTimeMs = 0;
      RUN.totalDeaths = 0;
      RUN.perLevel = [];
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start("GameScene", { level: 1 }));
    });
  }
}
