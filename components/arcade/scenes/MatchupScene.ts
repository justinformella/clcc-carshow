import Phaser from "phaser";
import { RaceCar } from "../types";

export class MatchupScene extends Phaser.Scene {
  constructor() {
    super({ key: "MatchupScene" });
  }

  create() {
    const { width, height } = this.scale;
    const playerCar: RaceCar = this.registry.get("playerCar");
    const allCars: RaceCar[] = this.registry.get("cars") || [];
    const others = allCars.filter((c) => c.id !== playerCar.id);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    const opponents = shuffled.slice(0, Math.min(3, shuffled.length));
    this.registry.set("opponentCars", opponents);
    const opponentCar = opponents[0] || playerCar;
    const selectedTrack = this.registry.get("selectedTrack");

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Dimmed garage background
    const supabaseUrl = this.registry.get("supabaseUrl") || "";
    if (supabaseUrl && this.textures.exists("garage-bg")) {
      const bg = this.add.image(width / 2, height / 2, "garage-bg");
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale).setAlpha(0.12);
    }

    // Header
    this.add.text(width / 2, 20, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa", letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 42, "REDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffffff",
    }).setOrigin(0.5);

    this.add.text(width / 2, 65, "Choose Your Ride", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ffffff",
    }).setOrigin(0.5);

    if (selectedTrack) {
      this.add.text(width / 2, 82, selectedTrack.name.toUpperCase(), {
        fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ffd700",
      }).setOrigin(0.5);
      this.add.text(width / 2, 100, selectedTrack.subtitle, {
        fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#666666",
      }).setOrigin(0.5);
    }

    // --- Car cards: P1 (left) | VS | CPU (right) ---
    const cardCenterY = height * 0.30;
    const cardW = Math.min(320, width * 0.32);
    const imgH = cardW * (9 / 16); // 16:9 aspect

    // Player card
    this.createCarCard(playerCar, width * 0.25, cardCenterY, cardW, imgH, "P1", 0xffd700);

    // VS
    this.add.text(width / 2, cardCenterY, "VS", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffd700",
    }).setOrigin(0.5);

    // Opponent card
    this.createCarCard(opponentCar, width * 0.75, cardCenterY, cardW, imgH, "CPU", 0xff0000);

    // --- Spec comparison boxes ---
    const compY = height * 0.58;
    const boxW = Math.min(200, width * 0.22);
    const boxH = 80;
    const stats = [
      { label: "HP", p: playerCar.hp, o: opponentCar.hp },
      { label: "LBS", p: playerCar.weight, o: opponentCar.weight },
      { label: "TOP", p: (playerCar.topSpeed || 150) + " mph", o: (opponentCar.topSpeed || 150) + " mph" },
    ];

    stats.forEach((s, i) => {
      const x = width * 0.25 + i * (width * 0.25);
      // Box with subtle gold bg and border
      this.add.rectangle(x, compY, boxW, boxH, 0x0d0d1a)
        .setStrokeStyle(1, 0x333333).setAlpha(1);
      this.add.rectangle(x, compY, boxW, boxH, 0xffd700).setAlpha(0.03);

      this.add.text(x, compY - 24, s.label, {
        fontFamily: "'Press Start 2P'", fontSize: "11px", color: "#aaaaaa",
      }).setOrigin(0.5);
      this.add.text(x, compY + 2, String(typeof s.p === "number" ? s.p.toLocaleString() : s.p), {
        fontFamily: "'Press Start 2P'", fontSize: "13px", color: "#ffd700",
      }).setOrigin(0.5);
      this.add.text(x, compY + 22, String(typeof s.o === "number" ? s.o.toLocaleString() : s.o), {
        fontFamily: "'Press Start 2P'", fontSize: "13px", color: "#ff0000",
      }).setOrigin(0.5);
    });

    // --- Buttons ---
    const btnY = height * 0.76;

    // RACE button
    const raceBtn = this.add.rectangle(width * 0.38, btnY, 180, 45, 0xffd700)
      .setStrokeStyle(2, 0xb8860b).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.38, btnY, "RACE!", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#0d0d1a",
    }).setOrigin(0.5);
    raceBtn.on("pointerover", () => raceBtn.setFillStyle(0xffe066));
    raceBtn.on("pointerout", () => raceBtn.setFillStyle(0xffd700));
    raceBtn.on("pointerdown", () => this.scene.start("RaceScene"));

    // SHUFFLE button
    const shuffleBtn = this.add.rectangle(width * 0.62, btnY, 180, 45, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.62, btnY, "SHUFFLE", {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#cccccc",
    }).setOrigin(0.5);
    shuffleBtn.on("pointerover", () => shuffleBtn.setStrokeStyle(2, 0xffd700));
    shuffleBtn.on("pointerout", () => shuffleBtn.setStrokeStyle(2, 0x333333));
    shuffleBtn.on("pointerdown", () => {
      this.scene.restart();
    });

    // PICK DIFFERENT CAR
    const pickText = this.add.text(width / 2, height * 0.85, "PICK DIFFERENT CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#555555",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pickText.on("pointerover", () => pickText.setColor("#aaaaaa"));
    pickText.on("pointerout", () => pickText.setColor("#555555"));
    pickText.on("pointerdown", () => this.scene.start("SelectScene"));

    // Accelerate hint
    this.add.text(width / 2, height * 0.93, "HOLD  SPACE  OR  UP  TO ACCELERATE", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#333333",
    }).setOrigin(0.5);

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("RaceScene"));
  }

  private createCarCard(car: RaceCar, x: number, y: number, cardW: number, imgH: number, label: string, color: number) {
    const colorStr = "#" + color.toString(16).padStart(6, "0");

    // Label (P1 / CPU)
    this.add.text(x, y - imgH / 2 - 30, label, {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: colorStr,
    }).setOrigin(0.5);

    // Image area — 16:9 with colored border
    this.add.rectangle(x, y, cardW, imgH, 0x111111)
      .setStrokeStyle(2, color);

    if (car.pixelArt) {
      const imgKey = `matchup-${car.id}`;
      const addImg = () => {
        if (this.textures.exists(imgKey)) {
          const img = this.add.image(x, y, imgKey);
          // objectFit: cover — fill the box, clip overflow
          const scaleX = cardW / img.width;
          const scaleY = imgH / img.height;
          const coverScale = Math.max(scaleX, scaleY);
          img.setScale(coverScale);
          // Crop to box bounds
          const visibleW = Math.ceil(cardW / coverScale);
          const visibleH2 = Math.ceil(imgH / coverScale);
          const cropX = Math.floor((img.width - visibleW) / 2);
          const cropY = Math.floor((img.height - visibleH2) / 2);
          img.setCrop(cropX, cropY, visibleW, visibleH2);
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

    // Car number
    this.add.text(x, y + imgH / 2 + 14, `#${car.carNumber}`, {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: colorStr,
    }).setOrigin(0.5);

    // Car name
    this.add.text(x, y + imgH / 2 + 34, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ffffff",
      align: "center", wordWrap: { width: cardW + 20 },
    }).setOrigin(0.5);

    // HP / LBS
    this.add.text(x, y + imgH / 2 + 58, `${car.hp} HP  ${car.weight.toLocaleString()} LBS`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
    }).setOrigin(0.5);
  }
}
