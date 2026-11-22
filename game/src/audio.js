// Palmetto Bay — fully synthesized WebAudio: no audio files at all.
// Engine hum follows speed, sirens wail while wanted, and every action
// has a short synthesized blip. Three radio stations change the bassline.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sirenTimer = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.station = 0;
    this.stations = ['BAY FM', 'PALMETTO 98', 'STATIC 107'];
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Audio is best-effort; a failed blip must never break the game.
    }
  }

  _noise(dur, vol, low) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low || 1200;
      const gain = this.ctx.createGain();
      gain.gain.value = vol || 0.2;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch {
      // Best effort only.
    }
  }

  engine(speedRatio) {
    if (!this.ctx || !this.engineOsc) return;
    try {
      this.engineOsc.frequency.value = 50 + speedRatio * 130;
      this.engineGain.gain.value = this.muted ? 0 : speedRatio * 0.05;
    } catch {
      // Ignore.
    }
  }

  shoot() { this._noise(0.14, 0.3, 2400); this._tone(160, 0.1, 'square', 0.1, 60); }
  punch() { this._noise(0.08, 0.2, 700); }
  crash() { this._noise(0.25, 0.3, 500); }
  door() { this._tone(220, 0.08, 'triangle', 0.12, 140); }
  engineStart() { this._tone(70, 0.5, 'sawtooth', 0.1, 180); }
  pickup() { this._tone(660, 0.12, 'sine', 0.14, 990); }
  cash() { this._tone(880, 0.1, 'sine', 0.14); this._tone(1320, 0.16, 'sine', 0.12); }
  missionStart() { this._tone(440, 0.14, 'square', 0.1); this._tone(660, 0.2, 'square', 0.1); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.22, 'triangle', 0.14), i * 110);
    });
  }
  fail() { this._tone(330, 0.4, 'sawtooth', 0.12, 110); }
  sirenBlip() {
    this._tone(700, 0.32, 'sine', 0.06, 1100);
    setTimeout(() => this._tone(1100, 0.32, 'sine', 0.06, 700), 340);
  }
  nextStation() {
    this.station = (this.station + 1) % this.stations.length;
    this._tone(990, 0.08, 'sine', 0.1);
    return this.stations[this.station];
  }

  // A simple driving bassline; the root note shifts per station, and a
  // high-hat tick lands on every fourth step while the car is moving.
  musicTick(dt, driving) {
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.24;
    if (!driving) return;
    const roots = [55, 65.4, 49];
    const root = roots[this.station];
    const pattern = [0, 0, 7, 0, 10, 0, 7, 5];
    const semi = pattern[this.musicStep % pattern.length];
    this.musicStep += 1;
    this._tone(root * Math.pow(2, semi / 12), 0.2, 'triangle', 0.05);
    if (this.musicStep % 4 === 0) this._tone(root * 4, 0.08, 'sine', 0.04);
  }
}
