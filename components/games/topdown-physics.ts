/**
 * Top-down 2D car physics engine — velocity-based drift model.
 * Inspired by pakastin/car: xVelocity/yVelocity components let velocity
 * lag behind the car's facing direction, which produces natural drift feel.
 *
 * Pure TypeScript math — no Phaser dependency.
 * Used by RaceScene to update all cars each frame.
 */

import { RaceCar } from "./types";

// ---------------------------------------------------------------------------
// Surface types
// ---------------------------------------------------------------------------

export type Surface = "road" | "grass" | "dirt" | "sidewalk";

interface SurfaceProps {
  friction: number;       // drag multiplier applied to velocity each frame
  maxSpeedMult: number;   // multiplier on car's topSpeed allowed on this surface
}

export const SURFACE_PROPS: Record<Surface, SurfaceProps> = {
  road:     { friction: 0.96, maxSpeedMult: 1.00 },
  grass:    { friction: 0.90, maxSpeedMult: 0.50 },
  dirt:     { friction: 0.92, maxSpeedMult: 0.65 },
  sidewalk: { friction: 0.93, maxSpeedMult: 0.70 },
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
  /** World-space velocity components */
  xVelocity: number;
  yVelocity: number;
  /** Throttle power — builds up gradually, decays on coast */
  power: number;
  /** Scalar speed (magnitude of velocity vector) — kept for HUD / audio */
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
  /**
   * Monotonically-increasing waypoint index.
   * Only advances forward — never drops — so that tracks whose path
   * loops near the start don't accidentally trigger finish detection early.
   */
  waypointProgress: number;

  constructor(car: RaceCar, x: number, y: number, angle: number) {
    this.car = car;
    this.stats = carStats(car);

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.xVelocity = 0;
    this.yVelocity = 0;
    this.power = 0;
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
    this.waypointProgress = 0;
  }

  /**
   * Main physics step — call once per frame.
   * Uses a velocity-based drift model: power accelerates the car in its
   * facing direction, but velocity carries momentum, so the car slides
   * naturally when turning at speed (drift = velocity lags facing angle).
   *
   * @param input  - current frame control inputs
   * @param deltaMs - milliseconds since last frame (defaults to 16.67 for 60fps)
   */
  update(input: CarInput, deltaMs: number = 16.667): void {
    if (this.finished) return;
    this.elapsedMs += deltaMs;

    const surf = SURFACE_PROPS[this.surface];
    const maxPower = this.stats.topSpeed * 0.012; // scale power to car stats
    const powerFactor = maxPower * 0.08;

    // --- Build up / release power gradually ---
    if (input.accel) {
      this.power = Math.min(this.power + powerFactor, maxPower);
    } else if (input.brake) {
      this.power = Math.max(this.power - powerFactor * 3, -maxPower * 0.3);
    } else {
      this.power *= 0.95; // coast
    }

    // --- Steering — modify angular velocity ---
    const turnSpeed = this.stats.steerRate * 0.5;
    const direction = this.power >= 0 ? 1 : -1;

    if (input.steerLeft)  this.angularVel -= direction * turnSpeed;
    if (input.steerRight) this.angularVel += direction * turnSpeed;

    // --- Apply power in car's facing direction ---
    this.xVelocity += Math.sin(this.angle) * this.power;
    this.yVelocity += Math.cos(this.angle) * this.power;

    // --- Drag — THIS is what creates natural drift feel ---
    // Velocity lags behind facing angle when turning, producing slide
    const effectiveDrag = surf.friction;
    this.xVelocity *= effectiveDrag;
    this.yVelocity *= effectiveDrag;

    // --- Angular drag ---
    this.angularVel *= 0.93;

    // --- Update angle ---
    this.angle += this.angularVel;

    // --- Update position (screen Y is inverted: forward = +y in world = -y on screen) ---
    this.x += this.xVelocity;
    this.y -= this.yVelocity;

    // --- Compute speed scalar for HUD / audio / other systems ---
    this.speed = Math.sqrt(
      this.xVelocity * this.xVelocity + this.yVelocity * this.yVelocity
    );

    // --- Surface speed limit ---
    const maxSpeed = this.stats.topSpeed * surf.maxSpeedMult;
    if (this.speed > maxSpeed) {
      const scale = maxSpeed / this.speed;
      this.xVelocity *= scale;
      this.yVelocity *= scale;
      this.speed = maxSpeed;
    }

    // Snap tiny speeds to zero
    if (this.speed < 0.01) {
      this.xVelocity = 0;
      this.yVelocity = 0;
      this.speed = 0;
    }

    // --- Drift detection ---
    // Drift occurs when velocity direction differs significantly from facing direction
    const velAngle = Math.atan2(this.xVelocity, this.yVelocity);
    let angleDiff = this.angle - velAngle;
    while (angleDiff > Math.PI)  angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const wasDrifting = this.isDrifting;
    this.isDrifting =
      this.speed > this.stats.topSpeed * 0.3 && Math.abs(angleDiff) > 0.2;
    this.driftAngle = angleDiff * 0.3; // visual drift angle for sprite rotation

    if (this.isDrifting && !wasDrifting) this.driftCount++;
    if (!this.isDrifting) this.driftAngle *= 0.85;

    // --- Track top speed ---
    const currentMph = this.mph;
    if (currentMph > this.topSpeedReached) this.topSpeedReached = currentMph;
  }

  /**
   * Maps pixel speed to real MPH for display.
   * At max pixel speed (stats.topSpeed) → car's real topSpeed mph.
   */
  get mph(): number {
    if (this.stats.topSpeed === 0) return 0;
    return (this.speed / this.stats.topSpeed) * this.car.topSpeed;
  }
}

// ---------------------------------------------------------------------------
// Collision resolution
// ---------------------------------------------------------------------------

/** Minimum distance (pixels) between car centers before collision resolves. */
const MIN_COLLISION_DIST = 28;

/**
 * Elastic collision between two cars using their masses.
 * Uses xVelocity/yVelocity directly — no angle-based velocity reconstruction.
 * Modifies x, y, xVelocity, yVelocity on both cars in-place.
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
  const relVx = a.xVelocity - b.xVelocity;
  const relVy = a.yVelocity - b.yVelocity;
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

  // Apply impulse directly to velocity vectors
  a.xVelocity += impAx;
  a.yVelocity += impAy;
  b.xVelocity -= impBx;
  b.yVelocity -= impBy;

  // Update speed scalars
  a.speed = Math.sqrt(a.xVelocity * a.xVelocity + a.yVelocity * a.yVelocity);
  b.speed = Math.sqrt(b.xVelocity * b.xVelocity + b.yVelocity * b.yVelocity);

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
  // Use velocity components directly
  const vx = car.xVelocity;
  const vy = car.yVelocity;

  // Component along wall normal
  const vDotN = vx * wallNx + vy * wallNy;

  // Only bounce if moving toward the wall
  if (vDotN >= 0) return;

  // Reflect velocity about the wall normal, 40% speed loss (restitution 0.6)
  const restitution = 0.6;
  car.xVelocity = vx - (1 + restitution) * vDotN * wallNx;
  car.yVelocity = vy - (1 + restitution) * vDotN * wallNy;

  // Update speed scalar
  car.speed = Math.sqrt(
    car.xVelocity * car.xVelocity + car.yVelocity * car.yVelocity
  );

  // Nudge car away from wall
  car.x += wallNx * 2;
  car.y += wallNy * 2;

  // Dampen angular velocity on wall hit
  car.angularVel *= 0.5;

  // Suppress unused parameter warning
  void wallX;
  void wallY;
}
