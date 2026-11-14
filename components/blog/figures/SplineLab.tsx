"use client";

import { useEffect, useRef, useState } from "react";
import { tr, type Lang } from "./Figure";

const XS = [0, 1, 2, 3, 4, 5, 6];
const START = [0.6, 2.6, 2.6, 0.9, 0.9, 3.1, 2.2];
const VW = 640;
const VH = 260;
const PAD = 34;
const sx = (x: number) => PAD + (x / 6) * (VW - PAD * 2);
const sy = (y: number) => VH - PAD - (y / 3.6) * (VH - PAD * 2);

/** Director.tsx's monotoneTangents (Fritsch–Carlson), verbatim in spirit. */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d = xs.slice(0, -1).map((_, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      m[i] = (3 / h) * a * d[i];
      m[i + 1] = (3 / h) * b * d[i];
    }
  }
  m[0] = 0;
  m[n - 1] = 0;
  return m;
}

/** Catmull-Rom: each tangent is the slope between the two neighbours. */
function catmull(xs: number[], ys: number[]) {
  return xs.map((_, i) => (i === 0 || i === xs.length - 1 ? 0 : (ys[i + 1] - ys[i - 1]) / (xs[i + 1] - xs[i - 1])));
}

/** Cubic Hermite through the keys with the given tangents; returns value and slope. */
function hermite(xs: number[], ys: number[], m: number[], x: number) {
  let i = 0;
  while (i < xs.length - 2 && x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const v = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  const dv = ((6 * t2 - 6 * t) * ys[i] + (3 * t2 - 4 * t + 1) * h * m[i] + (-6 * t2 + 6 * t) * ys[i + 1] + (3 * t2 - 2 * t) * h * m[i + 1]) / h;
  return [v, dv] as const;
}

const path = (fn: (x: number) => number) =>
  Array.from({ length: 241 }, (_, k) => {
    const x = (k / 240) * 6;
    return `${k ? "L" : "M"}${sx(x).toFixed(1)},${sy(fn(x)).toFixed(1)}`;
  }).join("");

/**
 * Two splines through the same camera keys, two of them holds (equal
 * neighbours). Drag the keys. Catmull-Rom bulges past every hold; the
 * monotone cubic stands still exactly where the keys say so.
 */
export function SplineLab({ lang }: { lang: Lang }) {
  const [ys, setYs] = useState(START);
  const [t, setT] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const visible = useRef(false);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    observer.observe(el);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => observer.disconnect();
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (visible.current) setT((v) => (v + (now - last) / 1000 / 7) % 1);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const mm = monotone(XS, ys);
  const cm = catmull(XS, ys);
  const x = t < 0.5 ? t * 12 : (1 - t) * 12;
  const [mv, md] = hermite(XS, ys, mm, x);
  const [cv, cd] = hermite(XS, ys, cm, x);

  // Where Catmull-Rom leaves its segment's range: the overshoot, shaded.
  const overshoot = XS.slice(0, -1).map((x0, i) => {
    const lo = Math.min(ys[i], ys[i + 1]);
    const hi = Math.max(ys[i], ys[i + 1]);
    const pts: string[] = [];
    for (let k = 0; k <= 40; k++) {
      const xx = x0 + k / 40;
      const v = hermite(XS, ys, cm, xx)[0];
      const clamped = Math.min(hi, Math.max(lo, v));
      pts.push(`${sx(xx).toFixed(1)},${sy(v).toFixed(1)}`);
      pts.unshift(`${sx(xx).toFixed(1)},${sy(clamped).toFixed(1)}`);
    }
    return <polygon key={i} points={pts.join(" ")} fill="#e8402a" opacity={0.28} />;
  });

  const onMove = (e: React.PointerEvent) => {
    if (drag === null || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const y = ((VH - PAD - ((e.clientY - r.top) / r.height) * VH) / (VH - PAD * 2)) * 3.6;
    setYs((prev) => prev.map((v, i) => (i === drag ? Math.min(3.5, Math.max(0.1, y)) : v)));
  };
  return (
    <div>
      <svg
        ref={svg}
        viewBox={`0 0 ${VW} ${VH}`}
        className="block w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        {XS.map((v) => (
          <line key={v} x1={sx(v)} x2={sx(v)} y1={PAD - 10} y2={VH - PAD} stroke="#141414" strokeOpacity={0.08} />
        ))}
        <line x1={PAD} x2={VW - PAD} y1={VH - PAD} y2={VH - PAD} stroke="#141414" />
        <text x={VW - PAD} y={VH - 10} textAnchor="end" className="fill-[#8a857c] font-mono text-[10px]">
          {tr(lang, "场景时间 s →", "scene time s →")}
        </text>
        <text x={PAD} y={16} className="fill-[#8a857c] font-mono text-[10px]">
          {tr(lang, "↑ 镜头位置", "↑ camera position")}
        </text>
        {/* The two holds. */}
        {[1, 3].map((i) => (
          <rect key={i} x={sx(i)} width={sx(i + 1) - sx(i)} y={PAD - 10} height={VH - PAD * 2 + 10} fill="#141414" opacity={0.04} />
        ))}
        {[1, 3].map((i) => (
          <text key={i} x={(sx(i) + sx(i + 1)) / 2} y={VH - PAD + 14} textAnchor="middle" className="fill-[#8a857c] font-mono text-[9px]">
            {tr(lang, "停靠", "hold")}
          </text>
        ))}
        {overshoot}
        <path d={path((v) => hermite(XS, ys, cm, v)[0])} fill="none" stroke="#8a857c" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={path((v) => hermite(XS, ys, mm, v)[0])} fill="none" stroke="#141414" strokeWidth={2.2} />
        {XS.map((v, i) => (
          <rect
            key={v}
            x={sx(v) - 6}
            y={sy(ys[i]) - 6}
            width={12}
            height={12}
            fill={drag === i ? "#e8402a" : "#f1ede4"}
            stroke="#141414"
            strokeWidth={1.5}
            className="cursor-ns-resize"
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDrag(i);
            }}
          />
        ))}
        <circle cx={sx(x)} cy={sy(cv)} r={5} fill="#8a857c" />
        <circle cx={sx(x)} cy={sy(mv)} r={6} fill="#e8402a" stroke="#141414" />
      </svg>
      <div className="grid grid-cols-2 gap-px border-t border-ink bg-ink font-mono text-[0.72rem]">
        <p className="bg-paper px-3 py-2">
          <span className="mr-2 inline-block h-0.5 w-6 bg-ink align-middle" />
          {tr(lang, "单调三次（网站用的）", "monotone cubic (the site's)")} · v = {md.toFixed(2)}
        </p>
        <p className="bg-paper px-3 py-2 text-ink-soft">
          <span className="mr-2 inline-block w-6 border-t-2 border-dashed border-[#8a857c] align-middle" />
          Catmull-Rom · v = {cd.toFixed(2)}
        </p>
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        {tr(
          lang,
          "方块是关键帧，可以上下拖。红色是 Catmull-Rom 冲出关键帧范围的部分：镜头本该停住，却晃了一下。v 是镜头此刻的速度，停靠段里单调样条的 v 恒为 0。",
          "Squares are keys; drag them. Red is where Catmull-Rom leaves the keys' range: the camera should hold still but wobbles. v is the camera's speed; on a hold the monotone curve's v stays 0.",
        )}
      </p>
    </div>
  );
}
