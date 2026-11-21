// Synthesized WebAudio: no audio files, every sound is built live.
// Engine hum follows speed, sirens wail, gunshots crack, pickups chime, and a
// low bass loop ("Azura Nights") plays under the game. M toggles mute.
export function createAudio() {
  let ctx = null, master = null, muted = false, engineOsc = null, engineGain = null, musicTimer = null;
  // Three in-game radio stations, all synthesized: different bass lines and
  // tempos, switched with C while driving. The HUD feed names the station.
  const STATIONS = [
    { name: 'AZURA FM — Dusk Drive', line: [55, 0, 55, 65.4, 49, 0, 58.3, 73.4], tempo: 300 },
    { name: 'TIDE 101 — Street Bass', line: [41.2, 41.2, 0, 49, 36.7, 0, 43.7, 55], tempo: 240 },
    { name: 'PALM WAVE — Sunset Synth', line: [65.4, 82.4, 98, 82.4, 73.4, 98, 110, 82.4], tempo: 360 },
  ];
  let station = 0;
  const bassLine = STATIONS[0].line;
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      startMusic();
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!live() || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq) {
    if (!live() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1800;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  function startMusic() {
    if (musicTimer) return;
    let step = 0;
    musicTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      const st = STATIONS[station];
      const f = st.line[step % st.line.length];
      if (f) tone(f, 0.42, 'triangle', 0.10);
      if (step % 4 === 2) tone(220, 0.1, 'sine', 0.03);
      step++;
    }, 300);
  }
  // Live only once the context is actually running (after a user gesture
  // resumes it). Scheduling oscillators while suspended spams Chrome's
  // autoplay warning, so every sound path checks this first.
  function live() { return !!(ctx && ctx.state === 'running'); }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    cycleStation() {
      station = (station + 1) % STATIONS.length;
      return STATIONS[station].name;
    },
    stationName() { return STATIONS[station].name; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    get muted() { return muted; },
    setEngine(speed01, on) {
      if (!live()) return;
      engineGain.gain.value = on ? 0.02 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 48 + speed01 * 130;
    },
    shot() { noise(0.14, 0.5, 2600); tone(180, 0.09, 'square', 0.18, 60); },
    shotgun() { noise(0.3, 0.7, 1400); tone(120, 0.2, 'square', 0.25, 40); },
    punch() { noise(0.08, 0.35, 900); },
    siren() { tone(720, 0.5, 'sine', 0.05, 980); },
    pickup() { tone(660, 0.12, 'sine', 0.16); setTimeout(() => tone(990, 0.18, 'sine', 0.16), 90); },
    cash() { tone(880, 0.1, 'sine', 0.15); setTimeout(() => tone(1320, 0.22, 'sine', 0.15), 80); },
    crash() { noise(0.25, 0.5, 700); },
    busted() { tone(440, 0.4, 'sawtooth', 0.15, 220); tone(330, 0.6, 'sawtooth', 0.15, 165); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.16), i * 110)); },
    fail() { [392, 311, 233].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.12), i * 130)); },
    horn() { tone(370, 0.18, 'square', 0.08); },
    radio() { tone(1046, 0.1, 'sine', 0.06); setTimeout(() => tone(784, 0.1, 'sine', 0.06), 100); },
  };
}
