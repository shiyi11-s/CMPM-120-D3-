/* ====================================================================
 *  EndScene — final summary after level 3.
 *  Shows total time + total death count, with a button to play again.
 * =================================================================== */
class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.fadeIn(380, 0, 0, 0);
    this.add.tileSprite(0, 0, W, H, "bg").setOrigin(0, 0);

    // Confetti / sparks rising in the background
    for (let i = 0; i < 24; i++) {
      const s = this.add.image(
        Phaser.Math.Between(40, W - 40), H + 20, "spark"
      ).setScale(Phaser.Math.FloatBetween(0.6, 1.2));
      this.tweens.add({
        targets: s,
        y: -40,
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.Between(2400, 4200),
        delay: i * 90,
        repeat: -1,
        ease: "sine.out",
      });
    }

    // Trophy-ish marble
    const marble = this.add.image(W / 2, 150, "marble").setScale(3);
    this.tweens.add({
      targets: marble, scale: 3.4, yoyo: true, duration: 900,
      repeat: -1, ease: "sine.inOut",
    });

    this.add.text(W / 2, 240, "all levels complete!", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "34px",
      color: "#ffd166",
      stroke: "#3b2a08",
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Per-level breakdown
    const lines = [];
    for (let i = 0; i < RUN.perLevel.length; i++) {
      const s = RUN.perLevel[i];
      lines.push(
        `level ${i + 1}    ${formatTime(s.timeMs).padStart(8, " ")}    deaths ${s.deaths}`
      );
    }
    this.add.text(W / 2, 320, lines.join("\n"), {
      fontFamily: "ui-monospace, monospace",
      fontSize: "18px",
      color: "#d8d0ff",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5);

    // Totals
    this.add.text(W / 2, 430, "totals", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "16px",
      color: "#a89cd8",
    }).setOrigin(0.5);
    this.add.text(W / 2, 460,
      `total time:  ${formatTime(RUN.totalTimeMs)}`, {
      fontFamily: "ui-monospace, monospace",
      fontSize: "22px",
      color: "#e5deff",
    }).setOrigin(0.5);
    this.add.text(W / 2, 488,
      `total deaths: ${RUN.totalDeaths}`, {
      fontFamily: "ui-monospace, monospace",
      fontSize: "22px",
      color: "#ff8b8b",
    }).setOrigin(0.5);

    const btn = this.add.text(W / 2, H - 60, "[ play again ]", {
      fontFamily: "ui-monospace, monospace",
      fontSize: "22px",
      color: "#ffd166",
      backgroundColor: "#3a2a08",
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerdown", () => {
      this.cameras.main.fadeOut(260, 0, 0, 0);
      this.time.delayedCall(280, () => this.scene.start("MenuScene"));
    });
    this.input.keyboard.once("keydown-ENTER",
      () => this.scene.start("MenuScene"));
  }
}
