"use client";

import { useEffect, useRef, useState } from "react";
import { tr, type Lang } from "./Figure";

/** beats.ts' wheel rules, standalone: quiet gap, re-arm on a surge, pull until the threshold. */
function makeGesture(threshold: number) {
  const s = { at: -1e9, armed: true, peak: 0, low: Infinity, pull: 0 };
  return (dy: number, now: number): "pull" | "commit" | "swallow" | "rearm" => {
    let rearmed = false;
    if (now - s.at > 180) Object.assign(s, { armed: true, peak: 0, low: Infinity });
    s.at = now;
    const m = Math.abs(dy);
    s.peak = Math.max(s.peak, m);
    if (m < s.peak * 0.5) s.low = Math.min(s.low, m);
    if (!s.armed && s.low < Infinity && m > s.low * 2.5 && m > 12) {
      Object.assign(s, { armed: true, peak: m, low: Infinity });
      rearmed = true;
    }
    if (!s.armed) return "swallow";
    s.pull += dy;
    if (Math.abs(s.pull) >= threshold) {
      s.armed = false;
      s.pull = 0;
      return "commit";
    }
    return rearmed ? "rearm" : "pull";
  };
}

/** A trackpad swipe: speeds up, coasts down, then a second push before the coast dies. */
function syntheticSwipe() {
  const d: number[] = [];
  for (let i = 0; i < 7; i++) d.push(4 + i * 10);
  for (let i = 0; i < 46; i++) d.push(70 * Math.pow(0.93, i));
  for (let i = 0; i < 6; i++) d.push(6 + i * 11);
  for (let i = 0; i < 40; i++) d.push(64 * Math.pow(0.9, i));
  return d;
}

const COLORS = { pull: "#141414", commit: "#e8402a", swallow: "#cfc9bd", rearm: "#e8402a" } as const;

function GestureChart({ lang }: { lang: Lang }) {
  const T = 234;
  const deltas = syntheticSwipe();
  const judge = makeGesture(T);
  const rows: { dy: number; kind: ReturnType<typeof judge>; pull: number }[] = [];
  for (let i = 0, pull = 0; i < deltas.length; i++) {
    const dy = deltas[i];
    const kind = judge(dy, i * 16);
    pull = kind === "commit" ? 0 : kind === "swallow" ? pull : pull + dy;
    rows.push({ dy, kind, pull: kind === "commit" ? T : pull });
  }
  const W = 640;
  const H = 200;
  const bw = W / rows.length;
  const y = (v: number) => H - 24 - (v / 80) * (H - 60);
  const py = (v: number) => H - 24 - (v / T) * (H - 60) * 0.95;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      <line x1={0} x2={W} y1={py(T)} y2={py(T)} stroke="#e8402a" strokeDasharray="4 4" />
      <text x={W - 4} y={py(T) - 4} textAnchor="end" className="fill-[#e8402a] font-mono text-[9px]">
        {tr(lang, `门槛 ${T}px`, `threshold ${T}px`)}
      </text>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={i * bw + 0.5} width={Math.max(bw - 1, 1)} y={y(r.dy)} height={H - 24 - y(r.dy)} fill={COLORS[r.kind]} />
          {r.kind === "commit" && <path d={`M${i * bw + bw / 2},${y(r.dy) - 14} l-4,-7 h8 z`} fill="#e8402a" />}
          {r.kind === "rearm" && <circle cx={i * bw + bw / 2} cy={y(r.dy) - 8} r={4} fill="none" stroke="#e8402a" strokeWidth={1.5} />}
        </g>
      ))}
      <path
        d={rows.map((r, i) => `${i ? "L" : "M"}${(i * bw + bw / 2).toFixed(1)},${py(r.pull).toFixed(1)}`).join("")}
        fill="none"
        stroke="#e8402a"
        strokeWidth={1.5}
        opacity={0.6}
      />
      <line x1={0} x2={W} y1={H - 24} y2={H - 24} stroke="#141414" />
      <text x={4} y={H - 8} className="fill-[#8a857c] font-mono text-[9px]">
        {tr(lang, "每根柱子是一个滚轮事件（16ms 一个），高度是滚动量", "each bar is one wheel event (every 16ms), height is its delta")}
      </text>
    </svg>
  );
}

