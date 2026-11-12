/**
 * A tiny synthesiser for the site's sound design. Everything is generated
 * with WebAudio (no files): paper tears, whooshes on cuts, key clicks, the
 * shockwave thump, game pops and buzzes, and an ambient drone whose filter
 * opens with scroll speed. Muted by default; the choice is remembered.
 */

const STORAGE_KEY = "qwq-sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let drone: { filter: BiquadFilterNode; gain: GainNode; stop: () => void } | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

export const isSoundOn = () => enabled;

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Reads the saved preference; audio itself waits for a user gesture. */
export function initSound() {
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {}
  listeners.forEach((fn) => fn(enabled));
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(comp).connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {}
  if (on) {
    const c = ensure();
    void c?.resume();
    startDrone();
    play("boot");
  } else {
    stopDrone();
  }
  listeners.forEach((fn) => fn(on));
}

/** Resume a suspended context on the first gesture after a reload with sound on. */
export function wakeSound() {
  if (!enabled) return;
  const c = ensure();
  if (c?.state === "suspended") void c.resume();
  if (!drone) startDrone();
}

function env(gain: GainNode, t: number, attack: number, peak: number, release: number) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(type: OscillatorType, from: number, to: number, dur: number, peak: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  env(g, t, 0.005, peak, dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function hiss(dur: number, peak: number, filter: { type: BiquadFilterType; from: number; to: number; q?: number }, crackle = false) {
  if (!ctx || !master || !noise) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = filter.type;
  f.Q.value = filter.q ?? 1;
  f.frequency.setValueAtTime(filter.from, t);
  f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
  const g = ctx.createGain();
  if (crackle) {
    // Paper fibres giving way: a burst of irregular amplitude steps.
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 40; i++) {
      g.gain.setValueAtTime(Math.random() * peak * (1 - i / 40), t + (i / 40) * dur);
    }
    g.gain.setValueAtTime(0.0001, t + dur);
  } else {
    env(g, t, dur * 0.25, peak, dur * 0.75);
  }
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

const SOUNDS: Record<string, (intensity: number) => void> = {
  tick: () => tone("square", 1900, 1500, 0.02, 0.05),
  key: () => {
    hiss(0.03, 0.12, { type: "highpass", from: 2500, to: 4000 });
    tone("sine", 160, 90, 0.04, 0.06);
  },
  whoosh: (i) => hiss(0.45, 0.22 * i, { type: "bandpass", from: 300, to: 3200, q: 1.5 }),
  tear: () => hiss(0.9, 0.35, { type: "bandpass", from: 1400, to: 3800, q: 0.8 }, true),
  shock: () => {
    tone("sine", 140, 38, 0.5, 0.35);
    hiss(0.25, 0.18, { type: "lowpass", from: 2000, to: 200 });
  },
  pop: () => {
    tone("sine", 620, 1300, 0.08, 0.2);
    tone("square", 2400, 2400, 0.015, 0.04);
  },
  buzz: () => tone("sawtooth", 95, 70, 0.28, 0.16),
  quack: () => {
    tone("sawtooth", 560, 360, 0.11, 0.12);
    tone("square", 1100, 700, 0.08, 0.04);
    tone("sawtooth", 520, 330, 0.12, 0.1, 0.14);
  },
  pen: () => hiss(0.18, 0.06, { type: "lowpass", from: 1800, to: 900 }),
  boot: () => [0, 0.08, 0.16].forEach((d, k) => tone("square", 660 * (1 + k * 0.5), 660 * (1 + k * 0.5), 0.05, 0.05, d)),
  party: () =>
    [261.6, 329.6, 392, 523.3, 392, 523.3, 659.3, 784].forEach((f, k) => tone("square", f, f, 0.09, 0.07, k * 0.1)),
};

export function play(name: string, intensity = 1) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  SOUNDS[name]?.(intensity);
}

function startDrone() {
  if (!ctx || !master || drone) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  filter.Q.value = 6;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
  const oscs = [55, 82.41, 110.5].map((f, i) => {
    const o = ctx!.createOscillator();
    o.type = i === 1 ? "triangle" : "sawtooth";
    o.frequency.value = f;
    o.detune.value = (i - 1) * 7;
    o.connect(filter);
    o.start();
    return o;
  });
  filter.connect(gain).connect(master);
  drone = {
    filter,
    gain,
    stop: () => {
      const t = ctx!.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      oscs.forEach((o) => o.stop(t + 0.45));
    },
  };
}

function stopDrone() {
  drone?.stop();
  drone = null;
}

/** Opens the drone's filter with scroll speed (call every frame; cheap). */
export function setAmbientSpeed(speed: number) {
  if (!drone || !ctx) return;
  drone.filter.frequency.setTargetAtTime(220 + speed * 2400, ctx.currentTime, 0.1);
}
