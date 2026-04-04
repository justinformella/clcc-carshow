/**
 * Visual effects per car: exhaust puffs, tire marks, drift smoke.
 * Each car in the race gets its own CarEffects instance, updated each frame.
 */

import Phaser from "phaser";
import { CarState } from "./topdown-physics";
import { RaceCar } from "./types";

// ---------------------------------------------------------------------------
// Exhaust config
// ---------------------------------------------------------------------------

interface ExhaustConfig {
  color: number;
  alpha: number;
  scale: number;
  lifespan: number;
}

/**
 * Returns exhaust particle config based on the car's engine type.
 */
function getExhaustConfig(car: RaceCar): ExhaustConfig {
  const type = (car.engineType ?? "").toLowerCase();

  if (type.includes("electric") || type.includes("ev")) {
    return { color: 0x4488ff, alpha: 0.3, scale: 0.3, lifespan: 200 };
  }
  if (type.includes("diesel")) {
    return { color: 0x222222, alpha: 0.6, scale: 0.8, lifespan: 600 };
  }
  if (type.includes("turbo")) {
    return { color: 0x6688cc, alpha: 0.4, scale: 0.5, lifespan: 300 };
  }
  // Default — V8 / muscle / anything else
  return { color: 0x555555, alpha: 0.4, scale: 0.5, lifespan: 400 };
}

// ---------------------------------------------------------------------------
// CarEffects class
// ---------------------------------------------------------------------------

export class CarEffects {
  private scene: Phaser.Scene;
  private car: RaceCar;
  private exhaustConfig: ExhaustConfig;
  private tireMarkGraphics: Phaser.GameObjects.Graphics;

  /** Last positions used for drawing tire mark lines. */
  private lastX: number | null = null;
  private lastY: number | null = null;

  constructor(scene: Phaser.Scene, car: RaceCar) {
    this.scene = scene;
    this.car = car;
    this.exhaustConfig = getExhaustConfig(car);

    this.tireMarkGraphics = scene.add.graphics();
    this.tireMarkGraphics.setDepth(2);
  }

  // -------------------------------------------------------------------------
  // update — call once per frame
  // -------------------------------------------------------------------------

  update(state: CarState): void {
    this.updateExhaust(state);
    this.updateTireMarks(state);
    this.updateDriftSmoke(state);

    this.lastX = state.x;
    this.lastY = state.y;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Angle in Phaser coords (0 = right/east).
   * The physics engine uses 0 = north (up), clockwise.
   * Convert: phaserAngle = physicsAngle - Math.PI/2
   */
  private phaserAngle(state: CarState): number {
    return state.angle - Math.PI / 2;
  }

  private updateExhaust(state: CarState): void {
    if (state.speed <= 0.5) return;
    if (Math.random() > 0.3) return;

    const cfg = this.exhaustConfig;
    const angle = this.phaserAngle(state);

    // 16px behind the car centre
    const ex = state.x - Math.cos(angle) * 16;
    const ey = state.y - Math.sin(angle) * 16;

    const radius = 4 * cfg.scale;
    const puff = this.scene.add.graphics();
    puff.fillStyle(cfg.color, cfg.alpha);
    puff.fillCircle(ex, ey, radius);
    puff.setDepth(3);

    this.scene.tweens.add({
      targets: puff,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: cfg.lifespan,
      ease: "Linear",
      onComplete: () => puff.destroy(),
    });
  }

  private updateTireMarks(state: CarState): void {
    if (!state.isDrifting) {
      // Reset last position so marks don't span non-drift gaps
      this.lastX = null;
      this.lastY = null;
      return;
    }

    if (this.lastX === null || this.lastY === null) {
      this.lastX = state.x;
      this.lastY = state.y;
      return;
    }

    const angle = this.phaserAngle(state);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const driveType = (this.car.driveType ?? "").toUpperCase();

    // Wheel offsets in local space (lateral ±6, longitudinal: rear +10, front -10)
    const wheelOffsets: Array<{ lat: number; lon: number }> = [];

    if (driveType === "RWD" || driveType === "AWD") {
      wheelOffsets.push({ lat: -6, lon: 10 });
      wheelOffsets.push({ lat: 6, lon: 10 });
    }
    if (driveType === "FWD" || driveType === "AWD") {
      wheelOffsets.push({ lat: -6, lon: -10 });
      wheelOffsets.push({ lat: 6, lon: -10 });
    }
    // Fallback — treat unknown as RWD
    if (wheelOffsets.length === 0) {
      wheelOffsets.push({ lat: -6, lon: 10 });
      wheelOffsets.push({ lat: 6, lon: 10 });
    }

    this.tireMarkGraphics.lineStyle(2, 0x333333, 0.5);

    for (const offset of wheelOffsets) {
      // Transform local offset to world coordinates
      const wx = cos * offset.lon - sin * offset.lat;
      const wy = sin * offset.lon + cos * offset.lat;

      const fromX = this.lastX + wx;
      const fromY = this.lastY + wy;
      const toX = state.x + wx;
      const toY = state.y + wy;

      this.tireMarkGraphics.beginPath();
      this.tireMarkGraphics.moveTo(fromX, fromY);
      this.tireMarkGraphics.lineTo(toX, toY);
      this.tireMarkGraphics.strokePath();
    }
  }

  private updateDriftSmoke(state: CarState): void {
    if (!state.isDrifting) return;
    if (Math.random() > 0.4) return;

    const angle = this.phaserAngle(state);

    // Near rear of car
    const sx = state.x - Math.cos(angle) * 10;
    const sy = state.y - Math.sin(angle) * 10;

    const smoke = this.scene.add.graphics();
    smoke.fillStyle(0xcccccc, 0.3);
    smoke.fillCircle(sx, sy, 6);
    smoke.setDepth(3);

    this.scene.tweens.add({
      targets: smoke,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 500,
      ease: "Linear",
      onComplete: () => smoke.destroy(),
    });
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    this.tireMarkGraphics.destroy();
  }
}
