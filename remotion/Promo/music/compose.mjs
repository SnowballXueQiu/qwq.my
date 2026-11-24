/**
 * The promo's soundtrack, synthesized from scratch: 120 BPM, A minor, 90 bars
 * (exactly three minutes), arranged on the same bar grid as the edit
 * (remotion/Promo/edit.ts). No samples, no bells: saws, noise and sines.
 *
 *   node remotion/Promo/music/compose.mjs  →  public/promo/bgm.wav (48 kHz, 24-bit stereo)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const BPM = 120;
const BEAT = (60 / BPM) * SR;
const BAR = BEAT * 4;
const STEP = BEAT / 4; // a 16th
const BARS = 90;
const N = BARS * BAR;

// ── Arrangement (bars), mirrored by the edit ────────────────────────────────
export const SECTIONS = {
  hook: [0, 4],
  draw: [4, 10],
  wake: [10, 16],
  tear: [16, 20],
  pano: [20, 30],
  tour: [30, 54],
  dual: [54, 62],
  lang: [62, 66],
  eggs: [66, 74],
  cta: [74, 86],
  end: [86, 90],
};
const CRASH_BAR = 69; // `sudo rm -rf /` lands here: tape stop, a bar of nothing
const inBars = (b, [a, z]) => b >= a && b < z;

// ── Buses ───────────────────────────────────────────────────────────────────
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const drums = bus();
const music = bus(); // ducked by the kick
const lead = bus();
const fx = bus();
const verbSend = bus();
const delaySend = bus();

function add(b, i, l, r = l) {
  if (i < 0 || i >= N) return;
  b.L[i] += l;
  b.R[i] += r;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const polyblep = (t, dt) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};
/** Band-limited saw, phase in [0,1). */
const saw = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt);
const square = (ph, dt, pw = 0.5) => {
  let v = ph < pw ? 1 : -1;
  v += polyblep(ph, dt);
  v -= polyblep((ph + 1 - pw) % 1, dt);
  return v;
};

/** TPT state-variable filter (lowpass / bandpass / highpass). */
class SVF {
  constructor() {
    this.ic1 = 0;
    this.ic2 = 0;
  }
  run(x, cutoff, q = 0.7) {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  }
}

// ── Harmony ─────────────────────────────────────────────────────────────────
// Am – F – C – G, one chord per bar; the breakdown leans on F – G – Am – Am.
const CHORDS = {
  Am: { bass: 33, pad: [57, 60, 64, 69], arp: [57, 60, 64, 69, 72] },
  F: { bass: 29, pad: [53, 57, 60, 65], arp: [53, 57, 60, 65, 69] },
  C: { bass: 36, pad: [55, 60, 64, 67], arp: [55, 60, 64, 67, 72] },
  G: { bass: 31, pad: [55, 59, 62, 67], arp: [55, 59, 62, 67, 71] },
  Em: { bass: 28, pad: [55, 59, 64, 67], arp: [52, 55, 59, 64, 67] },
  Dm: { bass: 38, pad: [53, 57, 62, 65], arp: [50, 53, 57, 62, 65] },
};
const MAIN = ["Am", "F", "C", "G"];
const SOFT = ["F", "G", "Am", "Am"];
const LIFT = ["F", "G", "Em", "Am"];
function chordAt(bar) {
  if (inBars(bar, SECTIONS.dual)) return CHORDS[SOFT[bar % 4]];
  if (inBars(bar, SECTIONS.draw)) return CHORDS[["Am", "F", "C", "G", "Dm", "G"][bar - 4]];
  if (inBars(bar, SECTIONS.end)) return CHORDS.Am;
  if (bar >= 82 && bar < 86) return CHORDS[LIFT[bar % 4]];
  return CHORDS[MAIN[bar % 4]];
}

