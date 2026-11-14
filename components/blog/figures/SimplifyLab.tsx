"use client";

import { useEffect, useMemo, useState } from "react";
import { prng } from "@/lib/prng";
import { tr, type Lang } from "./Figure";

type P = [number, number];
const VW = 640;
const VH = 320;

/** A ragged island: a lumpy ellipse, then six rounds of midpoint displacement. */
function coastline(): P[] {
  const rand = prng(42);
  let pts: P[] = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r = 0.75 + rand() * 0.35;
    return [VW / 2 + Math.cos(a) * r * 250, VH / 2 + Math.sin(a) * r * 115];
  });
  for (let round = 0; round < 6; round++) {
    const next: P[] = [];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const off = (rand() - 0.5) * len * 0.62;
      next.push(a, [(a[0] + b[0]) / 2 + ((b[1] - a[1]) / len) * off, (a[1] + b[1]) / 2 - ((b[0] - a[0]) / len) * off]);
    });
    pts = next;
  }
  // Rounded so the server and the browser draw exactly the same numbers.
  const round = (p: P): P => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
  return [...pts.map(round), round(pts[0])];
}

function perp(p: P, a: P, b: P) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

type Step = { i: number; j: number; k: number; d: number; kept: boolean };

/** build_china_map.py's dp(): a stack of spans, keep the farthest point while it's beyond `tol`. */
function douglasPeucker(points: P[], tol: number) {
  const keep = points.map((_, i) => i === 0 || i === points.length - 1);
  const steps: Step[] = [];
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let best = 0;
    let idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = perp(points[k], points[i], points[j]);
      if (d > best) {
        best = d;
        idx = k;
      }
    }
    if (idx < 0) continue;
    const kept = best > tol;
    steps.push({ i, j, k: idx, d: best, kept });
    if (kept) {
      keep[idx] = true;
      stack.push([i, idx], [idx, j]);
    }
  }
  return { keep, steps };
}

/** A band of half-width `tol` around the chord a–b. */
function band(a: P, b: P, tol: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (-(b[1] - a[1]) / len) * tol;
  const ny = ((b[0] - a[0]) / len) * tol;
  return `${a[0] + nx},${a[1] + ny} ${b[0] + nx},${b[1] + ny} ${b[0] - nx},${b[1] - ny} ${a[0] - nx},${a[1] - ny}`;
}

/**
 * Douglas–Peucker on a ragged coastline: drag the tolerance, or watch it
 * recurse: draw the chord, find the farthest point, keep it if it pokes out
 * of the band, and split there.
 */
export function SimplifyLab({ lang }: { lang: Lang }) {
  const points = useMemo(() => coastline(), []);
  const [tol, setTol] = useState(2);
  const [shown, setShown] = useState<number | null>(null);
  const { keep, steps } = useMemo(() => douglasPeucker(points, tol), [points, tol]);
  const kept = points.filter((_, i) => keep[i]);

  useEffect(() => {
    if (shown === null) return;
    if (shown >= Math.min(steps.length, 18)) {
      const id = window.setTimeout(() => setShown(null), 1600);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShown((s) => (s === null ? null : s + 1)), 750);
    return () => window.clearTimeout(id);
  }, [shown, steps.length]);

  // While stepping, the polyline so far: only the points kept by the steps already shown.
  const partialKeep = useMemo(() => {
    if (shown === null) return null;
    const k = points.map((_, i) => i === 0 || i === points.length - 1);
    steps.slice(0, shown + 1).forEach((s) => s.kept && (k[s.k] = true));
    return points.filter((_, i) => k[i]);
  }, [shown, steps, points]);
  const step = shown !== null ? steps[Math.min(shown, steps.length - 1)] : null;
  const line = (ps: P[]) => ps.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");

  return (
    <div>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full">
        <path d={line(points)} fill="none" stroke="#8a857c" strokeWidth={0.8} opacity={0.6} />
        {step && (
          <>
            <polygon points={band(points[step.i], points[step.j], tol)} fill="#e8402a" opacity={0.12} />
            <line x1={points[step.i][0]} y1={points[step.i][1]} x2={points[step.j][0]} y2={points[step.j][1]} stroke="#141414" strokeDasharray="5 4" />
            <circle cx={points[step.k][0]} cy={points[step.k][1]} r={6} fill="none" stroke={step.kept ? "#e8402a" : "#8a857c"} strokeWidth={2} />
          </>
        )}
        <path d={line(partialKeep ?? kept)} fill="none" stroke="#141414" strokeWidth={2} />
        {(partialKeep ?? kept).map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill="#e8402a" />
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-3 border-t border-ink px-3 py-2 font-mono text-[0.75rem]">
        <label className="flex flex-1 items-center gap-2">
          <span className="text-accent">{tr(lang, "容差", "tolerance")}</span>
          <input type="range" min={0.5} max={30} step={0.5} value={tol} onChange={(e) => setTol(Number(e.target.value))} className="flex-1" />
          <span className="w-12 tabular-nums">{tol}px</span>
        </label>
        <span className="tabular-nums text-ink-soft">
          {points.length} → <span className="text-ink">{kept.length}</span> {tr(lang, "个点", "points")} ({Math.round((kept.length / points.length) * 100)}%)
        </span>
        <button type="button" onClick={() => setShown(0)} className="label border border-ink px-2 py-1 hover:bg-accent hover:text-paper">
          {tr(lang, "▶ 看它怎么递归", "▶ watch it recurse")}
        </button>
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        {step
          ? tr(
              lang,
              `第 ${(shown ?? 0) + 1} 步：虚线是弦，最远的点离弦 ${step.d.toFixed(1)}px，${step.kept ? "超出了红色容差带 → 留下它，从这里拆成两段" : "还在容差带里 → 这一段只留两个端点"}`,
              `Step ${(shown ?? 0) + 1}: the dashed chord; the farthest point is ${step.d.toFixed(1)}px off it, ${step.kept ? "outside the red band → keep it and split there" : "inside the band → this span keeps only its ends"}`,
            )
          : tr(lang, "灰线是原始边界，黑线是简化后的。", "Grey is the original outline, black the simplified one.")}
      </p>
    </div>
  );
}
