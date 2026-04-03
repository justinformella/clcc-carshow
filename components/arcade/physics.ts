/**
 * Quarter-mile drag race physics engine.
 * Ported from /race — identical formulas for SAE HP, drivetrain losses,
 * per-gear speed caps, RPM scaling, and calibration.
 */

export type RaceCar = {
  id: string;
  carNumber: number;
  year: number;
  name: string;
  color: string;
  owner: string;
  hp: number;
  weight: number;
  pwr: number;
  displacement: number;
  cylinders: number;
  engineType: string;
  category: string;
  driveType: string;
  bodyStyle: string;
  origin: string;
  era: string;
  production: number;
  redline: number;
  topSpeed: number;
  gears: number;
  trans: string;
  pixelArt: string | null;
  pixelDash: string | null;
  pixelRear: string | null;
  aiImage: string | null;
};

/** Convert advertised HP to SAE Net equivalent (pre-1972 = gross × 0.80) */
export function netHP(hp: number, year: number): number {
  if (year < 1972) return hp * 0.80;
  return hp;
}

/** Drivetrain loss factor based on transmission type and era */
export function drivetrainFactor(trans: string, gears: number, year: number): number {
  const t = trans.toLowerCase();
  if (t === "electric" || t === "ev") return 0.95;
  if (t === "dct" || t === "semi-auto") return 1.0;
  if (t === "cvt") return 1.04;
  if (t === "manual") return 1.03;
  if (t === "automatic" || t === "auto") {
    if (gears <= 2) return 1.15;
    if (gears <= 3 && year < 1975) return 1.10;
    if (gears <= 4) return 1.06;
    return 1.02;
  }
  return 1.03;
}

/** Predicted quarter-mile ET in seconds */
export function quarterMileET(car: RaceCar): number {
  const base = 5.825 * Math.pow(car.weight / netHP(car.hp, car.year), 1 / 3);
  return base * drivetrainFactor(car.trans, car.gears, car.year);
}

/** Quarter-mile trap speed (MPH) */
export function trapSpeedMPH(car: RaceCar): number {
  return 234 * Math.pow(netHP(car.hp, car.year) / car.weight, 1 / 3);
}

/** Top speed — uses stored value or estimates from trap speed */
export function topSpeedMPH(car: RaceCar): number {
  if (car.topSpeed > 0) return car.topSpeed;
  return trapSpeedMPH(car) * 1.35;
}

/** Gear speed ceiling at a given gear */
export function gearCeiling(gear: number, maxGears: number, maxSpeed: number): number {
  return maxSpeed * (0.20 + 0.80 * Math.pow(gear / maxGears, 1.4));
}

/** Gear speed floor at a given gear */
export function gearFloor(gear: number, maxGears: number, maxSpeed: number): number {
  if (gear <= 1) return 0;
  return maxSpeed * (0.20 + 0.80 * Math.pow((gear - 1) / maxGears, 1.4));
}

/** Calibrate player maxSpeed so perfect play finishes at targetET */
export function calibratePlayer(targetET: number, redline: number, maxGears: number): { factor: number; peakSpeed: number } {
  const shiftPoint = Math.round(redline * 0.92);
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, speed = 0, gear = 1, rpm = 800, frames = 0, peak = 0;
    while (pos < 1000 && frames < 60 * 30) {
      rpm = Math.min(rpm + redline * 0.004, redline);
      const ceil = gearCeiling(gear, maxGears, maxSpeed);
      const floor = gearFloor(gear, maxGears, maxSpeed);
      const rpmPct = (rpm - 800) / (redline - 800);
      speed = floor + (ceil - floor) * rpmPct;
      if (speed > peak) peak = speed;
      if (rpm >= shiftPoint && gear < maxGears) { gear++; rpm = Math.round(redline * 0.45); }
      pos += speed * (1 / 60) * 60;
      frames++;
    }
    return { time: frames / 60, peak };
  };
  let lo = 0.3, hi = 1.5;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid).time < targetET) lo = mid; else hi = mid;
  }
  const finalFactor = (lo + hi) / 2;
  return { factor: finalFactor, peakSpeed: test(finalFactor).peak };
}

