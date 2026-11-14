"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Delaunay } from "d3-delaunay";
import { prng } from "@/lib/prng";
import { tr, type Lang } from "./Figure";

// The paper as the site sizes it (world units), seen from the camera 14.6 units away.
const HW = 7.6;
const HH = 4.75;
const D = 14.6;
const FOCUS: [number, number] = [2.2, 1.0];

type Shard = { poly: [number, number][]; c: [number, number]; r: [number, number, number]; delay: number };

/** shards.ts, in 2D: 45% of the seeds cluster around the focus, the rest scatter. */
function buildShards(): { shards: Shard[]; delaunay: Delaunay<[number, number]> } {
  const rand = prng(7);
  const points: [number, number][] = [];
  for (let i = 0; i < 170; i++) {
    if (i < 170 * 0.45) {
      const r = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * HW * 2 * 0.1;
      const a = rand() * Math.PI * 2;
      points.push([Math.min(HW, Math.max(-HW, FOCUS[0] + Math.cos(a) * r)), Math.min(HH, Math.max(-HH, FOCUS[1] + Math.sin(a) * r))]);
    } else {
      points.push([(rand() * 2 - 1) * HW, (rand() * 2 - 1) * HH]);
    }
  }
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([-HW, -HH, HW, HH]);
  const maxDist = Math.max(...[[-HW, -HH], [HW, -HH], [-HW, HH], [HW, HH]].map(([x, y]) => Math.hypot(x - FOCUS[0], y - FOCUS[1])));
  const shards: Shard[] = [];
  for (let i = 0; i < points.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    const verts = poly.slice(0, -1) as [number, number][];
    const cx = verts.reduce((a, v) => a + v[0], 0) / verts.length;
    const cy = verts.reduce((a, v) => a + v[1], 0) / verts.length;
    const r: [number, number, number] = [rand(), rand(), rand()];
    const delay = Math.min(1, Math.hypot(cx - FOCUS[0], cy - FOCUS[1]) / maxDist + rand() * 0.05);
    shards.push({ poly: verts, c: [cx, cy], r, delay });
  }
  return { shards, delaunay };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Rodrigues' rotation of p about a unit axis: the vertex shader's rotateAxis. */
function rotate(p: [number, number, number], axis: [number, number, number], a: number): [number, number, number] {
  const [x, y, z] = axis;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = (x * p[0] + y * p[1] + z * p[2]) * (1 - c);
  return [
    p[0] * c + (y * p[2] - z * p[1]) * s + x * d,
    p[1] * c + (z * p[0] - x * p[2]) * s + y * d,
    p[2] * c + (x * p[1] - y * p[0]) * s + z * d,
  ];
}

/** The vertex shader, per shard: where each corner is at `uBreak`. */
function placeShard(sh: Shard, uBreak: number) {
  const local = uBreak - sh.delay * 0.6;
  if (local <= 0) return { local, z: 0, pts: sh.poly.map(([x, y]) => [x, y, 0] as [number, number, number]) };
  const lift = smooth(0, 0.12, local);
  const t = Math.min(1, Math.max(0, (local - 0.06) / 0.5));
  const e = t * t;
  const raw: [number, number, number] = [sh.r[0] - 0.5, sh.r[1] - 0.5, sh.r[2] - 0.5 + 0.001];
  const len = Math.hypot(...raw);
  const axis: [number, number, number] = [raw[0] / len, raw[1] / len, raw[2] / len];
  const angle = e * (2.5 + sh.r[0] * 5) + lift * (sh.r[1] - 0.5) * 0.25;
  const awayRaw: [number, number, number] = [sh.c[0] * 0.25, sh.c[1] * 0.25, 1];
  const al = Math.hypot(...awayRaw);
  const fly = e * (16 + sh.r[1] * 18);
  const off: [number, number, number] = [(awayRaw[0] / al) * fly, (awayRaw[1] / al) * fly, (awayRaw[2] / al) * fly + lift * (0.05 + sh.r[2] * 0.12)];
  const pts = sh.poly.map(([x, y]) => {
    const q = rotate([x - sh.c[0], y - sh.c[1], 0], axis, angle);
    return [sh.c[0] + q[0] + off[0], sh.c[1] + q[1] + off[1], q[2] + off[2]] as [number, number, number];
  });
  return { local, z: off[2], pts };
}

export function TearLab({ lang }: { lang: Lang }) {
  const { shards, delaunay } = useMemo(() => buildShards(), []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [u, setU] = useState(0);
  const [auto, setAuto] = useState(true);
  const [heat, setHeat] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const visible = useRef(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Autoplay: tear (5s) — every shard is on its way by uBreak 0.6, so the show is
  // in the first half of the range — hold, mend (1.5s), hold, again.
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible.current) {
        t = (t + dt) % 8.5;
        const v = t < 5 ? t / 5 : t < 6 ? 1 : t < 7.5 ? 1 - (t - 6) / 1.5 : 0;
        setU(v * 0.9);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (el.width !== Math.round(w * dpr)) {
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Behind the paper: the dark world.
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, w, h);
    const k = w / (HW * 2);
    const project = ([x, y, z]: [number, number, number]) => {
      const p = D / Math.max(D - z, 0.5);
      return [w / 2 + x * p * k, h / 2 - y * p * k] as const;
    };
    const placed = shards.map((sh, i) => ({ i, sh, ...placeShard(sh, u) })).filter((s) => s.z < D - 1.2);
    placed.sort((a, b) => a.z - b.z);
    for (const s of placed) {
      ctx.beginPath();
      s.pts.forEach((p, j) => {
        const [x, y] = project(p);
        if (j) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      const d = s.sh.delay;
      ctx.fillStyle = heat ? `rgb(${241 - (241 - 232) * d},${237 - (237 - 64) * d},${228 - (228 - 42) * d})` : s.local > 0 ? "#e9e4d9" : "#f1ede4";
      ctx.fill();
      ctx.strokeStyle = s.i === hover ? "#e8402a" : "#141414";
      ctx.lineWidth = s.i === hover ? 2 : s.local > 0 ? 1.2 : 0.6;
      ctx.stroke();
    }
    // The tear's focus.
    const [fx, fy] = project([FOCUS[0], FOCUS[1], 0]);
    ctx.strokeStyle = "#e8402a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [shards, u, heat, hover]);

  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * HW * 2 - HW;
    const y = HH - ((e.clientY - r.top) / r.height) * HH * 2;
    setHover(delaunay.find(x, y));
  };
  const hs = hover !== null ? shards[hover] : null;
  return (
    <div>
      <canvas ref={canvas} className="block aspect-[16/10] w-full touch-none" onPointerMove={pick} onPointerLeave={() => setHover(null)} />
      <div className="flex flex-wrap items-center gap-3 border-t border-ink px-3 py-2">
        <label className="flex flex-1 items-center gap-2 font-mono text-[0.75rem]">
          <span className="text-accent">uBreak</span>
          <input
            type="range"
            min={0}
            max={1.7}
            step={0.01}
            value={u}
            onChange={(e) => {
              setAuto(false);
              setU(Number(e.target.value));
            }}
            className="flex-1"
          />
          <span className="w-10 tabular-nums">{u.toFixed(2)}</span>
        </label>
        <button type="button" onClick={() => setHeat((v) => !v)} className={`label border border-ink px-2 py-1 ${heat ? "bg-accent text-paper" : ""}`}>
          aDelay
        </button>
        <button type="button" onClick={() => setAuto((v) => !v)} className="label border border-ink px-2 py-1">
          {auto ? "❚❚" : "▶"}
        </button>
      </div>
      <p className="border-t border-ink px-3 py-2 font-mono text-[0.72rem] text-ink-soft">
        {hs
          ? `aDelay ${hs.delay.toFixed(3)} · local = uBreak − aDelay × 0.6 = ${(u - hs.delay * 0.6).toFixed(3)} · ${u - hs.delay * 0.6 > 0 ? tr(lang, "已经飞出", "flying") : tr(lang, "还在原位", "still in place")}`
          : tr(lang, "指着一块碎片看它的 aDelay；红圈是裂口的起点。", "Point at a shard to read its aDelay; the red ring is where the tear starts.")}
      </p>
    </div>
  );
}
