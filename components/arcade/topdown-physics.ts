/**
 * Top-down 2D car physics engine.
 * Pure TypeScript math — no Phaser dependency.
 * Used by RaceScene to update all cars each frame.
 */

import { RaceCar } from "./types";

// ---------------------------------------------------------------------------
// Surface types
// ---------------------------------------------------------------------------

export type Surface = "road" | "grass" | "dirt" | "sidewalk";

interface SurfaceProps {
  friction: number;       // multiplier applied to speed each frame (lower = more drag)
  maxSpeedMult: number;   // multiplier on car's topSpeed allowed on this surface
}

export const SURFACE_PROPS: Record<Surface, SurfaceProps> = {
  road:     { friction: 0.985, maxSpeedMult: 1.00 },
  grass:    { friction: 0.940, maxSpeedMult: 0.55 },
  dirt:     { friction: 0.955, maxSpeedMult: 0.70 },
  sidewalk: { friction: 0.960, maxSpeedMult: 0.65 },
};

// ---------------------------------------------------------------------------
// Derived gameplay stats
// ---------------------------------------------------------------------------

export interface CarGameStats {
  acceleration: number;  // px/frame² applied when pressing accelerate
  topSpeed: number;      // max speed in px/frame on road
  steerRate: number;     // radians/frame added per frame of steering input
  mass: number;          // normalized 0.5–1.5, used in collision resolution
  driftFactor: number;   // RWD=1.2, AWD=0.7, FWD=1.0
}

/**
 * Map a value from [inMin, inMax] to [outMin, outMax], clamped.
 */
function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

/**
 * Derives gameplay stats from real-world car data.
 */
export function carStats(car: RaceCar): CarGameStats {
  // HP/weight ratio — typical range roughly 0.05 (truck) to 0.50 (supercar)
  const pwrRatio = car.hp / Math.max(car.weight, 1);
  const acceleration = mapRange(pwrRatio, 0.05, 0.50, 2.0, 8.0);

  // topSpeed in mph, typical range 80–200
  const topSpeed = mapRange(car.topSpeed, 80, 200, 4.0, 9.0);

  // Lighter cars turn faster. Weight in lbs, typical range 1500–5000
  const steerRate = mapRange(car.weight, 1500, 5000, 0.050, 0.025);

  // Normalized mass 0.5–1.5
  const mass = mapRange(car.weight, 1500, 5000, 0.5, 1.5);

  // Drift tendency by drive type
  const driveUpper = car.driveType.toUpperCase();
  let driftFactor: number;
  if (driveUpper.includes("RWD") || driveUpper === "R") {
    driftFactor = 1.2;
  } else if (driveUpper.includes("AWD") || driveUpper === "A" || driveUpper.includes("4WD") || driveUpper.includes("4X4")) {
    driftFactor = 0.7;
  } else {
    // FWD or unknown
    driftFactor = 1.0;
  }

  return { acceleration, topSpeed, steerRate, mass, driftFactor };
}

// ---------------------------------------------------------------------------
// Input interface
// ---------------------------------------------------------------------------

export interface CarInput {
  accel: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
}

// ---------------------------------------------------------------------------
// CarState
// ---------------------------------------------------------------------------

export class CarState {
  x: number;
  y: number;
  /** Angle in radians, 0 = north (up), increases clockwise */
  angle: number;
  speed: number;
  angularVel: number;
  driftAngle: number;

  stats: CarGameStats;
  car: RaceCar;

  surface: Surface;

  // Race tracking
  finished: boolean;
  finishTime: number;
  elapsedMs: number;
  topSpeedReached: number;
  driftCount: number;
  isDrifting: boolean;

  constructor(car: RaceCar, x: number, y: number, angle: number) {
    this.car = car;
    this.stats = carStats(car);

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.angularVel = 0;
    this.driftAngle = 0;

    this.surface = "road";

    this.finished = false;
    this.finishTime = 0;
    this.elapsedMs = 0;
    this.topSpeedReached = 0;
    this.driftCount = 0;
    this.isDrifting = false;
  }

  /**
   * Main physics step — call once per frame.
   * @param input - current frame control inputs
   * @param deltaMs - milliseconds since last frame (defaults to 16.67 for 60fps)
   */
  update(
    input: CarInput,
    deltaMs: number = 16.667
  ): void {
    if (this.finished) return;

    this.elapsedMs += deltaMs;

    const surf = SURFACE_PROPS[this.surface];
    const maxSpeed = this.stats.topSpeed * surf.maxSpeedMult;

    // --- Acceleration / Braking ---
    if (input.accel) {
      this.speed += this.stats.acceleration;
    }
    if (input.brake) {
      // Braking is 1.5x stronger than acceleration
      this.speed -= this.stats.acceleration * 1.5;
    }

    // Clamp speed (allow slight reverse, max = maxSpeed)
    this.speed = Math.max(-maxSpeed * 0.3, Math.min(maxSpeed, this.speed));

    // Surface friction
    this.speed *= surf.friction;

    // Snap tiny speeds to zero
    if (Math.abs(this.speed) < 0.01) this.speed = 0;

    // --- Steering ---
    // Effectiveness scales with speed; no turning when stopped
    const speedFraction = Math.abs(this.speed) / Math.max(this.stats.topSpeed, 0.001);
    const steerEffective = this.stats.steerRate * Math.min(speedFraction, 1.0);

    let steerInput = 0;
    if (input.steerLeft)  steerInput -= 1;
    if (input.steerRight) steerInput += 1;

    // Flip steering when reversing
    if (this.speed < 0) steerInput = -steerInput;

    this.angularVel += steerInput * steerEffective;

    // Angular friction
    this.angularVel *= 0.80;

    this.angle += this.angularVel;

    // --- Drift detection ---
    const turnIntensity = Math.abs(this.angularVel);
    const speedThreshold = this.stats.topSpeed * 0.60;
    const wasDrifting = this.isDrifting;
    this.isDrifting =
      Math.abs(this.speed) > speedThreshold &&
      turnIntensity > 0.015;

    if (this.isDrifting) {
      // Drift costs 0.3% speed per frame
      this.speed *= 0.997;

      // Drift angle shifts toward current angular vel to create slide offset
      const driftTarget = this.angularVel * this.stats.driftFactor * 8;
      this.driftAngle += (driftTarget - this.driftAngle) * 0.15;
    } else {
      // Drift angle decays back to zero
      this.driftAngle *= 0.85;
    }

    // Count new drift events (rising edge)
    if (this.isDrifting && !wasDrifting) {
      this.driftCount += 1;
    }

    // --- Position update ---
    // Movement in facing direction (angle 0 = north = negative Y in screen coords)
    const moveAngle = this.angle + this.driftAngle;
    this.x += Math.sin(moveAngle) * this.speed;
    this.y -= Math.cos(moveAngle) * this.speed;

    // --- Top speed tracking ---
    const currentMph = this.mph;
    if (currentMph > this.topSpeedReached) {
      this.topSpeedReached = currentMph;
    }
  }