/** Calibrate opponent maxSpeed so AI finishes at targetET */
export function calibrateOpponent(targetET: number): number {
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, frames = 0;
    while (pos < 1000 && frames < 60 * 30) {
      const elapsed = frames * (1000 / 60);
      const curve = Math.min(elapsed / 8000, 1);
      const wobble = Math.sin(elapsed * 0.002) * 0.05;
      const speed = maxSpeed * curve * (0.85 + wobble);
      pos += speed * (1 / 60) * 60;
      frames++;
    }
    return frames / 60;
  };
  let lo = 0.4, hi = 1.0;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid) < targetET) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Live race state — updated each frame during a race.
 */
export class PlayerState {
  pos = 0;
  speed = 0;
  gear = 1;
  rpm = 800;
  finishTime = 0;
  frames = 0; // physics frame counter — used for timing (frames/60 = seconds)
  maxSpeed: number;
  peakSpeed: number;
  mphScale: number;
  redline: number;
  maxGears: number;
  shiftPoint: number;
  rpmRate: number;
  // Lateral steering
  laneX = 0;        // -1.0 (left edge) to +1.0 (right edge), 0 = center
  lateralVel = 0;   // current lateral velocity
  onGrass = false;   // true when |laneX| > 1.0

  constructor(car: RaceCar) {
    const targetET = quarterMileET(car);
    const cal = calibratePlayer(targetET, car.redline || 6500, car.gears || 5);
    this.maxSpeed = 1000 / (targetET * 60 * cal.factor);
    this.peakSpeed = cal.peakSpeed;
    this.mphScale = topSpeedMPH(car) / cal.peakSpeed;
    this.redline = car.redline || 6500;
    this.maxGears = car.gears || 5;
    this.shiftPoint = Math.round(this.redline * 0.92);
    this.rpmRate = this.redline * 0.004;
  }

  get mph(): number {
    return Math.round(this.speed * this.mphScale);
  }

  get finished(): boolean {
    return this.finishTime > 0;
  }

  update(accel: boolean): boolean /* shifted */ {
    if (this.finished) return false;
    this.frames++;

    // Fixed dt = 1/60 per frame — matches calibration exactly
    let shifted = false;
    if (accel) {
      this.rpm = Math.min(this.rpm + this.rpmRate, this.redline);
      const ceil = gearCeiling(this.gear, this.maxGears, this.maxSpeed);
      const floor = gearFloor(this.gear, this.maxGears, this.maxSpeed);
      const rpmPct = (this.rpm - 800) / (this.redline - 800);
      this.speed = floor + (ceil - floor) * rpmPct;
    } else {
      this.rpm = Math.max(this.rpm - this.redline * 0.005, 800);
      this.speed = Math.max(this.speed - 0.3, 0);
    }

    // Auto-shift
    if (this.rpm >= this.shiftPoint && this.gear < this.maxGears) {
      this.gear++;
      this.rpm = Math.round(this.redline * 0.45);
      shifted = true;
    }

    this.pos += this.speed * (1 / 60) * 60;

    if (this.pos >= 1000 && !this.finished) {
      // Time = physics frames / 60, converted to ms
      this.finishTime = Math.round(this.frames / 60 * 1000);
    }

    return shifted;
  }

  updateSteering(steerLeft: boolean, steerRight: boolean) {
    const LATERAL_ACCEL = 0.04;
    const LATERAL_FRICTION = 0.92;
    const MAX_LATERAL_VEL = 0.08;
    if (steerLeft) this.lateralVel -= LATERAL_ACCEL;
    if (steerRight) this.lateralVel += LATERAL_ACCEL;
    this.lateralVel *= LATERAL_FRICTION;
    this.lateralVel = Math.max(-MAX_LATERAL_VEL, Math.min(MAX_LATERAL_VEL, this.lateralVel));
    this.laneX += this.lateralVel;
    this.onGrass = Math.abs(this.laneX) > 1.0;
    if (this.onGrass) {
      this.speed *= 0.97;
      const pushBack = this.laneX > 0 ? -0.01 : 0.01;
      this.lateralVel += pushBack;
    }
    this.laneX = Math.max(-1.3, Math.min(1.3, this.laneX));
  }
}

export class OpponentState {
  pos = 0;
  speed = 0;
  finishTime = 0;
  frames = 0; // physics frame counter
  maxSpeed: number;
  reactionTime: number;
  reactionFrames: number;
  mphScale: number;
  // Lateral steering AI
  laneX = 0;
  lateralVel = 0;
  targetLaneX = 0;
  onGrass = false;
  private lastPlayerLaneX = 0;
  private blockingDelay = 0;

