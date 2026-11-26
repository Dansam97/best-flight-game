// Canyon Courier's sound: a tiny WebAudio synth, no audio files. The engine
// is a sawtooth through a low-pass filter whose pitch follows the airspeed;
// rings chime, levels arpeggiate and a crash is a burst of noise over a low
// thump. Everything is guarded: with no AudioContext the game stays silent.

export function createAudio() {
  let ctx = null;
  let engine = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 70;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      engine = { osc, gain };
      return true;
    } catch {
      return false;
    }
  }

  function setEngine(speed, throttle, running) {
    if (!engine) return;
    const t = ctx.currentTime;
    engine.osc.frequency.setTargetAtTime(52 + speed * 1.8, t, 0.12);
    engine.gain.gain.setTargetAtTime(!muted && running ? 0.014 + throttle * 0.034 : 0, t, 0.12);
  }

  function blip(freq, delay = 0, dur = 0.12, type = 'sine', vol = 0.1) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* a missed note is not an error worth surfacing */
    }
  }

  function ring(threaded) {
    blip(880, 0, 0.12, 'sine', 0.11);
    blip(1318, 0.07, 0.14, 'sine', 0.1);
    if (threaded) blip(1760, 0.15, 0.18, 'sine', 0.09);
  }

  function level() {
    blip(660, 0, 0.1, 'square', 0.05);
    blip(880, 0.06, 0.1, 'square', 0.05);
    blip(1108, 0.12, 0.16, 'square', 0.05);
  }

  function crash() {
    if (!ctx || muted) return;
    try {
      const dur = 0.45;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.22;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      blip(64, 0, 0.35, 'triangle', 0.2);
    } catch {
      /* silent crash */
    }
  }

  function toggleMute() {
    muted = !muted;
    if (engine) engine.gain.gain.value = 0;
    return muted;
  }

  return {
    ensure,
    setEngine,
    ring,
    level,
    crash,
    toggleMute,
    get muted() {
      return muted;
    },
  };
}
