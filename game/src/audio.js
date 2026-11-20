// Synthesized sound only: WebAudio oscillators and noise, no audio files and
// no network. Everything is a no-op until ensureAudio() runs from a user
// gesture (browsers require it); screenshot scenes never call it.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;
let sirenOsc = null;
let musicTimer = null;
let musicStep = 0;
let muted = false;

const MUSIC_BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 73.42, 65.41, 49];
const MUSIC_LEAD = [220, 0, 261.63, 329.63, 0, 261.63, 220, 0, 196, 0, 220, 246.94, 261.63, 0, 246.94, 220];

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(ctx.destination);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  } catch {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.45, ctx.currentTime, 0.05);
}
export function isMuted() { return muted; }

/** Engine hum follows the player's speed (0..1). Call every frame while driving. */
export function setEngine(speed01, active) {
  if (!ctx || !engineOsc) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(55 + 150 * speed01, t, 0.08);
  engineGain.gain.setTargetAtTime(active ? 0.035 + 0.05 * speed01 : 0, t, 0.1);
}

function blip(freq, dur, type, vol, when = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
}

export function playShot() { noiseBurst(0.12, 0.5, 2400); blip(180, 0.08, 'square', 0.18); }
export function playPickup() { blip(660, 0.09, 'sine', 0.3); blip(990, 0.14, 'sine', 0.3, 0.08); }
/** Stash chime: a rising three-note arpeggio when a hidden chest is found. */
export function playStash() {
  blip(784, 0.1, 'sine', 0.3);
  blip(1046.5, 0.1, 'sine', 0.3, 0.09);
  blip(1318.5, 0.22, 'sine', 0.32, 0.18);
}
/** Race countdown beep: one short high blip for the start and each final second. */
export function playRaceBeep() { blip(880, 0.09, 'square', 0.22); blip(1320, 0.06, 'square', 0.14, 0.05); }
export function playCrash() { noiseBurst(0.3, 0.55, 700); }
export function playBusted() { blip(392, 0.2, 'triangle', 0.3); blip(311, 0.35, 'triangle', 0.3, 0.18); }
export function playMissionDone() {
  blip(523.25, 0.12, 'triangle', 0.3);
  blip(659.25, 0.12, 'triangle', 0.3, 0.11);
  blip(783.99, 0.25, 'triangle', 0.32, 0.22);
}
export function playClick() { blip(440, 0.05, 'square', 0.12); }

/** Two-tone police siren while any cop is chasing. */
export function setSiren(on) {
  if (!ctx) return;
  if (on && !sirenTimer) {
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 720;
    const g = ctx.createGain();
    g.gain.value = 0.045;
    sirenOsc.connect(g);
    g.connect(master);
    sirenOsc.start();
    let high = true;
    sirenTimer = window.setInterval(() => {
      if (!sirenOsc) return;
      high = !high;
      sirenOsc.frequency.setTargetAtTime(high ? 950 : 720, ctx.currentTime, 0.05);
    }, 420);
  } else if (!on && sirenTimer) {
    window.clearInterval(sirenTimer);
    sirenTimer = null;
    if (sirenOsc) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; }
  }
}

/** A slow sun-soaked bass + lead loop, one step every 240 ms. */
export function startMusic() {
  if (!ctx || musicTimer) return;
  musicTimer = window.setInterval(() => {
    if (!ctx || muted) return;
    const bass = MUSIC_BASS[musicStep % MUSIC_BASS.length];
    const lead = MUSIC_LEAD[musicStep % MUSIC_LEAD.length];
    if (bass) blip(bass, 0.22, 'triangle', 0.22);
    if (lead && musicStep % 2 === 0) blip(lead, 0.2, 'sine', 0.07);
    musicStep += 1;
  }, 240);
}
export function stopMusic() {
  if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
}
