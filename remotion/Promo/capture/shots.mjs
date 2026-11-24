/**
 * The shots the promo films on the real site. Each `at(f)` says, for frame f
 * (60 fps), where the page is (`s`: scene time, see lib/sceneClock), where the
 * mouse is and what is pressed. One bar of the music is 120 frames (120 BPM);
 * shot lengths follow the edit in remotion/Promo/edit.ts, plus a little tail.
 */
export const SITE = process.env.SITE ?? "http://localhost:3100";

const clamp = (x) => Math.min(1, Math.max(0, x));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const linear = (t) => t;
/** Piecewise interpolation through [frame, value] keys. */
export const keys = (pts, f, e = ease) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [f1, v1] = pts[i];
    const [f0, v0] = pts[i - 1];
    if (f <= f1) return v0 + (v1 - v0) * e(clamp((f - f0) / (f1 - f0)));
  }
  return pts[pts.length - 1][1];
};
/** A mouse glide between two points over [f0, f1]. */
const glide = (f, f0, f1, a, b, e = ease) => {
  const t = e(clamp((f - f0) / (f1 - f0)));
  return { x: Math.round(a[0] + (b[0] - a[0]) * t), y: Math.round(a[1] + (b[1] - a[1]) * t) };
};
/** Typing: one key every `gap` frames from `start`; returns the keys due at frame f. */
const typing = (f, start, text, gap = 4) => {
  const i = (f - start) / gap;
  if (i < 0 || i >= text.length || !Number.isInteger(i)) return [];
  const ch = text[i];
  return [ch === "\n" ? "Enter" : ch === " " ? { key: " ", code: "Space", text: " " } : ch === "/" ? { key: "/", code: "Slash", text: "/" } : ch === "-" ? { key: "-", code: "Minus", text: "-" } : ch];
};
/** A script of typed lines: [[startFrame, "text\n"], ...]. */
const script = (f, lines, gap) => lines.flatMap(([start, text]) => typing(f, start, text, gap));

const DESK = { width: 1920, height: 1080, dpr: 2 };
const PHONE = { width: 390, height: 844, dpr: 3, mobile: true };

/** Header buttons, desktop (CSS px). */
const BTN = { overview: [1740, 51], terminal: [1785, 51], lang: [1842, 51] };
/** The mascot's face on the hero paper: its "w". */
const FACE = [1340, 470];

/** Heart, in screen px, drawn with the red pen (Shift). */
const heart = (t) => {
  const a = Math.PI * 2 * t;
  const x = 16 * Math.sin(a) ** 3;
  const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return { x: Math.round(640 + x * 11), y: Math.round(360 - y * 11) };
};

/** Scene-time schedule for the side-by-side desktop/phone sequence (both devices run it). */
const dual = (f) =>
  keys(
    [
      [0, 0.15],
      [100, 0.3],
      [220, 0.92],
      [330, 1.35],
      [450, 2.25],
      [570, 3.3],
      [690, 4.3],
      [810, 4.88],
      [960, 6.3],
    ],
    f,
  );

const tour = (f) =>
  keys(
    [
      [0, 0.98],
      [480, 1.96], // about: init(me), the footprints map
      [960, 2.96], // skills
      [1440, 3.97], // projects
      [1920, 4.6], // the road
      [2400, 5.03], // the GitHub city
      [2640, 5.36], // writing
      [2700, 5.95],
      [2880, 6.44], // contact
      [3000, 6.44],
    ],
    f,
    linear,
  );

const pano = (f) => keys([[0, 3.02], [1080, 3.3]], f, linear);
const PANO_VIEWS = { normal: 4, depth: 6, lines: 7, dots: 8 };