  /**
   * Maps pixel speed to real MPH for display.
   * At max pixel speed (stats.topSpeed) → car's real topSpeed mph.
   */
  get mph(): number {
    if (this.stats.topSpeed === 0) return 0;
    return Math.abs(this.speed / this.stats.topSpeed) * this.car.topSpeed;
  }
}

// ---------------------------------------------------------------------------
// Collision resolution
// ---------------------------------------------------------------------------

/** Minimum distance (pixels) between car centers before collision resolves. */
const MIN_COLLISION_DIST = 28;

/**
 * Elastic collision between two cars using their masses.
 * Modifies x, y, speed on both cars in-place.
 */
export function resolveCarCollision(a: CarState, b: CarState): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0 || dist >= MIN_COLLISION_DIST) return;

  // Normalized collision normal
  const nx = dx / dist;
  const ny = dy / dist;

  // Relative velocity along collision normal
  const aVx = Math.sin(a.angle) * a.speed;
  const aVy = -Math.cos(a.angle) * a.speed;
  const bVx = Math.sin(b.angle) * b.speed;
  const bVy = -Math.cos(b.angle) * b.speed;

  const relVx = aVx - bVx;
  const relVy = aVy - bVy;
  const relVn = relVx * nx + relVy * ny;

  // Only resolve if approaching
  if (relVn >= 0) return;

  // Elastic impulse scalar
  const restitution = 0.6;
  const impulse = (-(1 + restitution) * relVn) / (1 / a.stats.mass + 1 / b.stats.mass);

  const impAx = (impulse / a.stats.mass) * nx;
  const impAy = (impulse / a.stats.mass) * ny;
  const impBx = (impulse / b.stats.mass) * nx;
  const impBy = (impulse / b.stats.mass) * ny;

  // Apply impulse to velocity vectors
  const newAVx = aVx + impAx;
  const newAVy = aVy + impAy;
  const newBVx = bVx - impBx;
  const newBVy = bVy - impBy;

  // Convert back to speed scalars (preserve direction by projecting onto heading)
  a.speed = Math.sqrt(newAVx * newAVx + newAVy * newAVy) * Math.sign(
    newAVx * Math.sin(a.angle) + newAVy * (-Math.cos(a.angle))
  ) || 0;
  b.speed = Math.sqrt(newBVx * newBVx + newBVy * newBVy) * Math.sign(
    newBVx * Math.sin(b.angle) + newBVy * (-Math.cos(b.angle))
  ) || 0;

  // Positional correction — push cars apart to avoid overlap
  const overlap = MIN_COLLISION_DIST - dist;
  const correctionRatio = overlap / (a.stats.mass + b.stats.mass);
  a.x -= nx * correctionRatio * b.stats.mass;
  a.y -= ny * correctionRatio * b.stats.mass;
  b.x += nx * correctionRatio * a.stats.mass;
  b.y += ny * correctionRatio * a.stats.mass;
}

/**
 * Bounce a car off a wall defined by a point (wallX, wallY) and
 * inward-facing normal (wallNx, wallNy). Applies 40% speed loss.
 */
export function resolveWallCollision(
  car: CarState,
  wallX: number,
  wallY: number,
  wallNx: number,
  wallNy: number
): void {
  // Velocity vector
  const vx = Math.sin(car.angle) * car.speed;
  const vy = -Math.cos(car.angle) * car.speed;

  // Component along wall normal
  const vDotN = vx * wallNx + vy * wallNy;

  // Only bounce if moving toward the wall (negative dot with inward normal means moving away)
  if (vDotN >= 0) return;

  // Reflect velocity about the wall normal, 40% speed loss (restitution 0.6)
  const restitution = 0.6;
  const reflectX = vx - (1 + restitution) * vDotN * wallNx;
  const reflectY = vy - (1 + restitution) * vDotN * wallNy;

  const newSpeed = Math.sqrt(reflectX * reflectX + reflectY * reflectY);
  // Determine sign: does the reflected vector point in the car's facing direction?
  const facingX = Math.sin(car.angle);
  const facingY = -Math.cos(car.angle);
  const dotFacing = reflectX * facingX + reflectY * facingY;

  car.speed = newSpeed * Math.sign(dotFacing);

  // Nudge car away from wall
  car.x += wallNx * 2;
  car.y += wallNy * 2;

  // Dampen angular velocity on wall hit
  car.angularVel *= 0.5;
}