// ── Instruments ─────────────────────────────────────────────────────────────
function kick(at, gain = 1) {
  const len = Math.floor(SR * 0.42);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 44 + 120 * Math.exp(-t * 32);
    ph += f / SR;
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7.5);
    const click = noise() * Math.exp(-t * 400) * 0.25;
    const v = Math.tanh((body * 1.6 + click) * 1.2) * 0.9 * gain;
    add(drums, at + i, v);
  }
}
const clapF = new SVF();
function clap(at, gain = 1) {
  const len = Math.floor(SR * 0.3);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // Three quick bursts then the tail: a hand clap, not a drum.
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 180) : 0), 0);
    const env = Math.min(bursts, 1.2) * 0.6 + Math.exp(-t * 16) * 0.5;
    const v = clapF.run(noise(), 1500, 1.4).bp * env * 0.9 * gain;
    add(drums, at + i, v * (0.9 + 0.1 * rand()), v);
    add(verbSend, at + i, v * 0.35);
  }
}
const snareF = new SVF();
function snare(at, gain = 1) {
  const len = Math.floor(SR * 0.22);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += 190 / SR;
    const tone = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 30) * 0.5;
    const nz = snareF.run(noise(), 4200, 0.8).hp * Math.exp(-t * 22) * 0.7;
    const v = (tone + nz) * gain;
    add(drums, at + i, v);
    add(verbSend, at + i, v * 0.2);
  }
}
const hatF = new SVF();
function hat(at, gain = 1, open = false, pan = 0.15) {
  const len = Math.floor(SR * (open ? 0.24 : 0.05));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (open ? 14 : 75));
    const v = hatF.run(noise(), 9000, 0.9).hp * env * 0.32 * gain;
    add(drums, at + i, v * (1 - pan), v * (1 + pan));
  }
}
const shakerF = new SVF();
function shaker(at, gain = 1) {
  const len = Math.floor(SR * 0.07);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * Math.min(t / 0.07, 1)) ** 2;
    const v = shakerF.run(noise(), 7000, 1.2).bp * env * 0.18 * gain;
    add(drums, at + i, v * 0.7, v * 1.2);
  }
}
/** Soft crash: long, dark filtered noise (a wash, not a ring). */
const crashF = new SVF();
function wash(at, gain = 1) {
  const len = Math.floor(SR * 2.4);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const v = crashF.run(noise(), 6500, 0.6).hp * Math.exp(-t * 1.6) * 0.22 * gain;
    add(fx, at + i, v * (0.8 + 0.4 * rand()), v * (0.8 + 0.4 * rand()));
    add(verbSend, at + i, v * 0.3);
  }
}
/** Sub drop for big moments. */
function impact(at, gain = 1) {
  const len = Math.floor(SR * 1.8);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (38 + 50 * Math.exp(-t * 6)) / SR;
    const v = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 2.2) * 0.75 * gain;
    add(fx, at + i, v);
  }
  const nf = new SVF();
  for (let i = 0; i < SR * 0.6; i++) {
    const t = i / SR;
    const v = nf.run(noise(), 900 * Math.exp(-t * 3) + 120, 0.7).lp * Math.exp(-t * 5) * 0.5 * gain;
    add(fx, at + i, v);
    add(verbSend, at + i, v * 0.4);
  }
}
/** Noise riser over [at, at+len), filter sweeping up, swelling in. */
function riser(at, len, gain = 1) {
  const f = new SVF();
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const cutoff = 300 * Math.pow(40, t);
    const nz = f.run(noise(), cutoff, 2.2).bp;
    ph += mtof(45 + 24 * t * t) / SR;
    const tone = saw(ph % 1, mtof(45 + 24 * t * t) / SR) * 0.08 * t;
    const env = Math.pow(t, 2.2) * gain;
    const v = (nz * 0.55 + tone) * env;
    add(fx, at + i, v * (1 - 0.3 * Math.sin(t * 40)), v * (1 + 0.3 * Math.sin(t * 40)));
    add(verbSend, at + i, v * 0.3);
  }
}
/** Reverse swell into a downbeat (a "suck" in), from filtered noise. */
function swellInto(at, len, gain = 1) {
  const f = new SVF();
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const v = f.run(noise(), 400 + 6000 * t * t, 0.8).lp * Math.pow(t, 3) * 0.5 * gain;
    add(fx, at - len + i, v);
  }
}

