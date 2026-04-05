/**
 * Convert advertised HP to SAE Net equivalent.
 *
 * Before 1972, automakers reported SAE Gross HP — measured at the
 * flywheel with no accessories, water pump, alternator, or exhaust
 * system attached. In 1972 the SAE J1349 standard switched to Net HP,
 * measured with all production accessories and full exhaust. Gross
 * figures ran roughly 20-25% higher than net for the same engine.
 *
 * We apply an 0.80 multiplier to pre-1972 cars to approximate net HP.
 */
export function netHP(hp: number, year: number): number {
  if (year < 1972) return hp * 0.80;
  return hp;
}

/**
 * Drivetrain loss factor based on transmission type and era.
 * Modern DCTs and autos are efficient; old slushboxes lose significant power.
 */
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

/**
 * Realistic quarter-mile elapsed time (seconds).
 * Uses the standard empirical formula: ET = 5.825 × (weight / hp)^(1/3)
 */
export function quarterMileET(hp: number, weightLbs: number, year: number = 2000, trans: string = "Manual", gears: number = 5): number {
  const base = 5.825 * Math.pow(weightLbs / netHP(hp, year), 1 / 3);
  return base * drivetrainFactor(trans, gears, year);
}

/**
 * Quarter-mile trap speed (MPH).
 * Empirical formula: speed = 234 × (hp / weight)^(1/3)
 */
export function trapSpeedMPH(hp: number, weightLbs: number, year: number = 2000): number {
  return 234 * Math.pow(netHP(hp, year) / weightLbs, 1 / 3);
}

/**
 * Top speed (MPH). Uses stored value if available, otherwise estimates.
 */
export function topSpeedMPH(hp: number, weightLbs: number, year: number = 2000, stored: number = 0): number {
  if (stored > 0) return stored;
  return trapSpeedMPH(hp, weightLbs, year) * 1.35;
}

/**
 * Find the maxSpeed calibration factor so simulated physics
 * finishes in exactly targetET seconds.
 */
export function calibratePlayer(targetET: number, redline: number = 6500, maxGears: number = 5): { factor: number; peakSpeed: number } {
  const shiftPoint = Math.round(redline * 0.92);
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, speed = 0, gear = 1, rpm = 800, frames = 0, peak = 0;
    while (pos < 1000 && frames < 60 * 30) {
      rpm = Math.min(rpm + redline * 0.004, redline);
      const gearCeiling = maxSpeed * (0.20 + 0.80 * Math.pow(gear / maxGears, 1.4));
      const gearFloor = gear === 1 ? 0 : maxSpeed * (0.20 + 0.80 * Math.pow((gear - 1) / maxGears, 1.4));
      const rpmPct = (rpm - 800) / (redline - 800);
      speed = gearFloor + (gearCeiling - gearFloor) * rpmPct;
      if (speed > peak) peak = speed;
      if (rpm >= shiftPoint && gear < maxGears) { gear++; rpm = Math.round(redline * 0.45); }
      pos += speed * (1/60) * 60;
      if (speed > peak) peak = speed;
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

export function calibrateOpponent(targetET: number): number {
  const test = (factor: number) => {
    const maxSpeed = 1000 / (targetET * 60 * factor);
    let pos = 0, frames = 0;
    while (pos < 1000 && frames < 60 * 30) {
      const elapsed = frames * (1000/60);
      const curve = Math.min(elapsed / 8000, 1);
      const wobble = Math.sin(elapsed * 0.002) * 0.05;
      const speed = maxSpeed * curve * (0.85 + wobble);
      pos += speed * (1/60) * 60;
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
