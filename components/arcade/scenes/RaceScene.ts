import Phaser from "phaser";
import { CarState, resolveCarCollision } from "../topdown-physics";
import { TrackData, getSurfaceAt, hasCrossedFinish, raceProgress } from "../track";
import { renderTrack } from "../track-renderer";
import { AIDriver, createAIDrivers } from "../ai";
import { RaceHUD } from "../hud";
import { CarEffects } from "../effects";
import { RaceCar } from "../types";
import { initRaceAudio, EngineSound } from "../road-race-audio";

const CSS_COLORS: Record<string, number> = {
  red: 0xff0000, blue: 0x0000ff, green: 0x008000, black: 0x222222, white: 0xeeeeee,
  silver: 0xcccccc, grey: 0x888888, gray: 0x888888, yellow: 0xffff00, orange: 0xff8800,
  purple: 0x880088, gold: 0xffd700, brown: 0x8b4513, maroon: 0x800000, navy: 0x000080,
  burgundy: 0x800020, bronze: 0xcd7f32, beige: 0xf5f5dc, cream: 0xfffdd0,
  charcoal: 0x36454f, midnight: 0x191970,
};

function cssColorToHex(color: string): number | null {
  if (!color) return null;
  const lower = color.toLowerCase().trim();
  for (const [name, hex] of Object.entries(CSS_COLORS)) {
    if (lower.includes(name)) return hex;
  }
  if (lower.startsWith("#") && lower.length >= 7) {
    return parseInt(lower.slice(1, 7), 16);
  }
  return null;
}

export class RaceScene extends Phaser.Scene {
  // Race state
  private player!: CarState;
  private opponents: CarState[] = [];
  private allCars: CarState[] = [];
  private aiDrivers: AIDriver[] = [];
  private effects: CarEffects[] = [];
  private hud!: RaceHUD;
  private track!: TrackData;

  // Phase management
  private phase: "countdown" | "racing" | "finished" = "countdown";
  private raceElapsedMs = 0;
  private countdownTimer = 0;
  private finishOrder: CarState[] = [];

  // Sprites
  private carSprites: Phaser.GameObjects.Rectangle[] = [];

  // Keyboard cursors
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private arrowKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Countdown text reference for cleanup
  private countdownText!: Phaser.GameObjects.Text;

  // Engine audio
  private engineSound: EngineSound | null = null;