/** Detuned-saw pad, one chord, with slow attack. */
function pad(at, len, notes, { gain = 1, cutoff = 2200, attack = 0.4, release = 0.6, open = 0 } = {}) {
  const voices = [];
  for (const m of notes)
    for (const d of [-0.12, -0.05, 0.05, 0.12]) voices.push({ f: mtof(m + d), ph: rand(), pan: d * 5 });
  const fL = new SVF();
  const fR = new SVF();
  const total = len + Math.floor(release * SR);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const env = Math.min(t / attack, 1) * (i < len ? 1 : Math.exp(-((i - len) / SR) * (4 / release)));
    let l = 0;
    let r = 0;
    for (const v of voices) {
      v.ph = (v.ph + v.f / SR) % 1;
      const s = saw(v.ph, v.f / SR);
      l += s * (1 - v.pan * 0.5);
      r += s * (1 + v.pan * 0.5);
    }
    const c = cutoff * (1 + open * (i / total));
    const k = (0.05 / Math.sqrt(voices.length)) * env * gain;
    const yl = fL.run(l, c, 0.6).lp * k;
    const yr = fR.run(r, c, 0.6).lp * k;
    add(music, at + i, yl, yr);
    add(verbSend, at + i, yl * 0.5, yr * 0.5);
  }
}

/** Plucked square/saw for arps and the playful melody. */
function pluck(at, m, len, { gain = 1, bright = 1, pan = 0, wave = "square", send = 0.35 } = {}) {
  const f = mtof(m);
  const flt = new SVF();
  let ph = rand();
  const total = len + Math.floor(SR * 0.15);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    ph = (ph + f / SR) % 1;
    const s = wave === "square" ? square(ph, f / SR, 0.35) : saw(ph, f / SR);
    const env = Math.exp(-t * 9) * (i < len ? 1 : Math.exp(-((i - len) / SR) * 40));
    const cutoff = 400 + 5200 * bright * Math.exp(-t * 14);
    const v = flt.run(s, cutoff, 1.1).lp * env * 0.17 * gain;
    add(music, at + i, v * (1 - pan), v * (1 + pan));
    add(delaySend, at + i, v * send);
    add(verbSend, at + i, v * 0.2);
  }
}

/** Bass: saw + sub, short filter envelope. */
function bass(at, m, len, { gain = 1, bright = 1 } = {}) {
  const f = mtof(m);
  const flt = new SVF();
  let ph = 0;
  let sub = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph = (ph + f / SR) % 1;
    sub = (sub + f / 2 / SR) % 1;
    const s = saw(ph, f / SR) * 0.7 + Math.sin(2 * Math.PI * sub) * 0.45;
    const env = Math.min(t / 0.004, 1) * Math.min((len - i) / (SR * 0.01), 1);
    const cutoff = 180 + 1400 * bright * Math.exp(-t * 18);
    const v = Math.tanh(flt.run(s, cutoff, 0.9).lp * 1.6) * 0.34 * env * gain;
    add(music, at + i, v);
  }
}

/** Lead: two detuned saws + square an octave down, vibrato, glide-free. */
function leadNote(at, m, len, { gain = 1, octave = false } = {}) {
  const f0 = mtof(m);
  const flt = new SVF();
  let a = rand();
  let b = rand();
  let c = rand();
  const total = len + Math.floor(SR * 0.12);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const vib = 1 + 0.0045 * Math.sin(2 * Math.PI * 5.4 * t) * Math.min(t / 0.25, 1);
    const f = f0 * vib;
    a = (a + (f * 1.003) / SR) % 1;
    b = (b + (f * 0.997) / SR) % 1;
    c = (c + f / 2 / SR) % 1;
    let s = saw(a, f / SR) + saw(b, f / SR) + square(c, f / 2 / SR) * 0.5;
    if (octave) s += saw((a * 2) % 1, (2 * f) / SR) * 0.35;
    const env = Math.min(t / 0.01, 1) * (0.75 + 0.25 * Math.exp(-t * 6)) * (i < len ? 1 : Math.exp(-((i - len) / SR) * 30));
    const v = flt.run(s, 900 + 2600 * Math.exp(-t * 4) + 900, 0.9).lp * env * 0.1 * gain;
    add(lead, at + i, v * 0.95, v * 1.05);
    add(delaySend, at + i, v * 0.5);
    add(verbSend, at + i, v * 0.45);
  }
}

