import Phaser from "phaser";
import { RaceCar } from "../physics";

const GAP = 12;

export class SelectScene extends Phaser.Scene {
  private scrollY = 0;
  private maxScrollY = 0;
  private scrollContainer!: Phaser.GameObjects.Container;
  private isDragging = false;
  private inputEnabled = false; // prevent passthrough click from previous scene

  constructor() {
    super({ key: "SelectScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cars: RaceCar[] = this.registry.get("cars") || [];

    this.cameras.main.setBackgroundColor("#0d0d1a");
    this.isDragging = false;
    this.inputEnabled = false;

    // Delay input activation to prevent click passthrough from TitleScene
    this.time.delayedCall(300, () => { this.inputEnabled = true; });

    // Responsive columns: 1 on narrow, 2 on medium, 3 on wide
    const cols = width < 500 ? 1 : width < 700 ? 2 : 3;
    const cardW = Math.min(230, (width - GAP * (cols + 1)) / cols);
    const imgH = cardW * 0.45; // maintain roughly 16:9
    const cardH = imgH + 90; // image + text area

    // Header
    this.add.rectangle(width / 2, 40, width, 80, 0x0d0d1a).setDepth(10);

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

    this.maxScrollY = Math.max(0, rows * (cardH + GAP) - (height - headerH) + 20);
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
    // Card background
    const bg = this.add.rectangle(x, y, cardW, cardH, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(bg);

    // Image area
    const imgY = y - cardH / 2 + imgH / 2 + 2;
    this.scrollContainer.add(this.add.rectangle(x, imgY, cardW - 4, imgH, 0x000000));

    // Load pixel art
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

    // Text below image
    const textStartY = y - cardH / 2 + imgH + 8;

    this.scrollContainer.add(this.add.text(x - cardW / 2 + 8, textStartY, car.category || car.era || "", {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#ffd700",
    }));

    this.scrollContainer.add(this.add.text(x - cardW / 2 + 8, textStartY + 12, car.name, {
      fontFamily: "'Press Start 2P'", fontSize: "7px", color: "#ffffff",
      wordWrap: { width: cardW - 16 },
    }));

    const statsY = y + cardH / 2 - 22;
    this.scrollContainer.add(this.add.text(x - cardW / 2 + 8, statsY,
      `HP ${car.hp}   WT ${car.weight.toLocaleString()}`, {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#cccccc",
    }));
    this.scrollContainer.add(this.add.text(x - cardW / 2 + 8, statsY + 10,
      `${car.engineType || ""}  ${car.displacement ? car.displacement + "L" : ""}  ${car.driveType || ""}`, {
      fontFamily: "'Press Start 2P'", fontSize: "4px", color: "#aaaaaa",
    }));

    // Click handler — only on pointerup, only if not dragging, only after delay
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
