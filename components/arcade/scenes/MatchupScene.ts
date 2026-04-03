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

    this.add.text(width / 2, 40, "MATCHUP", {
      fontFamily: "'Press Start 2P'", fontSize: "24px", color: "#ffd700",
    }).setOrigin(0.5);

    // Player card (left)
    this.createCarPanel(playerCar, width * 0.25, height * 0.35, "P1", "#ffd700");

    // VS
    this.add.text(width / 2, height * 0.35, "VS", {
      fontFamily: "'Press Start 2P'", fontSize: "28px", color: "#555555",
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
        fontFamily: "'Press Start 2P'", fontSize: "11px", color: "#aaaaaa",
      }).setOrigin(0.5);
      this.add.text(x, compY + 22, String(typeof s.p === "number" ? s.p.toLocaleString() : s.p), {
        fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffd700",
      }).setOrigin(0.5);
      this.add.text(x, compY + 44, String(typeof s.o === "number" ? s.o.toLocaleString() : s.o), {
        fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ff0000",
      }).setOrigin(0.5);
    });

    // RACE button
    const raceBtn = this.add.rectangle(width * 0.35, height * 0.82, 220, 50, 0xffd700)
      .setInteractive({ useHandCursor: true });
    this.add.text(width * 0.35, height * 0.82, "RACE!", {
      fontFamily: "'Press Start 2P'", fontSize: "20px", color: "#0d0d1a",
    }).setOrigin(0.5);

    raceBtn.on("pointerover", () => raceBtn.setFillStyle(0xffe066));
    raceBtn.on("pointerout", () => raceBtn.setFillStyle(0xffd700));
    raceBtn.on("pointerdown", () => this.scene.start("RaceScene"));

    // SHUFFLE button
    const shuffleBtn = this.add.rectangle(width * 0.65, height * 0.82, 220, 50, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.65, height * 0.82, "SHUFFLE", {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: "#cccccc",
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

    // Pick different car
    const pickBtnY = height * 0.92;
    const pickBtn = this.add.rectangle(width / 2, pickBtnY, 280, 35, 0x0d0d1a)
      .setStrokeStyle(1, 0x333333).setInteractive({ useHandCursor: true });
    const pickText = this.add.text(width / 2, pickBtnY, "PICK DIFFERENT CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#777777",
    }).setOrigin(0.5);
    pickBtn.on("pointerover", () => { pickBtn.setStrokeStyle(1, 0xffd700); pickText.setColor("#aaaaaa"); });
    pickBtn.on("pointerout", () => { pickBtn.setStrokeStyle(1, 0x333333); pickText.setColor("#777777"); });
    pickBtn.on("pointerdown", () => this.scene.start("SelectScene"));

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("RaceScene"));
  }

  private createCarPanel(car: RaceCar, x: number, y: number, label: string, labelColor: string) {
    this.add.text(x, y - 100, label, {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: labelColor,
    }).setOrigin(0.5);

    const imgW = 220;
    const imgH = 124;
    this.add.rectangle(x, y - 20, imgW, imgH, 0x000000)
      .setStrokeStyle(2, parseInt(labelColor.replace("#", ""), 16));

    if (car.pixelArt) {
      const imgKey = `matchup-${car.id}`;
      const addImg = () => {
        if (this.textures.exists(imgKey)) {
          const img = this.add.image(x, y - 20, imgKey);
          const scale = Math.min((imgW - 4) / img.width, (imgH - 4) / img.height);
          img.setScale(scale);
        }
      };
      if (this.textures.exists(imgKey)) {
        addImg();
      } else {
        this.load.image(imgKey, car.pixelArt);
        this.load.once("complete", addImg);
        this.load.start();
      }
    }

    this.add.text(x, y + 50, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ffffff",
      align: "center", wordWrap: { width: 240 },
    }).setOrigin(0.5);

    this.add.text(x, y + 75, `${car.hp} HP  ${car.weight.toLocaleString()} LBS`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
    }).setOrigin(0.5);
  }
}
