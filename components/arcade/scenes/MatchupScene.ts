import Phaser from "phaser";
import { RaceCar, quarterMileET } from "../physics";

export class MatchupScene extends Phaser.Scene {
  constructor() {
    super({ key: "MatchupScene" });
  }

  create() {
    const { width, height } = this.scale;
    const playerCar: RaceCar = this.registry.get("playerCar");
    const opponentCar: RaceCar = this.registry.get("opponentCar");

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // VS header
    this.add.text(width / 2, 30, "MATCHUP", {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ffd700",
    }).setOrigin(0.5);

    // Player card (left)
    this.createCarPanel(playerCar, width * 0.25, height * 0.35, "P1", "#ffd700");

    // VS text
    this.add.text(width / 2, height * 0.35, "VS", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#555555",
    }).setOrigin(0.5);

    // Opponent card (right)
    this.createCarPanel(opponentCar, width * 0.75, height * 0.35, "CPU", "#ff0000");

    // Stat comparison
    const compY = height * 0.62;
    const stats = [
      { label: "HP", p: playerCar.hp, o: opponentCar.hp },
      { label: "LBS", p: playerCar.weight, o: opponentCar.weight },
      { label: "1/4 MI", p: quarterMileET(playerCar).toFixed(1) + "s", o: quarterMileET(opponentCar).toFixed(1) + "s" },
    ];

    stats.forEach((s, i) => {
      const x = width * (0.25 + i * 0.25);
      this.add.text(x, compY, s.label, {
        fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
      }).setOrigin(0.5);
      this.add.text(x, compY + 16, String(typeof s.p === "number" ? s.p.toLocaleString() : s.p), {
        fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#ffd700",
      }).setOrigin(0.5);
      this.add.text(x, compY + 30, String(typeof s.o === "number" ? s.o.toLocaleString() : s.o), {
        fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ff0000",
      }).setOrigin(0.5);
    });

    // RACE button
    const raceBtn = this.add.rectangle(width * 0.35, height * 0.82, 160, 40, 0xffd700)
      .setInteractive({ useHandCursor: true });
    this.add.text(width * 0.35, height * 0.82, "RACE!", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#0d0d1a",
    }).setOrigin(0.5);

    raceBtn.on("pointerover", () => raceBtn.setFillStyle(0xffe066));
    raceBtn.on("pointerout", () => raceBtn.setFillStyle(0xffd700));
    raceBtn.on("pointerdown", () => {
      this.scene.start("RaceScene");
    });

    // SHUFFLE button
    const shuffleBtn = this.add.rectangle(width * 0.65, height * 0.82, 160, 40, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    this.add.text(width * 0.65, height * 0.82, "SHUFFLE", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#cccccc",
    }).setOrigin(0.5);

    shuffleBtn.on("pointerover", () => shuffleBtn.setStrokeStyle(2, 0xffd700));
    shuffleBtn.on("pointerout", () => shuffleBtn.setStrokeStyle(2, 0x333333));
    shuffleBtn.on("pointerdown", () => {
      const cars: RaceCar[] = this.registry.get("cars") || [];
      const others = cars.filter((c) => c.id !== playerCar.id && c.id !== opponentCar.id);
      if (others.length > 0) {
        this.registry.set("opponentCar", others[Math.floor(Math.random() * others.length)]);
        this.scene.restart();
      }
    });

    // Pick different car — use a rectangle button for reliable click target
    const pickBtnY = height * 0.92;
    const pickBtn = this.add.rectangle(width / 2, pickBtnY, 200, 28, 0x0d0d1a)
      .setStrokeStyle(1, 0x333333)
      .setInteractive({ useHandCursor: true });
    const pickText = this.add.text(width / 2, pickBtnY, "PICK DIFFERENT CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#777777",
    }).setOrigin(0.5);
    pickBtn.on("pointerover", () => { pickBtn.setStrokeStyle(1, 0xffd700); pickText.setColor("#aaaaaa"); });
    pickBtn.on("pointerout", () => { pickBtn.setStrokeStyle(1, 0x333333); pickText.setColor("#777777"); });
    pickBtn.on("pointerdown", () => this.scene.start("SelectScene"));

    // Keyboard shortcut
    this.input.keyboard!.once("keydown-SPACE", () => {
      this.scene.start("RaceScene");
    });
  }

  private createCarPanel(car: RaceCar, x: number, y: number, label: string, labelColor: string) {
    // Label
    this.add.text(x, y - 80, label, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: labelColor,
    }).setOrigin(0.5);

    // Image area
    const imgW = 160;
    const imgH = 90;
    this.add.rectangle(x, y - 20, imgW, imgH, 0x000000).setStrokeStyle(2, parseInt(labelColor.replace("#", ""), 16));

    if (car.pixelArt) {
      const imgKey = `matchup-${car.id}`;
      if (!this.textures.exists(imgKey)) {
        this.load.image(imgKey, car.pixelArt);
        this.load.once("complete", () => {
          if (this.textures.exists(imgKey)) {
            this.add.image(x, y - 20, imgKey).setDisplaySize(imgW - 4, imgH - 4);
          }
        });
        this.load.start();
      } else {
        this.add.image(x, y - 20, imgKey).setDisplaySize(imgW - 4, imgH - 4);
      }
    }

    // Car name
    this.add.text(x, y + 35, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ffffff",
      align: "center", wordWrap: { width: 170 },
    }).setOrigin(0.5);

    // Stats
    this.add.text(x, y + 55, `${car.hp} HP  ${car.weight.toLocaleString()} LBS`, {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#aaaaaa",
    }).setOrigin(0.5);
  }
}
