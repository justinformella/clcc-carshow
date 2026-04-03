import Phaser from "phaser";
import { drawRoad } from "../road";
import { createHorizonTexture } from "../horizon";

export class RaceScene extends Phaser.Scene {
  private roadTexture!: Phaser.Textures.CanvasTexture;
  private roadOffset = 0;
  private speed = 0;
  private maxSpeed = 5;
  private accelHeld = false;

  private sceneryItems: { sprite: Phaser.GameObjects.Rectangle; baseX: number; z: number; side: number }[] = [];

  private horizonImage!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Create a Phaser CanvasTexture and draw road onto its own context
    this.roadTexture = this.textures.createCanvas("road", width, height)!;
    this.add.image(width / 2, height / 2, "road").setDepth(0);

    // Horizon — parallax city/tree skyline
    const horizonY = height * 0.35;
    const horizonHeight = 50;
    const horizonCanvas = createHorizonTexture(width, horizonHeight);
    this.textures.addCanvas("horizon", horizonCanvas);
    this.horizonImage = this.add.tileSprite(
      width / 2, horizonY - horizonHeight / 2, width, horizonHeight, "horizon"
    ).setDepth(1);

    // Trackside scenery
    this.createScenery(width, height);

    // Player car placeholder
    this.add.rectangle(width / 2, height * 0.78, 60, 30, 0xdc2626).setDepth(10);

    // Dashboard area
    this.add.rectangle(width / 2, height * 0.93, width, height * 0.15, 0x111111).setDepth(9);
    this.add.text(width / 2, height * 0.93, "DASHBOARD", {
      fontFamily: "'Press Start 2P'",
      fontSize: "10px",
      color: "#555555",
    }).setOrigin(0.5).setDepth(11);

    // Speed display
    this.add.text(16, height - 30, "SPEED: 0", {
      fontFamily: "'Press Start 2P'",
      fontSize: "12px",
      color: "#ffd700",
    }).setDepth(12).setName("speedText");

    // Keyboard input
    this.input.keyboard!.on("keydown-SPACE", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-SPACE", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-UP", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-UP", () => { this.accelHeld = false; });

    // Touch input for mobile
    this.input.on("pointerdown", () => { this.accelHeld = true; });
    this.input.on("pointerup", () => { this.accelHeld = false; });

    // Draw initial road frame
    this.drawRoadFrame();
  }

  private createScenery(width: number, height: number) {
    const horizonY = height * 0.35;
    for (let i = 0; i < 16; i++) {
      const z = 0.05 + (i / 16) * 0.95;
      const side = i % 2 === 0 ? -1 : 1;

      const color = i % 3 === 0 ? 0x0a4a0a : i % 3 === 1 ? 0x0d5a0d : 0x084008;
      const sprite = this.add.rectangle(0, 0, 4, 8, color).setDepth(3);

      this.sceneryItems.push({ sprite, baseX: 0, z, side });
    }
    this.updateSceneryPositions(width, height, horizonY);
  }

  private updateSceneryPositions(width: number, height: number, horizonY: number) {
    for (const item of this.sceneryItems) {
      const perspective = item.z * item.z;
      const roadW = width * 0.08 + (width * 0.85 - width * 0.08) * perspective;
      const shoulderW = 2 + 40 * perspective;
      const x = width / 2 + item.side * (roadW / 2 + shoulderW + 15 + perspective * 20);
      const y = horizonY + (height - horizonY) * item.z;
      const h = 8 + 40 * perspective;
      const w = 4 + 12 * perspective;

      item.sprite.setPosition(x, y - h / 2);
      item.sprite.setSize(w, h);
      item.sprite.setAlpha(Math.min(1, item.z * 2.5));
    }
  }

  private drawRoadFrame() {
    // Get the CanvasTexture's own context and draw directly onto it
    const ctx = this.roadTexture.getContext();
    const width = this.roadTexture.width;
    const height = this.roadTexture.height;
    drawRoad(ctx, width, height, this.roadOffset);
    this.roadTexture.refresh();
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // Acceleration
    if (this.accelHeld) {
      this.speed = Math.min(this.speed + this.maxSpeed * dt * 0.8, this.maxSpeed);
    } else {
      this.speed = Math.max(this.speed - this.maxSpeed * dt * 0.5, 0);
    }

    // Scroll road
    this.roadOffset += this.speed * dt * 30;
    this.drawRoadFrame();

    // Scroll horizon parallax
    this.horizonImage.tilePositionX += this.speed * dt * 6;

    // Animate scenery
    const { width, height } = this.scale;
    const horizonY = height * 0.35;
    for (const item of this.sceneryItems) {
      item.z += this.speed * dt * 0.15;
      if (item.z > 1.15) {
        item.z = 0.02 + Math.random() * 0.08;
      }
    }
    this.updateSceneryPositions(width, height, horizonY);

    // Update speed display
    const speedText = this.children.getByName("speedText") as Phaser.GameObjects.Text;
    if (speedText) {
      speedText.setText(`SPEED: ${Math.round(this.speed * 40)}`);
    }
  }
}