// ── Melodies (16th steps within 4 bars) ─────────────────────────────────────
const HOOK_A = [
  [0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 81, 4],
  [16, 79, 3], [19, 77, 1], [20, 76, 2], [22, 74, 2], [24, 72, 6], [30, 74, 2],
  [32, 76, 3], [35, 74, 1], [36, 72, 2], [38, 71, 2], [40, 72, 4], [44, 76, 4],
  [48, 74, 6], [54, 71, 2], [56, 67, 4], [60, 71, 4],
];
const HOOK_B = [
  [0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 84, 4],
  [16, 81, 3], [19, 79, 1], [20, 77, 2], [22, 76, 2], [24, 77, 4], [28, 81, 4],
  [32, 79, 4], [36, 76, 4], [40, 72, 4], [44, 76, 4],
  [48, 74, 4], [52, 76, 4], [56, 69, 8],
];
// The playful bit for the QwQ scene: short, bouncy, lots of rests.
const PLAY = [
  [0, 81, 1], [2, 76, 1], [4, 79, 1], [6, 81, 2], [10, 84, 1], [12, 83, 1], [14, 81, 1],
  [16, 77, 1], [18, 81, 1], [20, 84, 2], [24, 86, 1], [26, 84, 1], [28, 81, 2],
  [32, 79, 1], [34, 76, 1], [36, 79, 1], [38, 84, 2], [42, 83, 1], [44, 79, 2],
  [48, 79, 1], [50, 83, 1], [52, 86, 2], [56, 83, 1], [58, 79, 1], [60, 74, 2],
];

function playPhrase(startBar, phrase, fn) {
  for (const [st, m, l] of phrase) fn(startBar * BAR + st * STEP, m, l * STEP);
}

// ── Arrangement ─────────────────────────────────────────────────────────────
const at = (bar, beat = 0, step = 0) => Math.round(bar * BAR + beat * BEAT + step * STEP);

