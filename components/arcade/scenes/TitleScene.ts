import Phaser from "phaser";
import { initAudio, startSelectMusic } from "@/lib/race-audio";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Redline Motor Condos background image
    if (this.textures.exists("garage-bg")) {
      const bg = this.add.image(width / 2, height / 2, "garage-bg");
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale).setDepth(0);

      // Gradient overlay at bottom
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const y = height * (0.5 + t * 0.5);
        this.add.rectangle(width / 2, y, width, height / 20, 0x0d0d1a)
          .setAlpha(t * t * 0.9).setDepth(1);
      }
    }

    this.add.text(width / 2, height * 0.55, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "20px",
      color: "#aaaaaa",
      letterSpacing: 6,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width / 2, height * 0.65, "WELCOME TO\nREDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'",
      fontSize: "28px",
      color: "#ffd700",
      align: "center",
      lineSpacing: 14,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width / 2, height * 0.78, `${cars.length} VEHICLES IN THE GARAGE`, {
      fontFamily: "'Press Start 2P'",
      fontSize: "14px",
      color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(2);

    const btnY = height * 0.87;
    const btn = this.add.rectangle(width / 2, btnY, 350, 55, 0xffd700)
      .setInteractive({ useHandCursor: true }).setDepth(2);
    this.add.text(width / 2, btnY, "ENTER GARAGE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "20px",
      color: "#0d0d1a",
    }).setOrigin(0.5).setDepth(3);

    btn.on("pointerover", () => btn.setFillStyle(0xffe066));
    btn.on("pointerout", () => btn.setFillStyle(0xffd700));
    btn.on("pointerdown", () => {
      initAudio();
      startSelectMusic();
      this.scene.start("SelectScene");
    });

    this.input.keyboard!.once("keydown-SPACE", () => {
      initAudio();
      startSelectMusic();
      this.scene.start("SelectScene");
    });

    const backText = this.add.text(width / 2, height * 0.95, "BACK TO SITE", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#555555",
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => backText.setColor("#aaaaaa"));
    backText.on("pointerout", () => backText.setColor("#555555"));
    backText.on("pointerdown", () => { window.location.href = "/"; });
  }
}