  constructor() {
    super({ key: "RaceScene" });
  }

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  create() {
    // --- 1. Get data from registry -----------------------------------------
    const selectedTrack: TrackData | undefined = this.registry.get("selectedTrack");
    if (!selectedTrack) {
      this.scene.start("SelectScene");
      return;
    }
    this.track = selectedTrack;

    const playerCar: RaceCar | undefined = this.registry.get("playerCar");
    if (!playerCar) {
      this.scene.start("SelectScene");
      return;
    }

    const opponentCars: RaceCar[] = this.registry.get("opponentCars") || [];

    // --- 2. Reset state ---------------------------------------------------
    this.phase = "countdown";
    this.raceElapsedMs = 0;
    this.finishOrder = [];
    this.opponents = [];
    this.allCars = [];
    this.aiDrivers = [];
    this.effects = [];
    this.carSprites = [];

    // --- 3. Create CarState instances from spawn points -------------------
    const spawns = this.track.spawnPoints;

    // Player gets spawn[0]
    const playerSpawn = spawns[0] || { x: 400, y: 140, angle: Math.PI };
    this.player = new CarState(playerCar, playerSpawn.x, playerSpawn.y, playerSpawn.angle);

    // AI opponents
    const numOpponents = Math.min(opponentCars.length, 3);
    for (let i = 0; i < numOpponents; i++) {
      const spawn = spawns[i + 1] || {
        x: playerSpawn.x + (i % 2 === 0 ? 30 : -30),
        y: playerSpawn.y + Math.floor(i / 2) * 35,
        angle: playerSpawn.angle,
      };
      this.opponents.push(new CarState(opponentCars[i], spawn.x, spawn.y, spawn.angle));
    }

    // allCars: player first, then opponents (HUD expects index 0 = player)
    this.allCars = [this.player, ...this.opponents];

    // --- 4. Create AI drivers ---------------------------------------------
    this.aiDrivers = createAIDrivers().slice(0, numOpponents);

    // --- 5. Render the track ----------------------------------------------
    renderTrack(this, this.track);

    // --- 6. Create car sprites (20×32 rectangles) -------------------------
    for (let i = 0; i < this.allCars.length; i++) {
      const car = this.allCars[i];
      const isPlayer = i === 0;
      const color = cssColorToHex(car.car.color) ?? (isPlayer ? 0xffd700 : 0x888888);
      const rect = this.add.rectangle(car.x, car.y, 20, 32, color);
      rect.setDepth(10);
      this.carSprites.push(rect);
    }

    // --- 7. Create CarEffects for each car --------------------------------
    for (const car of this.allCars) {
      this.effects.push(new CarEffects(this, car.car));
    }

    // --- 8. Create and initialize HUD ------------------------------------
    this.hud = new RaceHUD(this, this.track);
    this.hud.create();

    // --- 9. Set up camera ------------------------------------------------
    const { width: trackW, height: trackH } = this.track;
    this.cameras.main.setBounds(0, 0, trackW, trackH);
    this.cameras.main.startFollow(this.carSprites[0], true, 0.12, 0.12);
    this.cameras.main.setZoom(1.8);

    // --- 10. Set up keyboard input ---------------------------------------
    const kb = this.input.keyboard!;
    this.arrowKeys = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // --- 11. Countdown ---------------------------------------------------
    this._startCountdown();

    // --- 12. Start engine audio -----------------------------------------
    try {
      initRaceAudio();
      this.engineSound = new EngineSound(
        playerCar.engineType ?? "v8",
        playerCar.cylinders ?? 8
      );
      this.engineSound.start();
    } catch {
      // Web Audio unavailable — continue without audio
      this.engineSound = null;
    }
  }

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  update(_time: number, delta: number) {
    // Always sync sprite positions so they're visible even during countdown
    this._updateSpriteTransforms();

    if (this.phase === "countdown" || this.phase === "finished") {
      return;
    }

    // ---- Racing phase ----------------------------------------------------

    // Accumulate elapsed race time
    this.raceElapsedMs += delta;

    // Read player input
    const playerInput = {
      accel: this.arrowKeys.up.isDown || this.wasd.up.isDown,
      brake: this.arrowKeys.down.isDown || this.wasd.down.isDown || this.spaceKey.isDown,
      steerLeft: this.arrowKeys.left.isDown || this.wasd.left.isDown,
      steerRight: this.arrowKeys.right.isDown || this.wasd.right.isDown,
    };

    // Update surface for all cars
    for (const car of this.allCars) {
      if (!car.finished) {
        car.surface = getSurfaceAt(this.track, car.x, car.y);
      }
    }

    // Update player physics
    if (!this.player.finished) {
      this.player.update(playerInput, delta);
    }

    // Update engine audio
    if (this.engineSound) {
      const speedNorm = this.player.stats
        ? this.player.speed / this.player.stats.topSpeed
        : 0;
      this.engineSound.update(speedNorm, playerInput.accel);
    }

    // Update AI opponents
    for (let i = 0; i < this.opponents.length; i++) {
      const opp = this.opponents[i];
      if (opp.finished) continue;
      const driver = this.aiDrivers[i];
      if (!driver) continue;
      const aiInput = this._getAIInput(driver, opp);
      opp.update(aiInput, delta);
    }

    // Resolve car-to-car collisions (nested loop, i < j)
    for (let i = 0; i < this.allCars.length; i++) {
      for (let j = i + 1; j < this.allCars.length; j++) {
        resolveCarCollision(this.allCars[i], this.allCars[j]);
      }
    }

    // Resolve car-to-boundary collisions (AABB nearest-point, 14px radius)
    const CAR_RADIUS = 14;
    for (const car of this.allCars) {
      if (car.finished) continue;
      for (const boundary of this.track.boundaries) {
        // Clamp car center to boundary rectangle
        const nearX = Math.max(boundary.x, Math.min(car.x, boundary.x + boundary.width));
        const nearY = Math.max(boundary.y, Math.min(car.y, boundary.y + boundary.height));
        const dx = car.x - nearX;
        const dy = car.y - nearY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CAR_RADIUS && dist > 0) {
          // Push car out
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = CAR_RADIUS - dist;
          car.x += nx * overlap;
          car.y += ny * overlap;

          // Speed penalty (0.6x = 40% speed loss)
          car.speed *= 0.6;
        }
      }
    }

    // Clamp all cars within track bounds
    const { width: tw, height: th } = this.track;
    for (const car of this.allCars) {
      car.x = Math.max(0, Math.min(tw, car.x));
      car.y = Math.max(0, Math.min(th, car.y));
    }

    // Check finish line crossing (only if raceProgress > 0.8 to avoid false positives at start)
    for (const car of this.allCars) {
      if (car.finished) continue;
      const progress = raceProgress(this.track, car.x, car.y);
      if (progress > 0.8 && hasCrossedFinish(this.track, car.x, car.y)) {
        car.finished = true;
        car.finishTime = this.raceElapsedMs;
        this.finishOrder.push(car);
      }
    }

    // Check if race should end
    const playerFinished = this.player.finished;
    const allOpponentsFinished = this.opponents.every((o) => o.finished);

    if (playerFinished && this.phase === "racing") {
      this.phase = "finished";
      this.hud.showFinishPosition(this.finishOrder.indexOf(this.player) + 1, this.allCars.length);
      this.time.delayedCall(2000, () => this._showResults());
    } else if (allOpponentsFinished && this.opponents.length > 0 && !playerFinished && this.phase === "racing") {
      // Player loses — mark as last place
      this.player.finished = true;
      this.player.finishTime = this.raceElapsedMs;
      this.finishOrder.push(this.player);
      this.phase = "finished";
      this.hud.showFinishPosition(this.finishOrder.length, this.allCars.length);
      this.time.delayedCall(2000, () => this._showResults());
    }