for (let bar = 0; bar < BARS; bar++) {
  const ch = chordAt(bar);
  const hook = inBars(bar, SECTIONS.hook);
  const draw = inBars(bar, SECTIONS.draw);
  const wake = inBars(bar, SECTIONS.wake);
  const tear = inBars(bar, SECTIONS.tear);
  const pano = inBars(bar, SECTIONS.pano);
  const tour = inBars(bar, SECTIONS.tour);
  const dual = inBars(bar, SECTIONS.dual);
  const lang = inBars(bar, SECTIONS.lang);
  const eggs = inBars(bar, SECTIONS.eggs);
  const cta = inBars(bar, SECTIONS.cta);
  const end = inBars(bar, SECTIONS.end);
  const full = hook || pano || tour || cta || (eggs && bar >= CRASH_BAR + 1) || (lang && bar >= 64) || (eggs && bar < CRASH_BAR);
  const silent = bar === CRASH_BAR;
  if (silent) continue;
  const lastOf4 = bar % 4 === 3;

  // Drums
  if (full) {
    for (let b = 0; b < 4; b++) kick(at(bar, b), 1);
    clap(at(bar, 1), 0.9);
    clap(at(bar, 3), 0.9);
    for (let b = 0; b < 4; b++) hat(at(bar, b, 2), 0.9, true);
    for (let s = 0; s < 16; s++) if (s % 4 !== 2) hat(at(bar, 0, s), s % 2 ? 0.45 : 0.3, false, s % 2 ? 0.25 : -0.2);
    if (lastOf4 && (tour || pano || cta)) for (let s = 12; s < 16; s++) snare(at(bar, 0, s), 0.35 + 0.15 * (s - 12));
  } else if (draw) {
    if (bar >= 6) for (let b = 0; b < 8; b++) hat(at(bar, b / 2), 0.25 + (b % 2) * 0.15, false);
    if (bar >= 8) kick(at(bar, 0), 0.55);
  } else if (wake) {
    kick(at(bar, 0), 0.95);
    kick(at(bar, 2), 0.85);
    if (bar % 2) kick(at(bar, 2, 2), 0.6);
    clap(at(bar, 1), 0.55);
    clap(at(bar, 3), 0.55);
    for (let s = 0; s < 16; s++) shaker(at(bar, 0, s), s % 2 ? 1 : 0.5);
  } else if (tear) {
    if (bar < 18) {
      for (let b = 0; b < 4; b++) kick(at(bar, b), 0.85);
      for (let b = 0; b < 4; b++) hat(at(bar, b, 2), 0.6, true);
    } else {
      // The roll: 8ths, then 16ths, then 32nds, louder all the way, then nothing.
      const div = bar === 18 ? 2 : 4;
      for (let i = 0; i < 4 * div; i++) {
        const tt = (bar - 18 + i / (4 * div)) / 2;
        if (bar === 19 && i >= 4 * div - 2) break;
        snare(at(bar, i / div), 0.25 + 0.6 * tt);
        if (bar === 19 && i >= 8) snare(at(bar, i / div + 1 / (2 * div)), 0.3 + 0.5 * tt);
      }
      kick(at(bar, 0), 0.8);
    }
  } else if (dual) {
    kick(at(bar, 0), 0.9);
    if (bar % 2) kick(at(bar, 2, 2), 0.6);
    snare(at(bar, 2), 0.75);
    for (let b = 0; b < 8; b++) hat(at(bar, b / 2), 0.25 + (b % 2) * 0.2);
  } else if (lang) {
    for (let b = 0; b < 4; b++) kick(at(bar, b), 0.9);
    for (let s = 0; s < 16; s++) hat(at(bar, 0, s), 0.2 + (s % 2) * 0.2);
    if (bar === 63) for (let s = 8; s < 16; s++) snare(at(bar, 0, s), 0.2 + 0.07 * (s - 8));
  } else if (end) {
    if (bar === 86) kick(at(bar, 0), 1);
  }

  // Bass
  if (full || (tear && bar < 18) || (lang && bar >= 63)) {
    // Rolling 8th-note offbeats with the root, octave pops on the last 8th.
    for (let e = 0; e < 8; e++) {
      const m = ch.bass + 12 + (e === 7 ? 12 : 0);
      bass(at(bar, e / 2) + (e % 2 === 0 ? STEP : 0), m, STEP * (e % 2 === 0 ? 1 : 2) - 200, { bright: pano || cta ? 1.2 : 1 });
    }
  } else if (wake) {
    bass(at(bar, 0), ch.bass + 12, BEAT * 0.9, { bright: 0.7 });
    bass(at(bar, 2), ch.bass + 12, BEAT * 0.9, { bright: 0.7 });
    bass(at(bar, 3, 2), ch.bass + 24, STEP * 2, { bright: 0.9 });
  } else if (dual) {
    bass(at(bar, 0), ch.bass + 12, BEAT * 1.8, { bright: 0.6 });
    bass(at(bar, 2, 2), ch.bass + 12, BEAT, { bright: 0.6 });
  } else if (draw && bar >= 8) {
    bass(at(bar, 0), ch.bass + 12, BAR * 0.95, { bright: 0.35, gain: 0.8 });
  }

  // Pads
  if (draw) pad(at(bar), BAR, ch.pad, { gain: 0.9, cutoff: 500 + (bar - 4) * 260, attack: 0.6 });
  else if (dual) pad(at(bar), BAR, ch.pad, { gain: 1, cutoff: 1500, attack: 0.3 });
  else if (end) {
    if (bar === 86) pad(at(bar), BAR * 3.5, [45, ...ch.pad, 76], { gain: 1.1, cutoff: 1800, attack: 0.05, release: 2.5 });
  } else if (full || tear || wake || lang) pad(at(bar), BAR, ch.pad, { gain: wake ? 0.5 : 0.75, cutoff: pano || cta ? 3000 : 2000, attack: 0.02, release: 0.2 });

  // Arps
  const arpOn = draw ? bar >= 5 : full || tear || dual || lang || end;
  if (arpOn) {
    const order = [0, 2, 1, 3, 2, 4, 3, 2];
    const bright = draw ? 0.25 + (bar - 5) * 0.12 : end ? Math.max(0.1, 0.6 - (bar - 86) * 0.15) : dual ? 0.5 : 0.85;
    const g = draw ? 0.7 : end ? Math.max(0, 0.8 - (bar - 86) * 0.22) : 0.8;
    for (let s = 0; s < 16; s++) {
      const m = ch.arp[order[s % 8]] + 12;
      pluck(at(bar, 0, s), m, STEP * 0.8, { gain: g * (s % 4 === 0 ? 1 : 0.7), bright, pan: s % 2 ? 0.35 : -0.35 });
    }
  }
}