  constructor(car: RaceCar) {
    const targetET = quarterMileET(car);
    const factor = calibrateOpponent(targetET);
    this.maxSpeed = 1000 / (targetET * 60 * factor);
    this.reactionTime = 150 + Math.random() * 250;
    this.reactionFrames = Math.round(this.reactionTime / (1000 / 60)); // convert ms to frames
    this.mphScale = topSpeedMPH(car) / this.maxSpeed;
  }

  get mph(): number {
    return Math.round(this.speed * this.mphScale);
  }

  get finished(): boolean {
    return this.finishTime > 0;
  }

  update() {
    if (this.finished) return;
    this.frames++;

    // Opponent uses frame-based elapsed (converted to ms for the acceleration curve)
    const elapsedMs = this.frames * (1000 / 60);
    const oppElapsed = elapsedMs - this.reactionTime;
    if (oppElapsed < 0) { this.speed = 0; return; }

    const curve = Math.min(oppElapsed / 8000, 1);
    const wobble = Math.sin(oppElapsed * 0.002) * 0.05;
    this.speed = this.maxSpeed * curve * (0.85 + wobble);

    this.pos += this.speed * (1 / 60) * 60;

    if (this.pos >= 1000 && !this.finished) {
      this.finishTime = Math.round(this.frames / 60 * 1000);
    }
  }

  updateSteering(playerLaneX: number, playerPos: number) {
    const LATERAL_ACCEL = 0.04;
    const LATERAL_FRICTION = 0.92;
    const MAX_LATERAL_VEL = 0.048;
    this.blockingDelay = Math.max(0, this.blockingDelay - 1);
    const elapsedMs = this.frames * (1000 / 60);
    const baseLane = Math.sin(elapsedMs * 0.0005 * Math.PI * 2 / 4) * 0.2;
    const delta = Math.abs(this.pos - playerPos);
    if (delta < 80 && this.blockingDelay <= 0) {
      this.targetLaneX = playerLaneX;
      this.blockingDelay = 18;
    } else if (delta >= 80) {
      this.targetLaneX = baseLane;
    }
    this.targetLaneX = Math.max(-0.95, Math.min(0.95, this.targetLaneX));
    const diff = this.targetLaneX - this.laneX;
    if (Math.abs(diff) > 0.02) {
      this.lateralVel += (diff > 0 ? LATERAL_ACCEL : -LATERAL_ACCEL) * 0.6;
    }
    this.lateralVel *= LATERAL_FRICTION;
    this.lateralVel = Math.max(-MAX_LATERAL_VEL, Math.min(MAX_LATERAL_VEL, this.lateralVel));
    this.laneX += this.lateralVel;
    this.onGrass = Math.abs(this.laneX) > 1.0;
    if (this.onGrass) {
      this.speed *= 0.97;
      this.lateralVel += this.laneX > 0 ? -0.01 : 0.01;
    }
    this.laneX = Math.max(-1.3, Math.min(1.3, this.laneX));
  }
}

export type CollisionResult = {
  carTocar: boolean;
  playerOnGrass: boolean;
  opponentOnGrass: boolean;
};

export function checkCollision(
  player: PlayerState,
  opponent: OpponentState,
  cooldownFrames: number
): { result: CollisionResult; newCooldown: number } {
  const result: CollisionResult = {
    carTocar: false,
    playerOnGrass: player.onGrass,
    opponentOnGrass: opponent.onGrass,
  };
  let newCooldown = Math.max(0, cooldownFrames - 1);
  const lateralDist = Math.abs(player.laneX - opponent.laneX);
  const depthDist = Math.abs(player.pos - opponent.pos);
  if (lateralDist < 0.25 && depthDist < 30 && cooldownFrames <= 0) {
    result.carTocar = true;
    newCooldown = 12;
    const bounceForce = 0.12;
    if (player.laneX < opponent.laneX) {
      player.lateralVel = -bounceForce;
      opponent.lateralVel = bounceForce;
    } else {
      player.lateralVel = bounceForce;
      opponent.lateralVel = -bounceForce;
    }
    player.speed *= 0.90;
    opponent.speed *= 0.90;
  }
  return { result, newCooldown };
}
