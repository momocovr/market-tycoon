/** Tiny WebAudio synth so the game needs no audio files. */
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slide = 1) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), a.currentTime + at + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.02);
}

export const sfx = {
  coin() { tone(1046, 0.08, 'square', 0.05); tone(1568, 0.14, 'square', 0.05, 0.07); },
  place() { tone(180, 0.12, 'triangle', 0.12, 0, 0.5); tone(660, 0.06, 'sine', 0.06, 0.02); },
  remove() { tone(400, 0.15, 'sawtooth', 0.05, 0, 0.4); },
  unlock() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.09)); },
  unhappy() { tone(220, 0.2, 'sawtooth', 0.05, 0, 0.7); },
  goal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, i * 0.1)); },
  deny() { tone(150, 0.1, 'square', 0.05); },
  toggleMute() { muted = !muted; return muted; },
  get muted() { return muted; },
};