const CARDS = ["FLUENT", "FAMILIAR", "GET BY", "FRONTEND", "NATIVE", "BACKEND"];
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A pocket beat scroller: the same pull, threshold, spring-back and one-beat-per-gesture. */
function Playground({ lang }: { lang: Lang }) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ pos: 0, pull: 0, note: "" });
  const [T, setT] = useState(234);
  const st = useRef({ beat: 0, pos: 0, pull: 0, gliding: false, queued: 0, release: 0, judge: makeGesture(234), threshold: 234 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const s = st.current;
    s.threshold = Math.min(300, Math.max(160, innerHeight * 0.26));
    s.judge = makeGesture(s.threshold);
    setT(s.threshold);
    const h = () => el.clientHeight;
    const show = (note = "") => setView((v) => ({ pos: s.pos, pull: s.pull, note: note || v.note }));
    const animate = (from: number, to: number, ms: number, done: () => void) => {
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        s.pos = from + (to - from) * easeInOut(t);
        show();
        if (t < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    };
    const glide = (dir: number) => {
      if (s.gliding) {
        s.queued = dir;
        show(tr(lang, "滑行中：排队等落地", "mid-glide: queued for the landing"));
        return;
      }
      const next = Math.min(CARDS.length - 1, Math.max(0, s.beat + dir));
      s.pull = 0;
      if (next === s.beat) {
        animate(s.pos, s.beat, 300, () => {});
        return;
      }
      s.gliding = true;
      s.beat = next;
      show(tr(lang, "够了：滑到下一拍", "enough: glide to the next beat"));
      animate(s.pos, next, 900, () => {
        s.gliding = false;
        const q = s.queued;
        s.queued = 0;
        if (q) glide(q);
      });
    };
    const lean = () => {
      const room = 0.4;
      const l = room * (1 - Math.exp((-Math.abs(s.pull) * 0.5) / (room * h())));
      s.pos = s.beat + Math.sign(s.pull) * l;
      show();
    };
    const springBack = () => {
      if (!s.pull || s.gliding) return;
      s.pull = 0;
      show(tr(lang, "不够：弹回来", "not enough: spring back"));
      animate(s.pos, s.beat, 420, () => {});
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const kind = s.judge(dy, performance.now());
      if (kind === "swallow") return show(tr(lang, "同一手势的余波：吞掉", "the same gesture's tail: swallowed"));
      if (kind === "commit") return glide(Math.sign(dy));
      if (s.gliding) return;
      s.pull += dy;
      lean();
      show(kind === "rearm" ? tr(lang, "又推了一把：算新手势", "a fresh push: a new gesture") : tr(lang, "拉动中", "pulling"));
      window.clearTimeout(s.release);
      s.release = window.setTimeout(springBack, 420);
    };
    let y0 = 0;
    let t0 = 0;
    const onStart = (e: TouchEvent) => {
      y0 = e.touches[0].clientY;
      t0 = performance.now();
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (s.gliding) return;
      s.pull = y0 - e.touches[0].clientY;
      lean();
      show(tr(lang, "拖动中", "dragging"));
    };
    const onEnd = () => {
      const speed = Math.abs(s.pull) / Math.max(performance.now() - t0, 1);
      if (Math.abs(s.pull) > Math.max(64, h() * 0.1) || (speed > 0.5 && Math.abs(s.pull) > 48)) glide(Math.sign(s.pull));
      else springBack();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [lang]);

  return (
    <div className="grid border-t border-ink sm:grid-cols-[1fr_180px]">
      <div ref={box} data-lenis-prevent className="relative h-56 cursor-ns-resize touch-none overflow-hidden bg-ink">
        <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${-view.pos * 100}%)`, height: "100%" }}>
          {CARDS.map((c, i) => (
            <div key={c} className="flex h-full items-center justify-center" style={{ transform: `translateY(${i * 100}%)`, position: "absolute", inset: 0 }}>
              <div className="border-2 border-paper px-6 py-4 text-center">
                <p className="font-mono text-[11px] text-paper/60">03.{i + 1} / 06</p>
                <p className="font-display text-3xl font-black text-accent">{c}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="label pointer-events-none absolute left-2 top-2 bg-paper px-1.5 py-0.5 text-ink">
          {tr(lang, "在这里滚动 / 拖动", "scroll or drag here")}
        </p>
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-ink p-3 font-mono text-[0.72rem] sm:border-l sm:border-t-0">
        <div>
          <p className="label text-ink-soft">{tr(lang, "拉力", "Pull")}</p>
          <div className="mt-1 h-2 border border-ink">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, (Math.abs(view.pull) / T) * 100)}%` }} />
          </div>
          <p className="mt-1 tabular-nums text-ink-soft">
            {Math.round(Math.abs(view.pull))} / {Math.round(T)}px
          </p>
        </div>
        <p className="min-h-[3em] text-ink">{view.note || "—"}</p>
      </div>
    </div>
  );
}

/** One gesture, one beat: the wheel rules on a real-shaped swipe, then a box to try them in. */
export function BeatLab({ lang }: { lang: Lang }) {
  return (
    <div>
      <GestureChart lang={lang} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        <span><i className="mr-1 inline-block size-2.5 bg-ink align-middle" />{tr(lang, "累积拉力", "adds to the pull")}</span>
        <span><i className="mr-1 inline-block size-2.5 bg-accent align-middle" />▼ {tr(lang, "够门槛，走一拍", "past the threshold: one beat")}</span>
        <span><i className="mr-1 inline-block size-2.5 bg-[#cfc9bd] align-middle" />{tr(lang, "惯性余波，吞掉", "inertia tail: swallowed")}</span>
        <span>◯ {tr(lang, "衰减后又变大：新手势", "dies away then surges: new gesture")}</span>
      </div>
      <Playground lang={lang} />
    </div>
  );
}
