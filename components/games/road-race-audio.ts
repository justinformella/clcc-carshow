/**
 * road-race-audio.ts
 *
 * Per-car engine audio profiles using the Web Audio API.
 * Each car gets a layered oscillator bank (fundamental + harmonics) whose
 * frequency and gain are driven in real-time by the car's speed / throttle.
 */

// ---------------------------------------------------------------------------
// AudioContext singleton
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;

/** Lazily create (or return the existing) AudioContext. */
export function initRaceAudio(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume in case the browser suspended it before a user gesture
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// ---------------------------------------------------------------------------
// Engine profile definitions
// ---------------------------------------------------------------------------

type OscType = OscillatorType; // "sine" | "square" | "sawtooth" | "triangle"

interface HarmonicDef {
  /** Multiplier applied to the base frequency for this harmonic. */
  mult: number;
  /** Relative gain of this harmonic (0-1, scaled against the master gain). */
  gainRatio: number;
}

interface EngineProfile {
  waveform: OscType;
  baseFreq: number;   // Hz at idle / min speed
  maxFreq: number;    // Hz at top speed
  minGain: number;    // master gain at speed=0
  maxGain: number;    // master gain at speed=1
  harmonics: HarmonicDef[];
}

/** Map a normalised engineType string to a profile. */
function resolveProfile(engineType: string, cylinders: number): EngineProfile {
  const et = engineType.toLowerCase();

  // Electric / EV
  if (et.includes("electric") || et.includes("ev")) {
    return {
      waveform: "sine",
      baseFreq: 400,
      maxFreq: 900,
      minGain: 0.03,
      maxGain: 0.08,
      harmonics: [{ mult: 2, gainRatio: 0.4 }],
    };
  }

  // Diesel
  if (et.includes("diesel")) {
    return {
      waveform: "square",
      baseFreq: 55,
      maxFreq: 120,
      minGain: 0.06,
      maxGain: 0.15,
      harmonics: [
        { mult: 2, gainRatio: 0.5 },
        { mult: 3, gainRatio: 0.25 },
      ],
    };
  }

  // Turbo or inline engines
  if (et.includes("turbo") || et.includes("inline")) {
    return {
      waveform: "triangle",
      baseFreq: 180,
      maxFreq: 450,
      minGain: 0.04,
      maxGain: 0.10,
      harmonics: [
        { mult: 2, gainRatio: 0.45 },
        { mult: 3.5, gainRatio: 0.2 },
      ],
    };
  }

  // Flat / boxer engines
  if (et.includes("flat") || et.includes("boxer")) {
    return {
      waveform: "sawtooth",
      baseFreq: 100,
      maxFreq: 300,
      minGain: 0.05,
      maxGain: 0.12,
      harmonics: [
        { mult: 1.5, gainRatio: 0.5 },
        { mult: 2.5, gainRatio: 0.3 },
      ],
    };
  }

  // Default V8 (and all other V-configs, muscle cars, etc.)
  const baseFreq = cylinders >= 8 ? 75 : cylinders >= 6 ? 100 : 140;
  return {
    waveform: "sawtooth",
    baseFreq,
    maxFreq: baseFreq * 3.5,
    minGain: 0.05,
    maxGain: 0.13,
    harmonics: [
      { mult: 2, gainRatio: 0.5 },
      { mult: 3, gainRatio: 0.3 },
      { mult: 4, gainRatio: 0.15 },
    ],
  };
}

// ---------------------------------------------------------------------------
// EngineSound class
// ---------------------------------------------------------------------------

interface OscNode {
  osc: OscillatorNode;
  gain: GainNode;
}

export class EngineSound {
  private profile: EngineProfile;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: OscNode[] = [];
  private running = false;

  constructor(engineType: string, cylinders: number) {
    this.profile = resolveProfile(engineType, cylinders);
  }

  // -------------------------------------------------------------------------
  // start
  // -------------------------------------------------------------------------

  /** Create oscillators and connect the audio graph. Volume starts at 0. */
  start(): void {
    if (this.running) return;

    try {
      this.ctx = initRaceAudio();
    } catch {
      // Web Audio not available (SSR, tests, etc.) — silently bail
      return;
    }

    const ctx = this.ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Fundamental oscillator
    this._addOscillator(this.profile.baseFreq, 1.0);

    // Harmonic oscillators
    for (const h of this.profile.harmonics) {
      this._addOscillator(this.profile.baseFreq * h.mult, h.gainRatio);
    }

    // Start all oscillators
    for (const n of this.nodes) {
      n.osc.start();
    }

    this.running = true;
  }

  private _addOscillator(freq: number, gainRatio: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = this.profile.waveform;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainRatio, ctx.currentTime);

    osc.connect(gain);
    gain.connect(this.masterGain);

    this.nodes.push({ osc, gain });
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  /**
   * Drive the engine sound from physics state each frame.
   *
   * @param speedNormalized  player.speed / player.stats.topSpeed, clamped 0-1
   * @param isAccelerating   true when throttle is pressed
   */
  update(speedNormalized: number, isAccelerating: boolean): void {
    if (!this.running || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const sp = Math.max(0, Math.min(1, speedNormalized));
    const { baseFreq, maxFreq, minGain, maxGain } = this.profile;

    // Frequency: linear interpolation between base and max
    const targetFreq = baseFreq + (maxFreq - baseFreq) * sp;

    // Gain: linear interpolation, with throttle boost
    const accelMult = isAccelerating ? 1.0 : 0.6;
    const targetGain = (minGain + (maxGain - minGain) * sp) * accelMult;

    // Smooth ramp to avoid clicks (10 ms ramp)
    const RAMP = 0.01;
    this.masterGain.gain.linearRampToValueAtTime(targetGain, t + RAMP);

    // Update fundamental frequency; harmonics keep their mult ratio
    const allFreqs = [1.0, ...this.profile.harmonics.map((h) => h.mult)];
    for (let i = 0; i < this.nodes.length; i++) {
      const mult = allFreqs[i] ?? 1.0;
      this.nodes[i].osc.frequency.linearRampToValueAtTime(
        targetFreq * mult,
        t + RAMP
      );
    }
  }

  // -------------------------------------------------------------------------
  // stop
  // -------------------------------------------------------------------------

  /** Gracefully stop and disconnect the audio graph. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    const t = this.ctx?.currentTime ?? 0;
    // Fade out over 200 ms to avoid a hard pop
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(0, t + 0.2);
    }

    // Stop oscillators after the fade
    setTimeout(() => {
      for (const n of this.nodes) {
        try {
          n.osc.stop();
          n.osc.disconnect();
          n.gain.disconnect();
        } catch {
          // Already stopped — ignore
        }
      }
      this.masterGain?.disconnect();
      this.nodes = [];
      this.masterGain = null;
      this.ctx = null;
    }, 250);
  }
}
