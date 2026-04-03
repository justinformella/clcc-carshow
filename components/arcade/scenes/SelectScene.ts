import Phaser from "phaser";
import { RaceCar } from "../physics";

const COLS = 3;
const CARD_W = 220;
const CARD_H = 140;
const GAP = 15;

export class SelectScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScrollY = 0;
  private carCards: Phaser.GameObjects.Container[] = [];
  private scrollContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "SelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars: RaceCar[] = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Header (fixed)
    this.add.text(width / 2, 20, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#aaaaaa", letterSpacing: 3,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 38, "REDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'", fontSize: "11px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 58, "CHOOSE YOUR RIDE", {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 75, `${cars.length} VEHICLES`, {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(10);

    // Scrollable car grid
    const headerH = 90;
    this.scrollContainer = this.add.container(0, headerH);

    const rows = Math.ceil(cars.length / COLS);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (width - gridW) / 2;

    cars.forEach((car, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP) + CARD_W / 2;
      const y = row * (CARD_H + GAP) + CARD_H / 2;

      const card = this.createCarCard(car, x, y);
      this.scrollContainer.add(card);
      this.carCards.push(card);
    });

    this.maxScrollY = Math.max(0, rows * (CARD_H + GAP) - (height - headerH) + 20);

    // Scroll with mouse wheel
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
      this.scrollContainer.setY(headerH - this.scrollY);
    });

    // Scroll with touch drag
    let dragStartY = 0;
    let dragScrollStart = 0;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragScrollStart = this.scrollY;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const dy = dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(dragScrollStart + dy, 0, this.maxScrollY);
        this.scrollContainer.setY(headerH - this.scrollY);
      }
    });

    // Back link
    const backText = this.add.text(width / 2, height - 15, "BACK", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#555555",
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    backText.on("pointerdown", () => this.scene.start("TitleScene"));
  }

  private createCarCard(car: RaceCar, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    container.add(bg);

    // Car image area (top portion)
    const imgH = CARD_H * 0.5;
    container.add(this.add.rectangle(0, -CARD_H / 2 + imgH / 2, CARD_W - 4, imgH, 0x000000));

    // If car has pixel art, load and display it
    if (car.pixelArt) {
      const imgKey = `car-${car.id}`;
      if (!this.textures.exists(imgKey)) {
        this.load.image(imgKey, car.pixelArt);
        this.load.once("complete", () => {
          if (this.textures.exists(imgKey)) {
            const img = this.add.image(0, -CARD_H / 2 + imgH / 2, imgKey)
              .setDisplaySize(CARD_W - 8, imgH - 4);
            container.add(img);
          }
        });
        this.load.start();
      } else {
        const img = this.add.image(0, -CARD_H / 2 + imgH / 2, imgKey)
          .setDisplaySize(CARD_W - 8, imgH - 4);
        container.add(img);
      }
    }

    // Category label
    const catY = imgH / 2 - CARD_H / 2 + imgH + 6;
    container.add(this.add.text(-CARD_W / 2 + 8, catY - CARD_H / 2 + imgH + 4, car.category || car.era || "", {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#ffd700",
    }));

    // Car name
    container.add(this.add.text(-CARD_W / 2 + 8, catY - CARD_H / 2 + imgH + 16, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ffffff",
      wordWrap: { width: CARD_W - 16 },
    }));

    // Stats row
    const statsY = CARD_H / 2 - 14;
    const statsText = `${car.hp}HP  ${car.weight}LB  ${car.engineType}`;
    container.add(this.add.text(-CARD_W / 2 + 8, statsY, statsText, {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#aaaaaa",
    }));

    // Click to select
    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd700));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x333333));
    bg.on("pointerdown", () => {
      // Pick random opponent
      const cars: RaceCar[] = this.registry.get("cars") || [];
      const others = cars.filter((c) => c.id !== car.id);
      const opponent = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : car;

      this.registry.set("playerCar", car);
      this.registry.set("opponentCar", opponent);
      this.scene.start("MatchupScene");
    });

    return container;
  }
}
