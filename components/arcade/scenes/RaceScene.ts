import Phaser from "phaser";

export class RaceScene extends Phaser.Scene {
  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#0d0d1a");

    this.add.text(width / 2, height / 2, "ROAD RACE\nCOMING SOON", {
      fontFamily: "'Press Start 2P'",
      fontSize: "24px",
      color: "#ffd700",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);

    const backText = this.add.text(width / 2, height / 2 + 80, "BACK TO SELECT", {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => this.scene.start("SelectScene"));
  }
}