    // Update effects
    for (let i = 0; i < this.effects.length; i++) {
      this.effects[i].update(this.allCars[i]);
    }

    // Update HUD
    this.hud.update(this.player, this.allCars, this.raceElapsedMs);
  }

  // ---------------------------------------------------------------------------
  // shutdown
  // ---------------------------------------------------------------------------

  shutdown() {
    this.engineSound?.stop();
    this.engineSound = null;
    for (const effect of this.effects) {
      effect.destroy();
    }
    this.effects = [];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Sync Phaser rectangle sprites to physics car positions and angles. */
  private _updateSpriteTransforms() {
    for (let i = 0; i < this.carSprites.length; i++) {
      const sprite = this.carSprites[i];
      const car = this.allCars[i];
      if (!sprite || !car) continue;
      sprite.setPosition(car.x, car.y);
      // Convert physics angle (0=north, clockwise) to Phaser angle (radians, 0=east)
      sprite.setRotation(car.angle);
    }
  }

  /** Get AI input from driver for the given car state. */
  private _getAIInput(driver: AIDriver, car: CarState) {
    return driver.update(car, this.track);
  }

  /** Kick off the 3-2-1-GO countdown sequence. */
  private _startCountdown() {
    const { width, height } = this.scale;
    this.countdownText = this.add
      .text(width / 2, height / 2 - 60, "3", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "72px",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300);

    const steps = [
      { label: "3", delay: 0 },
      { label: "2", delay: 1000 },
      { label: "1", delay: 2000 },
      { label: "GO!", delay: 3000 },
    ];

    for (const step of steps) {
      this.time.delayedCall(step.delay, () => {
        if (this.countdownText) {
          this.countdownText.setText(step.label);
          // Pop animation
          this.tweens.add({
            targets: this.countdownText,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 80,
            yoyo: true,
            ease: "Quad.easeOut",
          });
        }
      });
    }

    // After "GO!" disappears, start racing
    this.time.delayedCall(3800, () => {
      if (this.countdownText) {
        this.countdownText.destroy();
      }
      this.phase = "racing";
    });
  }

  /** Show the results overlay after the race ends. */
  private _showResults() {
    // Stop engine audio when results are shown
    this.engineSound?.stop();
    this.engineSound = null;
    const { width, height } = this.scale;
    const depth = 250;

    // Dark overlay
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x0d0d1a, 0.85)
      .setScrollFactor(0)
      .setDepth(depth);

    // Sort all cars by finish order / time
    const sortedCars = [...this.allCars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return 0;
    });

    const playerPosition = sortedCars.indexOf(this.player) + 1;
    const playerWon = playerPosition === 1;

    // WIN / LOSE header
    const headerText = playerWon ? "YOU WIN!" : "YOU LOSE";
    const headerColor = playerWon ? "#ffd700" : "#ff4444";
    this.add
      .text(width / 2, 40, headerText, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "28px",
        color: headerColor,
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    // Results table
    const tableStartY = 100;
    const rowH = 28;
    const ordinals = ["1st", "2nd", "3rd", "4th"];

    for (let i = 0; i < sortedCars.length; i++) {
      const car = sortedCars[i];
      const isPlayer = car === this.player;
      const timeStr = car.finished
        ? (car.finishTime / 1000).toFixed(2) + "s"
        : "DNF";
      const rowColor = isPlayer ? "#ffd700" : "#aaaaaa";
      const rowY = tableStartY + i * rowH;
      const label = `${ordinals[i] ?? `${i + 1}th`}  ${car.car.name.slice(0, 16).toUpperCase()}  ${timeStr}`;
      this.add
        .text(width / 2, rowY, label, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "10px",
          color: rowColor,
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(depth + 1);
    }

    // Player stats
    const statsY = tableStartY + sortedCars.length * rowH + 16;
    const topMph = Math.round(this.player.topSpeedReached);
    const drifts = this.player.driftCount;
    this.add
      .text(
        width / 2,
        statsY,
        `TOP SPEED: ${topMph} MPH   DRIFTS: ${drifts}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "9px",
          color: "#888888",
          stroke: "#000000",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 1);

    // Buttons
    const btnY = statsY + 50;
    this._makeResultButton("RACE AGAIN", width / 2 - 160, btnY, depth, () => {
      this.scene.restart();
    });
    this._makeResultButton("NEW TRACK", width / 2, btnY, depth, () => {
      this.scene.start("TrackSelectScene");
    });
    this._makeResultButton("NEW CAR", width / 2 + 160, btnY, depth, () => {
      this.scene.start("SelectScene");
    });
  }

  private _makeResultButton(
    label: string,
    x: number,
    y: number,
    depth: number,
    onClick: () => void
  ) {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "#1a1a2e",
        padding: { x: 10, y: 8 },
        stroke: "#444444",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setColor("#ffd700"));
    btn.on("pointerout", () => btn.setColor("#ffffff"));
    btn.on("pointerdown", onClick);
  }

}
