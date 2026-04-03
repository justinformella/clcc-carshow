import Phaser from "phaser";
import { drawRoad, drawBackground, pickRandomSkin, RoadColors } from "../road";
import { RaceCar, PlayerState, OpponentState, checkCollision } from "../physics";
import {
  initAudio, playCountdownBeep, startEngine, updateEngine,
  stopEngine, playGearShift, playWinJingle, playLoseJingle,
  playFoulBuzzer, startMusic, stopAll,
} from "@/lib/race-audio";

type RacePhase = "countdown" | "racing" | "finished";

export class RaceScene extends Phaser.Scene {
  private roadTexture!: Phaser.Textures.CanvasTexture;
  private roadOffset = 0;
  private accelHeld = false;
  private steerLeft = false;
  private steerRight = false;
  private collisionCooldown = 0;
  private playerCarSprite!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private dashImage: Phaser.GameObjects.Image | null = null;
  private horizonImage!: Phaser.GameObjects.TileSprite;
  private sceneryItems: { sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle; z: number; side: number }[] = [];
  private trackSkin!: RoadColors;
  private speedLines: Phaser.GameObjects.Line[] = [];

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
  private countdownOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "RaceScene" });
  }

  create() {
    const { width, height } = this.scale;

    // --- Cleanup from previous run (fix memory leaks) ---
    // Destroy old scenery sprites
    if (this.sceneryItems) {
      for (const item of this.sceneryItems) item.sprite.destroy();
    }
    // Remove old textures to prevent accumulation
    ["race-road", "race-horizon", "race-player-rear", "race-player-rear-nobg",
     "race-opp-rear", "race-opp-rear-nobg", "race-player-dash",
     "race-finish-p", "race-finish-o"].forEach(k => {
      if (this.textures.exists(k)) this.textures.remove(k);
    });
    // Remove stacked input listeners
    this.input.keyboard!.removeAllListeners();
    this.input.removeAllListeners();

    // Reset state
    this.phase = "countdown";
    this.countdown = 3;
    this.jumped = false;
    this.reactionTime = 0;
    this.reacted = false;
    this.roadOffset = 0;
    this.accelHeld = false;
    this.steerLeft = false;
    this.steerRight = false;
    this.collisionCooldown = 0;
    this.trackSkin = pickRandomSkin();
    this.speedLines = [];
    this.treeLights = [];

    // Stop any previous audio (e.g., select music)
    stopAll();

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

    // Static background (sky, skyline, trees at horizon) — drawn ONCE
    const horizonY = height * 0.35;
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext("2d")!;
    drawBackground(bgCtx, width, height, this.trackSkin);
    if (this.textures.exists("race-bg")) this.textures.remove("race-bg");
    this.textures.addCanvas("race-bg", bgCanvas);
    this.add.image(width / 2, height / 2, "race-bg").setDepth(0);

    // Animated road texture (only road surface below horizon — redrawn per frame)
    this.roadTexture = this.textures.createCanvas("race-road", width, height)!;
    this.add.image(width / 2, height / 2, this.roadTexture.key).setDepth(1);

    // Scenery
    this.sceneryItems = [];
    this.createScenery(width, height);

    // Load car sprites if available
    const pCar = playerCar || fallbackCar;
    const oCar = opponentCar || fallbackCar;

    // Road geometry — matches road.ts: totalRows = height - horizonY, t = row/totalRows
    const dashTop = height * 0.55; // 55% road / 45% dashboard — shows more cockpit
    const totalRoadRows = height - horizonY;

    // Helper: get road lane X positions at a screen Y coordinate
    const roadAtY = (screenY: number) => {
      const row = screenY - horizonY;
      const t = row / totalRoadRows;
      const perspective = t * t;
      const roadW = width * (0.08 + (1.10 - 0.08) * perspective);
      return {
        leftLaneX: width / 2 - roadW * 0.22,
        rightLaneX: width / 2 + roadW * 0.22,
        roadW,
      };
    };

    // Player car — right lane, just above dashboard line
    const playerY = dashTop - 15;
    const playerRoad = roadAtY(playerY);
    if (pCar.pixelRear) {
      const pKey = "race-player-rear";
      this.load.image(pKey, pCar.pixelRear);
      this.load.once("complete", () => {
        if (this.textures.exists(pKey)) {
          const pImg = this.add.image(playerRoad.rightLaneX, playerY, pKey).setDepth(7);
          this.removeBlackBg(pKey, pImg);
          const isDesktop = width >= 768;
          pImg.setDisplaySize(isDesktop ? 200 : 140, isDesktop ? 120 : 85);
          this.playerCarSprite = pImg;
        }
      });
      this.load.start();
    } else {
      this.playerCarSprite = this.add.rectangle(playerRoad.rightLaneX, playerY, 80, 40, 0xdc2626).setDepth(7);
    }

    // Opponent car — left lane, slightly ahead of player
    const oppStartY = dashTop - 50;
    const oppRoad = roadAtY(oppStartY);
    this.oppSprite = this.add.rectangle(oppRoad.leftLaneX, oppStartY, 60, 30, 0x3b82f6).setDepth(5);
    if (oCar.pixelRear) {
      const oppKey = "race-opp-rear";
      this.load.image(oppKey, oCar.pixelRear);
      this.load.once("complete", () => {
        if (this.textures.exists(oppKey)) {
          this.oppSprite.destroy();
          const oppImg = this.add.image(oppRoad.leftLaneX, oppStartY, oppKey)
            .setDisplaySize(width >= 768 ? 110 : 80, width >= 768 ? 65 : 50).setDepth(5);
          this.removeBlackBg(oppKey, oppImg);
          this.oppSprite = oppImg as unknown as Phaser.GameObjects.Rectangle;
        }
      });
      this.load.start();
    }

    // Solid backing behind dashboard to block road rendering (old version had separate div)
    this.add.rectangle(width / 2, dashTop + (height - dashTop) / 2, width, height - dashTop, 0x0d0d1a).setDepth(8);

    // Dashboard — bottom 40% of screen, matching old /race layout
    // Uses objectFit "cover" equivalent with crop to prevent overflow
    if (pCar.pixelDash) {
      const dashKey = "race-player-dash";
      this.load.image(dashKey, pCar.pixelDash);
      this.load.once("complete", () => {
        if (this.textures.exists(dashKey)) {
          const dash = this.add.image(0, 0, dashKey).setDepth(9);
          const dashZoneH = height - dashTop;
          // Scale to fill width (objectFit: cover)
          const coverScale = width / dash.width;
          dash.setScale(coverScale);
          // Center-crop: shows the gauge cluster (center of the image)
          // This matches the old /race objectFit: cover behavior
          const scaledH = dash.height * coverScale;
          if (scaledH > dashZoneH) {
            const visibleSrcH = Math.ceil(dashZoneH / coverScale);
            const cropTop = Math.floor((dash.height - visibleSrcH) / 2);
            dash.setCrop(0, cropTop, dash.width, visibleSrcH);
            dash.setOrigin(0.5, 0);
            dash.setPosition(width / 2, dashTop - cropTop * coverScale);
          } else {
            dash.setOrigin(0.5, 0.5);
            dash.setPosition(width / 2, dashTop + dashZoneH / 2);
          }
          dash.setAlpha(0.6);
          this.dashImage = dash;
        }
      });
      this.load.start();
    } else {
      this.add.rectangle(width / 2, dashTop + (height - dashTop) / 2, width, height - dashTop, 0x111111).setDepth(9);
    }

    // Border between road and dash
    this.add.rectangle(width / 2, dashTop, width, 2, 0x333333).setDepth(11);

    // Car name labels at top (matching old /race)
    this.add.text(10, 10, `P1  #${pCar.carNumber}  ${pCar.name}`, {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ffd700",
    }).setDepth(16);
    this.add.text(width - 10, 10, `CPU  #${oCar.carNumber}  ${oCar.name}`, {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ff0000",
    }).setOrigin(1, 0).setDepth(16);

    // HUD — Speed, RPM, Gear positioned at bottom of screen over dashboard
    const hudY = height - 30;
    this.speedText = this.add.text(width * 0.15, hudY - 16, "0", {
      fontFamily: "'Press Start 2P'", fontSize: "36px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.15, hudY + 14, "MPH", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    this.rpmText = this.add.text(width * 0.5, hudY - 10, "800", {
      fontFamily: "'Press Start 2P'", fontSize: "24px", color: "#cccccc",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.5, hudY + 14, "RPM", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    this.gearText = this.add.text(width * 0.85, hudY - 16, "1", {
      fontFamily: "'Press Start 2P'", fontSize: "36px", color: "#00ff00",
    }).setOrigin(0.5).setDepth(12);

    this.add.text(width * 0.85, hudY + 14, "GEAR", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(12);

    // Progress bar (below car name labels)
    const barW = width * 0.6;
    const barX = width / 2;
    const barY = 30;
    this.progressBar = this.add.rectangle(barX, barY, barW, 10, 0x333333).setDepth(15);
    this.progressFill = this.add.rectangle(barX - barW / 2, barY, 0, 10, 0xffd700).setOrigin(0, 0.5).setDepth(16);
    this.oppProgressFill = this.add.rectangle(barX - barW / 2, barY + 14, 0, 7, 0x3b82f6).setOrigin(0, 0.5).setDepth(16);

    this.add.text(barX - barW / 2 - 40, barY, "P1", {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(16);
    this.add.text(barX - barW / 2 - 40, barY + 14, "CPU", {
      fontFamily: "'Press Start 2P'", fontSize: "9px", color: "#3b82f6",
    }).setOrigin(0.5).setDepth(16);

    // Christmas tree lights (centered in road zone with semi-transparent overlay)
    const treeX = width / 2;
    const treeCenterY = dashTop * 0.5; // center of road zone
    const lightGap = 40;
    const treeTopY = treeCenterY - lightGap * 1.5;

    // Semi-transparent overlay behind tree (covers road zone)
    this.countdownOverlay = this.add.rectangle(width / 2, dashTop / 2, width, dashTop, 0x0d0d1a)
      .setAlpha(0.7).setDepth(19);

    for (let i = 0; i < 3; i++) {
      const light = this.add.circle(treeX, treeTopY + i * lightGap, 20, 0x222222)
        .setStrokeStyle(3, 0x444444).setDepth(20);
      this.treeLights.push(light);
    }
    this.greenLight = this.add.circle(treeX, treeTopY + 3 * lightGap, 24, 0x222222)
      .setStrokeStyle(3, 0x444444).setDepth(20);

    // Speed lines (appear at high speed on screen edges)
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side > 0 ? width - 20 - Math.random() * 60 : 20 + Math.random() * 60;
      const line = this.add.line(
        x, height * 0.3 + Math.random() * height * 0.4,
        0, 0, side * (15 + Math.random() * 25), 40 + Math.random() * 30,
        0xffffff
      ).setAlpha(0).setDepth(8).setLineWidth(1);
      this.speedLines.push(line);
    }

    // Countdown / result text
    this.countdownText = this.add.text(width / 2, height * 0.15, "", {
      fontFamily: "'Press Start 2P'", fontSize: "36px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.resultText = this.add.text(width / 2, height * 0.3, "", {
      fontFamily: "'Press Start 2P'", fontSize: "48px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    // Input
    this.input.keyboard!.on("keydown-SPACE", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-SPACE", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-UP", () => { this.accelHeld = true; });
    this.input.keyboard!.on("keyup-UP", () => { this.accelHeld = false; });
    this.input.on("pointerdown", () => { this.accelHeld = true; });
    this.input.on("pointerup", () => { this.accelHeld = false; });
    this.input.keyboard!.on("keydown-LEFT", () => { this.steerLeft = true; });
    this.input.keyboard!.on("keyup-LEFT", () => { this.steerLeft = false; });
    this.input.keyboard!.on("keydown-RIGHT", () => { this.steerRight = true; });
    this.input.keyboard!.on("keyup-RIGHT", () => { this.steerRight = false; });
    this.input.keyboard!.on("keydown-A", () => { this.steerLeft = true; });
    this.input.keyboard!.on("keyup-A", () => { this.steerLeft = false; });
    this.input.keyboard!.on("keydown-D", () => { this.steerRight = true; });
    this.input.keyboard!.on("keyup-D", () => { this.steerRight = false; });

    // Draw initial road
    this.drawRoadFrame();

    // Start countdown sequence
    this.startCountdown();
  }

  private startCountdown() {
    this.countdown = 3;
    this.updateTreeLights();
    playCountdownBeep(false);

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        this.countdown--;
        this.updateTreeLights();
        playCountdownBeep(this.countdown <= 0);

        // Jump detection: holding accel during amber
        if (this.countdown > 0 && this.accelHeld) {
          this.jumped = true;
          playFoulBuzzer();
        }

        if (this.countdown <= 0) {
          // GO!
          this.phase = "racing";
          this.raceStartTime = this.time.now;
          startEngine();
          startMusic();
          if (this.jumped) {
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
      // Flash green then fade tree + overlay
      this.time.delayedCall(500, () => {
        this.treeLights.forEach(l => l.setAlpha(0));
        this.greenLight.setAlpha(0);
        this.tweens.add({ targets: this.countdownOverlay, alpha: 0, duration: 300 });
      });
    }
  }

  /** Remove near-black pixels (background) from a car sprite texture — matches old /race approach */
  private removeBlackBg(textureKey: string, img: Phaser.GameObjects.Image) {
    const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const newKey = textureKey + "-nobg";
    this.textures.addCanvas(newKey, canvas);
    img.setTexture(newKey);
  }

  private createScenery(_width: number, _height: number) {
    // Create scenery textures — tree (bright), pole, and sign for variety
    const sceneryKeys = ["scn-tree", "scn-pole", "scn-sign"];
    for (const key of sceneryKeys) {
      if (this.textures.exists(key)) this.textures.remove(key);
    }

    // Tree — bright green, very visible against dark grass
    const tc = document.createElement("canvas");
    tc.width = 24; tc.height = 40;
    const tctx = tc.getContext("2d")!;
    tctx.fillStyle = "#5a3015"; // visible brown trunk
    tctx.fillRect(10, 28, 4, 12);
    tctx.fillStyle = "#156015"; // dark foliage
    tctx.fillRect(3, 16, 18, 13);
    tctx.fillRect(5, 10, 14, 8);
    tctx.fillStyle = "#1a8020"; // mid foliage
    tctx.fillRect(7, 5, 10, 8);
    tctx.fillRect(9, 1, 6, 5);
    tctx.fillStyle = "#30aa40"; // bright highlight
    tctx.fillRect(5, 11, 7, 6);
    tctx.fillRect(7, 6, 5, 5);
    tctx.fillRect(9, 2, 3, 4);
    this.textures.addCanvas("scn-tree", tc);

    // Road sign post — thin gray pole with small rectangle
    const sc = document.createElement("canvas");
    sc.width = 12; sc.height = 36;
    const sctx = sc.getContext("2d")!;
    sctx.fillStyle = "#888888"; // gray pole
    sctx.fillRect(5, 12, 2, 24);
    sctx.fillStyle = "#ffffff"; // white sign face
    sctx.fillRect(1, 4, 10, 8);
    sctx.fillStyle = "#cc2222"; // red border
    sctx.fillRect(1, 4, 10, 1);
    sctx.fillRect(1, 11, 10, 1);
    sctx.fillRect(1, 4, 1, 8);
    sctx.fillRect(10, 4, 1, 8);
    this.textures.addCanvas("scn-sign", sc);

    // Utility pole — tall, thin
    const pc = document.createElement("canvas");
    pc.width = 8; pc.height = 48;
    const pctx = pc.getContext("2d")!;
    pctx.fillStyle = "#6a5030"; // wooden pole
    pctx.fillRect(3, 4, 2, 44);
    pctx.fillStyle = "#5a4020";
    pctx.fillRect(0, 4, 8, 2); // crossbar
    this.textures.addCanvas("scn-pole", pc);

    // 36 scenery items — mix of trees, poles, signs
    for (let i = 0; i < 36; i++) {
      const z = 0.08 + (i / 36) * 0.92;
      const side = i % 2 === 0 ? -1 : 1;
      const type = i % 5; // 0,1,2 = tree, 3 = sign, 4 = pole
      const key = type <= 2 ? "scn-tree" : type === 3 ? "scn-sign" : "scn-pole";
      const sprite = this.add.image(0, 0, key).setDepth(3);
      this.sceneryItems.push({ sprite, z, side });
    }
  }

  private drawRoadFrame() {
    const ctx = this.roadTexture.getContext();
    const vanishOffset = this.playerState ? this.playerState.laneX * this.scale.width * -0.10 : 0;
    drawRoad(ctx, this.roadTexture.width, this.roadTexture.height, this.roadOffset, this.trackSkin, vanishOffset);
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
      const shifted = this.playerState.update(this.accelHeld);
      if (shifted) {
        playGearShift();
        this.cameras.main.shake(80, 0.003); // subtle screen shake on shift
      }

      // Update opponent
      this.opponentState.update();

      // Lateral steering physics
      this.playerState.updateSteering(this.steerLeft, this.steerRight);
      this.opponentState.updateSteering(this.playerState.laneX, this.playerState.pos);

      // Collision detection
      const { result, newCooldown } = checkCollision(
        this.playerState, this.opponentState, this.collisionCooldown
      );
      this.collisionCooldown = newCooldown;

      if (result.carTocar) {
        this.cameras.main.shake(100, 0.008);
        // Spark burst at collision point
        const sparkX = width / 2 + ((this.playerState.laneX + this.opponentState.laneX) / 2) * width * 0.3;
        const sparkY = height * 0.45;
        for (let i = 0; i < 10; i++) {
          const spark = this.add.rectangle(
            sparkX + (Math.random() - 0.5) * 20,
            sparkY + (Math.random() - 0.5) * 15,
            3 + Math.random() * 3, 3 + Math.random() * 3,
            Math.random() > 0.5 ? 0xffaa00 : 0xff6600
          ).setDepth(15);
          this.tweens.add({
            targets: spark,
            x: spark.x + (Math.random() - 0.5) * 80,
            y: spark.y + (Math.random() - 0.5) * 60,
            alpha: 0,
            duration: 200 + Math.random() * 150,
            onComplete: () => spark.destroy(),
          });
        }
      }

      // Grass debris when player on grass
      if (result.playerOnGrass && this.playerCarSprite && Math.random() < 0.3) {
        const debrisX = this.playerCarSprite.x;
        const debrisY = this.playerCarSprite.y;
        for (let i = 0; i < 4; i++) {
          const debris = this.add.rectangle(
            debrisX + (Math.random() - 0.5) * 30,
            debrisY,
            2 + Math.random() * 2, 2 + Math.random() * 2,
            0x2a6a2a
          ).setDepth(6);
          this.tweens.add({
            targets: debris,
            x: debris.x + (Math.random() - 0.5) * 40,
            y: debris.y - 20 - Math.random() * 30,
            alpha: 0,
            duration: 300 + Math.random() * 200,
            onComplete: () => debris.destroy(),
          });
        }
      }

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
        // Timeout — use frame-based time
        this.playerState.finishTime = Math.round(this.playerState.frames / 60 * 1000);
        this.opponentState.finishTime = Math.round(this.opponentState.frames / 60 * 1000);
        this.finishRace();
      }
    }

    // --- VISUAL UPDATES (all phases) ---
    const visualSpeed = this.phase === "racing" ? this.playerState.speed : 0;

    // Update engine sound
    if (this.phase === "racing") {
      updateEngine(this.playerState.rpm, this.playerState.speed);
    }

    // Speed lines — fade in at high speed
    const speedPct = this.playerState ? this.playerState.speed / (this.playerState.peakSpeed || 1) : 0;
    for (const line of this.speedLines) {
      line.setAlpha(speedPct > 0.6 ? (speedPct - 0.6) * 2.5 * (0.1 + Math.random() * 0.15) : 0);
    }

    // Scroll road
    this.roadOffset += visualSpeed * dt * 30;
    this.drawRoadFrame();

    // (Static background — no parallax needed)

    // Scenery — scroll toward camera, reset at far distance
    const totalRoadRows = height - horizonY;
    for (const item of this.sceneryItems) {
      item.z += visualSpeed * dt * 0.15;
      if (item.z > 1.15) item.z = 0.02 + Math.random() * 0.08;

      // Use road.ts perspective to place items just outside the shoulder
      const row = item.z * totalRoadRows;
      const t = row / totalRoadRows;
      const perspective = t * t;
      const roadW = width * (0.08 + (1.10 - 0.08) * perspective);
      const shoulderW = 2 + (width * 0.10) * perspective;
      // Place just outside the shoulder with a small random offset
      const offset = shoulderW + 8 + 20 * perspective;
      const x = width / 2 + item.side * (roadW / 2 + offset);
      const y = horizonY + row;
      const scale = 0.4 + 3.5 * perspective;

      item.sprite.setPosition(x, y);
      item.sprite.setScale(scale);
      item.sprite.setOrigin(0.5, 1);
      item.sprite.setAlpha(Math.min(1, item.z * 3));
      item.sprite.setDepth(3);
    }

    // Reposition player car based on laneX
    if (this.playerCarSprite && (this.phase === "racing" || this.phase === "finished")) {
      const dashTopLocal = height * 0.55;
      const playerScreenY = dashTopLocal - 15;
      const row = playerScreenY - horizonY;
      const t = row / (height - horizonY);
      const perspective = t * t;
      const isDesktop = width >= 768;
      const roadW = width * (0.08 + ((isDesktop ? 1.30 : 1.10) - 0.08) * perspective);
      const carX = width / 2 + this.playerState.laneX * (roadW * 0.35);
      this.playerCarSprite.setPosition(carX, playerScreenY);
      if (this.playerState.onGrass) {
        this.playerCarSprite.setRotation(Math.sin(this.time.now * 0.02) * 0.05);
      } else {
        this.playerCarSprite.setRotation(0);
      }
    }

    if (this.dashImage) {
      this.dashImage.setRotation(this.playerState ? this.playerState.laneX * -0.025 : 0);
    }

    // Opponent sprite positioning — uses road.ts perspective math
    // Visible road: horizonY to dashTop. Road renderer: horizonY to height.
    const dashTopY = height * 0.55;
    const totalRows = height - horizonY; // matches road.ts

    if (this.phase === "racing" || this.phase === "finished") {
      const delta2 = this.opponentState.pos - this.playerState.pos;

      if (delta2 >= 0) {
        // Opponent ahead — lerp from near-dashboard toward horizon
        const aheadT = Math.min(delta2 / 150, 1.0); // 0=beside player, 1=at horizon
        // Screen Y: from near dashTop (aheadT=0) to near horizonY (aheadT=1)
        const oppY = dashTopY - 50 - (dashTopY - 50 - horizonY - 10) * aheadT;
        // Get road width at this Y using road.ts perspective
        const row = oppY - horizonY;
        const t = row / totalRows;
        const perspective = t * t;
        const roadW = width * (0.08 + (1.10 - 0.08) * perspective);
        const leftLaneX = width / 2 + this.opponentState.laneX * (roadW * 0.35);
        // Scale sprite based on distance
        const spriteScale = 1.0 - aheadT * 0.75;
        const spriteW = 160 * spriteScale;

        this.oppSprite.setPosition(leftLaneX, oppY);
        if ((this.oppSprite as unknown as Phaser.GameObjects.Image).setDisplaySize) {
          (this.oppSprite as unknown as Phaser.GameObjects.Image).setDisplaySize(spriteW, spriteW * 0.55);
        } else {
          this.oppSprite.setSize(spriteW, spriteW * 0.55);
        }
        this.oppSprite.setAlpha(Math.min(1, spriteScale * 2));
      } else {
        // Opponent behind — grows and slides off screen
        const behind = Math.min(Math.abs(delta2), 80);
        const behindT = behind / 80;
        const spriteScale = 1.0 + behindT * 0.8;
        const spriteW = 160 * spriteScale;
        // Use road width at near-bottom
        const nearRow = (dashTopY - 30) - horizonY;
        const nearT = nearRow / totalRows;
        const nearPersp = nearT * nearT;
        const nearRoadW = width * (0.08 + (0.95 - 0.08) * nearPersp);
        const leftLaneX = width / 2 + this.opponentState.laneX * (nearRoadW * 0.35);
        const oppY = dashTopY - 30 + behindT * height * 0.15;
        const opacity = Math.max(0, 1 - behindT * 1.2);

        this.oppSprite.setPosition(leftLaneX, oppY);
        if ((this.oppSprite as unknown as Phaser.GameObjects.Image).setDisplaySize) {
          (this.oppSprite as unknown as Phaser.GameObjects.Image).setDisplaySize(spriteW, spriteW * 0.55);
        } else {
          this.oppSprite.setSize(spriteW, spriteW * 0.55);
        }
        this.oppSprite.setAlpha(opacity);
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
      this.progressFill.setSize(barW * Math.min(this.playerState.pos / 1000, 1), 10);
      this.oppProgressFill.setSize(barW * Math.min(this.opponentState.pos / 1000, 1), 7);
    }
  }

  private finishRace() {
    if (this.phase === "finished") return;
    this.phase = "finished";

    const { width, height } = this.scale;
    const playerCar: RaceCar = this.registry.get("playerCar");
    const opponentCar: RaceCar = this.registry.get("opponentCar");
    const playerWon = this.playerState.finishTime <= this.opponentState.finishTime;

    // Audio
    stopAll();
    if (playerWon) playWinJingle(); else playLoseJingle();

    // Camera shake on finish
    this.cameras.main.shake(200, 0.005);

    // Flash effect
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff).setDepth(25).setAlpha(0.9);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    // --- Semi-transparent overlay (matching old /race: rgba(13,13,26,0.85)) ---
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a).setAlpha(0.85).setDepth(30);

    // Result title
    const titleColor = playerWon ? "#ffd700" : "#ff0000";
    this.add.text(width / 2, height * 0.08, playerWon ? "YOU WIN!" : "YOU LOSE", {
      fontFamily: "'Press Start 2P'", fontSize: "36px", color: titleColor,
    }).setOrigin(0.5).setDepth(31);

    // --- Car images + times (P1 left, VS center, CPU right) ---
    const cardY = height * 0.35;
    const imgW = Math.min(220, width * 0.28);
    const pTime = (this.playerState.finishTime / 1000).toFixed(2);
    const oTime = (this.opponentState.finishTime / 1000).toFixed(2);
    const rt = this.jumped ? "JUMP +0.5s" : `RT: ${(this.reactionTime / 1000).toFixed(3)}s`;
    const oppRT = `RT: ${(this.opponentState.reactionTime / 1000).toFixed(3)}s`;

    // Player card (left)
    this.add.text(width * 0.25, cardY - 90, "P1", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ffd700",
    }).setOrigin(0.5).setDepth(31);

    if (playerCar?.pixelArt) {
      const pImgKey = "race-finish-p";
      this.load.image(pImgKey, playerCar.pixelArt);
      this.load.once("complete", () => {
        if (this.textures.exists(pImgKey)) {
          const img = this.add.image(width * 0.25, cardY - 20, pImgKey).setDepth(31);
          const scale = Math.min(imgW / img.width, (imgW * 0.5) / img.height);
          img.setScale(scale);
        }
      });
      this.load.start();
    }

    this.add.text(width * 0.25, cardY + 40, playerCar?.name || "P1", {
      fontFamily: "'Press Start 2P'", fontSize: "11px", color: "#aaaaaa",
      align: "center", wordWrap: { width: imgW + 20 },
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.25, cardY + 65, `${pTime}s`, {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.25, cardY + 90, rt, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: this.jumped ? "#ff0000" : "#00ff00",
    }).setOrigin(0.5).setDepth(31);

    // VS
    this.add.text(width / 2, cardY, "VS", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#333333",
    }).setOrigin(0.5).setDepth(31);

    // Opponent card (right)
    this.add.text(width * 0.75, cardY - 90, "CPU", {
      fontFamily: "'Press Start 2P'", fontSize: "12px", color: "#ff0000",
    }).setOrigin(0.5).setDepth(31);

    if (opponentCar?.pixelArt) {
      const oImgKey = "race-finish-o";
      this.load.image(oImgKey, opponentCar.pixelArt);
      this.load.once("complete", () => {
        if (this.textures.exists(oImgKey)) {
          const img = this.add.image(width * 0.75, cardY - 20, oImgKey).setDepth(31);
          const scale = Math.min(imgW / img.width, (imgW * 0.5) / img.height);
          img.setScale(scale);
        }
      });
      this.load.start();
    }

    this.add.text(width * 0.75, cardY + 40, opponentCar?.name || "CPU", {
      fontFamily: "'Press Start 2P'", fontSize: "11px", color: "#aaaaaa",
      align: "center", wordWrap: { width: imgW + 20 },
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.75, cardY + 65, `${oTime}s`, {
      fontFamily: "'Press Start 2P'", fontSize: "18px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width * 0.75, cardY + 90, oppRT, {
      fontFamily: "'Press Start 2P'", fontSize: "10px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(31);

    // --- Buttons ---
    const btnY = height * 0.75;

    const rematchBtn = this.add.rectangle(width * 0.38, btnY, 200, 48, 0xffd700)
      .setStrokeStyle(2, 0xb8860b).setDepth(32).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.38, btnY, "REMATCH", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#0d0d1a",
    }).setOrigin(0.5).setDepth(33);
    rematchBtn.on("pointerover", () => rematchBtn.setFillStyle(0xffe066));
    rematchBtn.on("pointerout", () => rematchBtn.setFillStyle(0xffd700));
    rematchBtn.on("pointerdown", () => this.scene.restart());

    const newCarBtn = this.add.rectangle(width * 0.62, btnY, 200, 48, 0x1a1a2e)
      .setStrokeStyle(2, 0x333333).setDepth(32).setInteractive({ useHandCursor: true });
    this.add.text(width * 0.62, btnY, "NEW CAR", {
      fontFamily: "'Press Start 2P'", fontSize: "16px", color: "#cccccc",
    }).setOrigin(0.5).setDepth(33);
    newCarBtn.on("pointerover", () => newCarBtn.setStrokeStyle(2, 0xffd700));
    newCarBtn.on("pointerout", () => newCarBtn.setStrokeStyle(2, 0x333333));
    newCarBtn.on("pointerdown", () => {
      import("@/lib/race-audio").then(({ startSelectMusic }) => startSelectMusic());
      this.scene.start("SelectScene");
    });

    // Keyboard shortcut
    this.input.keyboard!.once("keydown-SPACE", () => this.scene.restart());
  }
}