// Melodies
for (let b = SECTIONS.wake[0]; b < SECTIONS.wake[1] - 2; b += 4) playPhrase(b, PLAY, (t, m, l) => pluck(t, m, l, { gain: 1.4, bright: 1.1, wave: "saw", send: 0.5 }));
playPhrase(14, PLAY.slice(0, 13), (t, m, l) => pluck(t, m, l, { gain: 1.4, bright: 1.1, wave: "saw", send: 0.5 }));
const hookAt = (bar, phrase, opts) => playPhrase(bar, phrase, (t, m, l) => leadNote(t, m, l, opts));
hookAt(0, HOOK_A);
for (const b of [20, 24]) hookAt(b, b === 20 ? HOOK_A : HOOK_B);
hookAt(28, HOOK_A.slice(0, 12));
for (const b of [38, 46]) hookAt(b, HOOK_A, { gain: 0.8 });
for (const b of [42, 50]) hookAt(b, HOOK_B, { gain: 0.8 });
hookAt(70, HOOK_A.slice(0, 12), { gain: 0.9 });
for (const b of [74, 78]) hookAt(b, b === 74 ? HOOK_A : HOOK_B, { octave: true, gain: 1.05 });
hookAt(82, HOOK_A, { octave: true, gain: 1.1 });

// Hits and transitions
for (const b of [0, 20, 30, 46, 70, 74, 82, 86]) wash(at(b), b === 20 || b === 74 ? 1.2 : 0.8);
for (const b of [0, 20, 70, 74, 86]) impact(at(b), b === 86 ? 1.1 : 1);
riser(at(16), 4 * BAR - BEAT, 1);
riser(at(72), 2 * BAR, 0.7);
riser(at(64), 2 * BAR, 0.55);
riser(at(84), 2 * BAR, 0.6);
for (const b of [4, 10, 30, 54, 62, 66]) swellInto(at(b), BEAT * 2, 0.8);
swellInto(at(CRASH_BAR + 1), BAR * 0.5, 1.2);

