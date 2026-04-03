import { drawRoad } from "../road";

export class RaceScene extends Phaser.Scene {
  private roadCanvas!: HTMLCanvasElement;
  private roadCtx!: CanvasRenderingContext2D;
  private roadTexture!: Phaser.Textures.CanvasTexture;
  private roadOffset = 0;
  private speed = 0;
  private maxSpeed = 5;
  private accelHeld = false;

  private sceneryItems: { sprite: Phaser.GameObjects.Rectangle; baseX: number; z: number }[] = [];

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    this.roadCanvas = document.createElement("canvas");
    this.roadCanvas.width = width;
    this.roadCanvas.height = height;
    this.roadCtx = this.roadCanvas.getContext("2d")!;

    this.roadTexture = this.textures.createCanvas("road", width, height)!;
    this.add.image(width / 2, height / 2, "road");

    this.createScenery(width, height);

    this.add.rectangle(width / 2, height * 0.82, 60, 30, 0xdc2626).setDepth(10);

    this.add.rectangle(width / 2, height * 0.93, width, height * 0.15, 0x111111).setDepth(9);
    this.add.text(width / 2, height * 0.93, "DASHBOARD", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#555555",
    }).setOrigin(0.5).setDepth(11);

    this.add.text(16, height - 30, "SPEED: 0", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#ffd700",
    }).setDepth(12).setName("speedText");

    this.input.keyboard!.on("keydown-SPACE", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-SPACE", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-UP", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-UP", () => { this.accelHeld = false; });
  }

  private createScenery(width: number, height: number) {
    const horizonY = height * 0.35;
    for (let i = 0; i < 12; i++) {
      const z = 0.1 + Math.random() * 0.9;
      const perspective = z * z;
      const roadW = width * 0.08 + (width * 0.85 - width * 0.08) * perspective;
      const shoulderW = 2 + 40 * perspective;
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = width / 2 + side * (roadW / 2 + shoulderW + 10 + Math.random() * 30);
      const y = horizonY + (height - horizonY) * z;
      const h = 8 + 40 * perspective;
      const w = 4 + 12 * perspective;

      const color = i % 3 === 0 ? 0x0a4a0a : i % 3 === 1 ? 0x0d5a0d : 0x084008;
      const sprite = this.add.rectangle(baseX, y - h / 2, w, h, color).setDepth(3);

      this.sceneryItems.push({ sprite, baseX, z });
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    if (this.accelHeld) {
      this.speed = Math.min(this.speed + this.maxSpeed * dt * 0.8, this.maxSpeed);
    } else {
      this.speed = Math.max(this.speed - this.maxSpeed * dt * 0.5, 0);
    }

    this.roadOffset += this.speed * dt * 30;

    drawRoad(this.roadCtx, this.roadCanvas.width, this.roadCanvas.height, this.roadOffset);
    this.roadTexture.refresh();

    const { height } = this.scale;
    const horizonY = height * 0.35;
    for (const item of this.sceneryItems) {
      item.z += this.speed * dt * 0.15;
      if (item.z > 1.1) {
        item.z = 0.05 + Math.random() * 0.1;
      }
      const perspective = item.z * item.z;
      const roadW = this.scale.width * 0.08 + (this.scale.width * 0.85 - this.scale.width * 0.08) * perspective;
      const shoulderW = 2 + 40 * perspective;
      const side = item.baseX > this.scale.width / 2 ? 1 : -1;
      const x = this.scale.width / 2 + side * (roadW / 2 + shoulderW + 10 + Math.random() * 5);
      const y = horizonY + (height - horizonY) * item.z;
      const h = 8 + 40 * perspective;
      const w = 4 + 12 * perspective;

      item.sprite.setPosition(x, y - h / 2);
      item.sprite.setSize(w, h);
      item.sprite.setAlpha(Math.min(1, item.z * 3));
    }

    const speedText = this.children.getByName("speedText") as Phaser.GameObjects.Text;
    if (speedText) {
      speedText.setText(`SPEED: ${Math.round(this.speed * 40)}`);
    }
  }
}

