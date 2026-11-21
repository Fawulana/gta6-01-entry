// Synthesized sound only — no audio files. A WebAudio graph built on the first
// user gesture: an engine drone that follows speed, a two-tone siren while the
// police are close, one-shot effects (shots, crashes, pickups, jingles) and a
// low dusk-groove bass line with a kick and hats, scheduled a bar ahead.

export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let musicTimer = null;
  let muted = false;
  let bar = 0;
  let nextBarTime = 0;

  /** A minor-key dusk groove: root notes per bar, eighth-note pulse. */
  const BASS_LINE = [55, 55, 65.41, 55, 49, 55, 58.27, 65.41];
  const BAR_SECONDS = 1.9;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);

      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc2 = context.createOscillator();
      engineOsc2.type = 'square';
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();

      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenLfo = context.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.55;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 130;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenOsc.frequency.value = 820;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();

      nextBarTime = context.currentTime + 0.1;
      musicTimer = window.setInterval(scheduleMusic, 120);
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  function scheduleMusic() {
    if (!context || muted) return;
    while (nextBarTime < context.currentTime + 0.45) {
      const root = BASS_LINE[bar % BASS_LINE.length];
      const t0 = nextBarTime;
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const t = t0 + (eighth * BAR_SECONDS) / 8;
        // Kick on the beat.
        if (eighth % 2 === 0) {
          const kick = context.createOscillator();
          const kg = context.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(120, t);
          kick.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          kg.gain.setValueAtTime(0.5, t);
          kg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          kick.connect(kg);
          kg.connect(master);
          kick.start(t);
          kick.stop(t + 0.2);
        }
        // Bass note on the pulse.
        if (eighth % 2 === 1 || eighth === 0) {
          const bass = context.createOscillator();
          const bg = context.createGain();
          bass.type = 'triangle';
          bass.frequency.value = eighth === 0 ? root : root * 2;
          bg.gain.setValueAtTime(0.16, t);
          bg.gain.exponentialRampToValueAtTime(0.001, t + BAR_SECONDS / 8);
          bass.connect(bg);
          bg.connect(master);
          bass.start(t);
          bass.stop(t + BAR_SECONDS / 8 + 0.02);
        }
        // Hat tick.
        const hat = context.createBufferSource();
        const hatBuffer = context.createBuffer(1, 1200, context.sampleRate);
        const data = hatBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        hat.buffer = hatBuffer;
        const hg = context.createGain();
        hg.gain.setValueAtTime(eighth % 2 === 0 ? 0.05 : 0.09, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        hat.connect(hg);
        hg.connect(master);
        hat.start(t);
      }
      bar += 1;
      nextBarTime += BAR_SECONDS;
    }
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!context) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function blip(freq, duration, volume, type) {
    if (!context) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** speedRatio 0..1, inCar true while driving. */
    engine(speedRatio, inCar) {
      if (!context) return;
      const target = inCar ? 0.05 + speedRatio * 0.075 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.08);
      const freq = 52 + speedRatio * 165;
      engineOsc.frequency.setTargetAtTime(freq, context.currentTime, 0.06);
      engineOsc2.frequency.setTargetAtTime(freq * 1.5 + 3, context.currentTime, 0.06);
      engineFilter.frequency.setTargetAtTime(380 + speedRatio * 900, context.currentTime, 0.1);
    },
    siren(on) {
      if (!context) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, context.currentTime, 0.2);
    },
    shoot() {
      noiseBurst(0.14, 0.5, 2600);
      blip(180, 0.08, 0.25, 'square');
    },
    punch() {
      noiseBurst(0.09, 0.35, 900);
    },
    crash(strength) {
      noiseBurst(0.25, Math.min(0.7, 0.25 + strength * 0.5), 500);
      blip(70, 0.22, 0.4, 'sine');
    },
    explosion() {
      noiseBurst(0.7, 0.8, 300);
      blip(55, 0.6, 0.6, 'sine');
    },
    pickup() {
      blip(880, 0.09, 0.25);
      window.setTimeout(() => blip(1318, 0.14, 0.25), 70);
    },
    cash() {
      blip(1046, 0.07, 0.22);
      window.setTimeout(() => blip(1568, 0.12, 0.22), 60);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        window.setTimeout(() => blip(freq, 0.22, 0.28), i * 110);
      });
    },
    busted() {
      [392, 311, 233].forEach((freq, i) => {
        window.setTimeout(() => blip(freq, 0.3, 0.25, 'triangle'), i * 180);
      });
    },
    denied() {
      blip(140, 0.18, 0.3, 'square');
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
