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

// ─── MP3 MUSIC PLAYER ────────────────────────────────────────────────────────
// CC0 chiptune tracks by Juhani Junkala (Retro Game Music Pack)
// + "Exploring Town" by Spring Spring (CC0)

let currentAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;

function playTrack(src: string, volume = 0.4) {
  // Don't restart if already playing this track
  if (currentTrack === src && currentAudio && !currentAudio.paused) return;
  stopMusicPlayer();
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch(() => { /* autoplay blocked — will play on next interaction */ });
  currentAudio = audio;
  currentTrack = src;
}

function stopMusicPlayer() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
    currentTrack = null;
  }
}

export function startSelectMusic() { playTrack("/arcade/music/select.mp3", 0.3); }
export function stopSelectMusic() { stopMusicPlayer(); }
export function startMenuMusic() { playTrack("/arcade/music/level-1.mp3", 0.35); }
export function stopMenuMusic() { stopMusicPlayer(); }
export function startMusic() { playTrack("/arcade/music/level-3.mp3", 0.3); }
export function stopMusic() { stopMusicPlayer(); }

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

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

export function stopAll() {
  stopEngine();
  stopMusicPlayer();
}
