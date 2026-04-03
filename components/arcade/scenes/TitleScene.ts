import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Redline Motor Condos background image (loaded in BootScene)
    if (this.textures.exists("garage-bg")) {
      const bg = this.add.image(width / 2, height / 2, "garage-bg");
      // Scale to cover the full game area
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setDepth(0);

      // Gradient overlay — dark at bottom for text readability
      // Use a series of rectangles since Phaser doesn't have CSS gradients
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const y = height * (0.5 + t * 0.5);
        const alpha = t * t * 0.9;
        this.add.rectangle(width / 2, y, width, height / 20, 0x0d0d1a)
          .setAlpha(alpha).setDepth(1);
      }
    }

    // CLCC ARCADE label
    this.add.text(width / 2, height * 0.55, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#aaaaaa",
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(2);

    // Main title
    this.add.text(width / 2, height * 0.65, "WELCOME TO\nREDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#ffd700",
      align: "center",
      lineSpacing: 10,
    }).setOrigin(0.5).setDepth(2);

    // Vehicle count
    this.add.text(width / 2, height * 0.78, `${cars.length} VEHICLES IN THE GARAGE`, {
      fontFamily: "'Press Start 2P'",
      fontSize: "8px",
      color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(2);

    // ENTER GARAGE button
    const btnY = height * 0.87;
    const btn = this.add.rectangle(width / 2, btnY, 250, 40, 0xffd700)
      .setInteractive({ useHandCursor: true }).setDepth(2);

    this.add.text(width / 2, btnY, "ENTER GARAGE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "11px",
      color: "#0d0d1a",
    }).setOrigin(0.5).setDepth(3);

    btn.on("pointerover", () => btn.setFillStyle(0xffe066));
    btn.on("pointerout", () => btn.setFillStyle(0xffd700));
    btn.on("pointerdown", () => this.scene.start("SelectScene"));

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("SelectScene"));

    // Back to site link
    const backText = this.add.text(width / 2, height * 0.95, "BACK TO SITE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "7px",
      color: "#555555",
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => { window.location.href = "/"; });
  }
}
