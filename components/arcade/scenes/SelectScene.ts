import Phaser from "phaser";
import { RaceCar } from "../physics";

const GAP = 16;

export class SelectScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScrollY = 0;
  private scrollContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private inputEnabled = false;

  constructor() {
    super({ key: "SelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars: RaceCar[] = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");
    this.isDragging = false;
    this.inputEnabled = false;

    this.time.delayedCall(300, () => { this.inputEnabled = true; });

    // Responsive columns
    const cols = width < 600 ? 1 : width < 900 ? 2 : 3;
    const cardW = Math.min(380, (width - GAP * (cols + 1)) / cols);
    const imgH = cardW * 0.48;
    const cardH = imgH + 120;

    // Header
    const headerH = 110;
    this.add.rectangle(width / 2, headerH / 2, width, headerH, 0x0d0d1a).setDepth(10);

    this.add.text(width / 2, 18, "CLCC ARCADE", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#aaaaaa", letterSpacing: 4,
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 45, "REDLINE MOTOR CONDOS", {
      fontFamily: "'Press Start 2P'", fontSize: "20px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 72, "CHOOSE YOUR RIDE", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, 95, `${cars.length} VEHICLES`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(11);

    // Scrollable car grid
    this.scrollContainer = this.add.container(0, headerH);

    const rows = Math.ceil(cars.length / cols);
    const gridW = cols * cardW + (cols - 1) * GAP;
    const startX = (width - gridW) / 2;

    cars.forEach((car, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + GAP) + cardW / 2;
      const y = row * (cardH + GAP) + cardH / 2;
      this.createCarCard(car, x, y, cardW, cardH, imgH);
    });

    this.maxScrollY = Math.max(0, rows * (cardH + GAP) - (height - headerH) + 30);
    this.scrollY = 0;

    // Mouse wheel scroll
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _go: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
      this.scrollContainer.setY(headerH - this.scrollY);
    });

    // Touch/mouse drag scroll
    let dragStartY = 0;
    let dragScrollStart = 0;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragScrollStart = this.scrollY;
      this.isDragging = false;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const dy = dragStartY - pointer.y;
        if (Math.abs(dy) > 8) this.isDragging = true;
        this.scrollY = Phaser.Math.Clamp(dragScrollStart + dy, 0, this.maxScrollY);
        this.scrollContainer.setY(headerH - this.scrollY);
      }
    });
  }

  private createCarCard(car: RaceCar, x: number, y: number, cardW: number, cardH: number, imgH: number) {
    const bg = this.add.rectangle(x, y, cardW, cardH, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(bg);

    // Image area
    const imgY = y - cardH / 2 + imgH / 2 + 2;
    this.scrollContainer.add(this.add.rectangle(x, imgY, cardW - 4, imgH, 0x000000));

    if (car.pixelArt) {
      const imgKey = `car-select-${car.id}`;
      const addImage = () => {
        if (this.textures.exists(imgKey)) {
          const img = this.add.image(x, imgY, imgKey);
          const scaleX = (cardW - 8) / img.width;
          const scaleY = (imgH - 4) / img.height;
          img.setScale(Math.min(scaleX, scaleY));
          this.scrollContainer.add(img);
        }
      };
      if (this.textures.exists(imgKey)) {
        addImage();
      } else {
        this.load.image(imgKey, car.pixelArt);
        this.load.once("complete", addImage);
        this.load.start();
      }
    }

    const textStartY = y - cardH / 2 + imgH + 10;

    this.scrollContainer.add(this.add.text(x - cardW / 2 + 12, textStartY, car.category || car.era || "", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#ffd700",
    }));

    this.scrollContainer.add(this.add.text(x - cardW / 2 + 12, textStartY + 18, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#ffffff",
      wordWrap: { width: cardW - 24 },
    }));

    const statsY = y + cardH / 2 - 35;
    this.scrollContainer.add(this.add.text(x - cardW / 2 + 12, statsY,
      `HP ${car.hp}   WT ${car.weight.toLocaleString()}`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#cccccc",
    }));
    this.scrollContainer.add(this.add.text(x - cardW / 2 + 12, statsY + 16,
      `${car.engineType || ""}  ${car.displacement ? car.displacement + "L" : ""}  ${car.driveType || ""}`, {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#aaaaaa",
    }));

    bg.on("pointerover", () => bg.setStrokeStyle(2, 0xffd700));
    bg.on("pointerout", () => bg.setStrokeStyle(2, 0x333333));
    bg.on("pointerup", () => {
      if (this.isDragging || !this.inputEnabled) return;
      const allCars: RaceCar[] = this.registry.get("cars") || [];
      const others = allCars.filter((c) => c.id !== car.id);
      const opponent = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : car;
      this.registry.set("playerCar", car);
      this.registry.set("opponentCar", opponent);
      this.scene.start("MatchupScene");
    });
  }
}
