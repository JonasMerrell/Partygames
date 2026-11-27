// Tread Carefully: chiptune sound effects (synthesized) and the music tracks.
// Both follow the TV's mute button and its music / effects sliders.
import * as audio from '/sdk/audio.js';

export function createSound(ctx) {
  let ac = null, bus = null, noise = null;
  const last = {};
  function ready() {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        bus = ac.createGain(); bus.connect(ac.destination);
        noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      bus.gain.value = audio.isMuted() ? 0 : audio.getSfxVol() * 0.55;
      return ac.state === 'running';
    } catch { return false; }
  }
  function tone(type, f0, f1, dur, vol, t = 0) {
    const t0 = ac.currentTime + 0.005 + t;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function hiss(dur, vol, from, to, t = 0, type = 'lowpass') {
    const t0 = ac.currentTime + 0.005 + t;
    const s = ac.createBufferSource(); s.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const SFX = {
    fire: () => { tone('square', 520, 180, 0.08, 0.25); hiss(0.06, 0.25, 3000, 800); },
    rocket: () => { hiss(0.35, 0.35, 1200, 4000, 0, 'bandpass'); tone('sawtooth', 200, 90, 0.2, 0.15); },
    spread: () => { for (let i = 0; i < 3; i++) tone('square', 560 - i * 60, 200, 0.06, 0.18, i * 0.025); },
    laser: () => { tone('sawtooth', 1800, 140, 0.3, 0.22); tone('square', 900, 70, 0.3, 0.1); },
    homing: () => { tone('triangle', 300, 900, 0.25, 0.3); tone('square', 600, 1800, 0.25, 0.06); },
    blaster: () => { tone('square', 240, 90, 0.14, 0.3); hiss(0.12, 0.3, 1500, 300); },
    bounce: () => tone('square', 1400, 1100, 0.03, 0.1),
    fizz: () => hiss(0.08, 0.12, 2500, 800),
    clash: () => { tone('square', 900, 300, 0.07, 0.2); hiss(0.07, 0.2, 4000, 1000); },
    boom: () => { hiss(0.5, 0.7, 1600, 60); tone('triangle', 120, 30, 0.45, 0.6); },
    bigboom: () => { hiss(0.7, 0.8, 2000, 50); tone('triangle', 100, 25, 0.6, 0.7); tone('square', 60, 30, 0.3, 0.2); },
    kill: () => { tone('square', 660, 110, 0.4, 0.25); hiss(0.4, 0.4, 1200, 100); },
    crate: () => { hiss(0.2, 0.4, 900, 200); tone('square', 160, 90, 0.12, 0.2); },
    crack: () => tone('square', 240, 160, 0.05, 0.18),
    pickup: () => { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.07, 0.16, i * 0.05)); },
    item: () => { tone('triangle', 1568, 1568, 0.06, 0.12); tone('triangle', 2093, 2093, 0.08, 0.1, 0.06); },
    shield: () => { tone('triangle', 1200, 300, 0.25, 0.3); tone('square', 2400, 600, 0.15, 0.06); },
    tele: () => { tone('sine', 300, 2400, 0.22, 0.3); tone('square', 150, 1200, 0.22, 0.05); },
    mine: () => { tone('square', 200, 200, 0.04, 0.2); tone('square', 300, 300, 0.04, 0.15, 0.06); },
    spawn: () => { [392, 523, 659].forEach((f, i) => tone('triangle', f, f, 0.08, 0.2, i * 0.06)); },
    hill: () => { tone('square', 784, 784, 0.1, 0.15); tone('square', 988, 988, 0.15, 0.15, 0.1); },
    tick: () => tone('triangle', 1760, 1760, 0.03, 0.08),
    count: () => tone('square', 440, 440, 0.15, 0.25),
    go: () => { tone('square', 880, 880, 0.35, 0.3); tone('square', 1320, 1320, 0.35, 0.12); },
    win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, 0.14, 0.2, i * 0.11)); },
    round: () => { [392, 494, 587, 784].forEach((f, i) => tone('square', f, f, 0.12, 0.2, i * 0.09)); },
  };
  const GAP = { bounce: 0.045, fire: 0.03, tick: 0.12, crack: 0.05, fizz: 0.06, tele: 0.1 };
  return {
    play(name) {
      if (!SFX[name] || !ready()) return;
      const now = ac.currentTime;
      if (last[name] && now - last[name] < (GAP[name] || 0.02)) return;
      last[name] = now;
      try { SFX[name](); } catch {}
    },
    warm: ready,
  };
}

// Looping music from the game's audio folder.
export function createMusic(ctx) {
  let el = null, which = null;
  const level = () => (audio.isMuted() ? 0 : audio.getMusicVol() * 0.7);
  const timer = setInterval(() => { if (el) el.volume = level(); }, 250);
  return {
    play(name) {
      if (which === name) return;
      which = name;
      if (el) { el.pause(); el = null; }
      if (!name) return;
      try {
        el = new Audio(ctx.asset(`audio/${name}.ogg`));
        el.loop = true; el.volume = level();
        el.play().catch(() => {});
      } catch {}
    },
    stop() { clearInterval(timer); if (el) el.pause(); el = null; which = null; },
  };
}
