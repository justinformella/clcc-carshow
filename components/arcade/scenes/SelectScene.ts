import Phaser from "phaser";
import { RaceCar } from "../physics";

const COLS = 3;
const CARD_W = 230;
const CARD_H = 190;
const IMG_H = 100; // 16:9 at ~230px wide ≈ 130px, but leave room. Use objectFit logic.
const GAP = 12;

export class SelectScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScrollY = 0;
  private scrollContainer!: Phaser.GameObjects.Container;
  private isDragging = false;

  constructor() {
    super({ key: "SelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars: RaceCar[] = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Header (fixed, depth 10+)
    const headerBg = this.add.rectangle(width / 2, 40, width, 80, 0x0d0d1a).setDepth(10);

    this.add.text(width / 2, 15, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa", letterSpacing: 3,
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 32, "REDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 50, "CHOOSE YOUR RIDE", {
      fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 66, `${cars.length} VEHICLES`, {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(11);

    // Scrollable car grid
    const headerH = 82;
    this.scrollContainer = this.add.container(0, headerH);

    const rows = Math.ceil(cars.length / COLS);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (width - gridW) / 2;

    cars.forEach((car, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP) + CARD_W / 2;
      const y = row * (CARD_H + GAP) + CARD_H / 2;

      this.createCarCard(car, x, y);
    });

    this.maxScrollY = Math.max(0, rows * (CARD_H + GAP) - (height - headerH) + 20);
    this.scrollY = 0;

    // Mouse wheel scroll
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
      this.scrollContainer.setY(headerH - this.scrollY);
    });

    // Touch/mouse drag scroll with click-vs-drag detection
    let dragStartY = 0;
    let dragScrollStart = 0;
    this.isDragging = false;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragScrollStart = this.scrollY;
      this.isDragging = false;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const dy = dragStartY - pointer.y;
        if (Math.abs(dy) > 5) this.isDragging = true; // threshold: 5px = drag, not click
        this.scrollY = Phaser.Math.Clamp(dragScrollStart + dy, 0, this.maxScrollY);
        this.scrollContainer.setY(headerH - this.scrollY);
      }
    });
  }

  private createCarCard(car: RaceCar, x: number, y: number) {
    // Card background
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(bg);

    // Image area — black box at top of card
    const imgY = y - CARD_H / 2 + IMG_H / 2 + 2;
    const imgBg = this.add.rectangle(x, imgY, CARD_W - 4, IMG_H, 0x000000);
    this.scrollContainer.add(imgBg);

    // Load and display car pixel art
    if (car.pixelArt) {
      const imgKey = `car-select-${car.id}`;
      if (!this.textures.exists(imgKey)) {
        this.load.image(imgKey, car.pixelArt);
        this.load.once("complete", () => {
          if (this.textures.exists(imgKey)) {
            const img = this.add.image(x, imgY, imgKey);
            // Scale to fit within the box while maintaining aspect ratio
            const maxW = CARD_W - 8;
            const maxH = IMG_H - 4;
            const scaleX = maxW / img.width;
            const scaleY = maxH / img.height;
            const scale = Math.min(scaleX, scaleY);
            img.setScale(scale);
            this.scrollContainer.add(img);
          }
        });
        this.load.start();
      } else {
        const img = this.add.image(x, imgY, imgKey);
        const maxW = CARD_W - 8;
        const maxH = IMG_H - 4;
        const scaleX = maxW / img.width;
        const scaleY = maxH / img.height;
        img.setScale(Math.min(scaleX, scaleY));
        this.scrollContainer.add(img);
      }
    }

    // Text area below image
    const textStartY = y - CARD_H / 2 + IMG_H + 8;

    // Category
    const catText = this.add.text(x - CARD_W / 2 + 8, textStartY, car.category || car.era || "", {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#ffd700",
    });
    this.scrollContainer.add(catText);

    // Car name
    const nameText = this.add.text(x - CARD_W / 2 + 8, textStartY + 12, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ffffff",
      wordWrap: { width: CARD_W - 16 },
    });
    this.scrollContainer.add(nameText);

    // Stats
    const statsY = y + CARD_H / 2 - 22;
    const line1 = `HP ${car.hp}   WT ${car.weight.toLocaleString()}`;
    const line2 = `${car.engineType || ""}   ${car.displacement ? car.displacement + "L" : ""}   ${car.driveType || ""}`;
    const stats1 = this.add.text(x - CARD_W / 2 + 8, statsY, line1, {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#cccccc",
    });
    this.scrollContainer.add(stats1);
    const stats2 = this.add.text(x - CARD_W / 2 + 8, statsY + 10, line2, {
      fontFamily: "'Press Start 2P'", fontSize: "4px", color: "#aaaaaa",
    });
    this.scrollContainer.add(stats2);

    // Click handler
    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd700));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x333333));
    bg.on("pointerup", () => {
      if (this.isDragging) return; // was a scroll, not a click
      const cars: RaceCar[] = this.registry.get("cars") || [];
      const others = cars.filter((c) => c.id !== car.id);
      const opponent = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : car;
      this.registry.set("playerCar", car);
      this.registry.set("opponentCar", opponent);
      this.scene.start("MatchupScene");
    });
  }
}
