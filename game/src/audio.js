// Synthesized sound for Solmar Bay — WebAudio only, no audio files.
// Engine hum, two-tone sirens, gunshots, pickup chimes and a looping bass
// line are all built from oscillators and filtered noise. Everything is
// guarded: if the browser has no AudioContext (or it is blocked), the game
// plays silent and never throws.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.muted = false;
    this.started = false;
  }

  // Must be called from a user gesture at least once (Enter on the title).
  ensure() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.started = true;
      this._startEngine();
      this._startMusic();
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  // speedRatio 0..1, on = player is driving.
  setEngine(speedRatio, on) {
    if (!this.engineOsc || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const target = on ? 0.045 + speedRatio * 0.05 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speedRatio * 130, t, 0.1);
  }

  _startSiren() {
    if (this.sirenOsc) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    // Two-tone wail: alternate 720 / 950 Hz every 350 ms.
    let high = false;
    this._sirenInterval = setInterval(() => {
      if (!this.sirenOsc) return;
      high = !high;
      this.sirenOsc.frequency.setTargetAtTime(high ? 950 : 720, this.ctx.currentTime, 0.05);
    }, 350);
  }

  setSiren(on) {
    if (!this.ctx) return;
    if (on) {
      this._startSiren();
      this.sirenGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.2);
    } else if (this.sirenGain) {
      this.sirenGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.2);
    }
  }

  _noiseBurst(duration, filterFreq, gain) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start();
  }

  gunshot() {
    this._noiseBurst(0.14, 900, 0.5);
  }
  punch() {
    this._noiseBurst(0.07, 300, 0.35);
  }
  crash() {
    this._noiseBurst(0.3, 220, 0.6);
  }
  skid() {
    this._noiseBurst(0.18, 1400, 0.12);
  }

  _tone(freq, duration, type, gain, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  chime() {
    this._tone(880, 0.16, 'sine', 0.25);
    this._tone(1318, 0.28, 'sine', 0.22, 0.09);
  }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.22, i * 0.11));
  }
  busted() {
    [392, 311, 233].forEach((f, i) => this._tone(f, 0.4, 'sawtooth', 0.18, i * 0.16));
  }
  wasted() {
    [330, 262, 196, 131].forEach((f, i) => this._tone(f, 0.5, 'sawtooth', 0.2, i * 0.18));
  }
  checkpoint() {
    this._tone(1046, 0.12, 'square', 0.16);
    this._tone(1568, 0.2, 'square', 0.14, 0.08);
  }

  // A lazy dusk-drive bass loop: Am – F – C – G roots with a soft pluck on
  // top, stepped every 300 ms. Quiet enough to sit under the engine.
  _startMusic() {
    const roots = [110, 87.3, 130.8, 98];
    const plucks = [220, 261.6, 329.6, 392, 440, 523.2];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const bar = Math.floor(this.musicStep / 4) % 4;
      const step = this.musicStep % 4;
      if (step === 0) this._tone(roots[bar], 0.55, 'triangle', 0.16);
      if (step === 2) this._tone(plucks[(bar * 2 + step) % plucks.length], 0.22, 'sine', 0.07);
      this.musicStep += 1;
    }, 300);
  }

  stop() {
    if (this._sirenInterval) clearInterval(this._sirenInterval);
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.started = false;
  }
}
