/**
 * Building blocks for the promo, in the site's paper-and-ink language:
 * footage from the real site, a pen that draws polylines, a big cursor,
 * captions and posters.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Img, continueRender, delayRender, getInputProps, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { palette } from "@/lib/tokens";
import archivoJson from "@/public/fonts/archivo-condensed-black.typeface.json";
import monoJson from "@/public/fonts/jetbrains-mono-bold.typeface.json";

export const C = { paper: palette.paper, ink: palette.ink, accent: palette.accent, dark: "#141414", soft: "#8a857c" };
export const FONT = {
  display: "'QwQ Display', 'Noto Sans CJK SC', 'PingFang SC', sans-serif",
  mono: "'QwQ Mono', 'Noto Sans CJK SC', monospace",
  cjk: "'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number) => Math.pow(clamp01(t), 3);
/** 0→1 over [a, b] (frames), eased. */
export const ramp = (f: number, a: number, b: number, e: (t: number) => number = easeInOut) => e(clamp01((f - a) / (b - a)));
/** A small overshoot spring, 0→1 over `d` frames from `a`. */
export const pop = (f: number, a: number, d = 18) => {
  const t = clamp01((f - a) / d);
  return 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.5) * (1 - t * 0.2);
};

// ── Footage ─────────────────────────────────────────────────────────────────
const props = getInputProps() as { preview?: boolean };
/** In preview renders, footage comes from the quarter-size captures (every 20th frame). */
export const PREVIEW = !!props.preview;
const PREVIEW_EVERY = 20;

/** Frame counts of the captured shots (see capture/shots.mjs). */
export const SHOT_FRAMES: Record<string, number> = {
  hero_wake: 800,
  hero_doodle_tear: 620,
  pano: 1080,
  pano_world: 1080,
  pano_frame: 1080,
  pano_normal: 1080,
  pano_depth: 1080,
  pano_lines: 1080,
  pano_dots: 1080,
  tour: 3000,
  dual_desk: 1000,
  dual_phone: 1000,
  bi_zh: 540,
  bi_en: 540,
  egg_terminal: 560,
  egg_overview: 420,
  egg_game: 420,
  gh_repo: 1,
  gh_profile: 1,
};

/** Shots filmed on transparent (one layer of the page each). */
const ALPHA_SHOTS = new Set(["pano_frame"]);

export function footageSrc(shot: string, frame: number, layer = "full") {
  const max = (SHOT_FRAMES[shot] ?? 1) - 1;
  let f = Math.max(0, Math.min(max, Math.round(frame)));
  if (PREVIEW) f = Math.min(max - (max % PREVIEW_EVERY), f - (f % PREVIEW_EVERY));
  const ext = ALPHA_SHOTS.has(shot) ? "webp" : "jpg";
  return staticFile(`promo/${PREVIEW ? "footage-preview" : "footage"}/${shot}/${layer}/${String(f).padStart(5, "0")}.${ext}`);
}

/**
 * One frame of a captured shot, at `start + (sequence frame − delay) * rate`,
 * filling its box. `delay` holds the first frame that long before playing.
 */
export function Footage({ shot, start = 0, rate = 1, layer = "full", style, hold, delay = 0 }: { shot: string; start?: number; rate?: number; layer?: string; style?: CSSProperties; hold?: number; delay?: number }) {
  const f = useCurrentFrame();
  const at = hold ?? start + Math.max(0, f - delay) * rate;
  return <Img src={footageSrc(shot, at, layer)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />;
}

// ── Mouse tracks recorded by the grabber ────────────────────────────────────
type TrackPoint = { x: number; y: number; down: boolean } | null;
const trackCache = new Map<string, TrackPoint[]>();
export function useTrack(shot: string): TrackPoint[] | null {
  const [track, setTrack] = useState<TrackPoint[] | null>(trackCache.get(shot) ?? null);
  const [handle] = useState(() => (trackCache.has(shot) ? null : delayRender(`track ${shot}`)));
  useEffect(() => {
    if (!handle) return;
    fetch(staticFile(`promo/${PREVIEW ? "footage-preview" : "footage"}/${shot}/track.json`))
      .then((r) => r.json())
      .then((j: { track: TrackPoint[] }) => {
        trackCache.set(shot, j.track);
        setTrack(j.track);
      })
      .catch(() => setTrack([]))
      .finally(() => continueRender(handle));
  }, [handle, shot]);
  return track;
}

// ── Polylines and the pen ───────────────────────────────────────────────────
export type Pt = [number, number];
export type Stroke = { pts: Pt[]; color?: string; width?: number; fill?: string };

export const segLength = (pts: Pt[]) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
};
export function pointAt(pts: Pt[], d: number): Pt {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + s >= d) {
      const t = s ? (d - acc) / s : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    acc += s;
  }
  return pts[pts.length - 1];
}