export const shots = [
  {
    name: "survey",
    url: "/zh",
    ...DESK,
    frames: 1400,
    at: (f) => ({ s: (f / 1400) * 7 }),
  },
  {
    name: "phone_survey",
    url: "/zh",
    ...PHONE,
    frames: 700,
    at: (f) => ({ s: (f / 700) * 7 }),
  },

  // C — a big cursor wakes QwQ, pokes it, then clicks until it cries.
  {
    name: "hero_wake",
    url: "/zh",
    ...DESK,
    hideCursor: true,
    preroll: 16000, // idle long enough to be fast asleep
    frames: 800,
    at: (f) => {
      if (f < 90) return { s: 0 };
      let m;
      if (f < 210) m = glide(f, 90, 200, [1960, 1060], FACE);
      else if (f < 330) {
        // A small loop around the face: the eyes follow.
        const a = ((f - 210) / 120) * Math.PI * 2;
        m = { x: Math.round(FACE[0] + Math.sin(a) * 150), y: Math.round(FACE[1] - 40 + Math.cos(a) * -60 + 60) };
      } else m = { x: FACE[0], y: FACE[1] };
      const click = (start) => f >= start && f < start + 6;
      const down = click(330) || [0, 1, 2, 3, 4, 5, 6].some((k) => click(450 + k * 15));
      return { s: 0, mouse: { ...m, down } };
    },
  },

  // D — doodle a red heart on the paper, then scroll: the sheet tears.
  {
    name: "hero_doodle_tear",
    url: "/zh",
    ...DESK,
    hideCursor: true,
    preroll: 2000,
    frames: 620,
    at: (f) => {
      const s = keys([[260, 0], [500, 0.66], [620, 0.9]], f, (t) => t * t * (3 - 2 * t)); // the sheet shatters on the drop (f480)
      if (f < 10) return { s, mouse: { ...heart(0), down: false } };
      if (f < 200) return { s, mouse: { ...heart((f - 10) / 190), down: true, shift: true } };
      if (f < 230) return { s, mouse: { ...glide(f, 200, 230, [heart(1).x, heart(1).y], [1700, 980]), down: false } };
      return { s, mouse: { x: 1700, y: 980, down: false } };
    },
  },

  // E — the exploded view: the same slow push, filmed once per layer.
  { name: "pano", url: "/zh", ...DESK, hideCursor: true, frames: 1080, at: (f) => ({ s: pano(f) }) },
  // The same push, one run per layer (seeded randomness keeps them in step).
  // (The content layer is cut out of the full take in the edit: filmed alone, with
  // the world hidden, it stalls Chrome's virtual time.)
  ...["world", "frame"].map((only) => ({
    name: `pano_${only}`,
    url: "/zh",
    ...DESK,
    dpr: 1.25, // only ever seen shrunk, in the exploded stack
    hideCursor: true,
    frames: 1080,
    only,
    at: (f) => ({ s: pano(f) }),
  })),
  ...Object.entries(PANO_VIEWS).map(([view, mode]) => ({
    name: `pano_${view}`,
    url: "/zh",
    ...DESK,
    dpr: 1.25, // only ever seen shrunk, in the exploded stack
    hideCursor: true,
    frames: 1080,
    setup: { eval: `window.dispatchEvent(new CustomEvent('qwq:view', { detail: { mode: ${mode} } })); 1` },
    at: (f) => ({ s: pano(f) }),
  })),

  // F — the ride through every sheet, one take.
  {
    name: "tour",
    url: "/zh",
    ...DESK,
    frames: 3000,
    at: (f) => {
      const st = { s: tour(f) };
      // Over the city: sweep across the towers so their dates pop up.
      if (f >= 2180 && f < 2400) st.mouse = glide(f, 2180, 2390, [640, 560], [1480, 500]);
      if (f >= 2400 && f < 2402) st.mouse = { x: 1919, y: 1079 };
      return st;
    },
  },

  // G — desktop and phone, side by side, on the same schedule.
  // Shown inside drawn devices, never full screen: less resolution is plenty.
  { name: "dual_desk", url: "/zh", ...DESK, dpr: 1.25, hideCursor: true, frames: 1000, at: (f) => ({ s: dual(f) }) },
  { name: "dual_phone", url: "/zh", ...PHONE, dpr: 2, frames: 1000, at: (f) => ({ s: dual(f) }) },

  // H — the same moment in both languages.
  { name: "bi_zh", url: "/zh", ...DESK, hideCursor: true, frames: 540, at: (f) => ({ s: keys([[0, 1.22], [540, 1.5]], f, linear) }) },
  { name: "bi_en", url: "/en", ...DESK, hideCursor: true, frames: 540, at: (f) => ({ s: keys([[0, 1.22], [540, 1.5]], f, linear) }) },

  // I — easter eggs. The terminal, then `sudo rm -rf /`.
  {
    name: "egg_terminal",
    url: "/zh",
    ...DESK,
    frames: 560,
    at: (f) => {
      const st = { s: 0.86 };
      if (f >= 10 && f < 40) st.mouse = glide(f, 10, 38, [1500, 600], BTN.terminal);
      if (f >= 40 && f < 46) st.mouse = { x: BTN.terminal[0], y: BTN.terminal[1], down: true };
      if (f === 46) st.mouse = { x: BTN.terminal[0], y: BTN.terminal[1], down: false };
      if (f === 60) st.mouse = { x: 1919, y: 1079 };
      st.keys = script(f, [[80, "neofetch\n"], [200, "qwq\n"], [308, "sudo rm -rf /\n"]], 4); // Enter lands on f360 = the crash bar
      return st;
    },
  },
  // The overview: the whole world at once.
  {
    name: "egg_overview",
    url: "/zh",
    ...DESK,
    hideCursor: true,
    frames: 420,
    at: (f) => {
      const st = { s: 3.3 };
      if (f >= 10 && f < 50) st.mouse = glide(f, 10, 48, [1400, 700], BTN.overview);
      if (f >= 50 && f < 56) st.mouse = { x: BTN.overview[0], y: BTN.overview[1], down: true };
      if (f === 56) st.mouse = { x: BTN.overview[0], y: BTN.overview[1], down: false };
      if (f > 70) st.mouse = glide(f, 70, 400, BTN.overview, [1200, 640]);
      return st;
    },
  },
  // The bug game.
  {
    name: "egg_game",
    url: "/zh",
    ...DESK,
    frames: 420,
    setup: { s: 0.86 },
    at: (f) => {
      const st = { s: 0.86 };
      if (f === 5) st.eval = `window.dispatchEvent(new CustomEvent('qwq:game', { detail: { open: true } })); 1`;
      // Swat around the middle, where the bugs head for the face.
      if (f > 90) {
        const k = Math.floor((f - 90) / 22);
        const ph = (f - 90) % 22;
        const p = [
          [880, 520],
          [1060, 470],
          [960, 610],
          [780, 430],
          [1140, 560],
          [1000, 380],
          [840, 660],
          [1180, 420],
          [930, 500],
          [1080, 640],
          [760, 560],
          [1010, 450],
          [900, 560],
          [1100, 520],
          [980, 600],
        ][k % 15];
        st.mouse = { x: p[0], y: p[1], down: ph >= 10 && ph < 14 };
      }
      return st;
    },
  },

  // J — GitHub, as it is (stills; the video animates the star on top).
  { name: "gh_repo", url: "https://github.com/SnowballXueQiu/qwq.my", ...DESK, frames: 1, warm: 7000, preroll: 0, external: true },
  { name: "gh_profile", url: "https://github.com/SnowballXueQiu", ...DESK, frames: 1, warm: 7000, preroll: 0, external: true },
];
