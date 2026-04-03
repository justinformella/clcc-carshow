import Phaser from "phaser";
import { drawRoad } from "../road";
import { createHorizonTexture } from "../horizon";
import { RaceCar, PlayerState, OpponentState } from "../physics";

type RacePhase = "countdown" | "racing" | "finished";

export class RaceScene extends Phaser.Scene {
  private roadTexture!: Phaser.Textures.CanvasTexture;
  private roadOffset = 0;
  private accelHeld = false;
  private horizonImage!: Phaser.GameObjects.TileSprite;
  private sceneryItems: { sprite: Phaser.GameObjects.Rectangle; z: number; side: number }[] = [];

  // Race state
  private phase: RacePhase = "countdown";
  private countdown = 3;
  private raceStartTime = 0;
  private playerState!: PlayerState;
  private opponentState!: OpponentState;
  private jumped = false;
  private reactionTime = 0;
  private reacted = false;

  // Opponent sprite
  private oppSprite!: Phaser.GameObjects.Rectangle;

  // HUD texts
  private speedText!: Phaser.GameObjects.Text;
  private rpmText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private oppProgressFill!: Phaser.GameObjects.Rectangle;

  // Christmas tree lights
  private treeLights: Phaser.GameObjects.Arc[] = [];
  private greenLight!: Phaser.GameObjects.Arc;

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Reset state
    this.phase = "countdown";
    this.countdown = 3;
    this.jumped = false;
    this.reactionTime = 0;
    this.reacted = false;
    this.roadOffset = 0;
    this.accelHeld = false;

    // Get cars from registry (set by SelectScene/MatchupScene)
    const playerCar: RaceCar = this.registry.get("playerCar");
    const opponentCar: RaceCar = this.registry.get("opponentCar");

    // Fallback test cars if no selection was made (direct URL access)
    const fallbackCar: RaceCar = {
      id: "fallback", carNumber: 0, year: 2000, name: "Test Car",
      color: "Red", owner: "Test", hp: 300, weight: 3000, pwr: 100,
      displacement: 3.0, cylinders: 6, engineType: "V6", category: "Sports Car",
      driveType: "RWD", bodyStyle: "Coupe", origin: "American", era: "2000s",
      production: 0, redline: 6500, topSpeed: 150, gears: 5, trans: "Manual",
      pixelArt: null, pixelDash: null, pixelRear: null, aiImage: null,
    };

    // Init physics
    this.playerState = new PlayerState(playerCar || fallbackCar);
    this.opponentState = new OpponentState(opponentCar || fallbackCar);

    // Road texture
    this.roadTexture = this.textures.createCanvas("road-" + Date.now(), width, height)!;
    this.add.image(width / 2, height / 2, this.roadTexture.key).setDepth(0);

    // Horizon
    const horizonY = height * 0.35;
    const horizonHeight = 50;
    const horizonCanvas = createHorizonTexture(width, horizonHeight);
    const hKey = "horizon-" + Date.now();
    this.textures.addCanvas(hKey, horizonCanvas);
    this.horizonImage = this.add.tileSprite(
      width / 2, horizonY - horizonHeight / 2, width, horizonHeight, hKey
    ).setDepth(1);

    // Scenery
    this.sceneryItems = [];
    this.createScenery(width, height);

    // Opponent car (rectangle placeholder — in the left lane, ahead)
    this.oppSprite = this.add.rectangle(width * 0.38, height * 0.55, 40, 20, 0x3b82f6).setDepth(5);

    // Player car placeholder (right lane)
    this.add.rectangle(width * 0.58, height * 0.78, 60, 30, 0xdc2626).setDepth(10);

    // Dashboard area
    const dashY = height * 0.93;
    this.add.rectangle(width / 2, dashY, width, height * 0.15, 0x111111).setDepth(9);

