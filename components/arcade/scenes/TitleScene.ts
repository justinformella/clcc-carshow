import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars = this.registry.get("cars") || [];

    // Dark background
    this.cameras.main.setBackgroundColor("#0d0d1a");

    // CLCC ARCADE label
    this.add.text(width / 2, height * 0.25, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#aaaaaa",
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Main title
    this.add.text(width / 2, height * 0.38, "WELCOME TO\nREDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'",
      fontSize: "16px",
      color: "#ffd700",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);

    // Vehicle count
    this.add.text(width / 2, height * 0.55, `${cars.length} VEHICLES IN THE GARAGE`, {
      fontFamily: "'Press Start 2P'",
      fontSize: "8px",
      color: "#aaaaaa",
    }).setOrigin(0.5);

    // ENTER GARAGE button
    const btnW = 250;
    const btnH = 45;
    const btnY = height * 0.68;
    const btn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0xffd700)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, btnY, "ENTER GARAGE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#0d0d1a",
    }).setOrigin(0.5);

    btn.on("pointerover", () => btn.setFillStyle(0xffe066));
    btn.on("pointerout", () => btn.setFillStyle(0xffd700));
    btn.on("pointerdown", () => {
      this.scene.start("SelectScene");
    });

    // Keyboard shortcut
    this.input.keyboard!.once("keydown-SPACE", () => {
      this.scene.start("SelectScene");
    });

    // Back to site link
    const backText = this.add.text(width / 2, height * 0.82, "BACK TO SITE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "7px",
      color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => {
      window.location.href = "/";
    });
  }
}
