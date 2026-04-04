import { CarState } from './topdown-physics';
import { TrackData, nearestWaypointIndex } from './track';

export type AIInput = {
  accel: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
};

export class AIDriver {
  private skill: number;
  private reactionDelayMs: number;
  private startDelayMs: number;
  private startTime: number | null = null;

  constructor(skill: number) {
    this.skill = skill;
    this.reactionDelayMs = 150 + (1 - skill) * 500;
    this.startDelayMs = 200 + Math.random() * 300;
    this.startTime = null;
  }

  update(car: CarState, track: TrackData): AIInput {
    const noInput: AIInput = {
      accel: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    };

    const now = performance.now();

    if (this.startTime === null) {
      this.startTime = now;
    }

    const elapsed = now - this.startTime;

    if (elapsed < this.startDelayMs) {
      return noInput;
    }

    const effectiveElapsed = elapsed - this.startDelayMs;
    if (effectiveElapsed < this.reactionDelayMs) {
      return noInput;
    }

    const waypoints = track.waypoints;
    if (!waypoints || waypoints.length === 0) {
      return noInput;
    }

    const nearestIdx = nearestWaypointIndex(car, track);

    // Look further ahead at higher speeds
    const speed = car.speed ?? 0;
    const topSpeed = car.topSpeed ?? 200;
    const speedRatio = speed / topSpeed;
    const lookAhead = speedRatio > 0.5 ? 3 : 2;

    const targetIdx = (nearestIdx + lookAhead) % waypoints.length;
    const target = waypoints[targetIdx];

    const dx = target.x - car.x;
    const dy = target.y - car.y;

    // atan2(dx, -dy) for coordinate system where 0=north (up)
    const targetAngle = Math.atan2(dx, -dy);
    const carAngle = car.angle ?? 0;

    let angleDiff = targetAngle - carAngle;

    // Normalize to -PI..PI
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // Add noise based on skill level
    const noise = (1 - this.skill) * Math.sin(effectiveElapsed * 0.003) * 0.15;
    angleDiff += noise;

    const steerThreshold = 0.05;
    const steerLeft = angleDiff < -steerThreshold;
    const steerRight = angleDiff > steerThreshold;

    const turnSeverity = Math.abs(angleDiff);
    const shouldBrake = turnSeverity > 0.8 && speedRatio > 0.7;

    // Cap speed at topSpeed * skill
    const cappedTopSpeed = topSpeed * this.skill;
    const overSpeed = speed > cappedTopSpeed;

    return {
      accel: !shouldBrake && !overSpeed,
      brake: shouldBrake || overSpeed,
      steerLeft,
      steerRight,
    };
  }
}

export function createAIDrivers(): AIDriver[] {
  const randInRange = (min: number, max: number) =>
    min + Math.random() * (max - min);

  return [
    new AIDriver(randInRange(0.90, 1.00)),
    new AIDriver(randInRange(0.85, 0.95)),
    new AIDriver(randInRange(0.85, 0.93)),
  ];
}