export const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
export const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 64, a0 = -Math.PI / 2): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
/** A pill (stadium) around [x0, x1] at height y, radius r. */
export const capsule = (x0: number, x1: number, y: number, r: number, n = 20): Pt[] => {
  const pts: Pt[] = [[x0, y - r]];
  pts.push([x1, y - r]);
  for (let i = 1; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    pts.push([x1 + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  pts.push([x0, y + r]);
  for (let i = 1; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI;
    pts.push([x0 + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return pts;
};
export const roundRect = (x: number, y: number, w: number, h: number, r: number, n = 8): Pt[] => {
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  pts.push(pts[0]);
  return pts;
};

type TypefaceFont = { resolution: number; glyphs: Record<string, { ha: number; o?: string }> };
const FONTS = { display: archivoJson as unknown as TypefaceFont, mono: monoJson as unknown as TypefaceFont };

/** Glyph outlines of `text` as polylines, baseline at y, left at x. */
export function textStrokes(text: string, x: number, y: number, size: number, font: keyof typeof FONTS = "display", tracking = 0): { strokes: Pt[][]; width: number } {
  const ff = FONTS[font];
  const scale = size / ff.resolution;
  const strokes: Pt[][] = [];
  let pen = x;
  for (const ch of text) {
    const g = ff.glyphs[ch] ?? ff.glyphs["?"];
    if (!g) continue;
    const o = (g.o ?? "").split(" ");
    let cur: Pt[] = [];
    let lx = 0;
    let ly = 0;
    const P = (gx: number, gy: number): Pt => [pen + gx * scale, y - gy * scale];
    for (let i = 0; i < o.length; ) {
      const c = o[i++];
      if (c === "m") {
        if (cur.length > 1) strokes.push(cur);
        lx = +o[i++];
        ly = +o[i++];
        cur = [P(lx, ly)];
      } else if (c === "l") {
        lx = +o[i++];
        ly = +o[i++];
        cur.push(P(lx, ly));
      } else if (c === "q") {
        const ex = +o[i++];
        const ey = +o[i++];
        const cx = +o[i++];
        const cy = +o[i++];
        for (let k = 1; k <= 6; k++) {
          const t = k / 6;
          const qx = (1 - t) * (1 - t) * lx + 2 * (1 - t) * t * cx + t * t * ex;
          const qy = (1 - t) * (1 - t) * ly + 2 * (1 - t) * t * cy + t * t * ey;
          cur.push(P(qx, qy));
        }
        lx = ex;
        ly = ey;
      } else if (c === "b") {
        const ex = +o[i++];
        const ey = +o[i++];
        const c1x = +o[i++];
        const c1y = +o[i++];
        const c2x = +o[i++];
        const c2y = +o[i++];
        for (let k = 1; k <= 8; k++) {
          const t = k / 8;
          const u = 1 - t;
          cur.push(P(u * u * u * lx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * ly + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey));
        }
        lx = ex;
        ly = ey;
      } else if (c === "z") {
        if (cur.length) cur.push(cur[0]);
      }
    }
    if (cur.length > 1) strokes.push(cur);
    pen += g.ha * scale + tracking;
  }
  return { strokes, width: pen - x };
}

/** A fountain/technical pen whose nib is at (0, 0). */
export function PenGlyph({ x, y, tilt = 28, scale = 1, lift = 0 }: { x: number; y: number; tilt?: number; scale?: number; lift?: number }) {
  return (
    <g transform={`translate(${x} ${y - lift}) rotate(${tilt}) scale(${scale})`}>
      {/* shadow on the paper */}
      <g transform={`translate(${14 + lift * 0.6} ${10 + lift * 0.4})`} opacity={0.18}>
        <rect x={-15} y={-230} width={30} height={200} rx={6} fill={C.ink} />
      </g>
      <path d="M0 0 L-8 -30 L8 -30 Z" fill={C.ink} />
      <path d="M0 -4 L0 -22" stroke={C.paper} strokeWidth={1.6} />
      <rect x={-12} y={-52} width={24} height={22} fill={C.paper} stroke={C.ink} strokeWidth={3} />
      <rect x={-15} y={-232} width={30} height={182} rx={6} fill={C.ink} />
      <rect x={-15} y={-126} width={30} height={14} fill={C.accent} />
      <rect x={-6} y={-220} width={5} height={84} rx={2.5} fill={C.paper} opacity={0.35} />
    </g>
  );
}

/**
 * Draws `strokes` in order at `progress` (0–1 of their total length), with the
 * pen riding the tip. Strokes are SVG polylines in the 1920×1080 frame.
 */
export function DrawStrokes({ strokes, progress, pen = true, penScale = 1, style }: { strokes: Stroke[]; progress: number; pen?: boolean; penScale?: number; style?: CSSProperties }) {
  const lens = strokes.map((s) => segLength(s.pts));
  const total = lens.reduce((a, b) => a + b, 0);
  let left = clamp01(progress) * total;
  let tip: Pt | null = null;
  const els = strokes.map((s, i) => {
    const l = lens[i];
    const shown = Math.max(0, Math.min(l, left));
    left -= l;
    if (shown > 0 && shown < l) tip = pointAt(s.pts, shown);
    if (shown > 0 && left <= 0 && shown === l && !tip) tip = s.pts[s.pts.length - 1];
    return (
      <polyline
        key={i}
        points={s.pts.map((p) => p.join(",")).join(" ")}
        fill={shown >= l && s.fill ? s.fill : "none"}
        stroke={s.color ?? C.ink}
        strokeWidth={s.width ?? 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${l} ${l + 1}`}
        strokeDashoffset={l - shown}
        opacity={shown > 0 ? 1 : 0}
      />
    );
  });
  const done = progress >= 1;
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", ...style }}>
      {els}
      {pen && tip && !done && progress > 0 && <PenGlyph x={(tip as Pt)[0]} y={(tip as Pt)[1]} scale={penScale} />}
    </svg>
  );
}

// ── Big cursor ──────────────────────────────────────────────────────────────
/** An oversized arrow pointer drawn in ink, with a press squash and a ring per click. */
export function BigCursor({ x, y, down, clickAge, size = 1, pen = false }: { x: number; y: number; down: boolean; clickAge?: number; size?: number; pen?: boolean }) {
  const s = (down ? 0.86 : 1) * size;
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
      {clickAge !== undefined && clickAge >= 0 && clickAge < 24 && (
        <g opacity={1 - clickAge / 24}>
          <circle cx={x} cy={y} r={18 + clickAge * 4.2} fill="none" stroke={C.accent} strokeWidth={6 - clickAge * 0.2} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const r0 = 26 + clickAge * 3;
            const r1 = r0 + 16;
            return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />;
          })}
        </g>
      )}
      {pen ? (
        <PenGlyph x={x} y={y} scale={0.8 * size} lift={down ? 0 : 12} />
      ) : (
        <g transform={`translate(${x} ${y}) scale(${s}) rotate(-8)`}>
          <path d="M8 10 L8 118 L36 92 L54 136 L76 126 L58 84 L96 82 Z" fill={C.ink} opacity={0.25} transform="translate(10 8)" />
          <path d="M0 0 L0 108 L28 82 L46 126 L68 116 L50 74 L88 72 Z" fill={C.paper} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          <path d="M10 22 L10 80" stroke={C.accent} strokeWidth={6} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/** The cursor for a captured shot, following the mouse the grabber drove. */
export function TrackedCursor({ shot, start = 0, size = 1, pen = false, visibleFrom = 0, delay = 0 }: { shot: string; start?: number; size?: number; pen?: boolean; visibleFrom?: number; delay?: number }) {
  const f = Math.max(0, useCurrentFrame() - delay) + start;
  const track = useTrack(shot);
  if (!track || f < visibleFrom) return null;
  const p = track[Math.min(track.length - 1, Math.max(0, Math.round(f)))];
  if (!p) return null;
  // Age of the latest press, for the click ring.
  let age: number | undefined;
  for (let k = 0; k < 30; k++) {
    const a = track[Math.round(f) - k];
    const b = track[Math.round(f) - k - 1];
    if (a?.down && b && !b.down) {
      age = k;
      break;
    }
  }
  return <BigCursor x={p.x} y={p.y} down={p.down} clickAge={pen ? undefined : age} size={size} pen={pen} />;
}

// ── Type ────────────────────────────────────────────────────────────────────
/**
 * A subtitle: Chinese on top, English underneath, on an ink slab with the
 * site's red tick. Wipes in, wipes out.
 */
export function Caption({ zh, en, start, end, y = 905, align = "center" }: { zh: ReactNode; en?: ReactNode; start: number; end: number; y?: number; align?: "center" | "left" }) {
  const f = useCurrentFrame();
  if (f < start || f > end) return null;
  const inT = ramp(f, start, start + 12, easeOut);
  const outT = ramp(f, end - 10, end, easeIn);
  const wipe = inT * (1 - outT);
  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? 0 : 120,
        right: align === "center" ? 0 : undefined,
        top: y,
        display: "flex",
        justifyContent: align === "center" ? "center" : "flex-start",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(20,20,20,0.9)",
          color: C.paper,
          padding: "14px 30px 14px 34px",
          borderLeft: `8px solid ${C.accent}`,
          clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
          transform: `translateY(${(1 - inT) * 14}px)`,
          boxShadow: "8px 8px 0 rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontFamily: FONT.cjk, fontWeight: 700, fontSize: 44, lineHeight: 1.25, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{zh}</div>
        {en && (
          <div style={{ fontFamily: FONT.mono, fontSize: 19, letterSpacing: "0.08em", opacity: 0.62, marginTop: 6, whiteSpace: "nowrap", textTransform: "uppercase" }}>{en}</div>
        )}
      </div>
    </div>
  );
}

/** Highlight: red ink for a word inside a caption or poster. */
export const Red = ({ children }: { children: ReactNode }) => <span style={{ color: C.accent }}>{children}</span>;

/**
 * Big poster type (大字报) that slams in: overshoot scale, a jolt of offset
 * colour, then holds.
 */
export function Slam({ children, at, size = 150, color = C.paper, x = 960, y = 540, rot = -2, out, bg, style }: { children: ReactNode; at: number; size?: number; color?: string; x?: number; y?: number; rot?: number; out?: number; bg?: string; style?: CSSProperties }) {
  const f = useCurrentFrame();
  if (f < at || (out !== undefined && f > out + 8)) return null;
  const p = pop(f, at, 16);
  const scale = 1.5 - 0.5 * p;
  const jolt = f - at < 5 ? (5 - (f - at)) * 4 : 0;
  const fade = out !== undefined ? 1 - ramp(f, out, out + 8, easeIn) : 1;
  const text: CSSProperties = { fontFamily: FONT.cjk, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: "-0.02em", whiteSpace: "nowrap", ...style };
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`, opacity: Math.min(1, (f - at) / 3) * fade, pointerEvents: "none" }}>
      {bg && <div style={{ position: "absolute", inset: "-0.12em -0.3em", background: bg, transform: `skewX(-8deg) scaleX(${ramp(f, at, at + 10, easeOut)})`, transformOrigin: "left" }} />}
      {jolt > 0 && <div style={{ ...text, position: "absolute", inset: 0, color: C.accent, transform: `translate(${jolt}px, ${-jolt * 0.5}px)`, mixBlendMode: "screen", opacity: 0.8 }}>{children}</div>}
      <div style={{ ...text, position: "relative", color }}>{children}</div>
    </div>
  );
}

/** The site's sheet label: "SHEET 05 ———— 经历", top left. */
export function SheetTag({ no, zh, en, start, end }: { no: string; zh: string; en: string; start: number; end: number }) {
  const f = useCurrentFrame();
  if (f < start || f > end) return null;
  const t = ramp(f, start, start + 16, easeOut) * (1 - ramp(f, end - 10, end, easeIn));
  return (
    <div style={{ position: "absolute", left: 66, top: 96, padding: "18px 30px 14px", background: C.dark, borderLeft: `6px solid ${C.accent}`, fontFamily: FONT.mono, color: C.paper, opacity: t, transform: `translateX(${(1 - t) * -30}px)`, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, letterSpacing: "0.18em", color: C.accent }}>
        <span>SHEET {no}</span>
        <span style={{ width: 160 * t, height: 2, background: C.accent }} />
        <span style={{ color: C.paper, opacity: 0.7 }}>{en}</span>
      </div>
      <div style={{ fontFamily: FONT.cjk, fontWeight: 900, fontSize: 84, marginTop: 6, color: C.paper, textShadow: "0 4px 0 rgba(0,0,0,0.5)" }}>{zh}</div>
    </div>
  );
}

// ── Grounds ─────────────────────────────────────────────────────────────────
/** The site's drawing paper: warm sheet, fine and coarse grid, soft vignette. */
export function Paper({ children, dark = false }: { children?: ReactNode; dark?: boolean }) {
  const line = dark ? "rgba(241,237,228,0.06)" : "rgba(20,20,20,0.07)";
  const major = dark ? "rgba(241,237,228,0.12)" : "rgba(20,20,20,0.12)";
  return (
    <AbsoluteFill
      style={{
        background: dark ? C.dark : C.paper,
        backgroundImage: `linear-gradient(${major} 1.5px, transparent 1.5px), linear-gradient(90deg, ${major} 1.5px, transparent 1.5px), linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
        backgroundPosition: "-1px -1px",
      }}
    >
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.18) 100%)" }} />
      {children}
    </AbsoluteFill>
  );
}

/** Film grain over everything Remotion draws itself (the footage has its own). */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "multiply" }}>
      <svg width="100%" height="100%">
        <filter id={`g${f % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 6} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${f % 6})`} />
      </svg>
    </AbsoluteFill>
  );
}

/** A few frames of the site's glitch bars, over a cut at `at`. */
export function GlitchCut({ at, len = 8 }: { at: number; len?: number }) {
  const f = useCurrentFrame();
  const k = f - at;
  if (k < -2 || k > len) return null;
  const bars = Array.from({ length: 7 }, (_, i) => {
    const r = random(`g${at}-${i}-${Math.floor(k / 2)}`);
    const r2 = random(`h${at}-${i}-${Math.floor(k / 2)}`);
    return { top: r * 100, h: 1 + r2 * 9, dx: (r2 - 0.5) * 220, color: i % 3 === 0 ? C.accent : i % 3 === 1 ? C.paper : C.ink };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {bars.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${b.top}%`, height: `${b.h}%`, background: b.color, opacity: 0.85, transform: `translateX(${b.dx}px)`, mixBlendMode: i % 2 ? "difference" : "normal" }} />
      ))}
    </AbsoluteFill>
  );
}

/** Interpolate with clamping, the usual way. */
export const lerp = (f: number, input: number[], output: number[]) => interpolate(f, input, output, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