    // HUD — Speed, RPM, Gear
    this.speedText = this.add.text(width * 0.15, dashY - 8, "0", {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.15, dashY + 12, "MPH", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    this.rpmText = this.add.text(width * 0.5, dashY - 8, "800", {
      fontFamily: "'Press Start 2P'", fontSize: "14px", color: "#cccccc",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.5, dashY + 12, "RPM", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    this.gearText = this.add.text(width * 0.85, dashY - 8, "1", {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: "#00ff00",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.85, dashY + 12, "GEAR", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    // Progress bar (top of screen)
    const barW = width * 0.6;
    const barX = width / 2;
    const barY = 12;
    this.progressBar = this.add.rectangle(barX, barY, barW, 6, 0x333333).setDepth(15);
    this.progressFill = this.add.rectangle(barX - barW / 2, barY, 0, 6, 0xffd700).setOrigin(0, 0.5).setDepth(16);
    this.oppProgressFill = this.add.rectangle(barX - barW / 2, barY + 8, 0, 4, 0x3b82f6).setOrigin(0, 0.5).setDepth(16);

    // P1 / CPU labels on progress bar
    this.add.text(barX - barW / 2 - 30, barY, "P1", {
      fontFamily: "'Press Start 2P'", fontSize: "6px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(16);
    this.add.text(barX - barW / 2 - 30, barY + 8, "CPU", {
      fontFamily: "'Press Start 2P'", fontSize: "5px", color: "#3b82f6",
    }).setOrigin(0.5).setDepth(16);

    // Christmas tree lights (centered overlay)
    const treeX = width / 2;
    const treeBaseY = height * 0.3;
    for (let i = 0; i < 3; i++) {
      const light = this.add.circle(treeX, treeBaseY + i * 30, 12, 0x222222)
        .setStrokeStyle(2, 0x333333).setDepth(20);
      this.treeLights.push(light);
    }
    this.greenLight = this.add.circle(treeX, treeBaseY + 3 * 30, 15, 0x222222)
      .setStrokeStyle(2, 0x333333).setDepth(20);

    // Countdown / result text
    this.countdownText = this.add.text(width / 2, height * 0.2, "", {
      fontFamily: "'Press Start 2P'", fontSize: "20px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.resultText = this.add.text(width / 2, height * 0.35, "", {
      fontFamily: "'Press Start 2P'", fontSize: "24px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    // Input
    this.input.keyboard!.on("keydown-SPACE", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-SPACE", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-UP", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-UP", () => { this.accelHeld = false; });
    this.input.on("pointerdown", () => { this.accelHeld = true; });
    this.input.on("pointerup", () => { this.accelHeld = false; });

    // Draw initial road
    this.drawRoadFrame();

    // Start countdown sequence
    this.startCountdown();
  }

  private startCountdown() {
    this.countdown = 3;
    this.updateTreeLights();

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        this.countdown--;
        this.updateTreeLights();

        // Jump detection: holding accel during amber
        if (this.countdown > 0 && this.accelHeld) {
          this.jumped = true;
        }

        if (this.countdown <= 0) {
          // GO!
          this.phase = "racing";
          this.raceStartTime = this.time.now;
          if (this.jumped) {
            // Add 500ms penalty
            this.raceStartTime -= 500;
          }
        }
      },
    });
  }

  private updateTreeLights() {
    // Light up amber lights progressively
    for (let i = 0; i < 3; i++) {
      const lit = this.countdown <= (3 - i) && this.countdown > 0;
      const isGreen = this.countdown === 0;
      this.treeLights[i].setFillStyle(lit ? 0xf59e0b : isGreen ? 0x00ff00 : 0x222222);
    }
    this.greenLight.setFillStyle(this.countdown === 0 ? 0x00ff00 : 0x222222);

    if (this.countdown === 0) {
      // Flash green then fade tree
      this.time.delayedCall(500, () => {
        this.treeLights.forEach(l => l.setAlpha(0));
        this.greenLight.setAlpha(0);
      });
    }
  }

  private createScenery(width: number, height: number) {
    for (let i = 0; i < 16; i++) {
      const z = 0.05 + (i / 16) * 0.95;
      const side = i % 2 === 0 ? -1 : 1;
      const color = i % 3 === 0 ? 0x0a4a0a : i % 3 === 1 ? 0x0d5a0d : 0x084008;
      const sprite = this.add.rectangle(0, 0, 4, 8, color).setDepth(3);
      this.sceneryItems.push({ sprite, z, side });
    }
  }

  private drawRoadFrame() {
    const ctx = this.roadTexture.getContext();
    drawRoad(ctx, this.roadTexture.width, this.roadTexture.height, this.roadOffset);
    this.roadTexture.refresh();
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const { width, height } = this.scale;
    const horizonY = height * 0.35;
    const elapsed = this.phase === "racing" ? this.time.now - this.raceStartTime : 0;

    // --- RACING PHASE ---
    if (this.phase === "racing") {
      // Track reaction time
      if (this.accelHeld && !this.reacted) {
        this.reacted = true;
        this.reactionTime = this.jumped ? 0 : Math.round(this.time.now - (this.raceStartTime + (this.jumped ? 500 : 0)));
      }

      // Update player physics
      const shifted = this.playerState.update(this.accelHeld, elapsed);
      if (shifted) {
        // Could play shift sound here in SP4
      }

      // Update opponent
      this.opponentState.update(elapsed);

      // Check finish
      if (this.playerState.finished && this.opponentState.finished) {
        this.finishRace();
      } else if (this.playerState.finished && !this.opponentState.finished) {
        // Estimate opponent remaining time
        const oppRemaining = (1000 - this.opponentState.pos) / (this.opponentState.speed || 0.01);
        this.opponentState.finishTime = Math.round(this.playerState.finishTime + oppRemaining * 1000 / 60);
        this.finishRace();
      } else if (this.opponentState.finished && !this.playerState.finished) {
        const pRemaining = (1000 - this.playerState.pos) / (this.playerState.speed || 0.01);
        this.playerState.finishTime = Math.round(this.opponentState.finishTime + pRemaining * 1000 / 60);
        this.finishRace();
      } else if (elapsed > 30000) {
        // Timeout
        this.playerState.finishTime = elapsed;
        this.opponentState.finishTime = elapsed;
        this.finishRace();
      }
    }

    // --- VISUAL UPDATES (all phases) ---
    const visualSpeed = this.phase === "racing" ? this.playerState.speed : 0;

    // Scroll road
    this.roadOffset += visualSpeed * dt * 30;
    this.drawRoadFrame();

    // Parallax horizon
    this.horizonImage.tilePositionX += visualSpeed * dt * 6;

    // Scenery
    for (const item of this.sceneryItems) {
      item.z += visualSpeed * dt * 0.15;
      if (item.z > 1.15) item.z = 0.02 + Math.random() * 0.08;

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

    // Opponent sprite positioning — placed in left lane relative to road width at depth
    if (this.phase === "racing") {
      const delta2 = this.opponentState.pos - this.playerState.pos;
      const roadWidthBottom = width * 0.85;
      const roadWidthTop = width * 0.08;

      if (delta2 >= 0) {
        // Opponent ahead — shrink toward horizon
        const tOpp = Math.min(1, delta2 / 200);
        const depthT = 1 - tOpp; // 1 = near (bottom), 0 = far (horizon)
        const perspective = depthT * depthT;
        const roadW = roadWidthTop + (roadWidthBottom - roadWidthTop) * perspective;
        const scale = 0.2 + 0.8 * depthT;

        // Left lane = center - roadW/4 (quarter of road left of center line)
        const oppX = width / 2 - roadW * 0.22;
        const oppY = horizonY + (height * 0.8 - horizonY) * depthT;

        this.oppSprite.setPosition(oppX, oppY);
        this.oppSprite.setSize(40 * scale, 20 * scale);
        this.oppSprite.setAlpha(Math.min(1, scale * 1.5));
      } else {
        // Opponent behind — grow and slide left/down off screen
        const behind = Math.min(Math.abs(delta2), 100) / 100;
        const scale = 1.0 + behind * 0.6;
        const roadW = roadWidthBottom;
        const oppX = width / 2 - roadW * 0.22 - behind * width * 0.15;
        const oppY = height * 0.8 + behind * height * 0.15;

        this.oppSprite.setPosition(oppX, oppY);
        this.oppSprite.setSize(40 * scale, 20 * scale);
        this.oppSprite.setAlpha(Math.max(0, 1 - behind * 1.5));
      }
    }

    // HUD updates
    if (this.phase === "racing" || this.phase === "finished") {
      this.speedText.setText(`${this.playerState.mph}`);
      this.rpmText.setText(`${Math.round(this.playerState.rpm)}`);
      this.rpmText.setColor(this.playerState.rpm > this.playerState.redline * 0.88 ? "#ff0000" : "#cccccc");
      this.gearText.setText(`${this.playerState.gear}`);

      // Progress bars
      const barW = width * 0.6;
      this.progressFill.setSize(barW * Math.min(this.playerState.pos / 1000, 1), 6);
      this.oppProgressFill.setSize(barW * Math.min(this.opponentState.pos / 1000, 1), 4);
    }
  }

  private finishRace() {
    if (this.phase === "finished") return;
    this.phase = "finished";

    const { width, height } = this.scale;
    const playerWon = this.playerState.finishTime <= this.opponentState.finishTime;

    // Flash effect
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff).setDepth(25).setAlpha(0.9);
    this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

    // Result text
    this.resultText.setText(playerWon ? "YOU WIN!" : "YOU LOSE");
    this.resultText.setColor(playerWon ? "#ffd700" : "#ff0000");
    this.resultText.setAlpha(1);

    // Times
    const pTime = (this.playerState.finishTime / 1000).toFixed(2);
    const oTime = (this.opponentState.finishTime / 1000).toFixed(2);
    const rt = this.jumped ? "JUMP +0.5s" : `RT: ${(this.reactionTime / 1000).toFixed(3)}s`;

    this.add.text(width / 2, height * 0.48, `P1: ${pTime}s  |  CPU: ${oTime}s`, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(21);

    this.add.text(width / 2, height * 0.55, rt, {
      fontFamily: "'Press Start 2P'", fontSize: "8px", color: this.jumped ? "#ff0000" : "#00ff00",
    }).setOrigin(0.5).setDepth(21);

    // REMATCH button
    const rematchBtn = this.add.rectangle(width * 0.35, height * 0.65, 140, 35, 0xffd700)
      .setDepth(22).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.35, height * 0.65, "REMATCH", {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#0d0d1a",
    }).setOrigin(0.5).setDepth(23);
    rematchBtn.on("pointerdown", () => this.scene.restart());

    // NEW CAR button
    const newCarBtn = this.add.rectangle(width * 0.65, height * 0.65, 140, 35, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333).setDepth(22).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.65, height * 0.65, "NEW CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#cccccc",
    }).setOrigin(0.5).setDepth(23);
    newCarBtn.on("pointerdown", () => this.scene.start("SelectScene"));

    // Keyboard shortcuts
    this.input.keyboard!.once("keydown-SPACE", () => this.scene.restart());
  }
}