// ── Foley, placed by video frame (60 fps → 800 samples a frame) ─────────────
// Nothing tonal: the pen scratches, the mouse and the keys tick.
const FR = SR / 60;
const frameAt = (f) => Math.round(f * FR);
/** Paper scratch while the pen moves: band-limited noise with a jittery grain. */
function scratch(f0, f1, gain = 1) {
  const flt = new SVF();
  const a = frameAt(f0);
  const b = frameAt(f1);
  let grain = 0;
  for (let i = a; i < b; i++) {
    if (i % 400 === 0) grain = 0.4 + rand() * 0.6;
    const edge = Math.min((i - a) / (SR * 0.05), (b - i) / (SR * 0.05), 1);
    const v = flt.run(noise(), 2600 + 1400 * Math.sin(i / 900), 1.6).bp * grain * edge * 0.16 * gain;
    add(fx, i, v * 0.9, v * 1.1);
  }
}
/** A mouse click: two tiny clicks (down, up), filtered noise, no pitch. */
function click(f, gain = 1) {
  for (const [off, g] of [
    [0, 1],
    [frameAt(5), 0.55],
  ]) {
    const flt = new SVF();
    const at0 = frameAt(f) + off;
    for (let i = 0; i < SR * 0.025; i++) {
      const v = flt.run(noise(), 3200, 2.5).bp * Math.exp(-(i / SR) * 260) * 0.5 * g * gain;
      add(fx, at0 + i, v);
    }
  }
}
/** The site crashing: a short burst of crushed digital noise over a low thump (no pitch, no ring). */
function crash(f, gain = 1) {
  const at0 = frameAt(f);
  impact(at0, 0.7 * gain);
  const flt = new SVF();
  let held = 0;
  for (let i = 0; i < SR * 0.32; i++) {
    const t = i / SR;
    if (i % 24 === 0) held = Math.sign(noise()) * (0.5 + rand() * 0.5); // sample-and-hold at 2 kHz
    const v = flt.run(held, 2400, 0.9).lp * Math.exp(-t * 9) * 0.32 * gain;
    add(fx, at0 + i, v * (i % 960 < 480 ? 1 : 0.6), v * (i % 960 < 480 ? 0.6 : 1));
  }
}
/** A key on a mechanical keyboard: a soft thock plus a tick. */
function key(f, gain = 1) {
  const flt = new SVF();
  const at0 = frameAt(f);
  for (let i = 0; i < SR * 0.04; i++) {
    const t = i / SR;
    const v = (flt.run(noise(), 1800, 1.4).bp * Math.exp(-t * 180) * 0.45 + Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 90) * 0.12) * gain * (0.8 + 0.4 * rand());
    add(fx, at0 + i, v);
  }
}
{
  const DRAW = 4 * 120; // section starts, in frames (edit.ts)
  const WAKE = 10 * 120;
  const TEAR = 16 * 120;
  const EGGS = 66 * 120;
  const CTA = 74 * 120;
  // The pen drawing the sheet, the face, the title.
  scratch(DRAW + 6, DRAW + 170, 1);
  scratch(DRAW + 180, DRAW + 400, 0.9);
  scratch(DRAW + 400, DRAW + 540, 1);
  // Doodling the heart on the real page.
  scratch(TEAR + 62 + 10, TEAR + 62 + 200, 1.1); // held 62 frames (scenes.tsx TEAR_DELAY)
  // Poking QwQ: once, then five times fast.
  // The take starts 20 frames in (scenes.tsx WAKE_FROM).
  click(WAKE + 330 - 20);
  for (let k = 0; k < 7; k++) click(WAKE + 450 - 20 + k * 15, 0.9);
  // The terminal: the button, then the typing (see capture/shots.mjs).
  click(EGGS + 40);
  for (const [start, text] of [
    [80, "neofetch\n"],
    [200, "qwq\n"],
    [308, "sudo rm -rf /\n"],
  ])
    for (let i = 0; i < text.length; i++) key(EGGS + start + i * 4, text[i] === "\n" ? 1.3 : 0.9);
  // rm scrolling at 4×, then the crash (scenes.tsx CRASH_AT), alone in the silent bar.
  for (let f = 362; f < 400; f += 3) key(EGGS + f, 0.35);
  crash(EGGS + 400);
  // The overview button.
  click(EGGS + 480 + 10);
  // Star and Follow (scenes.tsx: GithubScene clickAt).
  click(CTA + 120 + 330, 1.1);
  click(CTA + 720 + 300, 1.1);
}

// ── Sidechain: the kick pumps the music bus ─────────────────────────────────
function duckAt(i) {
  const bar = Math.floor(i / BAR);
  if (!(inBars(bar, SECTIONS.hook) || inBars(bar, SECTIONS.pano) || inBars(bar, SECTIONS.tour) || inBars(bar, SECTIONS.cta) || inBars(bar, SECTIONS.eggs) || (bar >= 64 && bar < 66) || (bar >= 16 && bar < 18))) return 1;
  const t = ((i % BEAT) / SR);
  return 1 - 0.55 * Math.exp(-t * 11);
}

// ── Effects: ping-pong delay (dotted 8th) and a Freeverb-ish room ───────────
const out = bus();
{
  const d = Math.round(BEAT * 0.75);
  const bufL = new Float32Array(d);
  const bufR = new Float32Array(d);
  const hpL = new SVF();
  const hpR = new SVF();
  let j = 0;
  for (let i = 0; i < N; i++) {
    const yl = bufL[j];
    const yr = bufR[j];
    bufL[j] = hpL.run(delaySend.L[i] + yr * 0.42, 3500).lp;
    bufR[j] = hpR.run(delaySend.R[i] + yl * 0.42, 3500).lp;
    j = (j + 1) % d;
    out.L[i] += yl * 0.5;
    out.R[i] += yr * 0.5;
    verbSend.L[i] += yl * 0.2;
    verbSend.R[i] += yr * 0.2;
  }
}
{
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => Math.round((n * SR) / 44100));
  const aps = [556, 441, 341, 225].map((n) => Math.round((n * SR) / 44100));
  for (const [src, dst, spread] of [
    [verbSend.L, out.L, 0],
    [verbSend.R, out.R, 23],
  ]) {
    const cb = combs.map((n) => ({ buf: new Float32Array(n + spread), i: 0, store: 0 }));
    const ab = aps.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    const fb = 0.84;
    const damp = 0.3;
    for (let i = 0; i < N; i++) {
      const x = src[i] * 0.015;
      let y = 0;
      for (const c of cb) {
        const o = c.buf[c.i];
        c.store = o * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * fb;
        c.i = (c.i + 1) % c.buf.length;
        y += o;
      }
      for (const a of ab) {
        const o = a.buf[a.i];
        a.buf[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = o - y;
      }
      dst[i] += y * 0.9;
    }
  }
}

