// Palmetto Bay — sound. Everything is synthesized with WebAudio: no audio
// files, no network. Engine hum follows the car's speed, sirens wail in two
// tones, gunshots are filtered noise, and a lazy bassline loops under it all.

export function createAudio() {
  return {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    musicTimer: 0,
    musicStep: 0,
    sirenTimer: 0,
    sirenHigh: false,
  };
}

function ensureAudio(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 60;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
  } catch {
    audio.ctx = null;
  }
  return audio.ctx;
}

export function resumeAudio(audio) {
  const ctx = ensureAudio(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.engineGain) audio.engineGain.gain.value = muted ? 0 : 0.05;
}

export function updateEngineSound(audio, speed, topSpeed, inCar) {
  const ctx = ensureAudio(audio);
  if (!ctx || !audio.engineOsc || !audio.engineGain) return;
  if (audio.muted || !inCar) {
    audio.engineGain.gain.value = 0;
    return;
  }
  const ratio = Math.min(1, Math.abs(speed) / Math.max(1, topSpeed));
  audio.engineOsc.frequency.value = 55 + ratio * 165;
  audio.engineGain.gain.value = 0.035 + ratio * 0.03;
}

function blip(audio, freq, dur, type, gain) {
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type ?? 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain ?? 0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function noiseBurst(audio, dur, filterFreq, gain) {
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
}

export function playShot(audio) {
  noiseBurst(audio, 0.12, 1800, 0.25);
}

export function playPickup(audio) {
  blip(audio, 880, 0.12, 'sine', 0.14);
  setTimeout(() => blip(audio, 1320, 0.16, 'sine', 0.12), 90);
}

export function playMissionComplete(audio) {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => setTimeout(() => blip(audio, f, 0.22, 'triangle', 0.16), i * 110));
}

export function playBusted(audio) {
  blip(audio, 220, 0.5, 'sawtooth', 0.14);
  setTimeout(() => blip(audio, 165, 0.6, 'sawtooth', 0.14), 200);
}

export function playCrash(audio) {
  noiseBurst(audio, 0.25, 500, 0.3);
}

export function updateSiren(audio, wantedStars, dt) {
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted || wantedStars === 0) return;
  audio.sirenTimer -= dt;
  if (audio.sirenTimer <= 0) {
    audio.sirenTimer = 0.45;
    audio.sirenHigh = !audio.sirenHigh;
    blip(audio, audio.sirenHigh ? 950 : 700, 0.4, 'sine', 0.045);
  }
}

// A lazy bassline: A minor walk, one note per beat, quiet under the action.
const BASSLINE = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];

export function updateMusic(audio, dt) {
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted) return;
  audio.musicTimer -= dt;
  if (audio.musicTimer <= 0) {
    audio.musicTimer = 0.42;
    const f = BASSLINE[audio.musicStep % BASSLINE.length];
    audio.musicStep++;
    blip(audio, f, 0.38, 'triangle', 0.05);
  }
}
