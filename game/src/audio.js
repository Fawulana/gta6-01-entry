// Synthesized sound: every effect and the little bassline are built from
// WebAudio oscillators and noise, so the game ships no audio files at all.
// Audio starts on the first user gesture, as browsers require.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.musicOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(vol || 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = this.ctx.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
  }

  shoot() { this.noise(0.12, 0.5, 2600); this.tone(180, 0.08, 'square', 0.25, 60); }
  punch() { this.noise(0.08, 0.3, 700); }
  pickup() { this.tone(660, 0.09, 'sine', 0.25); this.tone(990, 0.14, 'sine', 0.22); }
  cash() { this.tone(880, 0.08, 'triangle', 0.25); setTimeout(() => this.tone(1320, 0.12, 'triangle', 0.25), 70); }
  crash() { this.noise(0.25, 0.5, 500); this.tone(90, 0.2, 'sawtooth', 0.3, 40); }
  sirenBlip() { this.tone(950, 0.16, 'sine', 0.14, 1400); }
  missionStart() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.28), i * 110)); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.3), i * 120)); }
  fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.18), i * 140)); }
  door() { this.tone(220, 0.07, 'square', 0.15, 140); }
  engineStart() { this.tone(60, 0.3, 'sawtooth', 0.2, 120); }

  // A looping engine hum whose pitch follows the car's speed.
  engine(speedRatio) {
    if (!this.ctx || this.muted) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const target = speedRatio > 0.02 ? 0.05 + speedRatio * 0.06 : 0;
    this.engineOsc.frequency.setTargetAtTime(55 + speedRatio * 130, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  // A lazy two-bar bassline that plays while driving, stepped from the game loop.
  musicTick(dt, driving) {
    if (!this.ctx || this.muted || !driving) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.21;
    const bass = [55, 0, 55, 65.4, 0, 55, 49, 58.3];
    const note = bass[this.musicStep % bass.length];
    this.musicStep += 1;
    if (note) this.tone(note, 0.18, 'triangle', 0.12);
  }
}