// ── Mix ─────────────────────────────────────────────────────────────────────
for (let i = 0; i < N; i++) {
  const g = duckAt(i);
  out.L[i] += drums.L[i] * 0.95 + music.L[i] * g + lead.L[i] * (0.6 + 0.4 * g) + fx.L[i];
  out.R[i] += drums.R[i] * 0.95 + music.R[i] * g + lead.R[i] * (0.6 + 0.4 * g) + fx.R[i];
}

// Tape stop into the crash: the last beat before CRASH_BAR slows to a halt.
{
  const stopEnd = CRASH_BAR * BAR;
  const len = Math.round(BEAT * 1.5);
  const start = stopEnd - len;
  const srcL = out.L.slice(start, stopEnd);
  const srcR = out.R.slice(start, stopEnd);
  let pos = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const speed = Math.max(0, 1 - t) ** 1.6;
    const k = Math.floor(pos);
    const fr = pos - k;
    const l = (srcL[k] ?? 0) * (1 - fr) + (srcL[k + 1] ?? 0) * fr;
    const r = (srcR[k] ?? 0) * (1 - fr) + (srcR[k + 1] ?? 0) * fr;
    const fade = 1 - t * t;
    out.L[start + i] = l * fade;
    out.R[start + i] = r * fade;
    pos += speed;
  }
  // The crash bar itself: silence apart from the reverb tail already rendered after it.
  for (let i = stopEnd; i < stopEnd + BAR; i++) {
    out.L[i] *= 0.0;
    out.R[i] *= 0.0;
  }
}

// Final fade over the last two bars, a 30 Hz high-pass, soft clip, normalise.
let peak = 0;
const hpL = new SVF();
const hpR = new SVF();
for (let i = 0; i < N; i++) {
  out.L[i] = hpL.run(out.L[i], 30, 0.7).hp;
  out.R[i] = hpR.run(out.R[i], 30, 0.7).hp;
  const fade = i > N - 2 * BAR ? Math.pow((N - i) / (2 * BAR), 1.5) : 1;
  const fadeIn = Math.min(i / (SR * 0.01), 1);
  out.L[i] = Math.tanh(out.L[i] * 0.9) * fade * fadeIn;
  out.R[i] = Math.tanh(out.R[i] * 0.9) * fade * fadeIn;
  peak = Math.max(peak, Math.abs(out.L[i]), Math.abs(out.R[i]));
}
const norm = 0.89 / peak;

// 24-bit WAV
const bytes = 3;
const data = Buffer.alloc(N * 2 * bytes);
for (let i = 0; i < N; i++) {
  for (const [c, ch] of [
    [0, out.L],
    [1, out.R],
  ]) {
    const v = Math.max(-1, Math.min(1, ch[i] * norm));
    const n = Math.round(v * 8388607);
    data.writeIntLE(n, (i * 2 + c) * bytes, 3);
  }
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2 * bytes, 28);
header.writeUInt16LE(2 * bytes, 32);
header.writeUInt16LE(bytes * 8, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
const here = dirname(fileURLToPath(import.meta.url));
// Raw mix; scripts/promo-music.sh normalises it to −14 LUFS as public/promo/bgm.wav.
const file = join(here, "../../../public/promo/bgm.raw.wav");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, Buffer.concat([header, data]));
console.log(`wrote ${file}: ${(N / SR).toFixed(1)} s, peak ${peak.toFixed(2)}`);
