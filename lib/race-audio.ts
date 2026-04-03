// 8-bit audio engine for the racing game using Web Audio API
// All sounds use square/triangle waves for authentic NES chiptune feel

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/**
 * Call from a user-gesture handler (click/tap) to ensure the
 * AudioContext is created and resumed before any async callbacks
 * (setInterval, requestAnimationFrame) try to use it.
 */
export function initAudio() {
  getCtx();
}

// ─── COUNTDOWN BEEPS ─────────────────────────────────────────────────────────

export function playCountdownBeep(isGo: boolean) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = isGo ? 880 : 440;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (isGo ? 0.4 : 0.2));
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + (isGo ? 0.4 : 0.2));
}

// ─── ENGINE SOUND ────────────────────────────────────────────────────────────

let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

export function startEngine() {
  const c = getCtx();
  if (engineOsc) stopEngine();

  engineOsc = c.createOscillator();
  engineGain = c.createGain();

  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 60;
  engineGain.gain.value = 0.06;

  // Add some grit with a waveshaper
  const distortion = c.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.5);
  }
  distortion.curve = curve;

  engineOsc.connect(distortion);
  distortion.connect(engineGain);
  engineGain.connect(c.destination);
  engineOsc.start();
}

export function updateEngine(rpm: number, speed: number) {
  if (!engineOsc || !engineGain) return;
  // Map RPM (800-7000) to frequency (50-200Hz) — low growly engine
  const freq = 50 + ((rpm - 800) / 6200) * 150;
  engineOsc.frequency.value = freq;
  // Volume increases with speed
  const vol = 0.04 + Math.min(speed / 15, 1) * 0.08;
  engineGain.gain.value = vol;
}

export function stopEngine() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch {}
    engineOsc.disconnect();
    engineOsc = null;
  }
  if (engineGain) {
    engineGain.disconnect();
    engineGain = null;
  }
}

// ─── GEAR SHIFT SOUND ────────────────────────────────────────────────────────

export function playGearShift() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 220;
  osc.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.08);
  gain.gain.value = 0.12;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

// ─── WIN JINGLE ──────────────────────────────────────────────────────────────

export function playWinJingle() {
  const c = getCtx();
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2 + i * 0.15 + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + i * 0.15);
    osc.stop(c.currentTime + i * 0.15 + 0.3);
  });
}

// ─── LOSE JINGLE ─────────────────────────────────────────────────────────────

export function playLoseJingle() {
  const c = getCtx();
  const notes = [392, 349, 311, 262]; // G4, F4, Eb4, C4 — descending
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2 + i * 0.2 + 0.3);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + i * 0.2);
    osc.stop(c.currentTime + i * 0.2 + 0.35);
  });
}

// ─── BACKGROUND MUSIC (simple chiptune loop) ────────────────────────────────

let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicGainNode: GainNode | null = null;

// Simple bass line pattern — loops every 8 beats
const BASS_PATTERN = [131, 131, 165, 165, 175, 175, 131, 131]; // C3, E3, F3, C3
const MELODY_PATTERN = [523, 0, 659, 0, 784, 659, 523, 0]; // C5 riff, 0 = rest

export function startMusic() {
  const c = getCtx();
  if (musicInterval) stopMusic();

  musicGainNode = c.createGain();
  musicGainNode.gain.value = 0.05;
  musicGainNode.connect(c.destination);

  let beat = 0;
  const BPM = 140;
  const beatMs = (60 / BPM) * 1000;

  musicInterval = setInterval(() => {
    const idx = beat % 8;

    // Bass note
    const bassFreq = BASS_PATTERN[idx];
    if (bassFreq) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = bassFreq;
      g.gain.value = 1;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + beatMs / 1000 * 0.9);
      osc.connect(g);
      g.connect(musicGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + beatMs / 1000);
    }

    // Melody note
    const melFreq = MELODY_PATTERN[idx];
    if (melFreq) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.value = melFreq;
      g.gain.value = 0.6;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + beatMs / 1000 * 0.7);
      osc.connect(g);
      g.connect(musicGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + beatMs / 1000);
    }

    beat++;
  }, beatMs);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicGainNode) {
    musicGainNode.disconnect();
    musicGainNode = null;
  }
}

// ─── FOUL BUZZER (jumped the green) ─────────────────────────────────────────

export function playFoulBuzzer() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 110;
  gain.gain.value = 0.2;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.5);
}

// ─── SELECT SCREEN MUSIC (chill garage vibe) ────────────────────────────────

let selectInterval: ReturnType<typeof setInterval> | null = null;
let selectGainNode: GainNode | null = null;

// Mellow pentatonic melody — relaxed browsing feel
const SELECT_BASS = [98, 98, 131, 131, 110, 110, 98, 98]; // G2, C3, A2, G2
const SELECT_MELODY = [392, 0, 330, 0, 294, 0, 262, 0]; // G4, E4, D4, C4
const SELECT_ARPEGGIO = [0, 523, 0, 440, 0, 392, 0, 330]; // off-beat sparkles

export function startSelectMusic() {
  const c = getCtx();
  if (selectInterval) stopSelectMusic();

  selectGainNode = c.createGain();
  selectGainNode.gain.value = 0.04;
  selectGainNode.connect(c.destination);

  let beat = 0;
  const BPM = 100;
  const beatMs = (60 / BPM) * 1000;

  selectInterval = setInterval(() => {
    const idx = beat % 8;

    const bassFreq = SELECT_BASS[idx];
    if (bassFreq) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = bassFreq;
      g.gain.value = 0.8;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + beatMs / 1000 * 0.8);
      osc.connect(g);
      g.connect(selectGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + beatMs / 1000);
    }

    const melFreq = SELECT_MELODY[idx];
    if (melFreq) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.value = melFreq;
      g.gain.value = 0.4;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + beatMs / 1000 * 0.6);
      osc.connect(g);
      g.connect(selectGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + beatMs / 1000);
    }

    const arpFreq = SELECT_ARPEGGIO[idx];
    if (arpFreq) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.value = arpFreq;
      g.gain.value = 0.3;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + beatMs / 1000 * 0.4);
      osc.connect(g);
      g.connect(selectGainNode!);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + beatMs / 1000);
    }

    beat++;
  }, beatMs);
}

export function stopSelectMusic() {
  if (selectInterval) {
    clearInterval(selectInterval);
    selectInterval = null;
  }
  if (selectGainNode) {
    selectGainNode.disconnect();
    selectGainNode = null;
  }
}

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

export function stopAll() {
  stopEngine();
  stopMusic();
  stopSelectMusic();
}
